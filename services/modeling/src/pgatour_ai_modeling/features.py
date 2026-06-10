from __future__ import annotations

import hashlib
import json
import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from decimal import Decimal
from pathlib import Path
from statistics import mean, pstdev
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/pgatour_ai"
FEATURE_SET_NAME = "player-baseline-v0"
FEATURE_SET_VERSION = "0.1.0"
ACTIVE_FIELD_STATUSES = ("entered", "qualified", "alternate")
ROUND_STAT_COLUMNS = (
    "sg_total",
    "sg_off_tee",
    "sg_approach",
    "sg_around_green",
    "sg_putting",
)
SOURCE_ENDPOINTS = (
    "v1/tournament_results",
    "v1/tournament_course_stats",
    "v1/course_holes",
    "v1/player_round_results",
    "v1/player_round_stats",
    "v1/player_season_stats",
    "v1/player_scorecards",
)


@dataclass(frozen=True)
class GenerateFeaturesOptions:
    tournament_id: str | None = None
    tournament_source_id: str | None = None
    as_of: datetime | None = None
    code_version: str = "local"
    feature_set_version: str = FEATURE_SET_VERSION
    recent_round_window: int = 24
    dry_run: bool = False


@dataclass(frozen=True)
class TournamentTarget:
    id: str
    source_entity_id: str | None
    name: str
    season: int
    starts_on: date
    ends_on: date
    course_id: str


@dataclass(frozen=True)
class FieldPlayer:
    player_id: str
    first_name: str
    last_name: str
    status: str
    seed: int | None

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


@dataclass(frozen=True)
class RoundStatRow:
    id: str
    player_id: str
    tournament_id: str
    course_id: str | None
    round_number: int
    tournament_starts_on: date
    captured_at: datetime
    sg_total: float | None
    sg_off_tee: float | None
    sg_approach: float | None
    sg_around_green: float | None
    sg_putting: float | None


@dataclass(frozen=True)
class PlayerFeature:
    player_id: str
    player_name: str
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


def parse_datetime(value: str | None) -> datetime:
    if value is None:
        return datetime.now(UTC)

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def stable_json_dumps(value: Any) -> str:
    return json.dumps(value, default=_json_default, separators=(",", ":"), sort_keys=True)


def stable_hash(value: Any) -> str:
    return hashlib.sha256(stable_json_dumps(value).encode("utf-8")).hexdigest()


