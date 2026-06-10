from __future__ import annotations

from datetime import UTC, datetime

import pytest

from pgatour_ai_modeling.inference import (
    FeatureRow,
    MarketPrice,
    PlayerModelInput,
    SimulationResult,
    build_player_model_inputs,
    build_prediction_rows,
    fair_american_odds,
    normalize_market_types,
    simulate_market_probabilities,
)


def test_normalize_market_types_deduplicates_and_rejects_unknown() -> None:
    assert normalize_market_types("top_20, top_10, top_20") == ("top_20", "top_10")

    with pytest.raises(ValueError, match="Unsupported market type"):
        normalize_market_types("top_20,first_round_leader")


def test_fair_american_odds_matches_domain_policy() -> None:
    assert fair_american_odds(0.25) == 300
    assert fair_american_odds(0.60) == -150


def test_build_player_model_inputs_preserves_missingness_as_risk() -> None:
    rows = [
        _feature_row(
            player_id="00000000-0000-0000-0000-000000000001",
            long_term_sg_total=None,
            recent_sg_total=None,
            volatility=None,
            rounds_count=0,
            missing_features=("long_term_sg_total", "recent_sg_total", "volatility"),
        ),
        _feature_row(
            player_id="00000000-0000-0000-0000-000000000002",
            long_term_sg_total=1.0,
            recent_sg_total=1.2,
            volatility=0.7,
            rounds_count=24,
            missing_features=(),
        ),
    ]

    inputs = build_player_model_inputs(rows)
    missing_player = inputs[0]
    strong_player = inputs[1]

    assert missing_player.confidence == "low"
    assert "Missing long-term SG" in missing_player.risks
    assert missing_player.skill_mean < strong_player.skill_mean
    assert missing_player.source_features["longTermSgTotal"] is None


def test_simulate_market_probabilities_are_rank_consistent() -> None:
    players = [
        PlayerModelInput(
            player_id=f"player-{index}",
            player_name=f"Player {index}",
            tournament_id="11111111-1111-1111-1111-111111111111",
            skill_mean=1.2 if index == 0 else 0,
            performance_sigma=1.0,
            uncertainty=0.1,
            confidence="medium",
            rounds_count=20,
            missing_features=(),
            drivers=(),
            risks=(),
            source_features={},
        )
        for index in range(30)
    ]

    result = simulate_market_probabilities(
        players,
        market_types=("outright", "top_5", "top_10", "top_20", "make_cut"),
        iterations=2_000,
        seed=11,
    )
    favorite_id = players[0].player_id

    assert sum(result.probabilities["outright"].values()) == pytest.approx(1)
    assert (
        result.probabilities["top_20"][favorite_id]
        >= result.probabilities["top_10"][favorite_id]
    )
    assert (
        result.probabilities["top_10"][favorite_id]
        >= result.probabilities["top_5"][favorite_id]
    )
    assert (
        result.probabilities["make_cut"][favorite_id]
        >= result.probabilities["top_20"][favorite_id]
    )
    assert result.mean_ranks[favorite_id] < result.mean_ranks[players[-1].player_id]


def test_build_prediction_rows_adds_market_edge_and_market_rank() -> None:
    player = PlayerModelInput(
        player_id="00000000-0000-0000-0000-000000000001",
        player_name="Test Player",
        tournament_id="11111111-1111-1111-1111-111111111111",
        skill_mean=1.0,
        performance_sigma=1.0,
        uncertainty=0.12,
        confidence="medium",
        rounds_count=20,
        missing_features=(),
        drivers=("Positive recent SG",),
        risks=(),
        source_features={"longTermSgTotal": 0.5},
    )
    market_price = MarketPrice(
        market_id="22222222-2222-2222-2222-222222222222",
        player_id=player.player_id,
        market_type="top_20",
        american_odds=300,
        implied_probability=0.25,
        no_vig_probability=0.24,
        captured_at=datetime(2026, 6, 8, tzinfo=UTC),
        raw_snapshot_key="balldontlie/2026-06-08/v1_futures/test.json",
        raw_snapshot_record_id="33333333-3333-3333-3333-333333333333",
    )

    rows = build_prediction_rows(
        player_inputs=[player],
        simulation=SimulationResult(
            probabilities={"top_20": {player.player_id: 0.42}},
            mean_ranks={player.player_id: 14.3},
            cutline_position=1,
        ),
        market_prices={(player.player_id, "top_20"): market_price},
        market_types=("top_20",),
    )

    assert len(rows) == 1
    assert rows[0].market_id == market_price.market_id
    assert rows[0].model_edge == pytest.approx(0.18)
    assert rows[0].rank == 1
    assert rows[0].simulation_summary["meanRank"] == 14.3


def _feature_row(
    *,
    player_id: str,
    long_term_sg_total: float | None,
    recent_sg_total: float | None,
    volatility: float | None,
    rounds_count: int,
    missing_features: tuple[str, ...],
) -> FeatureRow:
    return FeatureRow(
        feature_set_id="33333333-3333-3333-3333-333333333333",
        tournament_id="11111111-1111-1111-1111-111111111111",
        player_id=player_id,
        player_name="Test Player",
        as_of=datetime(2026, 6, 8, tzinfo=UTC),
        long_term_sg_total=long_term_sg_total,
        recent_sg_total=recent_sg_total,
        sg_off_tee=None,
        sg_approach=None,
        sg_around_green=None,
        sg_putting=None,
        volatility=volatility,
        rounds_count=rounds_count,
        field_strength_adjusted=None,
        course_fit=None,
        features={
            "coverage": {"courseRounds": 0, "historyRounds": rounds_count},
            "missingFeatures": list(missing_features),
        },
    )
