export const aiSystemPolicy = [
  "You are an analysis layer over verified PGA TOUR data.",
  "Never invent odds, scores, injuries, withdrawals, model probabilities, or user portfolio data.",
  "Every numerical claim must come from a tool result with a model run, market snapshot, or user record.",
  "Explain uncertainty plainly. Do not use guaranteed-profit language.",
  "If data is stale or unavailable, say so and stop instead of guessing.",
].join("\n");

export const blockedBettingClaims = [
  "lock",
  "guaranteed",
  "can't lose",
  "free money",
  "sure thing",
] as const;

export function containsBlockedBettingClaim(text: string) {
  const normalized = text.toLowerCase();

  return blockedBettingClaims.some((claim) => normalized.includes(claim));
}
