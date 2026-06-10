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
- tournament courses
- tournament results
- tournament course hole stats
- player round results
- player round stats
- player scorecards
- player season stats
- provider stat definitions
- model feature sets
- model player features
- model run inputs
- model backtests
- model backtest predictions
- model evaluations
- model runs
- predictions
- fantasy contests
- lineups
- user bets
- user watchlists
- alerts
- subscriptions
- sync runs
- raw snapshot records
- ingestion freshness

## Provider Snapshot Contract

Every provider response must persist:

- source
- endpoint
- request params
- captured timestamp
- request hash
- raw payload
- raw snapshot key

The raw payload is stored in S3/MinIO. Postgres stores provider metadata, request and payload hashes, snapshot keys, and the sync run that produced each snapshot.

## Freshness Contract

No product view may silently mix fresh and stale data. Each market, model output, alert, and AI citation must be traceable to a timestamped source record.

Ingestion freshness is tracked by source and resource. A product surface must prefer these records over guessing from table counts.

## Source Priority

- Modeling inputs: BALLDONTLIE GOAT first for this phase, then DataGolf/SportsDataIO/Sportradar only when licensed and explicitly mapped.
- Historical results and stats: BALLDONTLIE GOAT.
- Live scoring: BALLDONTLIE where licensed, then SportsDataIO/Sportradar when licensed.
- Live odds: BALLDONTLIE futures where available, then DataGolf/The Odds API/SportsDataIO when licensed.
- Player metadata: BALLDONTLIE bootstrap, then licensed validation sources.
- News: SportsDataIO.

## Historical Modeling Contract

Historical facts store the current normalized truth for fast model queries. Raw provider snapshots remain immutable in S3/MinIO and `raw_snapshot_records`.

Every model feature set must record:

- code version
- input hash
- input manifest
- training or inference window
- generated timestamp

No feature generation job may read provider records captured after the feature row's `asOf` timestamp.

## Model-Backed Tracker Contract

Manual tracker CRUD accepts user-entered bet/watchlist data. Model-backed tracker actions are different: clients send only identifiers and user intent, while the server resolves the trusted model and market signal.

`POST /api/tracker/model/bets` accepts:

- `tournamentId`
- `playerId`
- `marketType`
- `stake`
- optional `placedAt`
- optional `thesis`

The server resolves the latest completed model run, the canonical field entry,
the current market price, and the latest matching model validation summary. It
rejects missing model output, withdrawn/non-field players, unpriced model
signals, and model quality states that are not approved for automation. The
client must not provide book, odds, model probability, fair odds, rank, edge, or
model quality.

`POST /api/tracker/model/watchlists` accepts:

- `tournamentId`
- `playerId`
- `marketType`
- optional `name` defaulting to `Model edges`

The server upserts the named user watchlist for the tournament and idempotently
adds the player. Both endpoints return the tracker record, resolved model
signal, and model quality summary so UI and AI surfaces can explain what was
tracked without re-querying historical fact tables.

`POST /api/tracker/model/alerts` accepts:

- `tournamentId`
- optional `marketTypes`
- optional `minEdgePercent` defaulting to `5`
- optional `limit` defaulting to `25`, capped at `100`

The server resolves the same latest completed model run, current market prices,
and model quality summary. It builds `new_edge` alerts only when model quality is
approved for automation and only for entered players with priced model signals
above the edge threshold. Writes go through `alerts(user_id, dedupe_key)`.
Dedupe keys include the model run, tournament, player, market, book, and current
odds, so retrying the endpoint is idempotent while a new run or price can
produce a new alert. The client must not provide model probability, edge, book,
odds, or model quality.

`GET /api/tracker/alerts` accepts query params:

- optional `status`: `all`, `acknowledged`, or `unacknowledged`, defaulting to `all`
- optional `limit` defaulting to `50`, capped at `100`

The server returns alerts owned by the authenticated user plus summary counts for acknowledged and unacknowledged records. Listing alerts is read-only; it does not mutate `deliveredAt` or `acknowledgedAt`.

`PATCH /api/tracker/alerts` accepts:

- `alertIds`

The server acknowledges only alerts owned by the authenticated user and only sets `acknowledgedAt` for rows that are not already acknowledged. Retrying the same request is idempotent: the first request returns the newly acknowledged count, and later retries return the same alert records with `acknowledgedCount` of `0`.

`GET /api/tracker/alert-preferences` returns one preference row per alert type. Missing database rows are returned as server defaults:

- in-app enabled
- email disabled
- no mute window

`PATCH /api/tracker/alert-preferences` accepts:

- `preferences[]`
  - `alertType`
  - `inAppEnabled`
  - `emailEnabled`
  - optional nullable `mutedUntil`

Preference updates are full rows per alert type. Duplicate alert types in one request are invalid instead of silently merged.

Alert delivery is channel state attached to alert records, not a second notification model. `alert_deliveries(alert_id, channel)` is unique, so scheduled retries cannot create duplicate delivery jobs.

`GET /api/cron/alerts/deliveries` is the cron-ready in-app delivery endpoint. It requires `Authorization: Bearer ${CRON_SECRET}` and accepts:

- optional `limit`, defaulting to `100`, capped at `500`
- optional `now` for deterministic jobs/tests

The endpoint claims eligible unacknowledged alerts where in-app delivery is enabled and the user is not muted, creates an `in_app` delivery row, marks it delivered, and sets the alert's first `deliveredAt` timestamp. It does not send email. Email preferences are stored now so a provider-backed email worker can be added later without changing user preference semantics.
