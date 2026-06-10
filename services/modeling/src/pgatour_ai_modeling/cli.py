from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from datetime import datetime

from pgatour_ai_modeling.backtesting import RunBacktestOptions, run_backtest
from pgatour_ai_modeling.features import (
    GenerateFeaturesOptions,
    generate_feature_set,
    parse_datetime,
)
from pgatour_ai_modeling.inference import (
    DEFAULT_ITERATIONS,
    DEFAULT_MARKET_TYPES,
    DEFAULT_SEED,
    RunModelOptions,
    normalize_market_types,
    run_model,
)
from pgatour_ai_modeling.simulation import PlayerProjection, simulate_top20_probability


def smoke_run(args: argparse.Namespace) -> int:
    projection = PlayerProjection(
        player_id=args.player_id,
        baseline_strokes_gained=args.baseline_strokes_gained,
        course_fit=args.course_fit,
        volatility=args.volatility,
    )
    probability = simulate_top20_probability(
        projection,
        field_size=args.field_size,
        iterations=args.iterations,
        seed=args.seed,
    )

    print(
        json.dumps(
            {
                "fieldSize": args.field_size,
                "iterations": args.iterations,
                "marketType": "top_20",
                "playerId": projection.player_id,
                "probability": probability,
                "seed": args.seed,
            },
            sort_keys=True,
        )
    )

    return 0


def generate_features(args: argparse.Namespace) -> int:
    result = generate_feature_set(
        GenerateFeaturesOptions(
            tournament_id=args.tournament_id,
            tournament_source_id=args.tournament_source_id,
            as_of=parse_datetime(args.as_of),
            code_version=args.code_version,
            feature_set_version=args.feature_set_version,
            recent_round_window=args.recent_round_window,
            dry_run=args.dry_run,
        )
    )

    print(json.dumps(result, sort_keys=True))

    return 0


def run_model_command(args: argparse.Namespace) -> int:
    result = run_model(
        RunModelOptions(
            feature_set_id=args.feature_set_id,
            tournament_id=args.tournament_id,
            tournament_source_id=args.tournament_source_id,
            market_types=normalize_market_types(args.market_types),
            iterations=args.iterations,
            seed=args.seed,
            code_version=args.code_version,
            dry_run=args.dry_run,
        )
    )

    print(json.dumps(result, sort_keys=True))

    return 0


def run_backtest_command(args: argparse.Namespace) -> int:
    result = run_backtest(
        RunBacktestOptions(
            from_season=args.from_season,
            to_season=args.to_season,
            tournament_ids=tuple(args.tournament_id or ()),
            tournament_source_ids=tuple(args.tournament_source_id or ()),
            market_types=normalize_market_types(args.market_types),
            iterations=args.iterations,
            seed=args.seed,
            code_version=args.code_version,
            feature_set_version=args.feature_set_version,
            recent_round_window=args.recent_round_window,
            as_of_offset_days=args.as_of_offset_days,
            calibration_bins=args.calibration_bins,
            dry_run=args.dry_run,
        )
    )

    print(json.dumps(result, sort_keys=True))

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PGAI modeling service commands.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    smoke = subparsers.add_parser("smoke-run", help="Run a deterministic simulation smoke check.")
    smoke.add_argument("--player-id", default="smoke-player")
    smoke.add_argument("--baseline-strokes-gained", default=0.65, type=float)
    smoke.add_argument("--course-fit", default=4.0, type=float)
    smoke.add_argument("--volatility", default=78.0, type=float)
    smoke.add_argument("--field-size", default=75, type=int)
    smoke.add_argument("--iterations", default=20_000, type=int)
    smoke.add_argument("--seed", default=7, type=int)
    smoke.set_defaults(func=smoke_run)

    features = subparsers.add_parser(
        "generate-features",
        help="Generate deterministic per-player model feature rows for a tournament.",
    )
    features.add_argument("--tournament-id", help="Canonical tournament UUID.")
    features.add_argument("--tournament-source-id", help="BALLDONTLIE tournament source ID.")
    features.add_argument("--as-of", help="UTC timestamp used as the source capture cutoff.")
    features.add_argument("--code-version", default="local")
    features.add_argument("--feature-set-version", default="0.1.0")
    features.add_argument("--recent-round-window", default=24, type=int)
    features.add_argument("--dry-run", action="store_true")
    features.set_defaults(func=generate_features)

    inference = subparsers.add_parser(
        "run-model",
        help="Run deterministic Model v0 inference from a persisted feature set.",
    )
    inference.add_argument("--feature-set-id", help="Immutable model_feature_sets UUID.")
    inference.add_argument("--tournament-id", help="Canonical tournament UUID.")
    inference.add_argument("--tournament-source-id", help="BALLDONTLIE tournament source ID.")
    inference.add_argument(
        "--market-types",
        default=",".join(DEFAULT_MARKET_TYPES),
        help="Comma-separated markets. Supported: outright,top_5,top_10,top_20,make_cut,miss_cut.",
    )
    inference.add_argument("--iterations", default=DEFAULT_ITERATIONS, type=int)
    inference.add_argument("--seed", default=DEFAULT_SEED, type=int)
    inference.add_argument("--code-version", default="local")
    inference.add_argument("--dry-run", action="store_true")
    inference.set_defaults(func=run_model_command)

    current_year = datetime.now().year
    backtest = subparsers.add_parser(
        "run-backtest",
        help="Run historical Model v0 backtests and persist evaluation metrics.",
    )
    backtest.add_argument("--from-season", default=current_year, type=int)
    backtest.add_argument("--to-season", default=current_year, type=int)
    backtest.add_argument(
        "--tournament-id",
        action="append",
        help="Canonical tournament UUID. Repeatable.",
    )
    backtest.add_argument(
        "--tournament-source-id",
        action="append",
        help="BALLDONTLIE tournament source ID. Repeatable.",
    )
    backtest.add_argument(
        "--market-types",
        default=",".join(DEFAULT_MARKET_TYPES),
        help="Comma-separated markets. Supported: outright,top_5,top_10,top_20,make_cut,miss_cut.",
    )
    backtest.add_argument("--iterations", default=DEFAULT_ITERATIONS, type=int)
    backtest.add_argument("--seed", default=DEFAULT_SEED, type=int)
    backtest.add_argument("--code-version", default="local")
    backtest.add_argument("--feature-set-version", default="0.1.0")
    backtest.add_argument("--recent-round-window", default=24, type=int)
    backtest.add_argument("--as-of-offset-days", default=1, type=int)
    backtest.add_argument("--calibration-bins", default=10, type=int)
    backtest.add_argument("--dry-run", action="store_true")
    backtest.set_defaults(func=run_backtest_command)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    raw_args = sys.argv[1:] if argv is None else list(argv)
    args = parser.parse_args([arg for arg in raw_args if arg != "--"])

    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
