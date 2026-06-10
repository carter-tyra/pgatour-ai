ALTER TABLE "alerts"
ADD COLUMN "acknowledged_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "alerts_user_acknowledged_created_idx"
ON "alerts" ("user_id", "acknowledged_at", "created_at");
--> statement-breakpoint
CREATE INDEX "alerts_user_created_idx"
ON "alerts" ("user_id", "created_at");
