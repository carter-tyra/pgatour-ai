import {
  type AlertDeliveryChannel,
  type AlertDeliveryStatus,
  type AlertType,
  alertDeliveryChannels,
  alertDeliveryStatuses,
  alertTypes,
  type BetStatus,
  betStatuses,
  type ConfidenceLevel,
  type ContestType,
  confidenceLevels,
  contestTypes,
  type DataSource,
  dataSources,
  type FieldEntryStatus,
  type IngestionFreshnessStatus,
  type IngestionTaskStatus,
  ingestionFreshnessStatuses,
  type MarketType,
  type ModelEvaluationScope,
  type ModelRunType,
  marketTypes,
  type SourceEntityType,
  type SubscriptionTier,
  type SyncRunStatus,
  subscriptionTiers,
  syncRunStatuses,
} from "@pgatour-ai/domain";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

function enumValues<TValue extends string>(values: readonly TValue[]) {
  return values as unknown as [TValue, ...TValue[]];
}

export const dataSourceEnum = pgEnum("data_source", enumValues<DataSource>(dataSources));
export const marketTypeEnum = pgEnum("market_type", enumValues<MarketType>(marketTypes));
export const subscriptionTierEnum = pgEnum(
  "subscription_tier",
  enumValues<SubscriptionTier>(subscriptionTiers),
);
export const confidenceLevelEnum = pgEnum(
  "confidence_level",
  enumValues<ConfidenceLevel>(confidenceLevels),
);
export const betStatusEnum = pgEnum("bet_status", enumValues<BetStatus>(betStatuses));
export const contestTypeEnum = pgEnum("contest_type", enumValues<ContestType>(contestTypes));
export const alertTypeEnum = pgEnum("alert_type", enumValues<AlertType>(alertTypes));
export const alertDeliveryChannelEnum = pgEnum(
  "alert_delivery_channel",
  enumValues<AlertDeliveryChannel>(alertDeliveryChannels),
);
export const alertDeliveryStatusEnum = pgEnum(
  "alert_delivery_status",
  enumValues<AlertDeliveryStatus>(alertDeliveryStatuses),
);
export const syncRunStatusEnum = pgEnum(
  "sync_run_status",
  enumValues<SyncRunStatus>(syncRunStatuses),
);
export const ingestionFreshnessStatusEnum = pgEnum(
  "ingestion_freshness_status",
  enumValues<IngestionFreshnessStatus>(ingestionFreshnessStatuses),
);

export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("auth_users_email_unique").on(table.email),
  }),
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("auth_sessions_token_unique").on(table.token),
    userIdx: index("auth_sessions_user_idx").on(table.userId),
  }),
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("auth_accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    userIdx: index("auth_accounts_user_idx").on(table.userId),
  }),
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(table.identifier),
  }),
);

export const sourceEntityMappings = pgTable(
  "source_entity_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    entityType: text("entity_type").$type<SourceEntityType>().notNull(),
    sourceEntityId: text("source_entity_id").notNull(),
    canonicalId: uuid("canonical_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    canonicalIdx: index("source_entity_mappings_canonical_idx").on(
      table.entityType,
      table.canonicalId,
    ),
    sourceEntityUnique: uniqueIndex("source_entity_mappings_source_entity_unique").on(
      table.source,
      table.entityType,
      table.sourceEntityId,
    ),
  }),
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    jobType: text("job_type").notNull(),
    status: syncRunStatusEnum("status").notNull().default("running"),
    season: integer("season"),
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
    counts: jsonb("counts").$type<Record<string, unknown>>().notNull().default({}),
    rawSnapshotKeys: jsonb("raw_snapshot_keys").$type<string[]>().notNull().default([]),
    skipped: jsonb("skipped").$type<string[]>().notNull().default([]),
    error: text("error"),
    codeVersion: text("code_version"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceStartedIdx: index("sync_runs_source_started_idx").on(table.source, table.startedAt),
    statusIdx: index("sync_runs_status_idx").on(table.status),
  }),
);

