export const featureFlags = {
  liveTools: "live-tools",
  aiAnalyst: "ai-analyst",
  fantasySuite: "fantasy-suite",
  paidBeta: "paid-beta",
  providerSync: "provider-sync",
} as const;

export type FeatureFlag = (typeof featureFlags)[keyof typeof featureFlags];

export type FeatureFlagState = Record<FeatureFlag, boolean>;

export const defaultFeatureFlagState: FeatureFlagState = {
  [featureFlags.liveTools]: true,
  [featureFlags.aiAnalyst]: true,
  [featureFlags.fantasySuite]: true,
  [featureFlags.paidBeta]: true,
  [featureFlags.providerSync]: false,
};