def compute_player_features(
    *,
    field_players: list[FieldPlayer],
    round_stats: list[RoundStatRow],
    target_course_id: str,
    recent_round_window: int,
) -> list[PlayerFeature]:
    if recent_round_window < 1:
        raise ValueError("recent_round_window must be positive")

    rows_by_player: dict[str, list[RoundStatRow]] = defaultdict(list)
    for row in round_stats:
        rows_by_player[row.player_id].append(row)

    features: list[PlayerFeature] = []

    for player in field_players:
        player_rows = sorted(
            rows_by_player[player.player_id],
            key=lambda row: (row.tournament_starts_on, row.round_number, row.captured_at),
        )
        sg_total_values = _numeric_values(row.sg_total for row in player_rows)
        recent_rows = player_rows[-recent_round_window:]
        recent_sg_values = _numeric_values(row.sg_total for row in recent_rows)
        course_rows = [row for row in player_rows if row.course_id == target_course_id]
        course_sg_values = _numeric_values(row.sg_total for row in course_rows)

        long_term_sg_total = _mean_or_none(sg_total_values)
        course_average = _mean_or_none(course_sg_values)
        volatility = pstdev(sg_total_values) if len(sg_total_values) > 1 else None
        course_fit = (
            course_average - long_term_sg_total
            if course_average is not None and long_term_sg_total is not None
            else None
        )

        missing_features = []
        if long_term_sg_total is None:
            missing_features.append("long_term_sg_total")
        if len(recent_sg_values) == 0:
            missing_features.append("recent_sg_total")
        if volatility is None:
            missing_features.append("volatility")
        if course_fit is None:
            missing_features.append("course_fit")

        features.append(
            PlayerFeature(
                player_id=player.player_id,
                player_name=player.name,
                long_term_sg_total=long_term_sg_total,
                recent_sg_total=_mean_or_none(recent_sg_values),
                sg_off_tee=_mean_or_none(row.sg_off_tee for row in player_rows),
                sg_approach=_mean_or_none(row.sg_approach for row in player_rows),
                sg_around_green=_mean_or_none(row.sg_around_green for row in player_rows),
                sg_putting=_mean_or_none(row.sg_putting for row in player_rows),
                volatility=volatility,
                rounds_count=len(player_rows),
                field_strength_adjusted=None,
                course_fit=course_fit,
                features={
                    "coverage": {
                        "courseRounds": len(course_rows),
                        "historyRounds": len(player_rows),
                        "recentRoundWindow": recent_round_window,
                        "roundsWithSgTotal": len(sg_total_values),
                    },
                    "missingFeatures": missing_features,
                    "source": FEATURE_SET_NAME,
                },
            )
        )

    field_average = _mean_or_none(
        feature.long_term_sg_total for feature in features if feature.long_term_sg_total is not None
    )

    if field_average is None:
        return features

    adjusted_features: list[PlayerFeature] = []
    for feature in features:
        field_strength_adjusted = (
            feature.long_term_sg_total - field_average
            if feature.long_term_sg_total is not None
            else None
        )
        adjusted_features.append(
            PlayerFeature(
                player_id=feature.player_id,
                player_name=feature.player_name,
                long_term_sg_total=feature.long_term_sg_total,
                recent_sg_total=feature.recent_sg_total,
                sg_off_tee=feature.sg_off_tee,
                sg_approach=feature.sg_approach,
                sg_around_green=feature.sg_around_green,
                sg_putting=feature.sg_putting,
                volatility=feature.volatility,
                rounds_count=feature.rounds_count,
                field_strength_adjusted=field_strength_adjusted,
                course_fit=feature.course_fit,
                features={
                    **feature.features,
                    "fieldBaseline": {"longTermSgTotalAverage": field_average},
                },
            )
        )

    return adjusted_features


def generate_feature_set(options: GenerateFeaturesOptions) -> dict[str, Any]:
    load_workspace_env()
    database_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    as_of = options.as_of or datetime.now(UTC)

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        target = _resolve_target(
            connection,
            tournament_id=options.tournament_id,
            tournament_source_id=options.tournament_source_id,
        )
        field_players = _load_field_players(connection, target.id)
        if len(field_players) == 0:
            raise ValueError(f"{target.name} has no active field entries")

        round_stats = _load_round_stats(
            connection,
            player_ids=[player.player_id for player in field_players],
            target_starts_on=target.starts_on,
            as_of=as_of,
        )
        feature_rows = compute_player_features(
            field_players=field_players,
            round_stats=round_stats,
            recent_round_window=options.recent_round_window,
            target_course_id=target.course_id,
        )

        input_row_hash = _build_input_row_hash(
            target=target,
            field_players=field_players,
            round_stats=round_stats,
            as_of=as_of,
            recent_round_window=options.recent_round_window,
        )
        source_snapshot_summary = _load_source_snapshot_summary(connection, as_of)
        manifest = _build_manifest(
            target=target,
            as_of=as_of,
            code_version=options.code_version,
            feature_set_version=options.feature_set_version,
            field_players=field_players,
            round_stats=round_stats,
            feature_rows=feature_rows,
            input_row_hash=input_row_hash,
            source_snapshot_summary=source_snapshot_summary,
            recent_round_window=options.recent_round_window,
        )
        input_hash = stable_hash(manifest)

        feature_set_id: str | None = None
        if not options.dry_run:
            with connection.transaction():
                feature_set_id = _upsert_feature_set(
                    connection,
                    manifest=manifest,
                    input_hash=input_hash,
                    options=options,
                    as_of=as_of,
                    target=target,
                    row_count=len(feature_rows),
                )
                _upsert_player_features(
                    connection,
                    feature_set_id=feature_set_id,
                    tournament_id=target.id,
                    as_of=as_of,
                    rows=feature_rows,
                )

        rows_with_long_term = sum(1 for row in feature_rows if row.long_term_sg_total is not None)
        rows_with_course_fit = sum(1 for row in feature_rows if row.course_fit is not None)
        warnings = []
        if rows_with_long_term < len(feature_rows):
            warnings.append("Some field players have no pre-tournament SG history.")
        if rows_with_course_fit < len(feature_rows):
            warnings.append("Some field players have no target-course history.")

        return {
            "asOf": _to_iso(as_of),
            "dryRun": options.dry_run,
            "featureSetId": feature_set_id,
            "featureSetName": FEATURE_SET_NAME,
            "featureSetVersion": options.feature_set_version,
            "inputHash": input_hash,
            "rowCount": len(feature_rows),
            "rowsWithCourseFit": rows_with_course_fit,
            "rowsWithLongTermSgTotal": rows_with_long_term,
            "targetTournament": {
                "id": target.id,
                "name": target.name,
                "season": target.season,
                "sourceEntityId": target.source_entity_id,
                "startsOn": target.starts_on.isoformat(),
            },
            "warnings": warnings,
        }


