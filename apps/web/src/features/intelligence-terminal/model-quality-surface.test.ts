import { type MarketType, marketTypes } from "@pgatour-ai/domain";
import { describe, expect, it } from "vitest";
import type { PlayerIntelligence } from "@/lib/intelligence-types";
import {
  buildModelEdgeCandidates,
  formatEdgePercent,
  formatSignedPoints,
  marketLabel,
} from "./model-quality-surface";

function currentOdds(overrides: Partial<Record<MarketType, number | null>> = {}) {
  return {
    ...Object.fromEntries(marketTypes.map((marketType) => [marketType, null])),
    ...overrides,
  } as Record<MarketType, number | null>;
}

function player(
  id: string,
  overrides: {
    modelProbability?: number;
    name?: string;
    odds?: number | null;
  } = {},
): PlayerIntelligence {
  const odds = "odds" in overrides ? (overrides.odds ?? null) : 500;
  const probability = overrides.modelProbability ?? 0.25;

  return {
    archetype: "Model v0 projection",
    confidence: "high",
    country: "USA",
    courseFit: 60,
    currentOdds: currentOdds({ top_20: odds }),
    cutProbability: 0,
    drivers: ["Approach form"],
    form: 60,
    id,
    lineMovement: [],
    live: {
      position: "N/A",
      thru: "N/A",
      today: 0,
      total: 0,
    },
    modelMarkets: {
      top_20: {
        baselineProbability: null,
        confidence: "high",
        currentExpectedValuePercent: null,
        currentMarketBook: "DraftKings",
        currentMarketCapturedAt: "2026-06-09T12:00:00.000Z",
        currentMarketImpliedProbability: null,
        currentMarketOdds: odds,
        drivers: ["Approach form"],
        fairAmericanOdds: 300,
        marketType: "top_20",
        probability,
        rank: 1,
        risks: [],
        runMarketImpliedProbability: null,
        runProbabilityEdge: null,
        uncertainty: 0.1,
      },
    },
    modelProbabilities: { top_20: probability },
    name: overrides.name ?? id,
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
    teeWave: "TBD",
    tier: "contender",
    top20Probability: probability,
    volatility: 10,
    winProbability: 0,
  };
}

describe("model quality surface helpers", () => {
  it("sorts positive model edges and filters unpriced or negative candidates", () => {
    const candidates = buildModelEdgeCandidates({
      limit: 2,
      marketTypes: ["top_20"],
      players: [
        player("lower", { modelProbability: 0.2, name: "Lower Edge", odds: 400 }),
        player("higher", { modelProbability: 0.28, name: "Higher Edge", odds: 500 }),
        player("negative", { modelProbability: 0.1, name: "Negative Edge", odds: 200 }),
        player("unpriced", { modelProbability: 0.4, name: "Unpriced", odds: null }),
      ],
    });

    expect(candidates.map((candidate) => candidate.player.id)).toEqual(["higher", "lower"]);
    expect(candidates[0]?.edge.edge).toBeGreaterThan(candidates[1]?.edge.edge ?? 0);
  });

  it("formats compact model quality values for action surfaces", () => {
    expect(formatEdgePercent(12.345)).toBe("+12.3% EV");
    expect(formatSignedPoints(-0.0169)).toBe("-1.7 pts");
    expect(marketLabel("top_20")).toBe("Top 20");
  });
});
