import { describe, expect, it } from "vitest";
import type { PlayerMarketModel } from "@/lib/intelligence-types";
import {
  buildModelBackedBetInput,
  buildModelBackedThesis,
  hasCurrentMarketPrice,
} from "./model-tracker";

const pricedSignal: PlayerMarketModel = {
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
  probability: 0.25,
  rank: 1,
  risks: [],
  runMarketImpliedProbability: 0.13,
  runProbabilityEdge: 0.12,
  uncertainty: 0.08,
};

describe("model tracker helpers", () => {
  it("detects current market price availability", () => {
    expect(hasCurrentMarketPrice(pricedSignal)).toBe(true);
    expect(
      hasCurrentMarketPrice({
        ...pricedSignal,
        currentMarketBook: null,
        currentMarketOdds: null,
      }),
    ).toBe(false);
  });

  it("builds source-backed thesis copy from the model signal", () => {
    expect(buildModelBackedThesis({ marketType: "top_5", signal: pricedSignal })).toBe(
      "Model v0 top 5 25.0%; fair +300; market +500 at DraftKings; +50.0% EV",
    );
  });

  it("builds a bet tracker draft from server-derived price fields", () => {
    if (!hasCurrentMarketPrice(pricedSignal)) {
      throw new Error("expected priced signal");
    }

    expect(
      buildModelBackedBetInput({
        input: {
          marketType: "top_5",
          playerId: "22222222-2222-4222-8222-222222222222",
          stake: 50,
          tournamentId: "11111111-1111-4111-8111-111111111111",
        },
        signal: pricedSignal,
      }),
    ).toEqual({
      americanOdds: 500,
      book: "DraftKings",
      marketType: "top_5",
      playerId: "22222222-2222-4222-8222-222222222222",
      stake: 50,
      thesis: "Model v0 top 5 25.0%; fair +300; market +500 at DraftKings; +50.0% EV",
      tournamentId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