def load_workspace_env() -> None:
    root = Path(__file__).resolve().parents[4]
    existing_keys = set(os.environ)

    for env_file in (root / ".env", root / ".env.local"):
        if not env_file.exists():
            continue

        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            parsed = _parse_env_line(raw_line)
            if parsed is None:
                continue

            key, value = parsed
            if key not in existing_keys:
                os.environ[key] = value


def _resolve_target(
    connection: psycopg.Connection[Any],
    *,
    tournament_id: str | None,
    tournament_source_id: str | None,
) -> TournamentTarget:
    if tournament_id is not None and tournament_source_id is not None:
        raise ValueError("Pass either tournament_id or tournament_source_id, not both")

    if tournament_id is not None:
        query = """
            select
              t.id::text as id,
              sem.source_entity_id,
              t.name,
              t.season,
              t.starts_on,
              t.ends_on,
              t.course_id::text as course_id
            from tournaments t
            left join source_entity_mappings sem
              on sem.source = 'balldontlie'
             and sem.entity_type = 'tournament'
             and sem.canonical_id = t.id
            where t.id = %s::uuid
            limit 1
        """
        params = (tournament_id,)
    elif tournament_source_id is not None:
        query = """
            select
              t.id::text as id,
              sem.source_entity_id,
              t.name,
              t.season,
              t.starts_on,
              t.ends_on,
              t.course_id::text as course_id
            from tournaments t
            inner join source_entity_mappings sem
              on sem.source = 'balldontlie'
             and sem.entity_type = 'tournament'
             and sem.canonical_id = t.id
            where sem.source_entity_id = %s
            limit 1
        """
        params = (tournament_source_id,)
    else:
        query = """
            select
              t.id::text as id,
              sem.source_entity_id,
              t.name,
              t.season,
              t.starts_on,
              t.ends_on,
              t.course_id::text as course_id
            from tournaments t
            left join source_entity_mappings sem
              on sem.source = 'balldontlie'
             and sem.entity_type = 'tournament'
             and sem.canonical_id = t.id
            where t.status in ('not_started', 'scheduled', 'in_progress')
            order by t.starts_on asc
            limit 1
        """
        params = ()

    row = connection.execute(query, params).fetchone()
    if row is None:
        raise ValueError("No target tournament found")

    return _target_from_row(row)


