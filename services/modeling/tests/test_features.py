from __future__ import annotations

from datetime import UTC, date, datetime

import pytest

from pgatour_ai_modeling.features import (
    FieldPlayer,
    RoundStatRow,
    compute_player_features,
    parse_datetime,
    stable_hash,
)


def test_stable_hash_is_order_independent_for_objects() -> None:
    left = stable_hash({"b": 2, "a": {"d": 4, "c": 3}})
    right = stable_hash({"a": {"c": 3, "d": 4}, "b": 2})

    assert left == right


def test_compute_player_features_preserves_missing_stats_as_none() -> None:
    field_players = [
        FieldPlayer(
            player_id="00000000-0000-0000-0000-000000000001",
            first_name="No",
            last_name="History",
            status="entered",
            seed=None,
        )
    ]

    rows = compute_player_features(
        field_players=field_players,
        round_stats=[],
        recent_round_window=24,
        target_course_id="11111111-1111-1111-1111-111111111111",
    )

    assert len(rows) == 1
    assert rows[0].long_term_sg_total is None
    assert rows[0].recent_sg_total is None
    assert rows[0].volatility is None
    assert rows[0].course_fit is None
    assert rows[0].field_strength_adjusted is None
    assert rows[0].features["missingFeatures"] == [
        "long_term_sg_total",
        "recent_sg_total",
        "volatility",
        "course_fit",
    ]


def test_compute_player_features_uses_recent_window_and_field_average() -> None:
    target_course_id = "11111111-1111-1111-1111-111111111111"
    field_players = [
        FieldPlayer(
            player_id="00000000-0000-0000-0000-000000000001",
            first_name="Alice",
            last_name="Player",
            status="entered",
            seed=1,
        ),
        FieldPlayer(
            player_id="00000000-0000-0000-0000-000000000002",
            first_name="Bob",
            last_name="Player",
            status="entered",
            seed=2,
        ),
    ]
    round_stats = [
        _round_stat(
            id="a1",
            player_id=field_players[0].player_id,
            tournament_starts_on=date(2026, 1, 1),
            round_number=1,
            sg_total=1.0,
            course_id=target_course_id,
        ),
        _round_stat(
            id="a2",
            player_id=field_players[0].player_id,
            tournament_starts_on=date(2026, 1, 2),
            round_number=1,
            sg_total=2.0,
            course_id=None,
        ),
        _round_stat(
            id="a3",
            player_id=field_players[0].player_id,
            tournament_starts_on=date(2026, 1, 3),
            round_number=1,
            sg_total=-1.0,
            course_id=None,
        ),
        _round_stat(
            id="b1",
            player_id=field_players[1].player_id,
            tournament_starts_on=date(2026, 1, 1),
            round_number=1,
            sg_total=0.0,
            course_id=None,
        ),
    ]

    rows = compute_player_features(
        field_players=field_players,
        round_stats=round_stats,
        recent_round_window=2,
        target_course_id=target_course_id,
    )
    alice, bob = rows

    assert alice.long_term_sg_total == pytest.approx(2 / 3)
    assert alice.recent_sg_total == pytest.approx(0.5)
    assert alice.course_fit == pytest.approx(1 / 3)
    assert alice.field_strength_adjusted == pytest.approx(1 / 3)
    assert alice.rounds_count == 3
    assert bob.long_term_sg_total == 0
    assert bob.course_fit is None
    assert bob.field_strength_adjusted == pytest.approx(-1 / 3)


def test_parse_datetime_defaults_timezone_to_utc() -> None:
    parsed = parse_datetime("2026-06-08T12:00:00")

    assert parsed.tzinfo == UTC
    assert parsed.isoformat() == "2026-06-08T12:00:00+00:00"


def _round_stat(
    *,
    id: str,
    player_id: str,
    tournament_starts_on: date,
    round_number: int,
    sg_total: float,
    course_id: str | None,
) -> RoundStatRow:
    return RoundStatRow(
        id=id,
        player_id=player_id,
        tournament_id="22222222-2222-2222-2222-222222222222",
        course_id=course_id,
        round_number=round_number,
        tournament_starts_on=tournament_starts_on,
        captured_at=datetime(2026, 6, 1, tzinfo=UTC),
        sg_total=sg_total,
        sg_off_tee=sg_total / 4,
        sg_approach=sg_total / 4,
        sg_around_green=sg_total / 4,
        sg_putting=sg_total / 4,
    )
