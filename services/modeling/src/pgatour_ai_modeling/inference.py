from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from statistics import mean, median
from typing import Any, Literal

import numpy as np
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from pgatour_ai_modeling.features import (
    DEFAULT_DATABASE_URL,
    load_workspace_env,
    stable_hash,
)

MODEL_NAME = "simulation-baseline-v0"
MODEL_VERSION = "0.1.0"
OUTPUT_SCHEMA_VERSION = "1.0.0"
MIN_ITERATIONS = 1_000
MAX_ITERATIONS = 250_000
DEFAULT_ITERATIONS = 20_000
DEFAULT_SEED = 17
DEFAULT_MARKET_TYPES = ("outright", "top_5", "top_10", "top_20", "make_cut")
SUPPORTED_MARKET_TYPES = (*DEFAULT_MARKET_TYPES, "miss_cut")
PROBABILITY_SMOOTHING_ALPHA = 0.5

MarketType = Literal["outright", "top_5", "top_10", "top_20", "make_cut", "miss_cut"]
ConfidenceLevel = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class RunModelOptions:
    feature_set_id: str | None = None
    tournament_id: str | None = None
    tournament_source_id: str | None = None
    market_types: tuple[MarketType, ...] = DEFAULT_MARKET_TYPES
    iterations: int = DEFAULT_ITERATIONS
    seed: int = DEFAULT_SEED
    code_version: str = "local"
    dry_run: bool = False


@dataclass(frozen=True)
class FeatureSet:
    id: str
    feature_set_name: str
    feature_set_version: str
    code_version: str
    input_hash: str
    input_manifest: dict[str, Any]
    training_window_start: datetime | None
    training_window_end: datetime | None
    generated_at: datetime
    row_count: int


@dataclass(frozen=True)
class FeatureRow:
    feature_set_id: str
    tournament_id: str
    player_id: str
    player_name: str
    as_of: datetime
    long_term_sg_total: float | None
    recent_sg_total: float | None
    sg_off_tee: float | None
    sg_approach: float | None
    sg_around_green: float | None
    sg_putting: float | None
    volatility: float | None
    rounds_count: int
    field_strength_adjusted: float | None
    course_fit: float | None
    features: dict[str, Any]


@dataclass(frozen=True)
class PlayerModelInput:
    player_id: str
    player_name: str
    tournament_id: str
    skill_mean: float
    performance_sigma: float
    uncertainty: float
    confidence: ConfidenceLevel
    rounds_count: int
    missing_features: tuple[str, ...]
    drivers: tuple[str, ...]
    risks: tuple[str, ...]
    source_features: dict[str, Any]


@dataclass(frozen=True)
class MarketPrice:
    market_id: str
    player_id: str
    market_type: MarketType
    american_odds: int
    implied_probability: float
    no_vig_probability: float | None
    captured_at: datetime
    raw_snapshot_key: str | None
    raw_snapshot_record_id: str | None

    @property
    def comparison_probability(self) -> float:
        return self.no_vig_probability or self.implied_probability


@dataclass(frozen=True)
class SimulationResult:
    probabilities: dict[MarketType, dict[str, float]]
    mean_ranks: dict[str, float]
    cutline_position: int


@dataclass(frozen=True)
class PredictionRow:
    tournament_id: str
    player_id: str
    market_type: MarketType
    probability: float
    fair_american_odds: int
    baseline_probability: float
    market_id: str | None
    market_implied_probability: float | None
    model_edge: float | None
    uncertainty: float
    rank: int
    confidence: ConfidenceLevel
    drivers: tuple[str, ...]
    risks: tuple[str, ...]
    simulation_summary: dict[str, Any]


@dataclass(frozen=True)
class ModelRunArtifact:
    feature_set: FeatureSet
    input_hash: str
    manifest: dict[str, Any]
    market_prices: dict[tuple[str, MarketType], MarketPrice]
    player_inputs: list[PlayerModelInput]
    prediction_rows: list[PredictionRow]
    simulation: SimulationResult
    tournament_id: str


def normalize_market_types(
    raw_market_types: str | list[str] | tuple[str, ...] | None,
) -> tuple[MarketType, ...]:
    if raw_market_types is None:
        return DEFAULT_MARKET_TYPES

    if isinstance(raw_market_types, str):
        values = [value.strip() for value in raw_market_types.split(",")]
    else:
        values = [str(value).strip() for value in raw_market_types]

    normalized: list[MarketType] = []
    unsupported: list[str] = []
    seen = set()

    for value in values:
        if len(value) == 0:
            continue
        if value not in SUPPORTED_MARKET_TYPES:
            unsupported.append(value)
            continue
        if value in seen:
            continue
        seen.add(value)
        normalized.append(value)  # type: ignore[arg-type]

    if unsupported:
        supported = ", ".join(SUPPORTED_MARKET_TYPES)
        raise ValueError(
            f"Unsupported market type(s): {', '.join(unsupported)}. Supported: {supported}"
        )
    if not normalized:
        raise ValueError("At least one market type is required")

    return tuple(normalized)


