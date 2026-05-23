export const dataSources = ["datagolf", "sportsdataio", "the-odds-api", "manual", "model"] as const;

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