def _load_field_players(
    connection: psycopg.Connection[Any],
    tournament_id: str,
) -> list[FieldPlayer]:
    rows = connection.execute(
        """
            select
              fe.player_id::text as player_id,
              p.first_name,
              p.last_name,
              fe.status,
              fe.seed
            from field_entries fe
            inner join players p on p.id = fe.player_id
            where fe.tournament_id = %s::uuid
              and fe.status in ('entered', 'qualified', 'alternate')
            order by coalesce(fe.seed, 100000), p.last_name, p.first_name
        """,
        (tournament_id,),
    ).fetchall()

    return [
        FieldPlayer(
            player_id=row["player_id"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            status=row["status"],
            seed=row["seed"],
        )
        for row in rows
    ]


def _load_round_stats(
    connection: psycopg.Connection[Any],
    *,
    player_ids: list[str],
    target_starts_on: date,
    as_of: datetime,
) -> list[RoundStatRow]:
    if len(player_ids) == 0:
        return []

    placeholders = ",".join(["%s::uuid"] * len(player_ids))
    rows = connection.execute(
        f"""
            select
              prs.id::text as id,
              prs.player_id::text as player_id,
              prs.tournament_id::text as tournament_id,
              prr.course_id::text as course_id,
              prs.round_number,
              t.starts_on as tournament_starts_on,
              prs.captured_at,
              prs.sg_total,
              prs.sg_off_tee,
              prs.sg_approach,
              prs.sg_around_green,
              prs.sg_putting
            from player_round_stats prs
            inner join tournaments t on t.id = prs.tournament_id
            left join player_round_results prr
              on prr.tournament_id = prs.tournament_id
             and prr.player_id = prs.player_id
             and prr.round_number = prs.round_number
             and prr.source = prs.source
            where prs.player_id in ({placeholders})
              and t.starts_on < %s
              and prs.captured_at <= %s
            order by prs.player_id, t.starts_on, prs.round_number, prs.captured_at
        """,
        (*player_ids, target_starts_on.isoformat(), as_of),
    ).fetchall()

    return [
        RoundStatRow(
            id=row["id"],
            player_id=row["player_id"],
            tournament_id=row["tournament_id"],
            course_id=row["course_id"],
            round_number=row["round_number"],
            tournament_starts_on=_parse_date(row["tournament_starts_on"]),
            captured_at=_as_utc(row["captured_at"]),
            sg_total=_to_float(row["sg_total"]),
            sg_off_tee=_to_float(row["sg_off_tee"]),
            sg_approach=_to_float(row["sg_approach"]),
            sg_around_green=_to_float(row["sg_around_green"]),
            sg_putting=_to_float(row["sg_putting"]),
        )
        for row in rows
    ]


def _load_source_snapshot_summary(
    connection: psycopg.Connection[Any],
    as_of: datetime,
) -> list[dict[str, Any]]:
    placeholders = ",".join(["%s"] * len(SOURCE_ENDPOINTS))
    rows = connection.execute(
        f"""
            select
              endpoint,
              count(*)::int as count,
              max(captured_at) as latest_captured_at
            from raw_snapshot_records
            where source = 'balldontlie'
              and endpoint in ({placeholders})
              and captured_at <= %s
            group by endpoint
            order by endpoint
        """,
        (*SOURCE_ENDPOINTS, as_of),
    ).fetchall()

    return [
        {
            "count": row["count"],
            "endpoint": row["endpoint"],
            "latestCapturedAt": _to_iso(row["latest_captured_at"]),
        }
        for row in rows
    ]


def _build_input_row_hash(
    *,
    target: TournamentTarget,
    field_players: list[FieldPlayer],
    round_stats: list[RoundStatRow],
    as_of: datetime,
    recent_round_window: int,
) -> str:
    payload = {
        "asOf": _to_iso(as_of),
        "fieldPlayers": [
            {
                "playerId": player.player_id,
                "seed": player.seed,
                "status": player.status,
            }
            for player in field_players
        ],
        "recentRoundWindow": recent_round_window,
        "roundStats": [
            {
                "capturedAt": _to_iso(row.captured_at),
                "courseId": row.course_id,
                "id": row.id,
                "playerId": row.player_id,
                "roundNumber": row.round_number,
                "sgApproach": row.sg_approach,
                "sgAroundGreen": row.sg_around_green,
                "sgOffTee": row.sg_off_tee,
                "sgPutting": row.sg_putting,
                "sgTotal": row.sg_total,
                "tournamentId": row.tournament_id,
                "tournamentStartsOn": row.tournament_starts_on.isoformat(),
            }
            for row in round_stats
        ],
        "target": _target_to_manifest(target),
    }

    return stable_hash(payload)


def _build_manifest(
    *,
    target: TournamentTarget,
    as_of: datetime,
    code_version: str,
    feature_set_version: str,
    field_players: list[FieldPlayer],
    round_stats: list[RoundStatRow],
    feature_rows: list[PlayerFeature],
    input_row_hash: str,
    source_snapshot_summary: list[dict[str, Any]],
    recent_round_window: int,
) -> dict[str, Any]:
    captured_times = [row.captured_at for row in round_stats]
    starts_on_values = [row.tournament_starts_on for row in round_stats]

    return {
        "activeFieldStatuses": list(ACTIVE_FIELD_STATUSES),
        "asOf": _to_iso(as_of),
        "codeVersion": code_version,
        "featureColumns": [
            "long_term_sg_total",
            "recent_sg_total",
            "sg_off_tee",
            "sg_approach",
            "sg_around_green",
            "sg_putting",
            "volatility",
            "field_strength_adjusted",
            "course_fit",
        ],
        "featureSetName": FEATURE_SET_NAME,
        "featureSetVersion": feature_set_version,
        "inputRowHash": input_row_hash,
        "leakagePolicy": {
            "capturedAt": "source rows must have captured_at <= as_of",
            "tournamentStartsOn": (
                "historical rows must have tournament.starts_on < target.starts_on"
            ),
        },
        "recentRoundWindow": recent_round_window,
        "rowCounts": {
            "fieldPlayers": len(field_players),
            "modelPlayerFeatures": len(feature_rows),
            "playerRoundStats": len(round_stats),
            "playersWithCourseFit": sum(1 for row in feature_rows if row.course_fit is not None),
            "playersWithSgHistory": sum(
                1 for row in feature_rows if row.long_term_sg_total is not None
            ),
        },
        "sourceSnapshots": source_snapshot_summary,
        "targetTournament": _target_to_manifest(target),
        "trainingWindow": {
            "latestCapturedAt": _to_iso(max(captured_times)) if captured_times else None,
            "start": min(starts_on_values).isoformat() if starts_on_values else None,
            "end": target.starts_on.isoformat(),
        },
    }


def _upsert_feature_set(
    connection: psycopg.Connection[Any],
    *,
    manifest: dict[str, Any],
    input_hash: str,
    options: GenerateFeaturesOptions,
    as_of: datetime,
    target: TournamentTarget,
    row_count: int,
) -> str:
    training_start = _manifest_training_datetime(manifest, "start")
    training_end = datetime.combine(target.starts_on, time.min, tzinfo=UTC)
    generated_at = as_of

    row = connection.execute(
        """
            insert into model_feature_sets (
              feature_set_name,
              feature_set_version,
              code_version,
              input_hash,
              input_manifest,
              training_window_start,
              training_window_end,
              generated_at,
              row_count,
              status
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'complete')
            on conflict (feature_set_name, feature_set_version, input_hash) do nothing
            returning id::text
        """,
        (
            FEATURE_SET_NAME,
            options.feature_set_version,
            options.code_version,
            input_hash,
            Jsonb(manifest),
            training_start,
            training_end,
            generated_at,
            row_count,
        ),
    ).fetchone()

    if row is not None:
        return row["id"]

    existing = connection.execute(
        """
            select id::text as id
            from model_feature_sets
            where feature_set_name = %s
              and feature_set_version = %s
              and input_hash = %s
            limit 1
        """,
        (FEATURE_SET_NAME, options.feature_set_version, input_hash),
    ).fetchone()

    if existing is None:
        raise RuntimeError("Feature set insert failed and no existing feature set was found")

    return existing["id"]


def _upsert_player_features(
    connection: psycopg.Connection[Any],
    *,
    feature_set_id: str,
    tournament_id: str,
    as_of: datetime,
    rows: list[PlayerFeature],
) -> None:
    if len(rows) == 0:
        return

    payload = [
        (
            feature_set_id,
            tournament_id,
            row.player_id,
            as_of,
            _decimal(row.long_term_sg_total),
            _decimal(row.recent_sg_total),
            _decimal(row.sg_off_tee),
            _decimal(row.sg_approach),
            _decimal(row.sg_around_green),
            _decimal(row.sg_putting),
            _decimal(row.volatility),
            row.rounds_count,
            _decimal(row.field_strength_adjusted),
            _decimal(row.course_fit),
            Jsonb(row.features),
        )
        for row in rows
    ]

    with connection.cursor() as cursor:
        cursor.executemany(
            """
                insert into model_player_features (
                  feature_set_id,
                  tournament_id,
                  player_id,
                  as_of,
                  long_term_sg_total,
                  recent_sg_total,
                  sg_off_tee,
                  sg_approach,
                  sg_around_green,
                  sg_putting,
                  volatility,
                  rounds_count,
                  field_strength_adjusted,
                  course_fit,
                  features
                )
                values (
                  %s, %s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                on conflict (feature_set_id, tournament_id, player_id)
                do update set
                  as_of = excluded.as_of,
                  long_term_sg_total = excluded.long_term_sg_total,
                  recent_sg_total = excluded.recent_sg_total,
                  sg_off_tee = excluded.sg_off_tee,
                  sg_approach = excluded.sg_approach,
                  sg_around_green = excluded.sg_around_green,
                  sg_putting = excluded.sg_putting,
                  volatility = excluded.volatility,
                  rounds_count = excluded.rounds_count,
                  field_strength_adjusted = excluded.field_strength_adjusted,
                  course_fit = excluded.course_fit,
                  features = excluded.features
            """,
            payload,
        )


def _target_from_row(row: dict[str, Any]) -> TournamentTarget:
    return TournamentTarget(
        id=row["id"],
        source_entity_id=row["source_entity_id"],
        name=row["name"],
        season=row["season"],
        starts_on=_parse_date(row["starts_on"]),
        ends_on=_parse_date(row["ends_on"]),
        course_id=row["course_id"],
    )


def _target_to_manifest(target: TournamentTarget) -> dict[str, Any]:
    return {
        "courseId": target.course_id,
        "endsOn": target.ends_on.isoformat(),
        "id": target.id,
        "name": target.name,
        "season": target.season,
        "sourceEntityId": target.source_entity_id,
        "startsOn": target.starts_on.isoformat(),
    }


def _manifest_training_datetime(manifest: dict[str, Any], key: str) -> datetime | None:
    value = manifest["trainingWindow"].get(key)
    if value is None:
        return None

    return datetime.combine(date.fromisoformat(value), time.min, tzinfo=UTC)


def _numeric_values(values: Any) -> list[float]:
    return [float(value) for value in values if value is not None]


def _mean_or_none(values: Any) -> float | None:
    numeric_values = _numeric_values(values)
    if len(numeric_values) == 0:
        return None

    return mean(numeric_values)


def _decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None

    return Decimal(str(round(value, 4)))


def _parse_date(value: date | str) -> date:
    if isinstance(value, date):
        return value

    return date.fromisoformat(value)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    return float(value)


def _to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None

    return _as_utc(value).isoformat().replace("+00:00", "Z")


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return _to_iso(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)

    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _parse_env_line(raw_line: str) -> tuple[str, str] | None:
    line = raw_line.strip()
    if len(line) == 0 or line.startswith("#") or "=" not in line:
        return None
    if line.startswith("export "):
        line = line.removeprefix("export ").strip()

    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not key:
        return None
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        value = value[1:-1]

    return key, value
