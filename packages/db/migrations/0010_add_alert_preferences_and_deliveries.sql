CREATE TYPE "public"."alert_delivery_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."alert_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'skipped');--> statement-breakpoint

CREATE TABLE "alert_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "alert_type" "alert_type" NOT NULL,
  "in_app_enabled" boolean DEFAULT true NOT NULL,
  "email_enabled" boolean DEFAULT false NOT NULL,
  "muted_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "alert_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alert_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "channel" "alert_delivery_channel" NOT NULL,
  "status" "alert_delivery_status" DEFAULT 'pending' NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "delivered_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "failure_reason" text,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "alert_preferences"
ADD CONSTRAINT "alert_preferences_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "alert_deliveries"
ADD CONSTRAINT "alert_deliveries_alert_id_alerts_id_fk"
FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "alert_deliveries"
ADD CONSTRAINT "alert_deliveries_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "alert_preferences_user_alert_type_unique"
ON "alert_preferences" USING btree ("user_id", "alert_type");--> statement-breakpoint

CREATE INDEX "alert_preferences_user_idx"
ON "alert_preferences" USING btree ("user_id");--> statement-breakpoint

CREATE INDEX "alert_preferences_user_muted_until_idx"
ON "alert_preferences" USING btree ("user_id", "muted_until");--> statement-breakpoint

CREATE UNIQUE INDEX "alert_deliveries_alert_channel_unique"
ON "alert_deliveries" USING btree ("alert_id", "channel");--> statement-breakpoint

CREATE INDEX "alert_deliveries_channel_status_claimed_idx"
ON "alert_deliveries" USING btree ("channel", "status", "claimed_at");--> statement-breakpoint

CREATE INDEX "alert_deliveries_user_channel_status_created_idx"
ON "alert_deliveries" USING btree ("user_id", "channel", "status", "created_at");
