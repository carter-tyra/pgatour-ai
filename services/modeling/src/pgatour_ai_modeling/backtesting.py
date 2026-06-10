from __future__ import annotations

import math
import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from statistics import mean
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from pgatour_ai_modeling.features import (
    DEFAULT_DATABASE_URL,
    GenerateFeaturesOptions,
    generate_feature_set,
    load_workspace_env,
    stable_hash,
)
from pgatour_ai_modeling.inference import (
    DEFAULT_ITERATIONS,
    DEFAULT_MARKET_TYPES,
    DEFAULT_SEED,
    MODEL_NAME,
    MODEL_VERSION,
    MarketPrice,
    MarketType,
    PredictionRow,
    RunModelOptions,
    build_model_run_artifact,
)

BACKTEST_SCHEMA_VERSION = "1.0.0"
DEFAULT_AS_OF_OFFSET_DAYS = 1
DEFAULT_CALIBRATION_BINS = 10
MIN_COMPLETED_TOURNAMENTS = 1
EPSILON = 0.000001


@dataclass(frozen=True)
class RunBacktestOptions:
    from_season: int
    to_season: int
    tournament_ids: tuple[str, ...] = ()
    tournament_source_ids: tuple[str, ...] = ()
    market_types: tuple[MarketType, ...] = DEFAULT_MARKET_TYPES
    iterations: int = DEFAULT_ITERATIONS
    seed: int = DEFAULT_SEED
    code_version: str = "local"
    feature_set_version: str = "0.1.0"
    recent_round_window: int = 24
    as_of_offset_days: int = DEFAULT_AS_OF_OFFSET_DAYS
    calibration_bins: int = DEFAULT_CALIBRATION_BINS
    dry_run: bool = False


@dataclass(frozen=True)
class BacktestTarget:
    id: str
    source_entity_id: str | None
    name: str
    season: int
    starts_on: date
    ends_on: date
    field_entry_count: int
    result_count: int
    market_count: int


@dataclass(frozen=True)
class PlayerOutcome:
    made_cut: bool | None
    position_numeric: int | None
    withdrawn: bool
    disqualified: bool


@dataclass(frozen=True)
class BacktestPrediction:
    tournament_id: str
    player_id: str
    market_type: MarketType
    as_of: datetime
    probability: float
    fair_american_odds: int
    actual_outcome: bool | None
    finish_position: int | None
    closing_american_odds: int | None
    closing_line_value: float | None


@dataclass(frozen=True)
class EvaluationMetric:
    scope: str
    market_type: MarketType | None
    tournament_id: str | None
    brier_score: float | None
    log_loss: float | None
    calibration_error: float | None
    coverage: float
    average_closing_line_value: float | None
    metrics: dict[str, Any]


