export const dataSources = [
  "datagolf",
  "sportsdataio",
  "the-odds-api",
  "balldontlie",
  "manual",
  "model",
] as const;

export type DataSource = (typeof dataSources)[number];

export const marketTypes = [
  "outright",
  "top_5",
  "top_10",
  "top_20",
  "make_cut",
  "miss_cut",
  "matchup",
  "three_ball",
  "round_leader",
] as const;

export type MarketType = (typeof marketTypes)[number];

export const subscriptionTiers = ["free", "pro", "elite"] as const;

export type SubscriptionTier = (typeof subscriptionTiers)[number];

export const confidenceLevels = ["low", "medium", "high"] as const;

export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const betStatuses = ["open", "won", "lost", "push", "void"] as const;

export type BetStatus = (typeof betStatuses)[number];

export const fieldEntryStatuses = [
  "entered",
  "withdrawn",
  "alternate",
  "qualified",
  "unknown",
] as const;

export type FieldEntryStatus = (typeof fieldEntryStatuses)[number];

export const contestTypes = ["cash", "single_entry", "small_field_gpp", "large_field_gpp"] as const;

export type ContestType = (typeof contestTypes)[number];

export const alertTypes = [
  "new_edge",
  "odds_move",
  "stale_book",
  "withdrawal",
  "weather_wave",
  "cutline_danger",
  "portfolio_swing",
  "lineup_survival",
  "clv_update",
] as const;

export type AlertType = (typeof alertTypes)[number];

export const alertDeliveryChannels = ["in_app", "email"] as const;

export type AlertDeliveryChannel = (typeof alertDeliveryChannels)[number];

export const alertDeliveryStatuses = ["pending", "delivered", "failed", "skipped"] as const;

export type AlertDeliveryStatus = (typeof alertDeliveryStatuses)[number];

export const modelEdgeAlertDefaultMinEdgePercent = 5;
export const modelEdgeAlertDefaultLimit = 25;
export const modelEdgeAlertMaxLimit = 100;

export const syncRunStatuses = ["running", "succeeded", "failed", "partial"] as const;

export type SyncRunStatus = (typeof syncRunStatuses)[number];

export const ingestionFreshnessStatuses = ["unknown", "fresh", "stale", "failed"] as const;

export type IngestionFreshnessStatus = (typeof ingestionFreshnessStatuses)[number];

export const sourceEntityTypes = [
  "course",
  "course_hole",
  "field_entry",
  "market",
  "player",
  "player_round_result",
  "player_round_stat",
  "player_scorecard",
  "player_season_stat",
  "tee_time",
  "tournament",
  "tournament_course",
  "tournament_course_hole_stat",
  "tournament_result",
] as const;

export type SourceEntityType = (typeof sourceEntityTypes)[number];

export const ballDontLieHistoricalResources = [
  "core",
  "course_holes",
  "tournament_results",
  "tournament_course_stats",
  "player_round_results",
  "player_round_stats",
  "player_season_stats",
  "futures",
  "scorecards",
] as const;

export type BallDontLieHistoricalResource = (typeof ballDontLieHistoricalResources)[number];

export const ballDontLieProviderEmptyHistoricalFacts = [
  {
    reason:
      "BALLDONTLIE returns tournament and round results but no player round stats for the Masters.",
    resource: "player_round_stats",
    season: 2026,
    tournamentSourceId: "20",
  },
  {
    reason:
      "Zurich Classic is a team event and BALLDONTLIE does not return player-level historical facts from these PGA endpoints.",
    resource: "tournament_results",
    season: 2026,
    tournamentSourceId: "22",
  },
  {
    reason:
      "Zurich Classic is a team event and BALLDONTLIE does not return player-level historical facts from these PGA endpoints.",
    resource: "player_round_results",
    season: 2026,
    tournamentSourceId: "22",
  },
  {
    reason:
      "Zurich Classic is a team event and BALLDONTLIE does not return player-level historical facts from these PGA endpoints.",
    resource: "player_round_stats",
    season: 2026,
    tournamentSourceId: "22",
  },
] as const;

export type BallDontLieProviderEmptyHistoricalFact =
  (typeof ballDontLieProviderEmptyHistoricalFacts)[number];

export const ingestionTaskStatuses = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
] as const;

export type IngestionTaskStatus = (typeof ingestionTaskStatuses)[number];

export const modelRunTypes = ["inference", "backtest", "research"] as const;

export type ModelRunType = (typeof modelRunTypes)[number];

export const modelEvaluationScopes = [
  "overall",
  "market",
  "tournament",
  "player",
  "decile",
] as const;

export type ModelEvaluationScope = (typeof modelEvaluationScopes)[number];

export const featureKeys = [
  "delayedOdds",
  "fullOddsBoard",
  "betTracker",
  "aiAnalyst",
  "fantasySuite",
  "standardAlerts",
  "liveStaleOdds",
  "advancedSimulation",
  "exports",
  "customWatchlists",
] as const;

export type FeatureKey = (typeof featureKeys)[number];