def run_model(options: RunModelOptions) -> dict[str, Any]:
    _validate_options(options)
    load_workspace_env()
    database_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        artifact = build_model_run_artifact(connection, options)

        model_run_id: str | None = None
        if not options.dry_run:
            with connection.transaction():
                model_run_id = _upsert_model_run(
                    connection,
                    feature_set=artifact.feature_set,
                    input_hash=artifact.input_hash,
                    manifest=artifact.manifest,
                    options=options,
                    tournament_id=artifact.tournament_id,
                    prediction_count=len(artifact.prediction_rows),
                )
                _replace_model_run_inputs(
                    connection,
                    model_run_id=model_run_id,
                    feature_set_id=artifact.feature_set.id,
                    raw_snapshot_record_ids=_raw_snapshot_record_ids(artifact.market_prices),
                )
                _replace_predictions(
                    connection,
                    model_run_id=model_run_id,
                    rows=artifact.prediction_rows,
                )

    return _build_result(
        dry_run=options.dry_run,
        feature_set=artifact.feature_set,
        input_hash=artifact.input_hash,
        market_prices=artifact.market_prices,
        model_run_id=model_run_id,
        options=options,
        prediction_rows=artifact.prediction_rows,
        tournament_id=artifact.tournament_id,
    )


def build_model_run_artifact(
    connection: psycopg.Connection[Any],
    options: RunModelOptions,
) -> ModelRunArtifact:
    _validate_options(options)
    feature_set = _resolve_feature_set(
        connection,
        feature_set_id=options.feature_set_id,
        tournament_id=options.tournament_id,
        tournament_source_id=options.tournament_source_id,
    )
    feature_rows = _load_feature_rows(connection, feature_set.id)
    tournament_id = _resolve_feature_tournament_id(
        connection,
        feature_rows=feature_rows,
        expected_tournament_id=options.tournament_id,
        expected_tournament_source_id=options.tournament_source_id,
    )
    market_prices = _load_latest_market_prices(
        connection,
        tournament_id=tournament_id,
        market_types=options.market_types,
    )
    player_inputs = build_player_model_inputs(feature_rows)
    simulation = simulate_market_probabilities(
        player_inputs,
        market_types=options.market_types,
        iterations=options.iterations,
        seed=options.seed,
    )
    prediction_rows = build_prediction_rows(
        player_inputs=player_inputs,
        simulation=simulation,
        market_prices=market_prices,
        market_types=options.market_types,
    )
    manifest = _build_model_manifest(
        feature_set=feature_set,
        feature_rows=feature_rows,
        market_prices=market_prices,
        options=options,
        player_inputs=player_inputs,
        prediction_rows=prediction_rows,
        simulation=simulation,
    )

    return ModelRunArtifact(
        feature_set=feature_set,
        input_hash=stable_hash(manifest),
        manifest=manifest,
        market_prices=market_prices,
        player_inputs=player_inputs,
        prediction_rows=prediction_rows,
        simulation=simulation,
        tournament_id=tournament_id,
    )


def build_player_model_inputs(feature_rows: list[FeatureRow]) -> list[PlayerModelInput]:
    if len(feature_rows) == 0:
        raise ValueError("Feature set has no model_player_features rows")

    long_term_values = _present_values(row.long_term_sg_total for row in feature_rows)
    volatility_values = _present_values(row.volatility for row in feature_rows)
    field_mean = mean(long_term_values) if long_term_values else 0.0
    fallback_long_term = field_mean - 0.35
    fallback_volatility = median(volatility_values) if volatility_values else 0.95

    model_inputs: list[PlayerModelInput] = []
    for row in feature_rows:
        missing_features = tuple(str(value) for value in row.features.get("missingFeatures", []))
        coverage = row.features.get("coverage", {})
        course_rounds = _json_number(coverage, "courseRounds") or 0.0
        history_reliability = _history_reliability(row.rounds_count)
        recent_reliability = _recent_reliability(row.rounds_count)
        has_long_term = row.long_term_sg_total is not None
        long_term = (
            row.long_term_sg_total if row.long_term_sg_total is not None else fallback_long_term
        )
        recent = row.recent_sg_total if row.recent_sg_total is not None else long_term
        field_adjusted = (
            row.field_strength_adjusted
            if row.field_strength_adjusted is not None
            else long_term - field_mean
        )
        course_fit = _shrink_course_fit(row.course_fit, course_rounds=course_rounds)
        long_term_centered = (long_term - field_mean) * history_reliability
        recent_centered = (recent - field_mean) * recent_reliability
        field_adjusted_shrunk = field_adjusted * history_reliability

        per_round_skill_mean = (
            0.65 * long_term_centered
            + 0.25 * recent_centered
            + 0.07 * field_adjusted_shrunk
            + 0.03 * course_fit
        )
        per_round_skill_mean = _clamp(per_round_skill_mean, minimum=-1.25, maximum=1.25)
        round_sigma = _clamp(
            row.volatility if row.volatility is not None else fallback_volatility,
            minimum=0.45,
            maximum=2.20,
        )
        performance_sigma = _clamp(2 * round_sigma, minimum=0.75, maximum=3.50)
        uncertainty = _player_uncertainty(
            rounds_count=row.rounds_count,
            missing_features=missing_features,
            has_long_term=has_long_term,
            volatility=row.volatility,
        )
        confidence = _confidence_level(rounds_count=row.rounds_count, uncertainty=uncertainty)
        drivers, risks = _drivers_and_risks(
            row=row,
            skill_mean=per_round_skill_mean,
            course_fit=course_fit,
        )

        model_inputs.append(
            PlayerModelInput(
                player_id=row.player_id,
                player_name=row.player_name,
                tournament_id=row.tournament_id,
                skill_mean=per_round_skill_mean * 4,
                performance_sigma=performance_sigma,
                uncertainty=uncertainty,
                confidence=confidence,
                rounds_count=row.rounds_count,
                missing_features=missing_features,
                drivers=drivers,
                risks=risks,
                source_features={
                    "courseFit": row.course_fit,
                    "fieldMeanLongTermSgTotal": field_mean,
                    "fieldStrengthAdjusted": row.field_strength_adjusted,
                    "historyReliability": history_reliability,
                    "longTermSgTotal": row.long_term_sg_total,
                    "recentSgTotal": row.recent_sg_total,
                    "recentReliability": recent_reliability,
                    "roundsCount": row.rounds_count,
                    "sgApproach": row.sg_approach,
                    "sgAroundGreen": row.sg_around_green,
                    "sgOffTee": row.sg_off_tee,
                    "sgPutting": row.sg_putting,
                    "volatility": row.volatility,
                },
            )
        )

    return model_inputs