def run_backtest(options: RunBacktestOptions) -> dict[str, Any]:
    _validate_options(options)
    load_workspace_env()
    database_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        targets = _load_backtest_targets(connection, options)

        if options.dry_run:
            return {
                "dryRun": True,
                "eligibleTournamentCount": len(targets),
                "eligibleTournaments": [_target_to_result(target) for target in targets],
                "marketTypes": list(options.market_types),
            }

        predictions: list[BacktestPrediction] = []
        target_results: list[dict[str, Any]] = []
        feature_set_ids: list[str] = []
        model_input_hashes: list[str] = []

        for target in targets:
            as_of = _target_as_of(target, options.as_of_offset_days)
            feature_result = generate_feature_set(
                GenerateFeaturesOptions(
                    tournament_id=target.id,
                    as_of=as_of,
                    code_version=options.code_version,
                    feature_set_version=options.feature_set_version,
                    recent_round_window=options.recent_round_window,
                    dry_run=False,
                )
            )
            feature_set_id = feature_result["featureSetId"]
            if not isinstance(feature_set_id, str):
                raise RuntimeError(f"Feature generation did not persist for {target.name}")

            artifact = build_model_run_artifact(
                connection,
                RunModelOptions(
                    feature_set_id=feature_set_id,
                    market_types=options.market_types,
                    iterations=options.iterations,
                    seed=options.seed,
                    code_version=options.code_version,
                    dry_run=True,
                ),
            )
            outcomes = _load_player_outcomes(connection, target.id)
            closing_prices = _load_closing_market_prices(
                connection,
                tournament_id=target.id,
                market_types=options.market_types,
                closing_cutoff=datetime.combine(target.starts_on, time.min, tzinfo=UTC),
            )
            target_predictions = build_backtest_predictions(
                prediction_rows=artifact.prediction_rows,
                outcomes=outcomes,
                closing_prices=closing_prices,
                as_of=artifact.feature_set.generated_at,
            )

            predictions.extend(target_predictions)
            feature_set_ids.append(feature_set_id)
            model_input_hashes.append(artifact.input_hash)
            target_results.append(
                {
                    **_target_to_result(target),
                    "asOf": _to_iso(as_of),
                    "featureSetId": feature_set_id,
                    "knownOutcomePredictions": sum(
                        1 for row in target_predictions if row.actual_outcome is not None
                    ),
                    "predictionCount": len(target_predictions),
                    "rowsWithCourseFit": feature_result["rowsWithCourseFit"],
                    "rowsWithLongTermSgTotal": feature_result["rowsWithLongTermSgTotal"],
                }
            )

        evaluations = build_evaluations(
            predictions=predictions,
            calibration_bins=options.calibration_bins,
        )
        manifest = _build_backtest_manifest(
            feature_set_ids=feature_set_ids,
            model_input_hashes=model_input_hashes,
            options=options,
            predictions=predictions,
            targets=target_results,
        )
        input_hash = stable_hash(manifest)
        metrics = _backtest_metrics(
            evaluations=evaluations,
            input_hash=input_hash,
            manifest=manifest,
            predictions=predictions,
        )
        calibration = _calibration_payload(evaluations)

        with connection.transaction():
            backtest_id = _upsert_backtest(
                connection,
                calibration=calibration,
                feature_set_id=feature_set_ids[0] if len(feature_set_ids) == 1 else None,
                input_hash=input_hash,
                manifest=manifest,
                metrics=metrics,
                options=options,
                targets=targets,
            )
            _replace_backtest_predictions(connection, backtest_id=backtest_id, rows=predictions)
            _replace_evaluations(connection, backtest_id=backtest_id, rows=evaluations)

    return {
        "backtestId": backtest_id,
        "dryRun": False,
        "evaluationCount": len(evaluations),
        "inputHash": input_hash,
        "knownOutcomePredictionCount": sum(
            1 for row in predictions if row.actual_outcome is not None
        ),
        "marketTypes": list(options.market_types),
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "predictionCount": len(predictions),
        "summary": metrics["summary"],
        "tournamentCount": len(targets),
        "tournaments": target_results,
    }


def build_backtest_predictions(
    *,
    prediction_rows: list[PredictionRow],
    outcomes: dict[str, PlayerOutcome],
    closing_prices: dict[tuple[str, MarketType], MarketPrice],
    as_of: datetime,
) -> list[BacktestPrediction]:
    rows: list[BacktestPrediction] = []

    for prediction in prediction_rows:
        outcome = outcomes.get(prediction.player_id)
        market_price = closing_prices.get((prediction.player_id, prediction.market_type))
        closing_probability = (
            market_price.comparison_probability if market_price is not None else None
        )
        rows.append(
            BacktestPrediction(
                tournament_id=prediction.tournament_id,
                player_id=prediction.player_id,
                market_type=prediction.market_type,
                as_of=as_of,
                probability=prediction.probability,
                fair_american_odds=prediction.fair_american_odds,
                actual_outcome=actual_outcome(prediction.market_type, outcome),
                finish_position=outcome.position_numeric if outcome is not None else None,
                closing_american_odds=(
                    market_price.american_odds if market_price is not None else None
                ),
                closing_line_value=(
                    _round_metric(prediction.probability - closing_probability)
                    if closing_probability is not None
                    else None
                ),
            )
        )

    return rows


