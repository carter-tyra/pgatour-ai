CREATE TABLE "user_watchlist_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_bets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
WITH fallback_tournament AS (
	SELECT "id"
	FROM "tournaments"
	ORDER BY
		CASE
			WHEN "starts_on" <= CURRENT_DATE::text AND "ends_on" >= CURRENT_DATE::text THEN 0
			WHEN "starts_on" >= CURRENT_DATE::text THEN 1
			ELSE 2
		END,
		CASE WHEN "starts_on" >= CURRENT_DATE::text THEN "starts_on" END ASC,
		"starts_on" DESC
	LIMIT 1
)
UPDATE "user_watchlists"
SET "tournament_id" = (SELECT "id" FROM fallback_tournament)
WHERE "tournament_id" IS NULL;--> statement-breakpoint
WITH watchlist_player_values AS (
	SELECT
		"user_watchlists"."id" AS "watchlist_id",
		"player_values"."player_id" AS "player_id",
		("player_values"."ordinality" - 1)::integer AS "position"
	FROM "user_watchlists"
	CROSS JOIN LATERAL jsonb_array_elements_text("user_watchlists"."player_ids") WITH ORDINALITY AS "player_values"("player_id", "ordinality")
	WHERE "player_values"."player_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
),
valid_watchlist_players AS (
	SELECT
		"watchlist_player_values"."watchlist_id",
		"watchlist_player_values"."player_id"::uuid AS "player_id",
		"watchlist_player_values"."position"
	FROM "watchlist_player_values"
	INNER JOIN "players" ON "players"."id" = "watchlist_player_values"."player_id"::uuid
)
INSERT INTO "user_watchlist_players" ("watchlist_id", "player_id", "position")
SELECT DISTINCT ON ("watchlist_id", "player_id")
	"watchlist_id",
	"player_id",
	"position"
FROM "valid_watchlist_players"
ORDER BY "watchlist_id", "player_id", "position";--> statement-breakpoint
ALTER TABLE "user_watchlists" ALTER COLUMN "tournament_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_watchlist_players" ADD CONSTRAINT "user_watchlist_players_watchlist_id_user_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."user_watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist_players" ADD CONSTRAINT "user_watchlist_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_watchlist_players_player_idx" ON "user_watchlist_players" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_watchlist_players_watchlist_player_unique" ON "user_watchlist_players" USING btree ("watchlist_id","player_id");--> statement-breakpoint
CREATE INDEX "user_watchlist_players_watchlist_position_idx" ON "user_watchlist_players" USING btree ("watchlist_id","position");--> statement-breakpoint
ALTER TABLE "user_bets" ADD CONSTRAINT "user_bets_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_bets_user_created_idx" ON "user_bets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_bets_user_tournament_status_idx" ON "user_bets" USING btree ("user_id","tournament_id","status");--> statement-breakpoint
CREATE INDEX "user_watchlists_user_tournament_idx" ON "user_watchlists" USING btree ("user_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_watchlists_user_tournament_name_unique" ON "user_watchlists" USING btree ("user_id","tournament_id","name");--> statement-breakpoint
ALTER TABLE "user_watchlists" DROP COLUMN "player_ids";
