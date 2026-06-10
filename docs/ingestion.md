# Ingestion

## BALLDONTLIE Seed

Run a quota-safe smoke sync:

```bash
pnpm ingest:balldontlie:seed -- --sample
```

Run a season sync. By default this syncs courses, tournaments, players, field
entries, and tee times for the current/next mapped tournaments:

```bash
pnpm ingest:balldontlie:seed -- --season 2026
```

Force specific BALLDONTLIE tournament ids:

```bash
pnpm ingest:balldontlie:seed -- --season 2026 --no-auto-fields --tournament-id 6,7
```

Run a season sync without field entries:

```bash
pnpm ingest:balldontlie:seed -- --season 2026 --skip-fields
```

Run a season sync without tee times:

```bash
pnpm ingest:balldontlie:seed -- --season 2026 --skip-tee-times
```

The runner loads environment variables from the workspace root, writes raw
provider payloads to the configured S3/MinIO bucket, then normalizes into
canonical Postgres tables. It runs courses, tournaments, players, then field
entries and tee times for the selected current/next tournaments.

Trial accounts are rate-limited. Leave the default page delay in place for full syncs unless the provider limit changes.
The runner also spaces endpoint steps by default, so smoke runs avoid bursting through the trial limit.
Full syncs cap each endpoint at 100 cursor pages by default to prevent runaway pagination while still covering the current BALLDONTLIE player catalog.

## Active Event Workflow

Use this sequence before opening the weekly event views. Replace `30` with the
BALLDONTLIE source tournament id for the selected event.

```bash
pnpm db:bootstrap
pnpm ingest:balldontlie:seed -- --season 2026 --tournament-id 30
pnpm data:status
pnpm model:features -- --tournament-source-id 30 --as-of 2026-06-10T12:00:00Z
pnpm model:run -- --tournament-source-id 30
pnpm model:backtest -- --from-season 2026 --to-season 2026
pnpm data:quality -- --from-season 2026 --to-season 2026
```

Readiness is computed from one source state in the web app: tournament, field,
markets, tee times, and model output. Tee times are treated as pending before
the tournament start date and missing after the event starts. Both states keep
the event partial. Do not mark Live ready until tee times and live scores are
present.

## BALLDONTLIE Historical Backfill

Backfill normalized historical model inputs without scorecards:

```bash
pnpm ingest:balldontlie:history -- --from-season 2010 --to-season 2026 --resources core
```

Backfill high-volume scorecards after core facts are stable:

```bash
pnpm ingest:balldontlie:history -- --from-season 2010 --to-season 2026 --resources scorecards --resume
```

Validate a single tournament before running a wider job:

```bash
pnpm ingest:balldontlie:history -- --from-season 2026 --to-season 2026 --tournament-id 28 --resources tournament_results,player_round_results,player_round_stats --sample
```

Historical tasks are tracked in `ingestion_tasks` by source, resource, season, and tournament. Use `--resume` to skip tasks already marked `succeeded`.

## Data Status

Inspect persisted sync runs, raw snapshot metadata, freshness records, historical coverage, model readiness, table counts, skipped mappings, and mapped BALLDONTLIE tournament ids:

```bash
pnpm data:status
```

Every seed run writes a `sync_runs` record. Raw provider payloads still live in S3/MinIO, while `raw_snapshot_records` stores the searchable metadata needed for status pages, replay, and incident review.