def actual_outcome(market_type: MarketType, outcome: PlayerOutcome | None) -> bool | None:
    if outcome is None:
        return None

    if market_type == "make_cut":
        if outcome.made_cut is not None:
            return outcome.made_cut
        return False if outcome.withdrawn or outcome.disqualified else None

    if market_type == "miss_cut":
        if outcome.made_cut is not None:
            return not outcome.made_cut
        return True if outcome.withdrawn or outcome.disqualified else None

    if outcome.position_numeric is None:
        return False if outcome.withdrawn or outcome.disqualified else None

    if market_type == "outright":
        return outcome.position_numeric == 1
    if market_type == "top_5":
        return outcome.position_numeric <= 5
    if market_type == "top_10":
        return outcome.position_numeric <= 10
    if market_type == "top_20":
        return outcome.position_numeric <= 20

    raise ValueError(f"Unsupported market type: {market_type}")


def build_evaluations(
    *,
    predictions: list[BacktestPrediction],
    calibration_bins: int,
) -> list[EvaluationMetric]:
    known = [row for row in predictions if row.actual_outcome is not None]
    if len(known) == 0:
        return []

    evaluations: list[EvaluationMetric] = []
    evaluations.append(_metric_for_rows(scope="overall", rows=known, total_count=len(predictions)))

    rows_by_market: dict[MarketType, list[BacktestPrediction]] = defaultdict(list)
    total_by_market: dict[MarketType, int] = defaultdict(int)
    rows_by_tournament_market: dict[tuple[str, MarketType], list[BacktestPrediction]] = defaultdict(
        list
    )
    total_by_tournament_market: dict[tuple[str, MarketType], int] = defaultdict(int)

    for row in predictions:
        total_by_market[row.market_type] += 1
        total_by_tournament_market[(row.tournament_id, row.market_type)] += 1
        if row.actual_outcome is None:
            continue
        rows_by_market[row.market_type].append(row)
        rows_by_tournament_market[(row.tournament_id, row.market_type)].append(row)

    for market_type in sorted(rows_by_market):
        market_rows = rows_by_market[market_type]
        evaluations.append(
            _metric_for_rows(
                scope="market",
                rows=market_rows,
                total_count=total_by_market[market_type],
                market_type=market_type,
            )
        )
        evaluations.extend(
            _decile_metrics(
                market_type=market_type,
                rows=market_rows,
                calibration_bins=calibration_bins,
            )
        )

    for (tournament_id, market_type), rows in sorted(rows_by_tournament_market.items()):
        evaluations.append(
            _metric_for_rows(
                scope="tournament",
                rows=rows,
                total_count=total_by_tournament_market[(tournament_id, market_type)],
                market_type=market_type,
                tournament_id=tournament_id,
            )
        )

    return evaluations


def _metric_scores(rows: list[BacktestPrediction]) -> tuple[float, float]:
    probabilities = [row.probability for row in rows]
    outcomes = [1.0 if row.actual_outcome else 0.0 for row in rows]

    return (
        _round_metric(
            mean(
                (probability - outcome) ** 2
                for probability, outcome in zip(probabilities, outcomes, strict=True)
            )
        ),
        _round_metric(
            mean(
                _binary_log_loss(probability, outcome)
                for probability, outcome in zip(probabilities, outcomes, strict=True)
            )
        ),
    )


def _metric_for_rows(
    *,
    scope: str,
    rows: list[BacktestPrediction],
    total_count: int,
    market_type: MarketType | None = None,
    tournament_id: str | None = None,
    extra_metrics: dict[str, Any] | None = None,
) -> EvaluationMetric:
    if len(rows) == 0:
        raise ValueError("Cannot evaluate an empty row set")

    probabilities = [row.probability for row in rows]
    outcomes = [1.0 if row.actual_outcome else 0.0 for row in rows]
    closing_line_values = [
        row.closing_line_value for row in rows if row.closing_line_value is not None
    ]
    calibration_error, calibration_bins = calibration_summary(rows)
    brier_score, log_loss = _metric_scores(rows)
    metrics = {
        "averageProbability": _round_metric(mean(probabilities)),
        "calibrationBins": calibration_bins,
        "knownOutcomeCount": len(rows),
        "outcomeRate": _round_metric(mean(outcomes)),
        "predictionCount": total_count,
        "probabilityDrift": _round_metric(mean(outcomes) - mean(probabilities)),
        **(extra_metrics or {}),
    }

    return EvaluationMetric(
        scope=scope,
        market_type=market_type,
        tournament_id=tournament_id,
        brier_score=brier_score,
        log_loss=log_loss,
        calibration_error=calibration_error,
        coverage=_round_metric(len(rows) / total_count) if total_count > 0 else 0,
        average_closing_line_value=(
            _round_metric(mean(closing_line_values)) if closing_line_values else None
        ),
        metrics=metrics,
    )


