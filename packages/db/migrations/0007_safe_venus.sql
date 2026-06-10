CREATE TABLE "ingestion_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "data_source" NOT NULL,
	"resource" text NOT NULL,
	"task_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"season" integer,
	"tournament_source_id" text,
	"cursor" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_backtest_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_backtest_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"market_type" "market_type" NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"probability" numeric(10, 6) NOT NULL,
	"fair_american_odds" integer NOT NULL,
	"actual_outcome" boolean,
	"finish_position" integer,
	"closing_american_odds" integer,
	"closing_line_value" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_backtests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text NOT NULL,
	"feature_set_id" uuid,
	"feature_set_version" text NOT NULL,
	"training_window_start" timestamp with time zone NOT NULL,
	"training_window_end" timestamp with time zone NOT NULL,
	"test_window_start" timestamp with time zone NOT NULL,
	"test_window_end" timestamp with time zone NOT NULL,
	"market_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"calibration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_run_id" uuid,
	"model_backtest_id" uuid,
	"scope" text NOT NULL,
	"market_type" "market_type",
	"tournament_id" uuid,
	"brier_score" numeric(10, 6),
	"log_loss" numeric(10, 6),
	"calibration_error" numeric(10, 6),
	"coverage" numeric(10, 6),
	"average_closing_line_value" numeric(10, 6),
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_feature_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_set_name" text NOT NULL,
	"feature_set_version" text NOT NULL,
	"code_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"training_window_start" timestamp with time zone,
	"training_window_end" timestamp with time zone,
	"generated_at" timestamp with time zone NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_player_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_set_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"long_term_sg_total" numeric(8, 4),
	"recent_sg_total" numeric(8, 4),
	"sg_off_tee" numeric(8, 4),
	"sg_approach" numeric(8, 4),
	"sg_around_green" numeric(8, 4),
	"sg_putting" numeric(8, 4),
	"volatility" numeric(8, 4),
	"rounds_count" integer,
	"field_strength_adjusted" numeric(8, 4),
	"course_fit" numeric(8, 4),
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_run_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_run_id" uuid NOT NULL,
	"raw_snapshot_record_id" uuid,
	"feature_set_id" uuid,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_round_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"course_id" uuid,
	"source" "data_source" NOT NULL,
	"round_number" integer NOT NULL,
	"score" integer,
	"par_relative_score" integer,
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_round_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"round_number" integer NOT NULL,
	"sg_off_tee" numeric(8, 4),
	"sg_off_tee_rank" integer,
	"sg_approach" numeric(8, 4),
	"sg_approach_rank" integer,
	"sg_around_green" numeric(8, 4),
	"sg_around_green_rank" integer,
	"sg_putting" numeric(8, 4),
	"sg_putting_rank" integer,
	"sg_total" numeric(8, 4),
	"sg_total_rank" integer,
	"driving_accuracy" numeric(8, 4),
	"driving_accuracy_rank" integer,
	"driving_distance" numeric(8, 3),
	"driving_distance_rank" integer,
	"longest_drive" numeric(8, 3),
	"longest_drive_rank" integer,
	"greens_in_regulation" numeric(8, 4),
	"greens_in_regulation_rank" integer,
	"sand_saves" numeric(8, 4),
	"sand_saves_rank" integer,
	"scrambling" numeric(8, 4),
	"scrambling_rank" integer,
	"putts_per_gir" numeric(8, 4),
	"putts_per_gir_rank" integer,
	"eagles" integer,
	"birdies" integer,
	"pars" integer,
	"bogeys" integer,
	"double_bogeys" integer,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"course_id" uuid,
	"source" "data_source" NOT NULL,
	"round_number" integer NOT NULL,
	"hole_number" integer NOT NULL,
	"par" integer NOT NULL,
	"score" integer,
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_season_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"season" integer NOT NULL,
	"stat_id" integer NOT NULL,
	"stat_name" text NOT NULL,
	"stat_category" text,
	"rank" integer,
	"stat_value" jsonb,
	"value_numeric" numeric(14, 6),
	"value_text" text,
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_stat_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "data_source" NOT NULL,
	"stat_id" text NOT NULL,
	"stat_key" text NOT NULL,
	"stat_name" text NOT NULL,
	"stat_category" text,
	"canonical_name" text,
	"unit" text,
	"direction" text,
	"parse_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_course_hole_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"hole_number" integer NOT NULL,
	"round_number" integer,
	"round_scope" text NOT NULL,
	"scoring_average" numeric(8, 4),
	"scoring_diff" numeric(8, 4),
	"difficulty_rank" integer,
	"eagles" integer,
	"birdies" integer,
	"pars" integer,
	"bogeys" integer,
	"double_bogeys" integer,
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"rounds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"source" "data_source" NOT NULL,
	"position" text,
	"position_numeric" integer,
	"made_cut" boolean,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"disqualified" boolean DEFAULT false NOT NULL,
	"total_strokes" integer,
	"par_relative_score" integer,
	"earnings_usd" numeric(14, 2),
	"raw_snapshot_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "elevation_ft" integer;--> statement-breakpoint
