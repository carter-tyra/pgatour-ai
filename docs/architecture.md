# Architecture

PGA Tour AI is organized as a modular monorepo with hard boundaries between domain math, provider ingestion, canonical storage, modeling, AI, billing, and UI.

## Data Flow

```txt
DataGolf / SportsDataIO / The Odds API / weather / news
  -> provider adapter
  -> raw snapshot store
  -> canonical normalizer
  -> Postgres stable entities
  -> ClickHouse observations
  -> model runs
  -> Next.js product views and AI tools
```

## Bounded Contexts

- `packages/domain`: betting math, shared enums, validation, entitlements.
- `packages/providers`: source-specific fetchers and adapter contracts.
- `packages/db`: canonical Drizzle schema.
- `services/ingest`: idempotent provider snapshot and normalization jobs.
- `services/modeling`: numerical modeling, simulation, and backtesting.
- `packages/ai`: tool schemas and AI safety policy.
- `apps/web`: customer-facing application.

## Non-Negotiable Rules

- Raw source payloads are stored before normalization.
- UI does not compute canonical odds math.
- AI does not generate numerical truth.
- Model outputs are immutable and versioned.
- Feature access is driven by Stripe entitlements, not duplicated UI flags.
- Provider-specific logic stays out of app components.
