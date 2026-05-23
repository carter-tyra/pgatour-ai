# Vendor Data Use Matrix

| Provider | Intended Use | Storage | Notes |
|---|---|---|---|
| DataGolf | Modeling inputs, projections, odds, fantasy data, history | Raw snapshots, canonical entities, model features | Primary source where licensed. |
| SportsDataIO | Live scoring, news, player metadata, odds coverage | Raw snapshots, canonical entities, live observations | Secondary source and live coverage. |
| The Odds API | Supplemental book coverage | Raw snapshots, odds observations | Optional if paid coverage requires it. |
| Weather provider | Forecast and wave adjustments | Raw snapshots, weather observations | Must be timestamped by forecast time. |

Rules:

- Use licensed API access only.
- Do not scrape undocumented endpoints.
- Keep source attribution.
- Store raw payloads for replay and audits.
- Respect vendor redistribution limits before public launch.