ALTER TABLE "holes" ADD COLUMN "source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "holes" ADD COLUMN "raw_snapshot_key" text;--> statement-breakpoint
ALTER TABLE "holes" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "holes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "holes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "run_type" text DEFAULT 'inference' NOT NULL;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "tournament_id" uuid;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "feature_set_id" uuid;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "seed" integer;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "as_of" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "training_window_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "training_window_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "model_runs" ADD COLUMN "market_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "market_id" uuid;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "baseline_probability" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "market_implied_probability" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "model_edge" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "uncertainty" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "rank" integer;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "simulation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "model_backtest_predictions" ADD CONSTRAINT "model_backtest_predictions_model_backtest_id_model_backtests_id_fk" FOREIGN KEY ("model_backtest_id") REFERENCES "public"."model_backtests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_backtest_predictions" ADD CONSTRAINT "model_backtest_predictions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_backtest_predictions" ADD CONSTRAINT "model_backtest_predictions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_backtests" ADD CONSTRAINT "model_backtests_feature_set_id_model_feature_sets_id_fk" FOREIGN KEY ("feature_set_id") REFERENCES "public"."model_feature_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_evaluations" ADD CONSTRAINT "model_evaluations_model_run_id_model_runs_id_fk" FOREIGN KEY ("model_run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_evaluations" ADD CONSTRAINT "model_evaluations_model_backtest_id_model_backtests_id_fk" FOREIGN KEY ("model_backtest_id") REFERENCES "public"."model_backtests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_evaluations" ADD CONSTRAINT "model_evaluations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_player_features" ADD CONSTRAINT "model_player_features_feature_set_id_model_feature_sets_id_fk" FOREIGN KEY ("feature_set_id") REFERENCES "public"."model_feature_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_player_features" ADD CONSTRAINT "model_player_features_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_player_features" ADD CONSTRAINT "model_player_features_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_run_inputs" ADD CONSTRAINT "model_run_inputs_model_run_id_model_runs_id_fk" FOREIGN KEY ("model_run_id") REFERENCES "public"."model_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_run_inputs" ADD CONSTRAINT "model_run_inputs_raw_snapshot_record_id_raw_snapshot_records_id_fk" FOREIGN KEY ("raw_snapshot_record_id") REFERENCES "public"."raw_snapshot_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_run_inputs" ADD CONSTRAINT "model_run_inputs_feature_set_id_model_feature_sets_id_fk" FOREIGN KEY ("feature_set_id") REFERENCES "public"."model_feature_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_results" ADD CONSTRAINT "player_round_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_results" ADD CONSTRAINT "player_round_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_results" ADD CONSTRAINT "player_round_results_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_scorecards" ADD CONSTRAINT "player_scorecards_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_scorecards" ADD CONSTRAINT "player_scorecards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_scorecards" ADD CONSTRAINT "player_scorecards_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_course_hole_stats" ADD CONSTRAINT "tournament_course_hole_stats_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_course_hole_stats" ADD CONSTRAINT "tournament_course_hole_stats_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_courses" ADD CONSTRAINT "tournament_courses_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_courses" ADD CONSTRAINT "tournament_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingestion_tasks_source_resource_status_idx" ON "ingestion_tasks" USING btree ("source","resource","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_tasks_source_resource_task_unique" ON "ingestion_tasks" USING btree ("source","resource","task_key");--> statement-breakpoint
CREATE INDEX "model_backtest_predictions_market_idx" ON "model_backtest_predictions" USING btree ("model_backtest_id","market_type");--> statement-breakpoint
CREATE UNIQUE INDEX "model_backtest_predictions_unique" ON "model_backtest_predictions" USING btree ("model_backtest_id","tournament_id","player_id","market_type","as_of");--> statement-breakpoint
CREATE INDEX "model_backtests_lookup_idx" ON "model_backtests" USING btree ("model_name","model_version","created_at");--> statement-breakpoint
CREATE INDEX "model_evaluations_lookup_idx" ON "model_evaluations" USING btree ("scope","market_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_feature_sets_unique" ON "model_feature_sets" USING btree ("feature_set_name","feature_set_version","input_hash");--> statement-breakpoint
CREATE INDEX "model_player_features_tournament_idx" ON "model_player_features" USING btree ("tournament_id","as_of");--> statement-breakpoint
CREATE UNIQUE INDEX "model_player_features_feature_set_player_unique" ON "model_player_features" USING btree ("feature_set_id","tournament_id","player_id");--> statement-breakpoint
CREATE INDEX "model_run_inputs_model_run_idx" ON "model_run_inputs" USING btree ("model_run_id","role");--> statement-breakpoint
CREATE INDEX "player_round_results_tournament_round_idx" ON "player_round_results" USING btree ("tournament_id","round_number");--> statement-breakpoint
CREATE INDEX "player_round_results_player_idx" ON "player_round_results" USING btree ("player_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "player_round_results_source_tournament_player_round_unique" ON "player_round_results" USING btree ("source","tournament_id","player_id","round_number");--> statement-breakpoint
CREATE INDEX "player_round_stats_tournament_round_idx" ON "player_round_stats" USING btree ("tournament_id","round_number");--> statement-breakpoint
CREATE INDEX "player_round_stats_player_captured_idx" ON "player_round_stats" USING btree ("player_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "player_round_stats_source_tournament_player_round_unique" ON "player_round_stats" USING btree ("source","tournament_id","player_id","round_number");--> statement-breakpoint
CREATE INDEX "player_scorecards_tournament_round_hole_idx" ON "player_scorecards" USING btree ("tournament_id","round_number","hole_number");--> statement-breakpoint
CREATE INDEX "player_scorecards_player_tournament_idx" ON "player_scorecards" USING btree ("player_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_scorecards_source_tournament_player_round_hole_unique" ON "player_scorecards" USING btree ("source","tournament_id","player_id","round_number","hole_number");--> statement-breakpoint
CREATE INDEX "player_season_stats_player_season_idx" ON "player_season_stats" USING btree ("player_id","season");--> statement-breakpoint
CREATE UNIQUE INDEX "player_season_stats_source_player_season_stat_unique" ON "player_season_stats" USING btree ("source","player_id","season","stat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_stat_definitions_source_stat_unique" ON "provider_stat_definitions" USING btree ("source","stat_id","stat_key");--> statement-breakpoint
CREATE INDEX "tournament_course_hole_stats_lookup_idx" ON "tournament_course_hole_stats" USING btree ("tournament_id","course_id","round_scope");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_course_hole_stats_unique" ON "tournament_course_hole_stats" USING btree ("source","tournament_id","course_id","hole_number","round_scope");--> statement-breakpoint
CREATE INDEX "tournament_courses_tournament_idx" ON "tournament_courses" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_courses_tournament_course_unique" ON "tournament_courses" USING btree ("tournament_id","course_id");--> statement-breakpoint
CREATE INDEX "tournament_results_position_idx" ON "tournament_results" USING btree ("tournament_id","position_numeric");--> statement-breakpoint
CREATE INDEX "tournament_results_player_tournament_idx" ON "tournament_results" USING btree ("player_id","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_results_source_tournament_player_unique" ON "tournament_results" USING btree ("source","tournament_id","player_id");--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_feature_set_id_model_feature_sets_id_fk" FOREIGN KEY ("feature_set_id") REFERENCES "public"."model_feature_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "books_name_region_unique" ON "books" USING btree ("name","region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "markets_price_unique" ON "markets" USING btree ("tournament_id","player_id","book_id","market_type","source");--> statement-breakpoint
CREATE INDEX "model_runs_lookup_idx" ON "model_runs" USING btree ("model_name","model_version","run_type");--> statement-breakpoint
CREATE UNIQUE INDEX "model_runs_input_unique" ON "model_runs" USING btree ("model_name","model_version","input_hash","run_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "odds_market_snapshot_unique" ON "odds_snapshots" USING btree ("market_id","raw_snapshot_key");--> statement-breakpoint
CREATE UNIQUE INDEX "predictions_run_market_unique" ON "predictions" USING btree ("model_run_id","tournament_id","player_id","market_type");
