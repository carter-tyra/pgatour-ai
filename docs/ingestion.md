# Ingestion

## BALLDONTLIE Seed

Run a quota-safe smoke sync:

```bash
pnpm ingest:balldontlie:seed -- --sample
```

Run a season sync and selected tournament fields:

```bash
pnpm ingest:balldontlie:seed -- --season 2026 --tournament-id 6,7
```

The runner loads `.env` and `.env.local`, writes raw provider payloads to the configured S3/MinIO bucket, then normalizes into canonical Postgres tables. It runs courses, tournaments, players, then field entries for explicitly supplied tournament ids.

Trial accounts are rate-limited. Leave the default page delay in place for full syncs unless the provider limit changes.
The runner also spaces endpoint steps by default, so smoke runs avoid bursting through the trial limit.
