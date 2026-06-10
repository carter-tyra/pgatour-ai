import { pathToFileURL } from "node:url";
import {
  alerts,
  books,
  courses,
  createDatabaseClient,
  fantasyContests,
  fieldEntries,
  holes,
  ingestionFreshness,
  ingestionTasks,
  lineups,
  markets,
  modelBacktestPredictions,
  modelBacktests,
  modelEvaluations,
  modelFeatureSets,
  modelPlayerFeatures,
  modelRunInputs,
  modelRuns,
  newsItems,
  oddsSnapshots,
  playerRoundResults,
  playerRoundStats,
  playerScorecards,
  playerSeasonStats,
  players,
  predictions,
  providerStatDefinitions,
  rawSnapshotRecords,
  scores,
  sourceEntityMappings,
  subscriptions,
  syncRuns,
  teeTimes,
  tournamentCourseHoleStats,
  tournamentCourses,
  tournamentResults,
  tournaments,
  userBets,
  userWatchlists,
  weatherSnapshots,
} from "@pgatour-ai/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { loadLocalEnv } from "../local-env";

const ERROR_PREVIEW_LENGTH = 500;
const SKIPPED_RECORD_LIMIT = 100;

export function summarizeSyncRunError(error: string | null) {
  if (!error) {
    return null;
  }

  const truncated = error.length > ERROR_PREVIEW_LENGTH;

  return {
    length: error.length,
    preview: truncated ? `${error.slice(0, ERROR_PREVIEW_LENGTH)}...` : error,
    truncated,
  };
}

function summarizeSkippedRecords(skipped: string[]) {
  const truncated = skipped.length > SKIPPED_RECORD_LIMIT;

  return {
    count: skipped.length,
    records: skipped.slice(0, SKIPPED_RECORD_LIMIT),
    truncated,
  };
}

function errorDetail(error: unknown) {
  const messages: string[] = [];
  let current = error;

  while (current instanceof Error) {
    const record = current as Error & Record<string, unknown>;
    const fields = ["code", "errno", "address", "port"]
      .map((field) => {
        const value = record[field];

        return value === undefined || value === "" ? null : `${field}=${String(value)}`;
      })
      .filter((value) => value !== null);

    messages.push([current.message || current.name, fields.join(" ")].filter(Boolean).join(" "));
    current = current.cause;
  }

  if (current && typeof current === "object") {
    const record = current as Record<string, unknown>;
    const fields = ["message", "code", "errno", "address", "port"]
      .map((field) => {
        const value = record[field];

        return value === undefined || value === "" ? null : `${field}=${String(value)}`;
      })
      .filter((value) => value !== null);

    messages.push(fields.join(" "));
  } else if (typeof current === "string" && current.length > 0) {
    messages.push(current);
  }

  return [...new Set(messages)].join(" Cause: ") || "Unknown data status failure";
}

async function countRows(query: Promise<Array<{ count: number | string }>>) {
  const [row] = await query;

  return Number(row?.count ?? 0);
}

async function tableCounts(db: ReturnType<typeof createDatabaseClient>["db"]) {
  return {
    alerts: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(alerts)),
    books: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(books)),
    courses: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(courses)),
    fantasyContests: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(fantasyContests),
    ),
    fieldEntries: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(fieldEntries),
    ),
    holes: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(holes)),
    ingestionTasks: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(ingestionTasks),
    ),
    ingestionFreshness: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(ingestionFreshness),
    ),
    lineups: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(lineups)),
    markets: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(markets)),
    modelBacktestPredictions: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelBacktestPredictions),
    ),
    modelBacktests: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelBacktests),
    ),
    modelEvaluations: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelEvaluations),
    ),
    modelFeatureSets: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelFeatureSets),
    ),
    modelPlayerFeatures: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelPlayerFeatures),
    ),
    modelRunInputs: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(modelRunInputs),
    ),
    modelRuns: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(modelRuns)),
    newsItems: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(newsItems)),
    oddsSnapshots: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(oddsSnapshots),
    ),
    players: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(players)),
    playerRoundResults: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(playerRoundResults),
    ),
    playerRoundStats: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(playerRoundStats),
    ),
    playerScorecards: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(playerScorecards),
    ),
    playerSeasonStats: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(playerSeasonStats),
    ),
    predictions: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(predictions),
    ),
    providerStatDefinitions: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(providerStatDefinitions),
    ),
    rawSnapshotRecords: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(rawSnapshotRecords),
    ),
    scores: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(scores)),
    sourceEntityMappings: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(sourceEntityMappings),
    ),
    subscriptions: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(subscriptions),
    ),
    syncRuns: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(syncRuns)),
    teeTimes: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(teeTimes)),
    tournamentCourses: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(tournamentCourses),
    ),
    tournamentCourseHoleStats: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(tournamentCourseHoleStats),
    ),
    tournamentResults: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(tournamentResults),
    ),
    tournaments: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(tournaments),
    ),
    userBets: await countRows(db.select({ count: sql<number>`count(*)::int` }).from(userBets)),
    userWatchlists: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(userWatchlists),
    ),
    weatherSnapshots: await countRows(
      db.select({ count: sql<number>`count(*)::int` }).from(weatherSnapshots),
    ),
  };
}

