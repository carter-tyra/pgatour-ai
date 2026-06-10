CREATE TYPE "public"."ingestion_freshness_status" AS ENUM('unknown', 'fresh', 'stale', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('running', 'succeeded', 'failed', 'partial');--> statement-breakpoint
CREATE TABLE "ingestion_freshness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "data_source" NOT NULL,
	"resource" text NOT NULL,
	"status" "ingestion_freshness_status" DEFAULT 'unknown' NOT NULL,
	"latest_sync_run_id" uuid,
	"latest_captured_at" timestamp with time zone,
	"latest_completed_at" timestamp with time zone,
	"stale_after" timestamp with time zone,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_snapshot_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"endpoint" text NOT NULL,
	"request_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_hash" text NOT NULL,
	"payload_hash" text NOT NULL,
	"snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"schema_version" text DEFAULT '1' NOT NULL,
	"validation_status" text DEFAULT 'valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "data_source" NOT NULL,
	"job_type" text NOT NULL,
	"status" "sync_run_status" DEFAULT 'running' NOT NULL,
	"season" integer,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_snapshot_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"code_version" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingestion_freshness" ADD CONSTRAINT "ingestion_freshness_latest_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("latest_sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_snapshot_records" ADD CONSTRAINT "raw_snapshot_records_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_freshness_source_resource_unique" ON "ingestion_freshness" USING btree ("source","resource");--> statement-breakpoint
CREATE INDEX "ingestion_freshness_status_idx" ON "ingestion_freshness" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_snapshot_records_snapshot_key_unique" ON "raw_snapshot_records" USING btree ("snapshot_key");--> statement-breakpoint
CREATE INDEX "raw_snapshot_records_source_endpoint_captured_idx" ON "raw_snapshot_records" USING btree ("source","endpoint","captured_at");--> statement-breakpoint
CREATE INDEX "raw_snapshot_records_sync_run_idx" ON "raw_snapshot_records" USING btree ("sync_run_id");--> statement-breakpoint
CREATE INDEX "sync_runs_source_started_idx" ON "sync_runs" USING btree ("source","started_at");--> statement-breakpoint
CREATE INDEX "sync_runs_status_idx" ON "sync_runs" USING btree ("status");