def simulate_market_probabilities(
    player_inputs: list[PlayerModelInput],
    *,
    market_types: tuple[MarketType, ...],
    iterations: int,
    seed: int,
) -> SimulationResult:
    if len(player_inputs) == 0:
        raise ValueError("At least one player is required")
    if iterations < MIN_ITERATIONS:
        raise ValueError(f"iterations must be at least {MIN_ITERATIONS:,}")
    if iterations > MAX_ITERATIONS:
        raise ValueError(f"iterations must be less than or equal to {MAX_ITERATIONS:,}")

    player_ids = [player.player_id for player in player_inputs]
    means = np.array([player.skill_mean for player in player_inputs], dtype=np.float64)
    sigmas = np.array([player.performance_sigma for player in player_inputs], dtype=np.float64)
    rng = np.random.default_rng(seed)
    scores = rng.normal(loc=means, scale=sigmas, size=(iterations, len(player_inputs)))
    order = np.argsort(-scores, axis=1)
    ranks = np.empty(order.shape, dtype=np.int32)
    rank_values = np.arange(1, len(player_inputs) + 1, dtype=np.int32)
    np.put_along_axis(ranks, order, rank_values[np.newaxis, :], axis=1)

    cutline_position = _cutline_position(len(player_inputs))
    probabilities: dict[MarketType, dict[str, float]] = {}

    for market_type in market_types:
        if market_type == "outright":
            win_counts = np.sum(ranks == 1, axis=0)
            denominator = iterations + PROBABILITY_SMOOTHING_ALPHA * len(player_inputs)
            market_probabilities = (win_counts + PROBABILITY_SMOOTHING_ALPHA) / denominator
        else:
            threshold = _rank_threshold(market_type, cutline_position=cutline_position)
            success_counts = np.sum(ranks <= threshold, axis=0)
            if market_type == "miss_cut":
                success_counts = iterations - success_counts
            denominator = iterations + 2 * PROBABILITY_SMOOTHING_ALPHA
            market_probabilities = (success_counts + PROBABILITY_SMOOTHING_ALPHA) / denominator

        probabilities[market_type] = {
            player_id: float(probability)
            for player_id, probability in zip(player_ids, market_probabilities, strict=True)
        }

    return SimulationResult(
        probabilities=probabilities,
        mean_ranks={
            player_id: float(mean_rank)
            for player_id, mean_rank in zip(player_ids, np.mean(ranks, axis=0), strict=True)
        },
        cutline_position=cutline_position,
    )


def build_prediction_rows(
    *,
    player_inputs: list[PlayerModelInput],
    simulation: SimulationResult,
    market_prices: dict[tuple[str, MarketType], MarketPrice],
    market_types: tuple[MarketType, ...],
) -> list[PredictionRow]:
    field_size = len(player_inputs)
    inputs_by_player = {player.player_id: player for player in player_inputs}
    predictions: list[PredictionRow] = []

    for market_type in market_types:
        probabilities = simulation.probabilities[market_type]
        market_ranks = {
            player_id: rank
            for rank, (player_id, _) in enumerate(
                sorted(probabilities.items(), key=lambda item: item[1], reverse=True),
                start=1,
            )
        }
        baseline_probability = _baseline_probability(
            market_type,
            field_size=field_size,
            cutline_position=simulation.cutline_position,
        )

        for player_id, probability in probabilities.items():
            player = inputs_by_player[player_id]
            market_price = market_prices.get((player_id, market_type))
            market_probability = (
                market_price.comparison_probability if market_price is not None else None
            )
            model_edge = (
                probability - market_probability if market_probability is not None else None
            )
            predictions.append(
                PredictionRow(
                    tournament_id=player.tournament_id,
                    player_id=player_id,
                    market_type=market_type,
                    probability=_round_probability(probability),
                    fair_american_odds=fair_american_odds(probability),
                    baseline_probability=_round_probability(baseline_probability),
                    market_id=market_price.market_id if market_price is not None else None,
                    market_implied_probability=(
                        _round_probability(market_probability)
                        if market_probability is not None
                        else None
                    ),
                    model_edge=_round_probability(model_edge) if model_edge is not None else None,
                    uncertainty=_round_probability(player.uncertainty),
                    rank=market_ranks[player_id],
                    confidence=player.confidence,
                    drivers=player.drivers,
                    risks=player.risks,
                    simulation_summary={
                        "cutlinePosition": simulation.cutline_position,
                        "fieldSize": field_size,
                        "meanRank": round(simulation.mean_ranks[player_id], 3),
                        "marketPriceCapturedAt": (
                            _to_iso(market_price.captured_at) if market_price is not None else None
                        ),
                        "sourceFeatures": player.source_features,
                    },
                )
            )

    return predictions