export const rawSnapshotRecords = pgTable(
  "raw_snapshot_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    syncRunId: uuid("sync_run_id")
      .notNull()
      .references(() => syncRuns.id),
    source: dataSourceEnum("source").notNull(),
    endpoint: text("endpoint").notNull(),
    requestParams: jsonb("request_params").$type<Record<string, string>>().notNull().default({}),
    requestHash: text("request_hash").notNull(),
    payloadHash: text("payload_hash").notNull(),
    snapshotKey: text("snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    schemaVersion: text("schema_version").notNull().default("1"),
    validationStatus: text("validation_status").notNull().default("valid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapshotKeyUnique: uniqueIndex("raw_snapshot_records_snapshot_key_unique").on(
      table.snapshotKey,
    ),
    sourceEndpointCapturedIdx: index("raw_snapshot_records_source_endpoint_captured_idx").on(
      table.source,
      table.endpoint,
      table.capturedAt,
    ),
    syncRunIdx: index("raw_snapshot_records_sync_run_idx").on(table.syncRunId),
  }),
);

export const ingestionFreshness = pgTable(
  "ingestion_freshness",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    resource: text("resource").notNull(),
    status: ingestionFreshnessStatusEnum("status").notNull().default("unknown"),
    latestSyncRunId: uuid("latest_sync_run_id").references(() => syncRuns.id),
    latestCapturedAt: timestamp("latest_captured_at", { withTimezone: true }),
    latestCompletedAt: timestamp("latest_completed_at", { withTimezone: true }),
    staleAfter: timestamp("stale_after", { withTimezone: true }),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceResourceUnique: uniqueIndex("ingestion_freshness_source_resource_unique").on(
      table.source,
      table.resource,
    ),
    statusIdx: index("ingestion_freshness_status_idx").on(table.status),
  }),
);

export const ingestionTasks = pgTable(
  "ingestion_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    resource: text("resource").notNull(),
    taskKey: text("task_key").notNull(),
    status: text("status").$type<IngestionTaskStatus>().notNull().default("pending"),
    season: integer("season"),
    tournamentSourceId: text("tournament_source_id"),
    cursor: text("cursor"),
    attempts: integer("attempts").notNull().default(0),
    counts: jsonb("counts").$type<Record<string, unknown>>().notNull().default({}),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceResourceStatusIdx: index("ingestion_tasks_source_resource_status_idx").on(
      table.source,
      table.resource,
      table.status,
    ),
    sourceResourceTaskUnique: uniqueIndex("ingestion_tasks_source_resource_task_unique").on(
      table.source,
      table.resource,
      table.taskKey,
    ),
  }),
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    country: text("country"),
    status: text("status").notNull().default("active"),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("players_name_idx").on(table.lastName, table.firstName),
  }),
);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region"),
  country: text("country").notNull(),
  par: integer("par").notNull(),
  yardage: integer("yardage").notNull(),
  grass: text("grass"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  timezone: text("timezone"),
  elevationFt: integer("elevation_ft"),
  demandProfile: jsonb("demand_profile").$type<Record<string, unknown>>().notNull().default({}),
  sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const holes = pgTable(
  "holes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    holeNumber: integer("hole_number").notNull(),
    par: integer("par").notNull(),
    yardage: integer("yardage").notNull(),
    scoringProfile: jsonb("scoring_profile").$type<Record<string, unknown>>().notNull().default({}),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    rawSnapshotKey: text("raw_snapshot_key"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    courseHoleUnique: uniqueIndex("holes_course_hole_unique").on(table.courseId, table.holeNumber),
  }),
);

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    name: text("name").notNull(),
    season: integer("season").notNull(),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    status: text("status").notNull().default("scheduled"),
    purseUsd: integer("purse_usd"),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    seasonIdx: index("tournaments_season_idx").on(table.season, table.startsOn),
  }),
);

