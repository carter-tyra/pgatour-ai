import { describe, expect, it } from "vitest";
import { modelEdgeFor } from "./intelligence-math";
import type { PlayerIntelligence } from "./intelligence-types";

function playerWithOverrides(overrides: Partial<PlayerIntelligence> = {}): PlayerIntelligence {
  return {
    archetype: "Model v0 projection",
    confidence: "medium",
    country: "USA",
    courseFit: 50,
    currentOdds: {
      make_cut: -200,
      matchup: null,
      miss_cut: 200,
      outright: 1000,
      round_leader: null,
      three_ball: null,
      top_10: 300,
      top_20: 200,
      top_5: 500,
    },
    cutProbability: 0.7,
    drivers: ["test driver"],
    form: 50,
    id: "player-1",
    lineMovement: [],
    live: {
      position: "N/A",
      thru: "N/A",
      today: 0,
      total: 0,
    },
    modelMarkets: {},
    name: "Test Player",
    ownership: 0,
    projectedPoints: 0,
    risks: [],
    salary: 0,
    strokesGained: {
      approach: 0,
      offTee: 0,
      putting: 0,
      total: 0,
    },
    teeWave: "AM",
    tier: "contender",
    top20Probability: 0.4,
    volatility: 20,
    winProbability: 0.05,
    ...overrides,
  };
}

describe("modelEdgeFor", () => {
  it("uses market-specific model contract probabilities when present", () => {
    const player = playerWithOverrides({
      modelMarkets: {
        top_5: {
          baselineProbability: 0.2,
          confidence: "high",
          currentExpectedValuePercent: 50,
          currentMarketBook: "DraftKings",
          currentMarketCapturedAt: "2026-06-08T12:00:00.000Z",
          currentMarketImpliedProbability: 1 / 6,
          currentMarketOdds: 500,
          drivers: ["model signal"],
          fairAmericanOdds: 300,
          marketType: "top_5",
          probability: 0.25,
          rank: 1,
          risks: [],
          runMarketImpliedProbability: 0.13,
          runProbabilityEdge: 0.12,
          uncertainty: 0.08,
        },
      },
    });

    expect(modelEdgeFor(player, "top_5")).toEqual({
      edge: 50,
      fairOdds: 300,
      marketOdds: 500,
      modelMarket: player.modelMarkets.top_5,
      modelProbability: 0.25,
    });
  });

  it("falls back to legacy probability fields when the model contract is empty", () => {
    const edge = modelEdgeFor(playerWithOverrides(), "top_20");

    expect(edge?.modelProbability).toBe(0.4);
    expect(edge?.fairOdds).toBe(150);
    expect(edge?.edge).toBeCloseTo(20);
  });

  it("does not emit edges for unpriced markets", () => {
    expect(modelEdgeFor(playerWithOverrides(), "matchup")).toBeNull();
  });
});
