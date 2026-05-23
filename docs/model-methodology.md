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

## Promotion Criteria

A model cannot be promoted unless:

- input data is reproducible
- no result-leaking features are used
- output schema is versioned
- backtest results are stored
- calibration and drift checks pass