def fair_american_odds(probability: float) -> int:
    bounded = _bounded_probability(probability)
    if bounded < 0.5:
        return round((100 * (1 - bounded)) / bounded)

    return round((-100 * bounded) / (1 - bounded))


def _validate_options(options: RunModelOptions) -> None:
    if options.feature_set_id is not None and (
        options.tournament_id is not None or options.tournament_source_id is not None
    ):
        raise ValueError("Pass feature_set_id by itself, or pass a tournament selector")
    if options.tournament_id is not None and options.tournament_source_id is not None:
        raise ValueError("Pass either tournament_id or tournament_source_id, not both")
    if options.iterations < MIN_ITERATIONS:
        raise ValueError(f"iterations must be at least {MIN_ITERATIONS:,}")
    if options.iterations > MAX_ITERATIONS:
        raise ValueError(f"iterations must be less than or equal to {MAX_ITERATIONS:,}")
    if len(options.market_types) == 0:
        raise ValueError("At least one market type is required")


def _resolve_feature_set(
    connection: psycopg.Connection[Any],
    *,
    feature_set_id: str | None,
    tournament_id: str | None,
    tournament_source_id: str | None,
) -> FeatureSet:
    if feature_set_id is not None:
        row = connection.execute(
            """
                select
                  id::text as id,
                  feature_set_name,
                  feature_set_version,
                  code_version,
                  input_hash,
                  input_manifest,
                  training_window_start,
                  training_window_end,
                  generated_at,
                  row_count
                from model_feature_sets
                where id = %s::uuid
                  and status = 'complete'
                limit 1
            """,
            (feature_set_id,),
        ).fetchone()
    else:
        conditions = ["mfs.status = 'complete'"]
        params: list[Any] = []
        if tournament_id is not None:
            conditions.append(
                """
                exists (
                  select 1
                  from model_player_features mpf
                  where mpf.feature_set_id = mfs.id
                    and mpf.tournament_id = %s::uuid
                )
                """
            )
            params.append(tournament_id)
        if tournament_source_id is not None:
            conditions.append(
                """
                exists (
                  select 1
                  from model_player_features mpf
                  inner join source_entity_mappings sem
                    on sem.source = 'balldontlie'
                   and sem.entity_type = 'tournament'
                   and sem.canonical_id = mpf.tournament_id
                  where mpf.feature_set_id = mfs.id
                    and sem.source_entity_id = %s
                )
                """
            )
            params.append(tournament_source_id)

        row = connection.execute(
            f"""
                select
                  mfs.id::text as id,
                  mfs.feature_set_name,
                  mfs.feature_set_version,
                  mfs.code_version,
                  mfs.input_hash,
                  mfs.input_manifest,
                  mfs.training_window_start,
                  mfs.training_window_end,
                  mfs.generated_at,
                  mfs.row_count
                from model_feature_sets mfs
                where {" and ".join(conditions)}
                order by mfs.generated_at desc, mfs.created_at desc
                limit 1
            """,
            tuple(params),
        ).fetchone()

    if row is None:
        raise ValueError("No complete model feature set found")

    return _feature_set_from_row(row)


def _load_feature_rows(
    connection: psycopg.Connection[Any],
    feature_set_id: str,
) -> list[FeatureRow]:
    rows = connection.execute(
        """
            select
              mpf.feature_set_id::text as feature_set_id,
              mpf.tournament_id::text as tournament_id,
              mpf.player_id::text as player_id,
              trim(concat_ws(' ', p.first_name, p.last_name)) as player_name,
              mpf.as_of,
              mpf.long_term_sg_total,
              mpf.recent_sg_total,
              mpf.sg_off_tee,
              mpf.sg_approach,
              mpf.sg_around_green,
              mpf.sg_putting,
              mpf.volatility,
              mpf.rounds_count,
              mpf.field_strength_adjusted,
              mpf.course_fit,
              mpf.features
            from model_player_features mpf
            inner join players p on p.id = mpf.player_id
            where mpf.feature_set_id = %s::uuid
            order by p.last_name, p.first_name, mpf.player_id
        """,
        (feature_set_id,),
    ).fetchall()

    return [_feature_row_from_row(row) for row in rows]