def calibration_summary(
    rows: list[BacktestPrediction],
    *,
    bin_count: int = DEFAULT_CALIBRATION_BINS,
) -> tuple[float | None, list[dict[str, Any]]]:
    if len(rows) == 0:
        return None, []

    sorted_rows = sorted(rows, key=lambda row: row.probability)
    bins: list[dict[str, Any]] = []

    for index in range(bin_count):
        start = math.floor(index * len(sorted_rows) / bin_count)
        end = math.floor((index + 1) * len(sorted_rows) / bin_count)
        bin_rows = sorted_rows[start:end]
        if len(bin_rows) == 0:
            continue

        average_probability = mean(row.probability for row in bin_rows)
        outcome_rate = mean(1.0 if row.actual_outcome else 0.0 for row in bin_rows)
        bins.append(
            {
                "averageProbability": _round_metric(average_probability),
                "count": len(bin_rows),
                "endProbability": _round_metric(bin_rows[-1].probability),
                "outcomeRate": _round_metric(outcome_rate),
                "startProbability": _round_metric(bin_rows[0].probability),
            }
        )

    if len(bins) == 0:
        return None, []

    weighted_error = sum(
        abs(bin_row["averageProbability"] - bin_row["outcomeRate"]) * bin_row["count"]
        for bin_row in bins
    ) / len(rows)

    return _round_metric(weighted_error), bins


def _decile_metrics(
    *,
    market_type: MarketType,
    rows: list[BacktestPrediction],
    calibration_bins: int,
) -> list[EvaluationMetric]:
    sorted_rows = sorted(rows, key=lambda row: row.probability)
    metrics: list[EvaluationMetric] = []

    for index in range(calibration_bins):
        start = math.floor(index * len(sorted_rows) / calibration_bins)
        end = math.floor((index + 1) * len(sorted_rows) / calibration_bins)
        bin_rows = sorted_rows[start:end]
        if len(bin_rows) == 0:
            continue
        metrics.append(
            _metric_for_rows(
                scope="decile",
                rows=bin_rows,
                total_count=len(rows),
                market_type=market_type,
                extra_metrics={
                    "bin": index + 1,
                    "binCount": calibration_bins,
                    "endProbability": _round_metric(bin_rows[-1].probability),
                    "startProbability": _round_metric(bin_rows[0].probability),
                },
            )
        )

    return metrics


