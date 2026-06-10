ALTER TABLE "field_entries" ALTER COLUMN "status" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "tee_times" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tee_times" ALTER COLUMN "tee" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "tee_times" ALTER COLUMN "wave" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "field_entries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "start_tee" integer;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "group_number" integer;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tee_times" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tee_times" ADD CONSTRAINT "tee_times_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tee_times_tournament_round_idx" ON "tee_times" USING btree ("tournament_id","round_number","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tee_times_tournament_player_round_unique" ON "tee_times" USING btree ("tournament_id","player_id","round_number");