def _resolve_feature_tournament_id(
    connection: psycopg.Connection[Any],
    *,
    feature_rows: list[FeatureRow],
    expected_tournament_id: str | None,
    expected_tournament_source_id: str | None,
) -> str:
    tournament_ids = sorted({row.tournament_id for row in feature_rows})
    if len(tournament_ids) == 0:
        raise ValueError("Feature set has no tournament rows")
    if len(tournament_ids) > 1:
        raise ValueError(
            "Feature set contains multiple tournaments; generate one feature set per target"
        )

    tournament_id = tournament_ids[0]
    if expected_tournament_id is not None and tournament_id != expected_tournament_id:
        raise ValueError("Feature set tournament does not match tournament_id")
    if expected_tournament_source_id is not None:
        mapping = connection.execute(
            """
                select source_entity_id
                from source_entity_mappings
                where source = 'balldontlie'
                  and entity_type = 'tournament'
                  and canonical_id = %s::uuid
                limit 1
            """,
            (tournament_id,),
        ).fetchone()
        if mapping is None or mapping["source_entity_id"] != expected_tournament_source_id:
            raise ValueError("Feature set tournament does not match tournament_source_id")

    return tournament_id


def _load_latest_market_prices(
    connection: psycopg.Connection[Any],
    *,
    tournament_id: str,
    market_types: tuple[MarketType, ...],
) -> dict[tuple[str, MarketType], MarketPrice]:
    if len(market_types) == 0:
        return {}

    placeholders = ",".join(["%s::market_type"] * len(market_types))
    rows = connection.execute(
        f"""
            with latest_by_market as (
              select
                m.id::text as market_id,
                m.player_id::text as player_id,
                m.market_type::text as market_type,
                os.american_odds,
                os.implied_probability,
                os.no_vig_probability,
                os.raw_snapshot_key,
                rsr.id::text as raw_snapshot_record_id,
                os.captured_at
              from markets m
              inner join lateral (
                select
                  american_odds,
                  implied_probability,
                  no_vig_probability,
                  raw_snapshot_key,
                  captured_at
                from odds_snapshots os
                where os.market_id = m.id
                order by os.captured_at desc, os.id desc
                limit 1
              ) os on true
              left join raw_snapshot_records rsr on rsr.snapshot_key = os.raw_snapshot_key
              where m.tournament_id = %s::uuid
                and m.market_type in ({placeholders})
            )
            select distinct on (player_id, market_type)
              market_id,
              player_id,
              market_type,
              american_odds,
              implied_probability,
              no_vig_probability,
              raw_snapshot_key,
              raw_snapshot_record_id,
              captured_at
            from latest_by_market
            order by
              player_id,
              market_type,
              coalesce(no_vig_probability, implied_probability) asc,
              captured_at desc
        """,
        (tournament_id, *market_types),
    ).fetchall()

    prices = [_market_price_from_row(row) for row in rows]
    return {(price.player_id, price.market_type): price for price in prices}


def _upsert_model_run(
    connection: psycopg.Connection[Any],
    *,
    feature_set: FeatureSet,
    input_hash: str,
    manifest: dict[str, Any],
    options: RunModelOptions,
    tournament_id: str,
    prediction_count: int,
) -> str:
    now = datetime.now(UTC)
    metrics = {
        "fieldSize": manifest["rowCounts"]["players"],
        "marketPriceCount": manifest["rowCounts"]["marketPrices"],
        "predictionCount": prediction_count,
    }
    row = connection.execute(
        """
            insert into model_runs (
              model_name,
              model_version,
              code_version,
              input_hash,
              output_schema_version,
              status,
              run_type,
              tournament_id,
              feature_set_id,
              config,
              seed,
              as_of,
              training_window_start,
              training_window_end,
              market_types,
              started_at,
              completed_at,
              metrics
            )
            values (
              %s, %s, %s, %s, %s, 'complete', 'inference', %s::uuid, %s::uuid, %s,
              %s, %s, %s, %s, %s, %s, %s, %s
            )
            on conflict (model_name, model_version, input_hash, run_type) do nothing
            returning id::text
        """,
        (
            MODEL_NAME,
            MODEL_VERSION,
            options.code_version,
            input_hash,
            OUTPUT_SCHEMA_VERSION,
            tournament_id,
            feature_set.id,
            Jsonb(manifest["config"]),
            options.seed,
            feature_set.generated_at,
            feature_set.training_window_start,
            feature_set.training_window_end,
            Jsonb(list(options.market_types)),
            now,
            now,
            Jsonb(metrics),
        ),
    ).fetchone()

    if row is not None:
        return row["id"]

    existing = connection.execute(
        """
            select id::text as id
            from model_runs
            where model_name = %s
              and model_version = %s
              and input_hash = %s
              and run_type = 'inference'
            limit 1
        """,
        (MODEL_NAME, MODEL_VERSION, input_hash),
    ).fetchone()
    if existing is None:
        raise RuntimeError("Model run insert failed and no existing run was found")

    return existing["id"]


