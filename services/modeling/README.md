# Modeling Service

This package owns numerical modeling, simulation, and backtesting. The web app and AI layer consume model outputs; they do not generate fair lines directly.

Initial model targets:

- Baseline player skill.
- Course fit.
- Win/top-5/top-10/top-20/make-cut probabilities.
- Matchups and 3-balls.
- DFS projection, cut probability, ceiling, ownership leverage.
- Model explainability: drivers, risks, confidence, input hash, model version.

Promotion rules:

- No result-leaking features.
- Every run must be reproducible from raw snapshots and transformed Parquet inputs.
- Model outputs must include model version, code version, input hash, output schema version, and timestamp.

## Commands

Generate the immutable Feature Set v0 manifest and compact per-player feature rows:

```bash
pnpm model:features -- --tournament-source-id 30 --as-of 2026-06-08T00:00:00Z
```

If no tournament is provided, the command uses the next scheduled or in-progress
tournament. The `as_of` timestamp is the leakage cutoff: historical rows must
have `captured_at <= as_of` and must belong to tournaments that started before
the target tournament.

Run modeling tests:

```bash
pnpm model:check
```

Run deterministic Model v0 inference from the latest complete feature set and
write compact product-facing rows to `model_runs`, `model_run_inputs`, and
`predictions`:

```bash
pnpm model:run -- --tournament-source-id 30
```

The run is idempotent. The input hash includes the feature set, player feature
rows, selected market snapshots, model config, market types, iterations, and
seed. Re-running the same command reuses the same `model_runs` row and replaces
that run's child rows so local status and product reads stay deterministic.

Run historical Model v0 validation and write rows to `model_backtests`,
`model_backtest_predictions`, and `model_evaluations`:

```bash
pnpm model:backtest -- --from-season 2026 --to-season 2026
```

The backtest command selects completed tournaments that have field entries and
final results, generates leakage-guarded feature sets per event, runs the same
simulation path used by inference, and stores Brier score, log loss,
calibration, coverage, probability drift, and closing-line value where pre-start
market snapshots exist. Re-running the same command reuses the same backtest id
from its input hash and replaces child prediction/evaluation rows.
