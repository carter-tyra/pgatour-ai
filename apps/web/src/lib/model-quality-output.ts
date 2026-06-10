import "server-only";

import { modelBacktests, modelEvaluations } from "@pgatour-ai/db";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database";
import { buildModelQualitySummary, unvalidatedModelQuality } from "./model-quality";

type SelectLatestModelQualityOptions = {
  modelName?: string | null | undefined;
  modelVersion?: string | null | undefined;
};

function nullableNumberFromNumeric(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
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

export async function selectLatestModelQuality(options: SelectLatestModelQualityOptions = {}) {
  const db = getDatabase();
  const whereConditions = [
    eq(modelBacktests.status, "complete"),
    options.modelName ? eq(modelBacktests.modelName, options.modelName) : undefined,
    options.modelVersion ? eq(modelBacktests.modelVersion, options.modelVersion) : undefined,
  ].filter((condition) => condition !== undefined);
  const [latestBacktest] = await db
    .select({
      createdAt: modelBacktests.createdAt,
      id: modelBacktests.id,
      metrics: modelBacktests.metrics,
      modelName: modelBacktests.modelName,
      modelVersion: modelBacktests.modelVersion,
    })
    .from(modelBacktests)
    .where(and(...whereConditions))
    .orderBy(desc(modelBacktests.createdAt))
    .limit(1);

  if (!latestBacktest) {
    return unvalidatedModelQuality();
  }

  const evaluations = await db
    .select({
      averageClosingLineValue: modelEvaluations.averageClosingLineValue,
      brierScore: modelEvaluations.brierScore,
      calibrationError: modelEvaluations.calibrationError,
      coverage: modelEvaluations.coverage,
      logLoss: modelEvaluations.logLoss,
      marketType: modelEvaluations.marketType,
      metrics: modelEvaluations.metrics,
      scope: modelEvaluations.scope,
      tournamentId: modelEvaluations.tournamentId,
    })
    .from(modelEvaluations)
    .where(eq(modelEvaluations.modelBacktestId, latestBacktest.id));

  return buildModelQualitySummary({
    backtest: {
      createdAt: toIsoTimestamp(latestBacktest.createdAt),
      id: latestBacktest.id,
      metrics: jsonRecord(latestBacktest.metrics),
      modelName: latestBacktest.modelName,
      modelVersion: latestBacktest.modelVersion,
    },
    evaluations: evaluations.map((row) => ({
      averageClosingLineValue: nullableNumberFromNumeric(row.averageClosingLineValue),
      brierScore: nullableNumberFromNumeric(row.brierScore),
      calibrationError: nullableNumberFromNumeric(row.calibrationError),
      coverage: nullableNumberFromNumeric(row.coverage),
      logLoss: nullableNumberFromNumeric(row.logLoss),
      marketType: row.marketType,
      metrics: jsonRecord(row.metrics),
      scope: row.scope,
      tournamentId: row.tournamentId,
    })),
  });
}
