# Paid Beta Launch Checklist

## Data

- Provider contracts reviewed.
- Ingestion success rate above 95% for a full tournament week.
- Freshness dashboard available.
- Raw snapshots replayable.

## Product

- Subscription flow tested with live Stripe keys.
- Entitlements enforced server-side.
- Bet tracker works end to end.
- Fantasy optimizer deterministic for same inputs.
- AI responses cite records and fail closed when stale.

## Quality

- `pnpm check` passes.
- Critical E2E flows pass.
- No critical Sentry errors in staging.
- Legal/compliance copy reviewed.
- Support and refund path documented.

## Operations

- Provider outage runbook ready.
- Alert dedupe verified.
- Admin role gated.
- Secrets scanned.
- Rollback path documented.
