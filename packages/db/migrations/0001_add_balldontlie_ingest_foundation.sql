ALTER TYPE "public"."data_source" ADD VALUE 'balldontlie' BEFORE 'manual';--> statement-breakpoint
CREATE TABLE "source_entity_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "data_source" NOT NULL,
	"entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"canonical_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "field_entries" ADD COLUMN "source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "source_entity_mappings_canonical_idx" ON "source_entity_mappings" USING btree ("entity_type","canonical_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_entity_mappings_source_entity_unique" ON "source_entity_mappings" USING btree ("source","entity_type","source_entity_id");