export const tournamentCourses = pgTable(
  "tournament_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    rounds: jsonb("rounds").$type<number[]>().notNull().default([]),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentCourseIdx: index("tournament_courses_tournament_idx").on(table.tournamentId),
    tournamentCourseUnique: uniqueIndex("tournament_courses_tournament_course_unique").on(
      table.tournamentId,
      table.courseId,
    ),
  }),
);

export const fieldEntries = pgTable(
  "field_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    status: text("status").$type<FieldEntryStatus>().notNull().default("unknown"),
    seed: integer("seed"),
    teeWave: text("tee_wave"),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fieldUnique: uniqueIndex("field_entries_tournament_player_unique").on(
      table.tournamentId,
      table.playerId,
    ),
  }),
);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    region: text("region").notNull().default("US"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    nameRegionUnique: uniqueIndex("books_name_region_unique").on(table.name, table.region),
  }),
);

export const markets = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id),
    marketType: marketTypeEnum("market_type").notNull(),
    source: dataSourceEnum("source").notNull(),
    externalMarketId: text("external_market_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    marketLookupIdx: index("markets_lookup_idx").on(
      table.tournamentId,
      table.marketType,
      table.playerId,
    ),
    marketPriceUnique: uniqueIndex("markets_price_unique").on(
      table.tournamentId,
      table.playerId,
      table.bookId,
      table.marketType,
      table.source,
    ),
  }),
);

export const oddsSnapshots = pgTable(
  "odds_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id),
    americanOdds: integer("american_odds").notNull(),
    decimalOdds: numeric("decimal_odds", { precision: 10, scale: 4 }).notNull(),
    impliedProbability: numeric("implied_probability", { precision: 10, scale: 6 }).notNull(),
    noVigProbability: numeric("no_vig_probability", { precision: 10, scale: 6 }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    rawSnapshotKey: text("raw_snapshot_key"),
  },
  (table) => ({
    oddsMarketTimeIdx: index("odds_market_time_idx").on(table.marketId, table.capturedAt),
    oddsMarketSnapshotUnique: uniqueIndex("odds_market_snapshot_unique").on(
      table.marketId,
      table.rawSnapshotKey,
    ),
  }),
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    roundNumber: integer("round_number").notNull(),
    holeNumber: integer("hole_number"),
    totalScore: integer("total_score").notNull(),
    todayScore: integer("today_score").notNull(),
    position: text("position").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    scoreLiveIdx: index("scores_live_idx").on(table.tournamentId, table.capturedAt),
  }),
);

export const tournamentResults = pgTable(
  "tournament_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    source: dataSourceEnum("source").notNull(),
    position: text("position"),
    positionNumeric: integer("position_numeric"),
    madeCut: boolean("made_cut"),
    withdrawn: boolean("withdrawn").notNull().default(false),
    disqualified: boolean("disqualified").notNull().default(false),
    totalStrokes: integer("total_strokes"),
    parRelativeScore: integer("par_relative_score"),
    earningsUsd: numeric("earnings_usd", { precision: 14, scale: 2 }),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentPositionIdx: index("tournament_results_position_idx").on(
      table.tournamentId,
      table.positionNumeric,
    ),
    playerTournamentIdx: index("tournament_results_player_tournament_idx").on(
      table.playerId,
      table.tournamentId,
    ),
    sourceTournamentPlayerUnique: uniqueIndex(
      "tournament_results_source_tournament_player_unique",
    ).on(table.source, table.tournamentId, table.playerId),
  }),
);

