import { describe, expect, it } from "vitest";
import { buildModelEdgeAlertCandidates } from "./model-alerts";
import type { TrackerModelSignal } from "./types";

function signal(overrides: Partial<TrackerModelSignal>): TrackerModelSignal {
  return {
    baselineProbability: 0.2,
    confidence: "high",
    currentExpectedValuePercent: 50,
    currentMarketBook: "DraftKings",
    currentMarketCapturedAt: "2026-06-08T12:00:00.000Z",
    currentMarketImpliedProbability: 1 / 6,
    currentMarketOdds: 500,
    drivers: ["Approach form"],
    fairAmericanOdds: 300,
    marketType: "top_5",
    modelRunId: "model-run-1",
    modelVersion: "simulation-baseline-v0 0.1.0",
    playerId: "player-1",
    playerName: "Priced Player",
    probability: 0.25,
    rank: 1,
    risks: [],
    runMarketImpliedProbability: 0.13,
    runProbabilityEdge: 0.12,
    tournamentId: "tournament-1",
    uncertainty: 0.08,
    ...overrides,
  };
}

describe("model edge alert helpers", () => {
  it("builds deduped alert copy from priced model signals", () => {
    const [candidate] = buildModelEdgeAlertCandidates({
      limit: 10,
      marketTypes: undefined,
      minEdgePercent: 5,
      signals: [signal({})],
    });

    expect(candidate).toMatchObject({
      alertType: "new_edge",
      dedupeKey: "model-edge:model-run-1:tournament-1:player-1:top_5:DraftKings:500",
      reason:
        "Model simulation-baseline-v0 0.1.0 has 25.0% for top 5; fair +300; market +500 at DraftKings; +50.0% EV",
      source: "model",
      title: "Priced Player top 5 edge",
    });
  });

  it("filters unpriced and below-threshold signals", () => {
    expect(
      buildModelEdgeAlertCandidates({
        limit: 10,
        marketTypes: undefined,
        minEdgePercent: 5,
        signals: [
          signal({
            currentExpectedValuePercent: null,
            currentMarketBook: null,
            currentMarketOdds: null,
            playerId: "unpriced-player",
          }),
          signal({
            currentExpectedValuePercent: 4.9,
            playerId: "thin-edge-player",
          }),
        ],
      }),
    ).toEqual([]);
  });

  it("sorts by edge strength and applies market filters and limits", () => {
    const candidates = buildModelEdgeAlertCandidates({
      limit: 1,
      marketTypes: ["top_20"],
      minEdgePercent: 5,
      signals: [
        signal({
          currentExpectedValuePercent: 80,
          marketType: "top_5",
          playerId: "filtered-player",
        }),
        signal({
          currentExpectedValuePercent: 12,
          marketType: "top_20",
          playerId: "lower-edge-player",
          playerName: "Lower Edge",
        }),
        signal({
          currentExpectedValuePercent: 30,
          marketType: "top_20",
          playerId: "higher-edge-player",
          playerName: "Higher Edge",
        }),
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.signal.playerId).toBe("higher-edge-player");
  });
});
