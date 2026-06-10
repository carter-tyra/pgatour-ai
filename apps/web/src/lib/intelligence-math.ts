import {
  edgePercentage,
  fairAmericanLineFromProbability,
  type MarketType,
} from "@pgatour-ai/domain";
import type { PlayerIntelligence, PlayerMarketModel } from "./intelligence-types";

function fallbackProbabilityFor(player: PlayerIntelligence, marketType: MarketType) {
  if (marketType === "top_20") {
    return player.top20Probability;
  }

  if (marketType === "outright") {
    return player.winProbability;
  }

  if (marketType === "make_cut") {
    return player.cutProbability;
  }

  if (marketType === "miss_cut" && player.cutProbability > 0 && player.cutProbability < 1) {
    return 1 - player.cutProbability;
  }

  return null;
}

export function modelEdgeFor(player: PlayerIntelligence, marketType: MarketType) {
  const marketOdds = player.currentOdds[marketType];
  const modelMarket: PlayerMarketModel | null = player.modelMarkets[marketType] ?? null;

  if (marketOdds === null) {
    return null;
  }

  const modelProbability =
    modelMarket?.probability ??
    player.modelProbabilities?.[marketType] ??
    fallbackProbabilityFor(player, marketType);

  if (
    modelProbability === null ||
    !Number.isFinite(modelProbability) ||
    modelProbability <= 0 ||
    modelProbability >= 1
  ) {
    return null;
  }

  return {
    edge: edgePercentage(modelProbability, marketOdds),
    fairOdds: modelMarket?.fairAmericanOdds ?? fairAmericanLineFromProbability(modelProbability),
    marketOdds,
    modelMarket,
    modelProbability,
  };
}
