CREATE UNIQUE INDEX IF NOT EXISTS "books_name_region_unique" ON "books" ("name", "region");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "markets_price_unique" ON "markets" (
  "tournament_id",
  "player_id",
  "book_id",
  "market_type",
  "source"
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "odds_market_snapshot_unique" ON "odds_snapshots" (
  "market_id",
  "raw_snapshot_key"
);
