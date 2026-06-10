import { describe, expect, it } from "vitest";
import { buildModelQualitySummary, unvalidatedModelQuality } from "./model-quality";

const backtest = {
  createdAt: "2026-06-09T12:00:00.000Z",
  id: "backtest-1",
  metrics: {
    manifest: {
      config: {
        marketTypes: ["top_5", "top_20"],
      },
      rowCounts: {
        knownOutcomePredictions: 750,
        predictions: 900,
        targets: 3,
      },
      targetTournaments: [{ id: "fallback-tournament-1" }],
    },
    rowCounts: {
      knownOutcomePredictions: 750,
      predictions: 900,
      pricedClosingPredictions: 250,
    },
    summary: {
      averageClosingLineValue: 0.0123,
      brierScore: 0.16,
      calibrationError: 0.06,
      coverage: 0.83,
      logLoss: 0.92,
    },
  },
  modelName: "simulation-baseline-v0",
  modelVersion: "0.1.0",
};

function overall(overrides: Record<string, unknown> = {}) {
  return {
    averageClosingLineValue: 0.0123,
    brierScore: 0.16,
    calibrationError: 0.06,
    coverage: 0.83,
    logLoss: 0.92,
    marketType: null,
    metrics: {
      calibrationBins: [
        {
          averageProbability: 0.08,
          count: 90,
          endProbability: 0.12,
          outcomeRate: 0.1,
          startProbability: 0.04,
        },
        {
          averageProbability: 0.32,
          count: 90,
          endProbability: 0.4,
          outcomeRate: 0.29,
          startProbability: 0.25,
        },
        {
          averageProbability: null,
          count: 90,
          endProbability: 0.5,
          outcomeRate: 0.4,
          startProbability: 0.4,
        },
      ],
      knownOutcomeCount: 750,
      predictionCount: 900,
      probabilityDrift: -0.01,
    },
    scope: "overall",
    tournamentId: null,
    ...overrides,
  };
}

describe("model quality policy", () => {
  it("promotes models only when all quality gates pass", () => {
    const summary = buildModelQualitySummary({
      backtest,
      evaluations: [
        overall(),
        { ...overall(), marketType: "top_20", scope: "market" },
        { ...overall(), scope: "tournament", tournamentId: "tournament-1" },
      ],
    });

    expect(summary).toMatchObject({
      averageClosingLineValue: 0.0123,
      calibrationBins: [
        {
          averageProbability: 0.08,
          count: 90,
          endProbability: 0.12,
          outcomeRate: 0.1,
          startProbability: 0.04,
        },
        {
          averageProbability: 0.32,
          count: 90,
          endProbability: 0.4,
          outcomeRate: 0.29,
          startProbability: 0.25,
        },
      ],
      canAutomate: true,
      closingLineValueCoverage: 250 / 900,
      closingLineValuePredictionCount: 250,
      knownOutcomeCount: 750,
      label: "Model validated",
      marketCount: 1,
      predictionCount: 900,
      probabilityDrift: -0.01,
      status: "validated",
      tournamentCount: 1,
    });
    expect(summary.gates.every((gate) => gate.passed)).toBe(true);
  });

  it("keeps automation off when any quality gate fails", () => {
    const summary = buildModelQualitySummary({
      backtest: {
        ...backtest,
        metrics: {
          rowCounts: {
            knownOutcomePredictions: 284,
            predictions: 360,
            pricedClosingPredictions: 0,
          },
        },
      },
      evaluations: [overall({ calibrationError: 0.09831, coverage: 0.788889 })],
    });

    expect(summary.canAutomate).toBe(false);
    expect(summary.status).toBe("limited");
    expect(summary.warnings).toContain("Needs 500 known outcomes before automation.");
  });

  it("returns an unvalidated state when no completed backtest is available", () => {
    expect(unvalidatedModelQuality()).toMatchObject({
      canAutomate: false,
      calibrationBins: [],
      closingLineValueCoverage: null,
      closingLineValuePredictionCount: 0,
      label: "Not validated",
      status: "unvalidated",
    });
  });

  it("uses persisted backtest metrics when evaluation rows are missing", () => {
    const summary = buildModelQualitySummary({
      backtest,
      evaluations: [],
    });

    expect(summary).toMatchObject({
      averageClosingLineValue: 0.0123,
      brierScore: 0.16,
      calibrationBins: [],
      calibrationError: 0.06,
      closingLineValueCoverage: 250 / 900,
      coverage: 0.83,
      knownOutcomeCount: 750,
      logLoss: 0.92,
      marketCount: 2,
      predictionCount: 900,
      probabilityDrift: null,
      tournamentCount: 3,
    });
  });
});
