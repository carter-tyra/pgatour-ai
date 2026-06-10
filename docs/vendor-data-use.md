# Vendor Data Use Matrix

| Provider | Intended Use | Storage | Notes |
|---|---|---|---|
| BALLDONTLIE PGA GOAT | Primary phase-one PGA metadata, schedules, courses, fields, results, round stats, season stats, scorecards, and futures | Raw snapshots, snapshot metadata, canonical entities, normalized historical facts | Current licensed source for model-grade backfill. Review commercial terms before paid public launch. |
| DataGolf | Modeling validation, projections, odds, fantasy data, history | Raw snapshots, canonical entities, model features | Add only when licensed and explicitly mapped. |
| SportsDataIO | Live scoring, news, player metadata, odds coverage | Raw snapshots, canonical entities, live observations | Add only when licensed and needed for coverage gaps. |
| The Odds API | Supplemental book coverage | Raw snapshots, odds observations | Optional if paid coverage requires it. |
| Weather provider | Forecast and wave adjustments | Raw snapshots, weather observations | Must be timestamped by forecast time. |

Rules:

- Use licensed API access only.
- Do not scrape undocumented endpoints.
- Keep source attribution.
- Store raw payloads for replay and audits.
- Respect vendor redistribution limits before public launch.