def _load_backtest_targets(
    connection: psycopg.Connection[Any],
    options: RunBacktestOptions,
) -> list[BacktestTarget]:
    conditions = [
        "t.status = 'completed'",
        "t.season between %s and %s",
        "coalesce(fc.field_entry_count, 0) > 0",
        "coalesce(rc.result_count, 0) > 0",
    ]
    params: list[Any] = [options.from_season, options.to_season]

    if options.tournament_ids:
        placeholders = ",".join(["%s::uuid"] * len(options.tournament_ids))
        conditions.append(f"t.id in ({placeholders})")
        params.extend(options.tournament_ids)

    if options.tournament_source_ids:
        placeholders = ",".join(["%s"] * len(options.tournament_source_ids))
        conditions.append(f"sem.source_entity_id in ({placeholders})")
        params.extend(options.tournament_source_ids)

    rows = connection.execute(
        f"""
            with field_counts as (
              select
                tournament_id,
                count(distinct player_id)::int as field_entry_count
              from field_entries
              where status in ('entered', 'qualified', 'alternate')
              group by tournament_id
            ),
            result_counts as (
              select
                tournament_id,
                count(distinct player_id)::int as result_count
              from tournament_results
              group by tournament_id
            ),
            market_counts as (
              select
                tournament_id,
                count(distinct id)::int as market_count
              from markets
              group by tournament_id
            )
            select
              t.id::text as id,
              sem.source_entity_id,
              t.name,
              t.season,
              t.starts_on,
              t.ends_on,
              fc.field_entry_count,
              rc.result_count,
              coalesce(mc.market_count, 0)::int as market_count
            from tournaments t
            left join source_entity_mappings sem
              on sem.source = 'balldontlie'
             and sem.entity_type = 'tournament'
             and sem.canonical_id = t.id
            left join field_counts fc on fc.tournament_id = t.id
            left join result_counts rc on rc.tournament_id = t.id
            left join market_counts mc on mc.tournament_id = t.id
            where {" and ".join(conditions)}
            order by t.starts_on asc, t.id
        """,
        tuple(params),
    ).fetchall()

    targets = [
        BacktestTarget(
            id=row["id"],
            source_entity_id=row["source_entity_id"],
            name=row["name"],
            season=row["season"],
            starts_on=_parse_date(row["starts_on"]),
            ends_on=_parse_date(row["ends_on"]),
            field_entry_count=row["field_entry_count"],
            result_count=row["result_count"],
            market_count=row["market_count"],
        )
        for row in rows
    ]

    if len(targets) < MIN_COMPLETED_TOURNAMENTS:
        raise ValueError("No completed tournaments have field entries and results")

    return targets


def _load_player_outcomes(
    connection: psycopg.Connection[Any],
    tournament_id: str,
) -> dict[str, PlayerOutcome]:
    rows = connection.execute(
        """
            select
              player_id::text as player_id,
              made_cut,
              position_numeric,
              withdrawn,
              disqualified
            from tournament_results
            where tournament_id = %s::uuid
        """,
        (tournament_id,),
    ).fetchall()

    return {
        row["player_id"]: PlayerOutcome(
            made_cut=row["made_cut"],
            position_numeric=row["position_numeric"],
            withdrawn=row["withdrawn"],
            disqualified=row["disqualified"],
        )
        for row in rows
    }