export const tournamentCourseHoleStats = pgTable(
  "tournament_course_hole_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    source: dataSourceEnum("source").notNull(),
    holeNumber: integer("hole_number").notNull(),
    roundNumber: integer("round_number"),
    roundScope: text("round_scope").notNull(),
    scoringAverage: numeric("scoring_average", { precision: 8, scale: 4 }),
    scoringDiff: numeric("scoring_diff", { precision: 8, scale: 4 }),
    difficultyRank: integer("difficulty_rank"),
    eagles: integer("eagles"),
    birdies: integer("birdies"),
    pars: integer("pars"),
    bogeys: integer("bogeys"),
    doubleBogeys: integer("double_bogeys"),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentCourseRoundIdx: index("tournament_course_hole_stats_lookup_idx").on(
      table.tournamentId,
      table.courseId,
      table.roundScope,
    ),
    sourceTournamentHoleUnique: uniqueIndex("tournament_course_hole_stats_unique").on(
      table.source,
      table.tournamentId,
      table.courseId,
      table.holeNumber,
      table.roundScope,
    ),
  }),
);

export const playerRoundResults = pgTable(
  "player_round_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    courseId: uuid("course_id").references(() => courses.id),
    source: dataSourceEnum("source").notNull(),
    roundNumber: integer("round_number").notNull(),
    score: integer("score"),
    parRelativeScore: integer("par_relative_score"),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentRoundIdx: index("player_round_results_tournament_round_idx").on(
      table.tournamentId,
      table.roundNumber,
    ),
    playerRoundIdx: index("player_round_results_player_idx").on(table.playerId, table.capturedAt),
    sourceTournamentPlayerRoundUnique: uniqueIndex(
      "player_round_results_source_tournament_player_round_unique",
    ).on(table.source, table.tournamentId, table.playerId, table.roundNumber),
  }),
);

export const playerRoundStats = pgTable(
  "player_round_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    source: dataSourceEnum("source").notNull(),
    roundNumber: integer("round_number").notNull(),
    sgOffTee: numeric("sg_off_tee", { precision: 8, scale: 4 }),
    sgOffTeeRank: integer("sg_off_tee_rank"),
    sgApproach: numeric("sg_approach", { precision: 8, scale: 4 }),
    sgApproachRank: integer("sg_approach_rank"),
    sgAroundGreen: numeric("sg_around_green", { precision: 8, scale: 4 }),
    sgAroundGreenRank: integer("sg_around_green_rank"),
    sgPutting: numeric("sg_putting", { precision: 8, scale: 4 }),
    sgPuttingRank: integer("sg_putting_rank"),
    sgTotal: numeric("sg_total", { precision: 8, scale: 4 }),
    sgTotalRank: integer("sg_total_rank"),
    drivingAccuracy: numeric("driving_accuracy", { precision: 8, scale: 4 }),
    drivingAccuracyRank: integer("driving_accuracy_rank"),
    drivingDistance: numeric("driving_distance", { precision: 8, scale: 3 }),
    drivingDistanceRank: integer("driving_distance_rank"),
    longestDrive: numeric("longest_drive", { precision: 8, scale: 3 }),
    longestDriveRank: integer("longest_drive_rank"),
    greensInRegulation: numeric("greens_in_regulation", { precision: 8, scale: 4 }),
    greensInRegulationRank: integer("greens_in_regulation_rank"),
    sandSaves: numeric("sand_saves", { precision: 8, scale: 4 }),
    sandSavesRank: integer("sand_saves_rank"),
    scrambling: numeric("scrambling", { precision: 8, scale: 4 }),
    scramblingRank: integer("scrambling_rank"),
    puttsPerGir: numeric("putts_per_gir", { precision: 8, scale: 4 }),
    puttsPerGirRank: integer("putts_per_gir_rank"),
    eagles: integer("eagles"),
    birdies: integer("birdies"),
    pars: integer("pars"),
    bogeys: integer("bogeys"),
    doubleBogeys: integer("double_bogeys"),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentRoundIdx: index("player_round_stats_tournament_round_idx").on(
      table.tournamentId,
      table.roundNumber,
    ),
    playerCapturedIdx: index("player_round_stats_player_captured_idx").on(
      table.playerId,
      table.capturedAt,
    ),
    sourceTournamentPlayerRoundUnique: uniqueIndex(
      "player_round_stats_source_tournament_player_round_unique",
    ).on(table.source, table.tournamentId, table.playerId, table.roundNumber),
  }),
);

