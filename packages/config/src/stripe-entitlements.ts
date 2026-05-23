import { entitlements, type SubscriptionTier, subscriptionTiers } from "@pgatour-ai/domain";

export const stripeProductLookupKeys: Record<SubscriptionTier, string> = {
  free: "pgatour_ai_free",
  pro: "pgatour_ai_pro_monthly",
  elite: "pgatour_ai_elite_monthly",
};

export function tierFromLookupKey(lookupKey: string): SubscriptionTier {
  const match = subscriptionTiers.find((tier) => stripeProductLookupKeys[tier] === lookupKey);

  if (!match) {
    throw new Error(`Unknown Stripe lookup key: ${lookupKey}`);
  }

  return match;
}

export function entitlementPayloadForTier(tier: SubscriptionTier) {
  return {
    tier,
    features: entitlements[tier],
  };
}
