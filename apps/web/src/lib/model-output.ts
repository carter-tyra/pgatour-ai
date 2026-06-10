import "server-only";

import { modelRuns, predictions } from "@pgatour-ai/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database";
import type {
  LatestTournamentModelOutput,
  PlayerTournamentModelOutput,
  TournamentModelPredictionOutput,
} from "./model-contract";
import { selectLatestModelQuality } from "./model-quality-output";

function nullableNumberFromNumeric(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumberFromNumeric(value: number | string, label: string): number {
  const parsed = nullableNumberFromNumeric(value);

  if (parsed === null) {
    throw new Error(`${label} must be numeric.`);
  }

  return parsed;
}

function toIsoTimestamp(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function selectLatestTournamentModelOutput(
  tournamentId: string,
): Promise<LatestTournamentModelOutput | null> {
  const db = getDatabase();
  const [latestRun] = await db
    .select({
      asOf: modelRuns.asOf,
      codeVersion: modelRuns.codeVersion,
      completedAt: modelRuns.completedAt,
      config: modelRuns.config,
      featureSetId: modelRuns.featureSetId,
      id: modelRuns.id,
      inputHash: modelRuns.inputHash,
      marketTypes: modelRuns.marketTypes,
      metrics: modelRuns.metrics,
      modelName: modelRuns.modelName,
      modelVersion: modelRuns.modelVersion,
      outputSchemaVersion: modelRuns.outputSchemaVersion,
      runType: modelRuns.runType,
      seed: modelRuns.seed,
      startedAt: modelRuns.startedAt,
      status: modelRuns.status,
      tournamentId: modelRuns.tournamentId,
      trainingWindowEnd: modelRuns.trainingWindowEnd,
      trainingWindowStart: modelRuns.trainingWindowStart,
    })
    .from(modelRuns)
    .where(
      and(
        eq(modelRuns.tournamentId, tournamentId),
        eq(modelRuns.runType, "inference"),
        eq(modelRuns.status, "complete"),
      ),
    )
    .orderBy(desc(modelRuns.completedAt), desc(modelRuns.startedAt))
    .limit(1);

  if (!latestRun) {
    return null;
  }

  const [rows, quality] = await Promise.all([
    db
      .select({
        baselineProbability: predictions.baselineProbability,
        confidence: predictions.confidence,
        createdAt: predictions.createdAt,
        drivers: predictions.drivers,
        fairAmericanOdds: predictions.fairAmericanOdds,
        marketId: predictions.marketId,
        marketImpliedProbability: predictions.marketImpliedProbability,
        marketType: predictions.marketType,
        modelEdge: predictions.modelEdge,
        playerId: predictions.playerId,
        probability: predictions.probability,
        rank: predictions.rank,
        risks: predictions.risks,
        simulationSummary: predictions.simulationSummary,
        uncertainty: predictions.uncertainty,
      })
      .from(predictions)
      .where(
        and(eq(predictions.modelRunId, latestRun.id), eq(predictions.tournamentId, tournamentId)),
      )
      .orderBy(asc(predictions.marketType), asc(predictions.rank)),
    selectLatestModelQuality({
      modelName: latestRun.modelName,
      modelVersion: latestRun.modelVersion,
    }),
  ]);

  const playersById = new Map<string, PlayerTournamentModelOutput>();

  for (const row of rows) {
    const existing = playersById.get(row.playerId) ?? {
      confidence: row.confidence,
      drivers: [],
      predictions: {},
      probabilities: {},
      risks: [],
      sourceFeatures: {},
    };
    const probability = requiredNumberFromNumeric(row.probability, "Prediction probability");
    const simulationSummary = jsonRecord(row.simulationSummary);
    const sourceFeatures = simulationSummary.sourceFeatures;
    const prediction = {
      baselineProbability: nullableNumberFromNumeric(row.baselineProbability),
      confidence: row.confidence,
      createdAt: toIsoTimestamp(row.createdAt) ?? new Date(0).toISOString(),
      drivers: row.drivers,
      fairAmericanOdds: row.fairAmericanOdds,
      marketId: row.marketId,
      marketImpliedProbability: nullableNumberFromNumeric(row.marketImpliedProbability),
      marketType: row.marketType,
      modelEdge: nullableNumberFromNumeric(row.modelEdge),
      probability,
      rank: row.rank,
      risks: row.risks,
      simulationSummary,
      uncertainty: nullableNumberFromNumeric(row.uncertainty),
    } satisfies TournamentModelPredictionOutput;

    existing.predictions[row.marketType] = prediction;
    existing.probabilities[row.marketType] = probability;

    if (row.marketType === "top_20" || existing.drivers.length === 0) {
      existing.confidence = row.confidence;
      existing.drivers = row.drivers;
      existing.risks = row.risks;
    }

    if (
      typeof sourceFeatures === "object" &&
      sourceFeatures !== null &&
      Object.keys(existing.sourceFeatures).length === 0
    ) {
      existing.sourceFeatures = sourceFeatures as Record<string, unknown>;
    }

    playersById.set(row.playerId, existing);
  }

  return {
    playersById,
    predictionCount: rows.length,
    quality,
    run: {
      asOf: toIsoTimestamp(latestRun.asOf),
      codeVersion: latestRun.codeVersion,
      completedAt: toIsoTimestamp(latestRun.completedAt),
      config: latestRun.config,
      featureSetId: latestRun.featureSetId,
      id: latestRun.id,
      inputHash: latestRun.inputHash,
      marketTypes: latestRun.marketTypes,
      metrics: latestRun.metrics,
      modelName: latestRun.modelName,
      modelVersion: latestRun.modelVersion,
      outputSchemaVersion: latestRun.outputSchemaVersion,
      runType: latestRun.runType,
      seed: latestRun.seed,
      startedAt: toIsoTimestamp(latestRun.startedAt) ?? new Date(0).toISOString(),
      status: latestRun.status,
      tournamentId: latestRun.tournamentId,
      trainingWindowEnd: toIsoTimestamp(latestRun.trainingWindowEnd),
      trainingWindowStart: toIsoTimestamp(latestRun.trainingWindowStart),
    },
  };
}