def _replace_model_run_inputs(
    connection: psycopg.Connection[Any],
    *,
    model_run_id: str,
    feature_set_id: str,
    raw_snapshot_record_ids: tuple[str, ...],
) -> None:
    connection.execute(
        "delete from model_run_inputs where model_run_id = %s::uuid",
        (model_run_id,),
    )
    connection.execute(
        """
            insert into model_run_inputs (model_run_id, feature_set_id, role)
            values (%s::uuid, %s::uuid, 'feature_set')
        """,
        (model_run_id, feature_set_id),
    )
    if len(raw_snapshot_record_ids) == 0:
        return

    with connection.cursor() as cursor:
        cursor.executemany(
            """
                insert into model_run_inputs (model_run_id, raw_snapshot_record_id, role)
                values (%s::uuid, %s::uuid, 'market_price_snapshot')
            """,
            [
                (model_run_id, raw_snapshot_record_id)
                for raw_snapshot_record_id in raw_snapshot_record_ids
            ],
        )


def _replace_predictions(
    connection: psycopg.Connection[Any],
    *,
    model_run_id: str,
    rows: list[PredictionRow],
) -> None:
    connection.execute("delete from predictions where model_run_id = %s::uuid", (model_run_id,))
    if len(rows) == 0:
        return

    payload = [
        (
            model_run_id,
            row.market_id,
            row.tournament_id,
            row.player_id,
            row.market_type,
            _decimal(row.probability),
            row.fair_american_odds,
            _decimal(row.baseline_probability),
            _decimal(row.market_implied_probability),
            _decimal(row.model_edge),
            _decimal(row.uncertainty),
            row.rank,
            row.confidence,
            Jsonb(list(row.drivers)),
            Jsonb(list(row.risks)),
            Jsonb(row.simulation_summary),
        )
        for row in rows
    ]

    with connection.cursor() as cursor:
        cursor.executemany(
            """
                insert into predictions (
                  model_run_id,
                  market_id,
                  tournament_id,
                  player_id,
                  market_type,
                  probability,
                  fair_american_odds,
                  baseline_probability,
                  market_implied_probability,
                  model_edge,
                  uncertainty,
                  rank,
                  confidence,
                  drivers,
                  risks,
                  simulation_summary
                )
                values (
                  %s::uuid, %s::uuid, %s::uuid, %s::uuid, %s::market_type, %s, %s,
                  %s, %s, %s, %s, %s, %s::confidence_level, %s, %s, %s
                )
            """,
            payload,
        )


def _build_model_manifest(
    *,
    feature_set: FeatureSet,
    feature_rows: list[FeatureRow],
    market_prices: dict[tuple[str, MarketType], MarketPrice],
    options: RunModelOptions,
    player_inputs: list[PlayerModelInput],
    prediction_rows: list[PredictionRow],
    simulation: SimulationResult,
) -> dict[str, Any]:
    priced_predictions = sum(1 for row in prediction_rows if row.market_id is not None)
    return {
        "asOf": _to_iso(feature_set.generated_at),
        "codeVersion": options.code_version,
        "config": {
            "abilityWeights": {
                "courseFit": 0.03,
                "fieldStrengthAdjusted": 0.07,
                "longTermSgTotal": 0.65,
                "recentSgTotal": 0.25,
            },
            "cutlinePolicy": "top-65 approximation for standard full-field PGA events",
            "featureClipping": {"perRoundSkillMean": [-1.25, 1.25]},
            "iterations": options.iterations,
            "marketPricePolicy": (
                "best available latest market snapshot by lowest implied probability"
            ),
            "maxIterations": MAX_ITERATIONS,
            "minIterations": MIN_ITERATIONS,
            "modelName": MODEL_NAME,
            "modelVersion": MODEL_VERSION,
            "performanceUnit": "simulated tournament-level strokes gained relative to field",
            "probabilitySmoothingAlpha": PROBABILITY_SMOOTHING_ALPHA,
            "reliabilityShrinkage": {
                "history": "rounds_count / (rounds_count + 16)",
                "recent": "min(1, rounds_count / 24)",
            },
            "seed": options.seed,
            "supportedMarketTypes": list(SUPPORTED_MARKET_TYPES),
        },
        "featureSet": {
            "codeVersion": feature_set.code_version,
            "featureSetId": feature_set.id,
            "featureSetName": feature_set.feature_set_name,
            "featureSetVersion": feature_set.feature_set_version,
            "generatedAt": _to_iso(feature_set.generated_at),
            "inputHash": feature_set.input_hash,
            "rowCount": feature_set.row_count,
            "trainingWindowEnd": _to_iso(feature_set.training_window_end),
            "trainingWindowStart": _to_iso(feature_set.training_window_start),
        },
        "inputHashes": {
            "featureRows": stable_hash([_feature_row_hash_payload(row) for row in feature_rows]),
            "marketPrices": stable_hash(
                [_market_price_hash_payload(price) for price in market_prices.values()]
            ),
            "playerInputs": stable_hash(
                [_player_input_hash_payload(player) for player in player_inputs]
            ),
        },
        "leakagePolicy": {
            "featureRows": (
                "model consumes only persisted model_player_features for the immutable feature set"
            ),
            "marketPrices": (
                "market snapshots are used for edge calculation only, not probability estimation"
            ),
        },
        "marketTypes": list(options.market_types),
        "outputSchemaVersion": OUTPUT_SCHEMA_VERSION,
        "rowCounts": {
            "marketPrices": len(market_prices),
            "marketPriceRawSnapshots": len(_raw_snapshot_record_ids(market_prices)),
            "players": len(player_inputs),
            "predictions": len(prediction_rows),
            "pricedPredictions": priced_predictions,
            "unpricedPredictions": len(prediction_rows) - priced_predictions,
        },
        "simulation": {
            "cutlinePosition": simulation.cutline_position,
            "fieldSize": len(player_inputs),
        },
    }


