# Data Contracts

## Canonical Entities

The canonical schema includes:

- players
- tournaments
- courses
- holes
- field entries
- books
- markets
- odds snapshots
- scores
- tee times
- weather snapshots
- news items
- model runs
- predictions
- fantasy contests
- lineups
- user bets
- user watchlists
- alerts
- subscriptions

## Provider Snapshot Contract

Every provider response must persist:

- source
- endpoint
- request params
- captured timestamp
- request hash
- raw payload
- raw snapshot key

## Freshness Contract

No product view may silently mix fresh and stale data. Each market, model output, alert, and AI citation must be traceable to a timestamped source record.

## Source Priority

- Modeling inputs: DataGolf, then SportsDataIO.
- Live scoring: SportsDataIO, then DataGolf.
- Live odds: DataGolf, then The Odds API, then SportsDataIO.
- Player metadata: SportsDataIO, then DataGolf.
- News: SportsDataIO.