export const playerScorecards = pgTable(
  "player_scorecards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    courseId: uuid("course_id").references(() => courses.id),
    source: dataSourceEnum("source").notNull(),
    roundNumber: integer("round_number").notNull(),
    holeNumber: integer("hole_number").notNull(),
    par: integer("par").notNull(),
    score: integer("score"),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentRoundHoleIdx: index("player_scorecards_tournament_round_hole_idx").on(
      table.tournamentId,
      table.roundNumber,
      table.holeNumber,
    ),
    playerTournamentIdx: index("player_scorecards_player_tournament_idx").on(
      table.playerId,
      table.tournamentId,
    ),
    sourceTournamentPlayerRoundHoleUnique: uniqueIndex(
      "player_scorecards_source_tournament_player_round_hole_unique",
    ).on(table.source, table.tournamentId, table.playerId, table.roundNumber, table.holeNumber),
  }),
);

export const playerSeasonStats = pgTable(
  "player_season_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    source: dataSourceEnum("source").notNull(),
    season: integer("season").notNull(),
    statId: integer("stat_id").notNull(),
    statName: text("stat_name").notNull(),
    statCategory: text("stat_category"),
    rank: integer("rank"),
    statValue: jsonb("stat_value").$type<Array<Record<string, string>> | null>(),
    valueNumeric: numeric("value_numeric", { precision: 20, scale: 6 }),
    valueText: text("value_text"),
    rawSnapshotKey: text("raw_snapshot_key").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    playerSeasonIdx: index("player_season_stats_player_season_idx").on(
      table.playerId,
      table.season,
    ),
    sourcePlayerSeasonStatUnique: uniqueIndex(
      "player_season_stats_source_player_season_stat_unique",
    ).on(table.source, table.playerId, table.season, table.statId),
  }),
);

export const providerStatDefinitions = pgTable(
  "provider_stat_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    statId: text("stat_id").notNull(),
    statKey: text("stat_key").notNull(),
    statName: text("stat_name").notNull(),
    statCategory: text("stat_category"),
    canonicalName: text("canonical_name"),
    unit: text("unit"),
    direction: text("direction"),
    parsePolicy: jsonb("parse_policy").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceStatUnique: uniqueIndex("provider_stat_definitions_source_stat_unique").on(
      table.source,
      table.statId,
      table.statKey,
    ),
  }),
);

export const teeTimes = pgTable(
  "tee_times",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    courseId: uuid("course_id").references(() => courses.id),
    roundNumber: integer("round_number").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    tee: text("tee").notNull().default("unknown"),
    wave: text("wave").notNull().default("unknown"),
    startTee: integer("start_tee"),
    groupNumber: integer("group_number"),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentRoundIdx: index("tee_times_tournament_round_idx").on(
      table.tournamentId,
      table.roundNumber,
      table.startsAt,
    ),
    tournamentPlayerRoundUnique: uniqueIndex("tee_times_tournament_player_round_unique").on(
      table.tournamentId,
      table.playerId,
      table.roundNumber,
    ),
  }),
);

export const weatherSnapshots = pgTable("weather_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  forecastAt: timestamp("forecast_at", { withTimezone: true }).notNull(),
  windMph: numeric("wind_mph", { precision: 6, scale: 2 }).notNull(),
  precipitationChance: numeric("precipitation_chance", { precision: 5, scale: 4 }).notNull(),
  wave: text("wave"),
  source: dataSourceEnum("source").notNull(),
});

export const newsItems = pgTable("news_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: dataSourceEnum("source").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  playerId: uuid("player_id").references(() => players.id),
  tournamentId: uuid("tournament_id").references(() => tournaments.id),
  summary: text("summary"),
  bettingRelevance: text("betting_relevance"),
  rawSnapshotKey: text("raw_snapshot_key"),
});