export async function buildDataStatusSummary(db: ReturnType<typeof createDatabaseClient>["db"]) {
  const recentSyncRuns = await db
    .select({
      completedAt: syncRuns.completedAt,
      durationMs: syncRuns.durationMs,
      error: syncRuns.error,
      id: syncRuns.id,
      jobType: syncRuns.jobType,
      season: syncRuns.season,
      skipped: syncRuns.skipped,
      source: syncRuns.source,
      startedAt: syncRuns.startedAt,
      status: syncRuns.status,
    })
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(10);

  const latestRawSnapshots = await db
    .select({
      capturedAt: rawSnapshotRecords.capturedAt,
      endpoint: rawSnapshotRecords.endpoint,
      requestHash: rawSnapshotRecords.requestHash,
      snapshotKey: rawSnapshotRecords.snapshotKey,
      source: rawSnapshotRecords.source,
    })
    .from(rawSnapshotRecords)
    .orderBy(desc(rawSnapshotRecords.capturedAt))
    .limit(10);

  const freshness = await db
    .select({
      latestCapturedAt: ingestionFreshness.latestCapturedAt,
      latestCompletedAt: ingestionFreshness.latestCompletedAt,
      resource: ingestionFreshness.resource,
      source: ingestionFreshness.source,
      staleAfter: ingestionFreshness.staleAfter,
      status: ingestionFreshness.status,
      updatedAt: ingestionFreshness.updatedAt,
    })
    .from(ingestionFreshness)
    .orderBy(desc(ingestionFreshness.updatedAt))
    .limit(20);

  const latestHistoricalTasks = await db
    .select({
      attempts: ingestionTasks.attempts,
      completedAt: ingestionTasks.completedAt,
      lastError: ingestionTasks.lastError,
      resource: ingestionTasks.resource,
      season: ingestionTasks.season,
      status: ingestionTasks.status,
      taskKey: ingestionTasks.taskKey,
      tournamentSourceId: ingestionTasks.tournamentSourceId,
      updatedAt: ingestionTasks.updatedAt,
    })
    .from(ingestionTasks)
    .where(eq(ingestionTasks.source, "balldontlie"))
    .orderBy(desc(ingestionTasks.updatedAt))
    .limit(25);

  const availableTournamentIds = await db
    .select({
      canonicalId: tournaments.id,
      endsOn: tournaments.endsOn,
      name: tournaments.name,
      season: tournaments.season,
      sourceEntityId: sourceEntityMappings.sourceEntityId,
      startsOn: tournaments.startsOn,
      status: tournaments.status,
    })
    .from(sourceEntityMappings)
    .innerJoin(tournaments, eq(sourceEntityMappings.canonicalId, tournaments.id))
    .where(
      and(
        eq(sourceEntityMappings.source, "balldontlie"),
        eq(sourceEntityMappings.entityType, "tournament"),
      ),
    )
    .orderBy(desc(tournaments.startsOn))
    .limit(50);

  const counts = await tableCounts(db);

  return {
    availableTournamentIds,
    generatedAt: new Date().toISOString(),
    historicalCoverage: {
      latestTasks: latestHistoricalTasks.map((task) => ({
        ...task,
        lastError: summarizeSyncRunError(task.lastError),
      })),
      normalizedRows: {
        playerRoundResults: counts.playerRoundResults,
        playerRoundStats: counts.playerRoundStats,
        playerScorecards: counts.playerScorecards,
        playerSeasonStats: counts.playerSeasonStats,
        providerStatDefinitions: counts.providerStatDefinitions,
        tournamentCourseHoleStats: counts.tournamentCourseHoleStats,
        tournamentCourses: counts.tournamentCourses,
        tournamentResults: counts.tournamentResults,
      },
    },
    latestRawSnapshots,
    latestSyncRuns: recentSyncRuns.slice(0, 5).map((run) => ({
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      error: summarizeSyncRunError(run.error),
      id: run.id,
      jobType: run.jobType,
      season: run.season,
      skippedCount: run.skipped.length,
      source: run.source,
      startedAt: run.startedAt,
      status: run.status,
    })),
    skippedMappings: recentSyncRuns
      .filter((run) => run.skipped.length > 0)
      .map((run) => ({
        id: run.id,
        jobType: run.jobType,
        skipped: summarizeSkippedRecords(run.skipped),
        source: run.source,
        startedAt: run.startedAt,
        status: run.status,
      })),
    modelReadiness: {
      backtestPredictions: counts.modelBacktestPredictions,
      backtests: counts.modelBacktests,
      evaluations: counts.modelEvaluations,
      featureRows: counts.modelPlayerFeatures,
      featureSets: counts.modelFeatureSets,
      modelRunInputs: counts.modelRunInputs,
      modelRuns: counts.modelRuns,
      predictions: counts.predictions,
    },
    tableCounts: counts,
    freshness,
  };
}

async function main() {
  const env = loadLocalEnv();
  const dbClient = createDatabaseClient(env.DATABASE_URL);

  try {
    const summary = await buildDataStatusSummary(dbClient.db);

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      [
        "Data status failed.",
        "If this is a fresh local database, run `pnpm db:migrate` after `pnpm db:bootstrap`.",
        `Detail: ${errorDetail(error)}`,
      ].join(" "),
    );
    process.stderr.write("\n");
    process.exitCode = 1;
  } finally {
    await dbClient.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