def _build_result(
    *,
    dry_run: bool,
    feature_set: FeatureSet,
    input_hash: str,
    market_prices: dict[tuple[str, MarketType], MarketPrice],
    model_run_id: str | None,
    options: RunModelOptions,
    prediction_rows: list[PredictionRow],
    tournament_id: str,
) -> dict[str, Any]:
    best_edges = sorted(
        (row for row in prediction_rows if row.model_edge is not None),
        key=lambda row: row.model_edge or -1,
        reverse=True,
    )[:10]

    return {
        "dryRun": dry_run,
        "featureSetId": feature_set.id,
        "inputHash": input_hash,
        "marketPriceCount": len(market_prices),
        "marketTypes": list(options.market_types),
        "modelName": MODEL_NAME,
        "modelRunId": model_run_id,
        "modelVersion": MODEL_VERSION,
        "predictionCount": len(prediction_rows),
        "tournamentId": tournament_id,
        "topPricedEdges": [
            {
                "edge": row.model_edge,
                "fairAmericanOdds": row.fair_american_odds,
                "marketImpliedProbability": row.market_implied_probability,
                "marketType": row.market_type,
                "playerId": row.player_id,
                "probability": row.probability,
            }
            for row in best_edges
        ],
    }


def _raw_snapshot_record_ids(
    market_prices: dict[tuple[str, MarketType], MarketPrice],
) -> tuple[str, ...]:
    return tuple(
        sorted(
            {
                price.raw_snapshot_record_id
                for price in market_prices.values()
                if price.raw_snapshot_record_id is not None
            }
        )
    )


def _feature_set_from_row(row: dict[str, Any]) -> FeatureSet:
    return FeatureSet(
        id=row["id"],
        feature_set_name=row["feature_set_name"],
        feature_set_version=row["feature_set_version"],
        code_version=row["code_version"],
        input_hash=row["input_hash"],
        input_manifest=row["input_manifest"],
        training_window_start=_as_utc_optional(row["training_window_start"]),
        training_window_end=_as_utc_optional(row["training_window_end"]),
        generated_at=_as_utc(row["generated_at"]),
        row_count=row["row_count"],
    )


def _feature_row_from_row(row: dict[str, Any]) -> FeatureRow:
    return FeatureRow(
        feature_set_id=row["feature_set_id"],
        tournament_id=row["tournament_id"],
        player_id=row["player_id"],
        player_name=row["player_name"],
        as_of=_as_utc(row["as_of"]),
        long_term_sg_total=_to_float(row["long_term_sg_total"]),
        recent_sg_total=_to_float(row["recent_sg_total"]),
        sg_off_tee=_to_float(row["sg_off_tee"]),
        sg_approach=_to_float(row["sg_approach"]),
        sg_around_green=_to_float(row["sg_around_green"]),
        sg_putting=_to_float(row["sg_putting"]),
        volatility=_to_float(row["volatility"]),
        rounds_count=row["rounds_count"] or 0,
        field_strength_adjusted=_to_float(row["field_strength_adjusted"]),
        course_fit=_to_float(row["course_fit"]),
        features=row["features"] or {},
    )


def _market_price_from_row(row: dict[str, Any]) -> MarketPrice:
    return MarketPrice(
        market_id=row["market_id"],
        player_id=row["player_id"],
        market_type=row["market_type"],
        american_odds=row["american_odds"],
        implied_probability=float(row["implied_probability"]),
        no_vig_probability=_to_float(row["no_vig_probability"]),
        captured_at=_as_utc(row["captured_at"]),
        raw_snapshot_key=row["raw_snapshot_key"],
        raw_snapshot_record_id=row["raw_snapshot_record_id"],
    )


def _feature_row_hash_payload(row: FeatureRow) -> dict[str, Any]:
    return {
        "asOf": _to_iso(row.as_of),
        "courseFit": row.course_fit,
        "features": row.features,
        "fieldStrengthAdjusted": row.field_strength_adjusted,
        "longTermSgTotal": row.long_term_sg_total,
        "playerId": row.player_id,
        "recentSgTotal": row.recent_sg_total,
        "roundsCount": row.rounds_count,
        "tournamentId": row.tournament_id,
        "volatility": row.volatility,
    }


def _market_price_hash_payload(price: MarketPrice) -> dict[str, Any]:
    return {
        "americanOdds": price.american_odds,
        "capturedAt": _to_iso(price.captured_at),
        "impliedProbability": price.implied_probability,
        "marketId": price.market_id,
        "marketType": price.market_type,
        "noVigProbability": price.no_vig_probability,
        "playerId": price.player_id,
        "rawSnapshotKey": price.raw_snapshot_key,
        "rawSnapshotRecordId": price.raw_snapshot_record_id,
    }