export const modelFeatureSets = pgTable(
  "model_feature_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureSetName: text("feature_set_name").notNull(),
    featureSetVersion: text("feature_set_version").notNull(),
    codeVersion: text("code_version").notNull(),
    inputHash: text("input_hash").notNull(),
    inputManifest: jsonb("input_manifest").$type<Record<string, unknown>>().notNull().default({}),
    trainingWindowStart: timestamp("training_window_start", { withTimezone: true }),
    trainingWindowEnd: timestamp("training_window_end", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    rowCount: integer("row_count").notNull().default(0),
    status: text("status").notNull().default("complete"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    featureSetUnique: uniqueIndex("model_feature_sets_unique").on(
      table.featureSetName,
      table.featureSetVersion,
      table.inputHash,
    ),
  }),
);

export const modelPlayerFeatures = pgTable(
  "model_player_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureSetId: uuid("feature_set_id")
      .notNull()
      .references(() => modelFeatureSets.id),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    longTermSgTotal: numeric("long_term_sg_total", { precision: 8, scale: 4 }),
    recentSgTotal: numeric("recent_sg_total", { precision: 8, scale: 4 }),
    sgOffTee: numeric("sg_off_tee", { precision: 8, scale: 4 }),
    sgApproach: numeric("sg_approach", { precision: 8, scale: 4 }),
    sgAroundGreen: numeric("sg_around_green", { precision: 8, scale: 4 }),
    sgPutting: numeric("sg_putting", { precision: 8, scale: 4 }),
    volatility: numeric("volatility", { precision: 8, scale: 4 }),
    roundsCount: integer("rounds_count"),
    fieldStrengthAdjusted: numeric("field_strength_adjusted", { precision: 8, scale: 4 }),
    courseFit: numeric("course_fit", { precision: 8, scale: 4 }),
    features: jsonb("features").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    featureTournamentIdx: index("model_player_features_tournament_idx").on(
      table.tournamentId,
      table.asOf,
    ),
    featureSetPlayerUnique: uniqueIndex("model_player_features_feature_set_player_unique").on(
      table.featureSetId,
      table.tournamentId,
      table.playerId,
    ),
  }),
);

export const modelRuns = pgTable(
  "model_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelName: text("model_name").notNull(),
    modelVersion: text("model_version").notNull(),
    codeVersion: text("code_version").notNull(),
    inputHash: text("input_hash").notNull(),
    outputSchemaVersion: text("output_schema_version").notNull(),
    status: text("status").notNull().default("complete"),
    runType: text("run_type").$type<ModelRunType>().notNull().default("inference"),
    tournamentId: uuid("tournament_id").references(() => tournaments.id),
    featureSetId: uuid("feature_set_id").references(() => modelFeatureSets.id),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    seed: integer("seed"),
    asOf: timestamp("as_of", { withTimezone: true }),
    trainingWindowStart: timestamp("training_window_start", { withTimezone: true }),
    trainingWindowEnd: timestamp("training_window_end", { withTimezone: true }),
    marketTypes: jsonb("market_types").$type<MarketType[]>().notNull().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    modelRunLookupIdx: index("model_runs_lookup_idx").on(
      table.modelName,
      table.modelVersion,
      table.runType,
    ),
    modelRunInputUnique: uniqueIndex("model_runs_input_unique").on(
      table.modelName,
      table.modelVersion,
      table.inputHash,
      table.runType,
    ),
  }),
);

export const modelRunInputs = pgTable(
  "model_run_inputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelRunId: uuid("model_run_id")
      .notNull()
      .references(() => modelRuns.id),
    rawSnapshotRecordId: uuid("raw_snapshot_record_id").references(() => rawSnapshotRecords.id),
    featureSetId: uuid("feature_set_id").references(() => modelFeatureSets.id),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    modelRunInputIdx: index("model_run_inputs_model_run_idx").on(table.modelRunId, table.role),
  }),
);

