# Model Methodology

## Model Ownership

The modeling service owns numerical truth. The web app and AI analyst can explain and query model outputs, but they cannot invent probabilities, fair lines, or recommendations.

## v1 Model Families

1. Baseline player skill.
2. Course fit.
3. Fair lines for win, placement, cut, matchup, and 3-ball markets.
4. Tournament simulation.
5. Fantasy projection and lineup simulation.
6. Explainability.

## Validation

Track:

- calibration
- Brier score
- log loss
- expected value
- closing-line value
- market-by-market performance
- tournament drift
- false confidence

Model v0 validation is persisted by:

```bash
pnpm model:backtest -- --from-season 2026 --to-season 2026
```

The command writes one idempotent `model_backtests` row, child
`model_backtest_predictions`, and scoped `model_evaluations` rows for overall,
market, tournament, and probability-bin views. Closing-line value is only
populated when a pre-start market snapshot exists.

The web app treats stored validation as the promotion gate for model-backed
automation. A model is considered validated only when the latest matching
completed backtest has at least 500 known outcomes, at least 75% coverage,
calibration error at or below 8%, Brier score at or below 0.18, and log loss at
or below 1.10. Limited or missing validation can still be displayed, but
model-backed bets, watchlists, and alerts fail closed.

## Promotion Criteria

A model cannot be promoted unless:

- input data is reproducible
- no result-leaking features are used
- output schema is versioned
- backtest results are stored
- calibration and drift checks pass