def _load_closing_market_prices(
    connection: psycopg.Connection[Any],
    *,
    tournament_id: str,
    market_types: tuple[MarketType, ...],
    closing_cutoff: datetime,
) -> dict[tuple[str, MarketType], MarketPrice]:
    if len(market_types) == 0:
        return {}

    placeholders = ",".join(["%s::market_type"] * len(market_types))
    rows = connection.execute(
        f"""
            select distinct on (m.player_id, m.market_type)
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
            inner join odds_snapshots os on os.market_id = m.id
            left join raw_snapshot_records rsr on rsr.snapshot_key = os.raw_snapshot_key
            where m.tournament_id = %s::uuid
              and m.market_type in ({placeholders})
              and os.captured_at <= %s
            order by m.player_id, m.market_type, os.captured_at desc, os.id desc
        """,
        (tournament_id, *market_types, closing_cutoff),
    ).fetchall()

    prices = [
        MarketPrice(
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
        for row in rows
    ]

    return {(price.player_id, price.market_type): price for price in prices}


def _upsert_backtest(
    connection: psycopg.Connection[Any],
    *,
    calibration: dict[str, Any],
    feature_set_id: str | None,
    input_hash: str,
    manifest: dict[str, Any],
    metrics: dict[str, Any],
    options: RunBacktestOptions,
    targets: list[BacktestTarget],
) -> str:
    existing = connection.execute(
        """
            select id::text as id
            from model_backtests
            where model_name = %s
              and model_version = %s
              and metrics->>'inputHash' = %s
            order by created_at desc
            limit 1
        """,
        (MODEL_NAME, MODEL_VERSION, input_hash),
    ).fetchone()

    if existing is not None:
        connection.execute(
            """
                update model_backtests
                set feature_set_id = %s::uuid,
                    feature_set_version = %s,
                    training_window_start = %s,
                    training_window_end = %s,
                    test_window_start = %s,
                    test_window_end = %s,
                    market_types = %s,
                    metrics = %s,
                    calibration = %s,
                    status = 'complete'
                where id = %s::uuid
            """,
            (
                feature_set_id,
                options.feature_set_version,
                datetime.combine(min(target.starts_on for target in targets), time.min, tzinfo=UTC),
                datetime.combine(max(target.starts_on for target in targets), time.min, tzinfo=UTC),
                datetime.combine(min(target.starts_on for target in targets), time.min, tzinfo=UTC),
                datetime.combine(max(target.ends_on for target in targets), time.max, tzinfo=UTC),
                Jsonb(list(options.market_types)),
                Jsonb(metrics),
                Jsonb(calibration),
                existing["id"],
            ),
        )
        return existing["id"]

    row = connection.execute(
        """
            insert into model_backtests (
              model_name,
              model_version,
              feature_set_id,
              feature_set_version,
              training_window_start,
              training_window_end,
              test_window_start,
              test_window_end,
              market_types,
              metrics,
              calibration,
              status
            )
            values (%s, %s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, 'complete')
            returning id::text
        """,
        (
            MODEL_NAME,
            MODEL_VERSION,
            feature_set_id,
            options.feature_set_version,
            datetime.combine(min(target.starts_on for target in targets), time.min, tzinfo=UTC),
            datetime.combine(max(target.starts_on for target in targets), time.min, tzinfo=UTC),
            datetime.combine(min(target.starts_on for target in targets), time.min, tzinfo=UTC),
            datetime.combine(max(target.ends_on for target in targets), time.max, tzinfo=UTC),
            Jsonb(list(options.market_types)),
            Jsonb(metrics),
            Jsonb(calibration),
        ),
    ).fetchone()

    if row is None:
        raise RuntimeError("Model backtest insert failed")

    return row["id"]


def _replace_backtest_predictions(
    connection: psycopg.Connection[Any],
    *,
    backtest_id: str,
    rows: list[BacktestPrediction],
) -> None:
    connection.execute(
        "delete from model_backtest_predictions where model_backtest_id = %s::uuid",
        (backtest_id,),
    )
    if len(rows) == 0:
        return

    payload = [
        (
            backtest_id,
            row.tournament_id,
            row.player_id,
            row.market_type,
            row.as_of,
            _decimal(row.probability),
            row.fair_american_odds,
            row.actual_outcome,
            row.finish_position,
            row.closing_american_odds,
            _decimal(row.closing_line_value),
        )
        for row in rows
    ]

    with connection.cursor() as cursor:
        cursor.executemany(
            """
                insert into model_backtest_predictions (
                  model_backtest_id,
                  tournament_id,
                  player_id,
                  market_type,
                  as_of,
                  probability,
                  fair_american_odds,
                  actual_outcome,
                  finish_position,
                  closing_american_odds,
                  closing_line_value
                )
                values (
                  %s::uuid, %s::uuid, %s::uuid, %s::market_type, %s, %s, %s,
                  %s, %s, %s, %s
                )
            """,
            payload,
        )


def _replace_evaluations(
    connection: psycopg.Connection[Any],
    *,
    backtest_id: str,
    rows: list[EvaluationMetric],
) -> None:
    connection.execute(
        "delete from model_evaluations where model_backtest_id = %s::uuid",
        (backtest_id,),
    )
    if len(rows) == 0:
        return

    payload = [
        (
            backtest_id,
            row.scope,
            row.market_type,
            row.tournament_id,
            _decimal(row.brier_score),
            _decimal(row.log_loss),
            _decimal(row.calibration_error),
            _decimal(row.coverage),
            _decimal(row.average_closing_line_value),
            Jsonb(row.metrics),
        )
        for row in rows
    ]

    with connection.cursor() as cursor:
        cursor.executemany(
            """
                insert into model_evaluations (
                  model_backtest_id,
                  scope,
                  market_type,
                  tournament_id,
                  brier_score,
                  log_loss,
                  calibration_error,
                  coverage,
                  average_closing_line_value,
                  metrics
                )
                values (
                  %s::uuid, %s, %s::market_type, %s::uuid, %s, %s, %s, %s, %s, %s
                )
            """,
            payload,
        )


def _backtest_metrics(
    *,
    evaluations: list[EvaluationMetric],
    input_hash: str,
    manifest: dict[str, Any],
    predictions: list[BacktestPrediction],
) -> dict[str, Any]:
    overall = next((row for row in evaluations if row.scope == "overall"), None)

    return {
        "inputHash": input_hash,
        "manifest": manifest,
        "rowCounts": {
            "evaluations": len(evaluations),
            "knownOutcomePredictions": sum(
                1 for row in predictions if row.actual_outcome is not None
            ),
            "predictions": len(predictions),
            "pricedClosingPredictions": sum(
                1 for row in predictions if row.closing_line_value is not None
            ),
        },
        "summary": {
            "averageClosingLineValue": (
                overall.average_closing_line_value if overall is not None else None
            ),
            "brierScore": overall.brier_score if overall is not None else None,
            "calibrationError": overall.calibration_error if overall is not None else None,
            "coverage": overall.coverage if overall is not None else 0,
            "logLoss": overall.log_loss if overall is not None else None,
        },
    }


def _calibration_payload(evaluations: list[EvaluationMetric]) -> dict[str, Any]:
    return {
        "markets": {
            row.market_type: row.metrics.get("calibrationBins", [])
            for row in evaluations
            if row.scope == "market" and row.market_type is not None
        },
        "overall": next(
            (
                row.metrics.get("calibrationBins", [])
                for row in evaluations
                if row.scope == "overall"
            ),
            [],
        ),
    }


def _build_backtest_manifest(
    *,
    feature_set_ids: list[str],
    model_input_hashes: list[str],
    options: RunBacktestOptions,
    predictions: list[BacktestPrediction],
    targets: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "asOfPolicy": {
            "offsetDaysBeforeTournamentStart": options.as_of_offset_days,
            "targetTournamentRowsExcluded": True,
        },
        "backtestSchemaVersion": BACKTEST_SCHEMA_VERSION,
        "codeVersion": options.code_version,
        "config": {
            "calibrationBins": options.calibration_bins,
            "iterations": options.iterations,
            "marketTypes": list(options.market_types),
            "recentRoundWindow": options.recent_round_window,
            "seed": options.seed,
        },
        "featureSetIds": feature_set_ids,
        "modelInputHashes": model_input_hashes,
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "rowCounts": {
            "knownOutcomePredictions": sum(
                1 for row in predictions if row.actual_outcome is not None
            ),
            "predictions": len(predictions),
            "targets": len(targets),
        },
        "targetTournaments": targets,
    }


def _validate_options(options: RunBacktestOptions) -> None:
    if options.from_season > options.to_season:
        raise ValueError("from_season must be less than or equal to to_season")
    if options.as_of_offset_days < 0:
        raise ValueError("as_of_offset_days must be non-negative")
    if options.calibration_bins < 2:
        raise ValueError("calibration_bins must be at least 2")
    if options.recent_round_window < 1:
        raise ValueError("recent_round_window must be positive")
    if len(options.market_types) == 0:
        raise ValueError("At least one market type is required")


def _target_as_of(target: BacktestTarget, offset_days: int) -> datetime:
    return datetime.combine(
        target.starts_on - timedelta(days=offset_days),
        time(hour=12),
        tzinfo=UTC,
    )


def _target_to_result(target: BacktestTarget) -> dict[str, Any]:
    return {
        "fieldEntryCount": target.field_entry_count,
        "id": target.id,
        "marketCount": target.market_count,
        "name": target.name,
        "resultCount": target.result_count,
        "season": target.season,
        "sourceEntityId": target.source_entity_id,
        "startsOn": target.starts_on.isoformat(),
    }


def _binary_log_loss(probability: float, outcome: float) -> float:
    bounded = min(1 - EPSILON, max(EPSILON, probability))
    return -(outcome * math.log(bounded) + (1 - outcome) * math.log(1 - bounded))


def _round_metric(value: float) -> float:
    return round(float(value), 6)


def _decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None

    return Decimal(str(round(value, 6)))


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    return float(value)


def _parse_date(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()

    return date.fromisoformat(str(value))


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _to_iso(value: datetime) -> str:
    return _as_utc(value).isoformat().replace("+00:00", "Z")