export const modelBacktests = pgTable(
  "model_backtests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelName: text("model_name").notNull(),
    modelVersion: text("model_version").notNull(),
    featureSetId: uuid("feature_set_id").references(() => modelFeatureSets.id),
    featureSetVersion: text("feature_set_version").notNull(),
    trainingWindowStart: timestamp("training_window_start", { withTimezone: true }).notNull(),
    trainingWindowEnd: timestamp("training_window_end", { withTimezone: true }).notNull(),
    testWindowStart: timestamp("test_window_start", { withTimezone: true }).notNull(),
    testWindowEnd: timestamp("test_window_end", { withTimezone: true }).notNull(),
    marketTypes: jsonb("market_types").$type<MarketType[]>().notNull().default([]),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
    calibration: jsonb("calibration").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("complete"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    modelBacktestLookupIdx: index("model_backtests_lookup_idx").on(
      table.modelName,
      table.modelVersion,
      table.createdAt,
    ),
  }),
);

export const modelBacktestPredictions = pgTable(
  "model_backtest_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelBacktestId: uuid("model_backtest_id")
      .notNull()
      .references(() => modelBacktests.id),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    marketType: marketTypeEnum("market_type").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    probability: numeric("probability", { precision: 10, scale: 6 }).notNull(),
    fairAmericanOdds: integer("fair_american_odds").notNull(),
    actualOutcome: boolean("actual_outcome"),
    finishPosition: integer("finish_position"),
    closingAmericanOdds: integer("closing_american_odds"),
    closingLineValue: numeric("closing_line_value", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    backtestMarketIdx: index("model_backtest_predictions_market_idx").on(
      table.modelBacktestId,
      table.marketType,
    ),
    backtestPredictionUnique: uniqueIndex("model_backtest_predictions_unique").on(
      table.modelBacktestId,
      table.tournamentId,
      table.playerId,
      table.marketType,
      table.asOf,
    ),
  }),
);

export const modelEvaluations = pgTable(
  "model_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelRunId: uuid("model_run_id").references(() => modelRuns.id),
    modelBacktestId: uuid("model_backtest_id").references(() => modelBacktests.id),
    scope: text("scope").$type<ModelEvaluationScope>().notNull(),
    marketType: marketTypeEnum("market_type"),
    tournamentId: uuid("tournament_id").references(() => tournaments.id),
    brierScore: numeric("brier_score", { precision: 10, scale: 6 }),
    logLoss: numeric("log_loss", { precision: 10, scale: 6 }),
    calibrationError: numeric("calibration_error", { precision: 10, scale: 6 }),
    coverage: numeric("coverage", { precision: 10, scale: 6 }),
    averageClosingLineValue: numeric("average_closing_line_value", { precision: 10, scale: 6 }),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    modelEvaluationLookupIdx: index("model_evaluations_lookup_idx").on(
      table.scope,
      table.marketType,
      table.createdAt,
    ),
  }),
);

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelRunId: uuid("model_run_id")
      .notNull()
      .references(() => modelRuns.id),
    marketId: uuid("market_id").references(() => markets.id),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    marketType: marketTypeEnum("market_type").notNull(),
    probability: numeric("probability", { precision: 10, scale: 6 }).notNull(),
    fairAmericanOdds: integer("fair_american_odds").notNull(),
    baselineProbability: numeric("baseline_probability", { precision: 10, scale: 6 }),
    marketImpliedProbability: numeric("market_implied_probability", { precision: 10, scale: 6 }),
    modelEdge: numeric("model_edge", { precision: 10, scale: 6 }),
    uncertainty: numeric("uncertainty", { precision: 10, scale: 6 }),
    rank: integer("rank"),
    confidence: confidenceLevelEnum("confidence").notNull(),
    drivers: jsonb("drivers").$type<string[]>().notNull().default([]),
    risks: jsonb("risks").$type<string[]>().notNull().default([]),
    simulationSummary: jsonb("simulation_summary")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    predictionLookupIdx: index("predictions_lookup_idx").on(
      table.tournamentId,
      table.marketType,
      table.playerId,
    ),
    predictionRunMarketUnique: uniqueIndex("predictions_run_market_unique").on(
      table.modelRunId,
      table.tournamentId,
      table.playerId,
      table.marketType,
    ),
  }),
);

