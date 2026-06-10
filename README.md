# PGA Tour AI

A B2C PGA TOUR betting and fantasy intelligence platform for serious bettors, DFS players, one-and-done users, and avid fans.

The v1 posture is analysis-only: the app explains fair lines, market edges, portfolio exposure, fantasy leverage, live risks, and model drivers. It does not place wagers, store sportsbook credentials, or claim guaranteed results.

## Current Implementation

- pnpm/Turborepo monorepo with Next.js, TypeScript, shared domain packages, provider contracts, Drizzle schemas, and Python modeling scaffolding.
- Working web terminal at `apps/web` with deterministic seed data for betting, fantasy, live, portfolio, and AI analyst workflows.
- Domain package with tested odds math, no-vig normalization, Kelly sizing, dead-heat logic, and subscription entitlements.
- Local infra plan for Postgres, ClickHouse, Redis-compatible cache, and MinIO raw snapshot storage.
- Product, architecture, data, modeling, and quality documentation in `docs/`.

## Commands

```bash
pnpm install
pnpm dev:web
pnpm check
pnpm db:check
pnpm db:generate
pnpm db:migrate
pnpm ingest:balldontlie:seed -- --sample
pnpm data:status
```

## Environment

Local secrets live in the repo root `.env.local`. Use `.env.example` as the
template, but do not commit real `.env*` files. Root tooling, Drizzle, ingest
scripts, and the Next.js app all load environment variables from the workspace
root.

Required local keys for the web app and database:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pgatour_ai
BETTER_AUTH_SECRET=replace-with-a-32-plus-character-secret
```

Required local key for BALLDONTLIE ingestion:

```bash
BALL_DONT_LIE_API_KEY=replace-with-provider-key
```

## Repo Layout

```txt
apps/web                 Next.js app
packages/domain          Shared domain types, validation, odds math, entitlements
packages/config          Typed environment and feature flags
packages/providers       Data provider adapter contracts
packages/db              Drizzle canonical schema
packages/ai              AI tool schemas and safety policy
packages/ui              Shared UI primitives
services/ingest          Ingestion worker scaffold
services/modeling        Python modeling scaffold
infra                    Local infrastructure
docs                     Product and engineering docs
```

## Product Rules

- Licensed provider data only.
- Raw payloads are stored before normalization.
- Provider-specific logic stays in `packages/providers`.
- Betting/fantasy math stays in `packages/domain`.
- UI never computes business-critical odds or subscription rules directly.
- AI can explain/query/summarize verified data, but it cannot invent numbers or override model outputs.
