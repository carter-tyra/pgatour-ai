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
