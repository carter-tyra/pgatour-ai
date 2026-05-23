import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  deadHeatReturn,
  decimalToAmerican,
  edgePercentage,
  fairAmericanLineFromProbability,
  fractionalKellyStake,
  impliedProbabilityFromAmerican,
  noVigProbabilities,
} from "../odds";

describe("odds math", () => {
  it("converts American odds to decimal odds", () => {
    expect(americanToDecimal(150)).toBe(2.5);
    expect(americanToDecimal(-200)).toBe(1.5);
  });

  it("converts decimal odds to American odds", () => {
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(1.5)).toBe(-200);
  });

  it("computes implied probability", () => {
    expect(impliedProbabilityFromAmerican(300)).toBeCloseTo(0.25);
    expect(impliedProbabilityFromAmerican(-150)).toBeCloseTo(0.6);
  });

  it("converts probabilities to fair American lines", () => {
    expect(fairAmericanLineFromProbability(0.25)).toBe(300);
    expect(fairAmericanLineFromProbability(0.6)).toBe(-150);
  });

  it("removes vig from a two-way market", () => {
    const prices = noVigProbabilities([
      { label: "Player A", americanOdds: -110 },
      { label: "Player B", americanOdds: -110 },
    ]);

    expect(prices[0]?.noVigProbability).toBeCloseTo(0.5);
    expect(prices[1]?.noVigProbability).toBeCloseTo(0.5);
  });

  it("computes expected value edge", () => {
    expect(edgePercentage(0.3, 300)).toBeCloseTo(20);
  });

  it("caps negative fractional Kelly stake at zero", () => {
    expect(
      fractionalKellyStake({
        bankroll: 1000,
        modelProbability: 0.2,
        americanOdds: 200,
      }),
    ).toBe(0);
  });

  it("calculates dead heat return", () => {
    expect(
      deadHeatReturn({
        stake: 100,
        americanOdds: 200,
        winners: 1,
        tiedPlayers: 2,
      }),
    ).toBe(150);
  });
});
