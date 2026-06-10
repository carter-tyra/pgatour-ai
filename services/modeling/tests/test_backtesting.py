from __future__ import annotations

from datetime import UTC, datetime

import pytest

from pgatour_ai_modeling.backtesting import (
    BacktestPrediction,
    PlayerOutcome,
    actual_outcome,
    build_evaluations,
    calibration_summary,
)


def test_actual_outcome_maps_supported_markets() -> None:
    winner = PlayerOutcome(
        made_cut=True,
        position_numeric=1,
        withdrawn=False,
        disqualified=False,
    )
    missed_cut = PlayerOutcome(
        made_cut=False,
        position_numeric=None,
        withdrawn=False,
        disqualified=False,
    )

    assert actual_outcome("outright", winner) is True
    assert actual_outcome("top_5", winner) is True
    assert actual_outcome("top_10", winner) is True
    assert actual_outcome("top_20", winner) is True
    assert actual_outcome("make_cut", winner) is True
    assert actual_outcome("miss_cut", winner) is False
    assert actual_outcome("make_cut", missed_cut) is False
    assert actual_outcome("miss_cut", missed_cut) is True
    assert actual_outcome("top_20", missed_cut) is None


def test_build_evaluations_scores_overall_market_tournament_and_deciles() -> None:
    rows = [
        _prediction("p1", "top_20", 0.8, True, closing_line_value=0.1),
        _prediction("p2", "top_20", 0.4, False, closing_line_value=-0.05),
        _prediction("p3", "make_cut", 0.7, True, closing_line_value=None),
        _prediction("p4", "make_cut", 0.3, False, closing_line_value=None),
        _prediction("p5", "top_20", 0.5, None, closing_line_value=None),
    ]

    evaluations = build_evaluations(predictions=rows, calibration_bins=2)
    overall = next(row for row in evaluations if row.scope == "overall")
    top_20 = next(
        row for row in evaluations if row.scope == "market" and row.market_type == "top_20"
    )

    assert overall.coverage == pytest.approx(0.8)
    assert overall.brier_score == pytest.approx(0.095)
    assert overall.log_loss == pytest.approx(0.361829, abs=0.000001)
    assert overall.average_closing_line_value == pytest.approx(0.025)
    assert top_20.coverage == pytest.approx(2 / 3)
    assert any(row.scope == "tournament" for row in evaluations)
    assert any(row.scope == "decile" and row.market_type == "top_20" for row in evaluations)


def test_calibration_summary_returns_weighted_absolute_error() -> None:
    rows = [
        _prediction("p1", "top_20", 0.1, False),
        _prediction("p2", "top_20", 0.2, False),
        _prediction("p3", "top_20", 0.8, True),
        _prediction("p4", "top_20", 0.9, True),
    ]

    error, bins = calibration_summary(rows, bin_count=2)

    assert error == pytest.approx(0.15)
    assert bins == [
        {
            "averageProbability": 0.15,
            "count": 2,
            "endProbability": 0.2,
            "outcomeRate": 0.0,
            "startProbability": 0.1,
        },
        {
            "averageProbability": 0.85,
            "count": 2,
            "endProbability": 0.9,
            "outcomeRate": 1.0,
            "startProbability": 0.8,
        },
    ]


def _prediction(
    player_id: str,
    market_type: str,
    probability: float,
    actual: bool | None,
    *,
    closing_line_value: float | None = None,
) -> BacktestPrediction:
    return BacktestPrediction(
        tournament_id="11111111-1111-1111-1111-111111111111",
        player_id=player_id,
        market_type=market_type,  # type: ignore[arg-type]
        as_of=datetime(2026, 6, 3, 12, tzinfo=UTC),
        probability=probability,
        fair_american_odds=100,
        actual_outcome=actual,
        finish_position=1 if actual else None,
        closing_american_odds=200 if closing_line_value is not None else None,
        closing_line_value=closing_line_value,
    )