export const fantasyContests = pgTable("fantasy_contests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  provider: text("provider").notNull(),
  contestType: contestTypeEnum("contest_type").notNull(),
  salaryCap: integer("salary_cap").notNull(),
  rosterSize: integer("roster_size").notNull(),
  rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default({}),
});

export const lineups = pgTable("lineups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  fantasyContestId: uuid("fantasy_contest_id")
    .notNull()
    .references(() => fantasyContests.id),
  name: text("name").notNull(),
  playerIds: jsonb("player_ids").$type<string[]>().notNull(),
  projection: numeric("projection", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBets = pgTable(
  "user_bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    marketType: marketTypeEnum("market_type").notNull(),
    book: text("book").notNull(),
    stake: numeric("stake", { precision: 12, scale: 2 }).notNull(),
    americanOdds: integer("american_odds").notNull(),
    status: betStatusEnum("status").notNull().default("open"),
    thesis: text("thesis"),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("user_bets_user_created_idx").on(table.userId, table.createdAt),
    userTournamentStatusIdx: index("user_bets_user_tournament_status_idx").on(
      table.userId,
      table.tournamentId,
      table.status,
    ),
  }),
);

export const userWatchlists = pgTable(
  "user_watchlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTournamentIdx: index("user_watchlists_user_tournament_idx").on(
      table.userId,
      table.tournamentId,
    ),
    userTournamentNameUnique: uniqueIndex("user_watchlists_user_tournament_name_unique").on(
      table.userId,
      table.tournamentId,
      table.name,
    ),
  }),
);

export const userWatchlistPlayers = pgTable(
  "user_watchlist_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => userWatchlists.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    playerIdx: index("user_watchlist_players_player_idx").on(table.playerId),
    watchlistPlayerUnique: uniqueIndex("user_watchlist_players_watchlist_player_unique").on(
      table.watchlistId,
      table.playerId,
    ),
    watchlistPositionIdx: index("user_watchlist_players_watchlist_position_idx").on(
      table.watchlistId,
      table.position,
    ),
  }),
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    alertType: alertTypeEnum("alert_type").notNull(),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    source: dataSourceEnum("source").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    alertDedupeUnique: uniqueIndex("alerts_dedupe_unique").on(table.userId, table.dedupeKey),
    userAcknowledgedCreatedIdx: index("alerts_user_acknowledged_created_idx").on(
      table.userId,
      table.acknowledgedAt,
      table.createdAt,
    ),
    userCreatedIdx: index("alerts_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const alertPreferences = pgTable(
  "alert_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    alertType: alertTypeEnum("alert_type").notNull(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userAlertTypeUnique: uniqueIndex("alert_preferences_user_alert_type_unique").on(
      table.userId,
      table.alertType,
    ),
    userIdx: index("alert_preferences_user_idx").on(table.userId),
    userMutedUntilIdx: index("alert_preferences_user_muted_until_idx").on(
      table.userId,
      table.mutedUntil,
    ),
  }),
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    channel: alertDeliveryChannelEnum("channel").notNull(),
    status: alertDeliveryStatusEnum("status").notNull().default("pending"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    alertChannelUnique: uniqueIndex("alert_deliveries_alert_channel_unique").on(
      table.alertId,
      table.channel,
    ),
    channelStatusClaimedIdx: index("alert_deliveries_channel_status_claimed_idx").on(
      table.channel,
      table.status,
      table.claimedAt,
    ),
    userChannelStatusCreatedIdx: index("alert_deliveries_user_channel_status_created_idx").on(
      table.userId,
      table.channel,
      table.status,
      table.createdAt,
    ),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
