from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class PlayerProjection:
    """Inputs needed for a first-pass tournament simulation."""

    player_id: str
    baseline_strokes_gained: float
    course_fit: float
    volatility: float


def simulate_top20_probability(
    player: PlayerProjection,
    field_size: int,
    iterations: int = 20_000,
    seed: int = 7,
) -> float:
    """Estimate a player's top-20 probability from a simple score distribution.

    This is a scaffold, not the final production model. It establishes the
    deterministic simulation contract used by app and data pipelines.
    """

    if field_size < 20:
        raise ValueError("field_size must be at least 20")
    if iterations < 1_000:
        raise ValueError("iterations must be at least 1,000")

    rng = np.random.default_rng(seed)
    player_mean = player.baseline_strokes_gained + player.course_fit / 100
    player_sigma = max(0.15, player.volatility / 100)
    player_scores = rng.normal(player_mean, player_sigma, iterations)
    field_scores = rng.normal(0, 0.85, (iterations, field_size - 1))
    players_beaten = (player_scores[:, None] > field_scores).sum(axis=1)
    top20_cutoff = max(0, field_size - 20)

    return float(np.mean(players_beaten >= top20_cutoff))