def _player_input_hash_payload(player: PlayerModelInput) -> dict[str, Any]:
    return {
        "confidence": player.confidence,
        "missingFeatures": list(player.missing_features),
        "performanceSigma": player.performance_sigma,
        "playerId": player.player_id,
        "roundsCount": player.rounds_count,
        "skillMean": player.skill_mean,
        "uncertainty": player.uncertainty,
    }


def _baseline_probability(
    market_type: MarketType,
    *,
    field_size: int,
    cutline_position: int,
) -> float:
    if market_type == "outright":
        return 1 / field_size
    if market_type == "top_5":
        return min(5, field_size) / field_size
    if market_type == "top_10":
        return min(10, field_size) / field_size
    if market_type == "top_20":
        return min(20, field_size) / field_size
    if market_type == "make_cut":
        return min(cutline_position, field_size) / field_size
    if market_type == "miss_cut":
        return 1 - min(cutline_position, field_size) / field_size

    raise ValueError(f"Unsupported market type: {market_type}")


def _rank_threshold(market_type: MarketType, *, cutline_position: int) -> int:
    if market_type == "top_5":
        return 5
    if market_type == "top_10":
        return 10
    if market_type == "top_20":
        return 20
    if market_type in {"make_cut", "miss_cut"}:
        return cutline_position
    if market_type == "outright":
        return 1

    raise ValueError(f"Unsupported market type: {market_type}")


def _cutline_position(field_size: int) -> int:
    if field_size <= 0:
        raise ValueError("field_size must be positive")
    if field_size <= 75:
        return field_size

    return min(65, field_size)


def _shrink_course_fit(course_fit: float | None, *, course_rounds: float) -> float:
    if course_fit is None:
        return 0.0

    sample_weight = _clamp(course_rounds / 12, minimum=0.0, maximum=1.0)
    return _clamp(course_fit, minimum=-1.25, maximum=1.25) * sample_weight


def _history_reliability(rounds_count: int) -> float:
    if rounds_count <= 0:
        return 0.0

    return rounds_count / (rounds_count + 16)


def _recent_reliability(rounds_count: int) -> float:
    if rounds_count <= 0:
        return 0.0

    return _clamp(rounds_count / 24, minimum=0.0, maximum=1.0)


def _player_uncertainty(
    *,
    rounds_count: int,
    missing_features: tuple[str, ...],
    has_long_term: bool,
    volatility: float | None,
) -> float:
    missing_penalty = 0.04 * len(missing_features)
    history_penalty = max(0.0, (16 - min(rounds_count, 16)) / 16) * 0.18
    fallback_penalty = 0.08 if not has_long_term else 0.0
    volatility_penalty = 0.05 if volatility is None else 0.0
    return _clamp(
        0.08 + missing_penalty + history_penalty + fallback_penalty + volatility_penalty,
        minimum=0.05,
        maximum=0.55,
    )


def _confidence_level(*, rounds_count: int, uncertainty: float) -> ConfidenceLevel:
    if rounds_count >= 24 and uncertainty <= 0.16:
        return "high"
    if rounds_count >= 8 and uncertainty <= 0.30:
        return "medium"

    return "low"


def _drivers_and_risks(
    *,
    row: FeatureRow,
    skill_mean: float,
    course_fit: float,
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    drivers: list[str] = []
    risks: list[str] = []

    if row.long_term_sg_total is not None and row.long_term_sg_total > 0.35:
        drivers.append("Positive long-term SG")
    if row.recent_sg_total is not None and row.recent_sg_total > 0.35:
        drivers.append("Positive recent SG")
    if row.sg_approach is not None and row.sg_approach > 0.15:
        drivers.append("Approach strength")
    if course_fit > 0.10:
        drivers.append("Positive course-fit sample")
    if skill_mean > 0.25:
        drivers.append("Above-field baseline")

    if row.rounds_count < 8:
        risks.append("Limited historical sample")
    if row.long_term_sg_total is None:
        risks.append("Missing long-term SG")
    if row.course_fit is None:
        risks.append("No course-fit sample")
    if row.volatility is not None and row.volatility > 1.35:
        risks.append("High volatility")
    if row.recent_sg_total is not None and row.recent_sg_total < -0.35:
        risks.append("Weak recent SG")

    return tuple(drivers[:4]), tuple(risks[:4])


def _round_probability(value: float | None) -> float | None:
    if value is None:
        return None

    return round(_bounded_probability(value), 6)


def _bounded_probability(value: float) -> float:
    if not np.isfinite(value):
        raise ValueError("probability must be finite")

    return _clamp(float(value), minimum=0.000001, maximum=0.999999)


def _present_values(values: Any) -> list[float]:
    return [float(value) for value in values if value is not None]


def _json_number(value: Any, key: str) -> float | None:
    if not isinstance(value, dict) or value.get(key) is None:
        return None

    return float(value[key])


def _decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None

    return Decimal(str(round(value, 6)))


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    return float(value)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _as_utc_optional(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    return _as_utc(value)


def _to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None

    return _as_utc(value).isoformat().replace("+00:00", "Z")


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))
