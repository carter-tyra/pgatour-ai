# Product Quality Rules

## UI

- Dense, calm, professional dashboard UI.
- Short, useful copy.
- No marketing filler inside the app.
- Tables must support scanning, sorting, filtering, and export as features mature.
- Stale data must be visible.

## Betting

- Analysis only in v1.
- No sportsbook credentials.
- No bet placement.
- No guaranteed-result language.
- Every edge shows fair line, market line, confidence, driver, risk, and timestamp.

## AI

- AI responses cite internal records.
- Numerical values must come from tool calls.
- AI fails closed on missing or stale data.
- Prompt-injection defenses are required for provider/news text.

## Engineering

- Validate at system boundaries.
- Prefer direct integrations at hard boundaries.
- Avoid premature wrappers.
- Keep one source of truth for enums, entitlements, contest rules, and odds math.
- Add tests with every new business rule.
