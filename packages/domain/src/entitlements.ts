import type { FeatureKey, SubscriptionTier } from "./constants";

export type TierEntitlements = Record<FeatureKey, boolean>;

export const entitlements: Record<SubscriptionTier, TierEntitlements> = {
  free: {
    delayedOdds: true,
    fullOddsBoard: false,
    betTracker: false,
    aiAnalyst: false,
    fantasySuite: false,
    standardAlerts: false,
    liveStaleOdds: false,
    advancedSimulation: false,
    exports: false,
    customWatchlists: false,
  },
  pro: {
    delayedOdds: true,
    fullOddsBoard: true,
    betTracker: true,
    aiAnalyst: true,
    fantasySuite: true,
    standardAlerts: true,
    liveStaleOdds: false,
    advancedSimulation: false,
    exports: false,
    customWatchlists: false,
  },
  elite: {
    delayedOdds: true,
    fullOddsBoard: true,
    betTracker: true,
    aiAnalyst: true,
    fantasySuite: true,
    standardAlerts: true,
    liveStaleOdds: true,
    advancedSimulation: true,
    exports: true,
    customWatchlists: true,
  },
};

export function hasFeature(tier: SubscriptionTier, feature: FeatureKey) {
  return entitlements[tier][feature];
}
