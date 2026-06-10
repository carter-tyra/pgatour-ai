import { describe, expect, it } from "vitest";
import type { CanonicalFieldPlayer, ModelRunSummary } from "./intelligence-types";
import { buildIntelligenceModelContract, type LatestTournamentModelOutput } from "./model-contract";
import { unvalidatedModelQuality } from "./model-quality";

const run: ModelRunSummary = {
  asOf: "2026-06-08T12:00:00.000Z",
  codeVersion: "test",
  completedAt: "2026-06-08T12:10:00.000Z",
  config: { iterations: 20_000 },
  featureSetId: "feature-set-1",
  id: "model-run-1",
  inputHash: "input-hash",
  marketTypes: ["top_5"],
  metrics: {},
  modelName: "simulation-baseline-v0",
  modelVersion: "0.1.0",
  outputSchemaVersion: "1.0.0",
  runType: "inference",
  seed: 17,
  startedAt: "2026-06-08T12:00:00.000Z",
  status: "complete",
  tournamentId: "tournament-1",
  trainingWindowEnd: null,
  trainingWindowStart: null,
};

const fieldPlayer: CanonicalFieldPlayer = {
  country: "USA",
  id: "player-1",
  name: "Test Player",
  odds: {
    top_5: {
      americanOdds: 500,
      book: "DraftKings",
      capturedAt: "2026-06-08T12:00:00.000Z",
      impliedProbability: 1 / 6,
    },
  },
  status: "entered",
  teeTimes: [],
  teeWave: "AM",
};
const quality = unvalidatedModelQuality({
  canAutomate: true,
  helper: "Model-backed actions are on.",
  label: "Model validated",
  status: "validated",
  warnings: [],
});

describe("buildIntelligenceModelContract", () => {
  it("builds serializable model state and player market signals", () => {
    const output: LatestTournamentModelOutput = {
      playersById: new Map([
        [
          "player-1",
          {
            confidence: "high",
            drivers: ["Approach form"],
            predictions: {
              top_5: {
                baselineProbability: 0.2,
                confidence: "high",
                createdAt: "2026-06-08T12:10:00.000Z",
                drivers: ["Approach form"],
                fairAmericanOdds: 300,
                marketId: "market-1",
                marketImpliedProbability: 0.13,
                marketType: "top_5",
                modelEdge: 0.12,
                probability: 0.25,
                rank: 1,
                risks: ["Short price window"],
                simulationSummary: {},
                uncertainty: 0.08,
              },
            },
            probabilities: { top_5: 0.25 },
            risks: ["Short price window"],
            sourceFeatures: {},
          },
        ],
      ]),
      predictionCount: 1,
      quality,
      run,
    };

    const contract = buildIntelligenceModelContract({
      fieldPlayers: [fieldPlayer],
      modelOutput: output,
    });

    expect(contract.model).toMatchObject({
      currentPricedPredictionCount: 1,
      label: "1 modeled players",
      modeledPlayerCount: 1,
      predictionCount: 1,
      quality,
      run,
      runPricedPredictionCount: 1,
      status: "ready",
    });
    expect(contract.model.marketCoverage.top_5).toMatchObject({
      currentPricedPredictionCount: 1,
      currentPriceCount: 1,
      predictionCount: 1,
      runPricedPredictionCount: 1,
    });
    expect(contract.playerModelMarketsById.get("player-1")?.top_5).toMatchObject({
      currentExpectedValuePercent: 50,
      currentMarketBook: "DraftKings",
      currentMarketOdds: 500,
      fairAmericanOdds: 300,
      probability: 0.25,
      runProbabilityEdge: 0.12,
    });
  });

  it("preserves current price coverage when no model run exists", () => {
    const contract = buildIntelligenceModelContract({
      fieldPlayers: [fieldPlayer],
      modelOutput: null,
    });

    expect(contract.model.status).toBe("empty");
    expect(contract.model.marketCoverage.top_5.currentPriceCount).toBe(1);
    expect(contract.model.predictionCount).toBe(0);
    expect(contract.playerModelMarketsById.size).toBe(0);
  });
});
