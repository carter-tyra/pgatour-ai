import {
  type AlertType,
  alertTypes,
  type BetStatus,
  betStatuses,
  type ConfidenceLevel,
  type ContestType,
  confidenceLevels,
  contestTypes,
  type DataSource,
  dataSources,
  type MarketType,
  marketTypes,
  type SubscriptionTier,
  subscriptionTiers,
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

export const sourceEntityMappings = pgTable(
  "source_entity_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: dataSourceEnum("source").notNull(),
    entityType: text("entity_type").notNull(),
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
    status: text("status").notNull().default("entered"),
    seed: integer("seed"),
    teeWave: text("tee_wave"),
    sourceIds: jsonb("source_ids").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fieldUnique: uniqueIndex("field_entries_tournament_player_unique").on(
      table.tournamentId,
      table.playerId,
    ),
  }),
);

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  region: text("region").notNull().default("US"),
  isActive: boolean("is_active").notNull().default(true),
});

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

export const teeTimes = pgTable("tee_times", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  roundNumber: integer("round_number").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  tee: text("tee").notNull(),
  wave: text("wave").notNull(),
});

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

export const modelRuns = pgTable("model_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version").notNull(),
  codeVersion: text("code_version").notNull(),
  inputHash: text("input_hash").notNull(),
  outputSchemaVersion: text("output_schema_version").notNull(),
  status: text("status").notNull().default("complete"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
});

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelRunId: uuid("model_run_id")
      .notNull()
      .references(() => modelRuns.id),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    marketType: marketTypeEnum("market_type").notNull(),
    probability: numeric("probability", { precision: 10, scale: 6 }).notNull(),
    fairAmericanOdds: integer("fair_american_odds").notNull(),
    confidence: confidenceLevelEnum("confidence").notNull(),
    drivers: jsonb("drivers").$type<string[]>().notNull().default([]),
    risks: jsonb("risks").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    predictionLookupIdx: index("predictions_lookup_idx").on(
      table.tournamentId,
      table.marketType,
      table.playerId,
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

export const userBets = pgTable("user_bets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
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
});

export const userWatchlists = pgTable("user_watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  playerIds: jsonb("player_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    alertDedupeUnique: uniqueIndex("alerts_dedupe_unique").on(table.userId, table.dedupeKey),
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
