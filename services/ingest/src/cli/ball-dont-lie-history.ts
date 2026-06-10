import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import type { AppEnv } from "@pgatour-ai/config";
import { createDatabaseClient, ingestionTasks } from "@pgatour-ai/db";
import {
  type BallDontLieHistoricalResource,
  ballDontLieHistoricalResources,
  type IngestionTaskStatus,
  type SyncRunStatus,
} from "@pgatour-ai/domain";
import { createBallDontLieClient } from "@pgatour-ai/providers";
import { and, eq, sql } from "drizzle-orm";
import {
  type BallDontLieSyncOptions,
  type BallDontLieSyncResult,
  createDrizzleCanonicalRepository,
  selectBallDontLieCompletedTournamentIds,
  syncBallDontLieCourseHoles,
  syncBallDontLieCourses,
  syncBallDontLieFutures,
  syncBallDontLiePlayerRoundResults,
  syncBallDontLiePlayerRoundStats,
  syncBallDontLiePlayerScorecards,
  syncBallDontLiePlayerSeasonStats,
  syncBallDontLiePlayers,
  syncBallDontLieTournamentCourseStats,
  syncBallDontLieTournamentResults,
  syncBallDontLieTournaments,
} from "../ball-dont-lie";
import { loadLocalEnv } from "../local-env";
import {
  createS3RawSnapshotStoreFromEnv,
  ensureRawSnapshotBucket,
  type RawSnapshotStore,
} from "../raw-snapshots";
import { DatabaseSyncRunRecorder, defaultSyncRunCodeVersion, startSyncRun } from "../sync-runs";

const DEFAULT_FROM_SEASON = 2010;
const DEFAULT_FULL_SYNC_MAX_PAGES = 2_500;
const DEFAULT_PAGE_DELAY_MS = 250;
const DEFAULT_STEP_DELAY_MS = 500;
const CURRENT_SEASON = new Date().getFullYear();

const CORE_RESOURCES = [
  "course_holes",
  "tournament_results",
  "tournament_course_stats",
  "player_round_results",
  "player_round_stats",
  "player_season_stats",
] as const satisfies readonly BallDontLieHistoricalResource[];

export type BallDontLieHistoryArgs = {
  fromSeason: number;
  maxPages?: number;
  pageDelayMs?: number;
  perPage?: number;
  resources: BallDontLieHistoricalResource[];
  resume: boolean;
  sample: boolean;
  stepDelayMs?: number;
  toSeason: number;
  tournamentIds: number[];
};

export type BallDontLieHistoryStep = {
  elapsedMs: number;
  resource: string;
  result: BallDontLieSyncResult;
  season?: number;
  taskStatus?: IngestionTaskStatus;
  tournamentId?: number;
};

export type BallDontLieHistorySummary = {
  bucketStatus: "created" | "exists";
  elapsedMs: number;
  fromSeason: number;
  resources: BallDontLieHistoricalResource[];
  status: SyncRunStatus;
  steps: BallDontLieHistoryStep[];
  syncRunId: string;
  toSeason: number;
};

type RunBallDontLieHistoryOptions = {
  env: AppEnv;
  historyArgs: BallDontLieHistoryArgs;
  rawSnapshotStore?: RawSnapshotStore;
};

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function parseNonNegativeInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function parseResources(value: string): BallDontLieHistoricalResource[] {
  const allowed = new Set<string>(ballDontLieHistoricalResources);
  const values = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (values.includes("all")) {
    return ["core", "futures", "scorecards"];
  }

  const invalid = values.filter((resource) => !allowed.has(resource));

  if (invalid.length > 0) {
    throw new Error(`Unknown --resources value: ${invalid.join(",")}`);
  }

  return Array.from(new Set(values)) as BallDontLieHistoricalResource[];
}

export function parseBallDontLieHistoryArgs(argv: string[]): BallDontLieHistoryArgs {
  const args: BallDontLieHistoryArgs = {
    fromSeason: DEFAULT_FROM_SEASON,
    resources: ["core"],
    resume: false,
    sample: false,
    toSeason: CURRENT_SEASON,
    tournamentIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      throw new Error(helpText());
    }

    if (arg === "--") {
      continue;
    }

    if (arg === "--resume") {
      args.resume = true;
      continue;
    }

    if (arg === "--sample") {
      args.sample = true;
      continue;
    }

    const next = argv[index + 1];

    if (next === undefined) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--from-season") {
      args.fromSeason = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--to-season") {
      args.toSeason = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--tournament-id") {
      args.tournamentIds.push(...parseTournamentIds(next));
      index += 1;
      continue;
    }

    if (arg === "--resources") {
      args.resources = parseResources(next);
      index += 1;
      continue;
    }

    if (arg === "--max-pages") {
      args.maxPages = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--per-page") {
      args.perPage = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--page-delay-ms") {
      args.pageDelayMs = parseNonNegativeInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--step-delay-ms") {
      args.stepDelayMs = parseNonNegativeInteger(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.fromSeason > args.toSeason) {
    throw new Error("--from-season must be less than or equal to --to-season");
  }

  return args;
}

function parseTournamentIds(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parsePositiveInteger("--tournament-id", part));
}

export function historyPageOptionsFromArgs(args: BallDontLieHistoryArgs) {
  if (args.sample) {
    return {
      maxPages: args.maxPages ?? 1,
      pageDelayMs: args.pageDelayMs ?? 0,
      perPage: args.perPage ?? 3,
      stopAfterMaxPages: true,
    };
  }

  return {
    maxPages: args.maxPages ?? DEFAULT_FULL_SYNC_MAX_PAGES,
    pageDelayMs: args.pageDelayMs ?? DEFAULT_PAGE_DELAY_MS,
    ...(args.perPage !== undefined ? { perPage: args.perPage } : {}),
  };
}

export function expandedHistoryResources(resources: BallDontLieHistoricalResource[]) {
  const selected = new Set<BallDontLieHistoricalResource>();

  for (const resource of resources) {
    if (resource === "core") {
      for (const coreResource of CORE_RESOURCES) {
        selected.add(coreResource);
      }
      continue;
    }

    selected.add(resource);
  }

  return selected;
}

function helpText() {
  return [
    "Usage: pnpm ingest:balldontlie:history [options]",
    "",
    "Options:",
    "  --from-season <year>        First season to backfill. Defaults to 2010.",
    "  --to-season <year>          Last season to backfill. Defaults to current year.",
    "  --tournament-id <id[,id]>   BALLDONTLIE tournament id to backfill. Repeatable.",
    "  --resources <list>          Comma-separated resources: core,futures,scorecards,all, or individual history resources.",
    "  --resume                    Skip tasks already marked succeeded.",
    "  --sample                    Fetch one small page per endpoint and stop intentionally.",
    "  --max-pages <count>         Maximum cursor pages per endpoint.",
    "  --per-page <count>          Page size. BALLDONTLIE supports up to 100.",
    "  --page-delay-ms <ms>        Delay between pages. Defaults to GOAT-safe pacing.",
    "  --step-delay-ms <ms>        Delay between endpoint steps. Defaults to GOAT-safe pacing.",
  ].join("\n");
}

function requireBallDontLieApiKey(env: AppEnv) {
  const apiKey = env.BALL_DONT_LIE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("BALL_DONT_LIE_API_KEY is required in the workspace root .env.local file");
  }

  return apiKey;
}

function errorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const childMessages: string[] = error.errors.map(errorMessage).filter(Boolean);
    const message = error.message || error.name;

    return childMessages.length > 0 ? `${message}: ${childMessages.join(" | ")}` : message;
  }

  if (error instanceof Error) {
    if (error.cause) {
      return `${error.message || error.name}: ${errorMessage(error.cause)}`;
    }

    return error.message || error.name;
  }

  return typeof error === "string" && error.length > 0 ? error : "Unknown ingest failure";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStep({
  action,
  resource,
  season,
  tournamentId,
}: {
  action: () => Promise<BallDontLieSyncResult>;
  resource: string;
  season?: number | undefined;
  tournamentId?: number | undefined;
}): Promise<BallDontLieHistoryStep> {
  const startedAt = performance.now();
  const result = await action();

  return {
    elapsedMs: Math.round(performance.now() - startedAt),
    resource,
    result,
    ...(season !== undefined ? { season } : {}),
    ...(tournamentId !== undefined ? { tournamentId } : {}),
  };
}

function historyTaskKey(resource: string, season: number, tournamentId?: number) {
  return tournamentId === undefined ? `${season}` : `${season}:${tournamentId}:${resource}`;
}

async function succeededTaskExists({
  db,
  resource,
  season,
  taskKey,
}: {
  db: ReturnType<typeof createDatabaseClient>["db"];
  resource: string;
  season: number;
  taskKey: string;
}) {
  const [task] = await db
    .select({ id: ingestionTasks.id })
    .from(ingestionTasks)
    .where(
      and(
        eq(ingestionTasks.source, "balldontlie"),
        eq(ingestionTasks.resource, resource),
        eq(ingestionTasks.season, season),
        eq(ingestionTasks.taskKey, taskKey),
        eq(ingestionTasks.status, "succeeded"),
      ),
    )
    .limit(1);

  return Boolean(task);
}

async function markTaskRunning({
  db,
  resource,
  season,
  taskKey,
  tournamentId,
}: {
  db: ReturnType<typeof createDatabaseClient>["db"];
  resource: string;
  season: number;
  taskKey: string;
  tournamentId?: number | undefined;
}) {
  await db
    .insert(ingestionTasks)
    .values({
      attempts: 1,
      lockedAt: new Date(),
      resource,
      season,
      source: "balldontlie",
      startedAt: new Date(),
      status: "running",
      taskKey,
      tournamentSourceId: tournamentId === undefined ? null : String(tournamentId),
    })
    .onConflictDoUpdate({
      target: [ingestionTasks.source, ingestionTasks.resource, ingestionTasks.taskKey],
      set: {
        attempts: sql`${ingestionTasks.attempts} + 1`,
        lastError: null,
        lockedAt: sql`now()`,
        startedAt: sql`now()`,
        status: "running",
        updatedAt: sql`now()`,
      },
    });
}

async function markTaskComplete({
  db,
  error,
  result,
  resource,
  status,
  taskKey,
}: {
  db: ReturnType<typeof createDatabaseClient>["db"];
  error?: string | undefined;
  resource: string;
  result?: BallDontLieSyncResult | undefined;
  status: IngestionTaskStatus;
  taskKey: string;
}) {
  await db
    .update(ingestionTasks)
    .set({
      completedAt: new Date(),
      counts: result === undefined ? {} : syncResultCounts(result),
      lastError: error,
      lockedAt: null,
      status,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(ingestionTasks.source, "balldontlie"),
        eq(ingestionTasks.resource, resource),
        eq(ingestionTasks.taskKey, taskKey),
      ),
    );
}

async function runTask({
  action,
  db,
  resource,
  resume,
  season,
  tournamentId,
}: {
  action: () => Promise<BallDontLieSyncResult>;
  db: ReturnType<typeof createDatabaseClient>["db"];
  resource: string;
  resume: boolean;
  season: number;
  tournamentId?: number | undefined;
}): Promise<BallDontLieHistoryStep> {
  const taskKey = historyTaskKey(resource, season, tournamentId);

  if (
    resume &&
    (await succeededTaskExists({
      db,
      resource,
      season,
      taskKey,
    }))
  ) {
    return {
      elapsedMs: 0,
      resource,
      result: emptyHistoryResult(),
      season,
      taskStatus: "skipped",
      ...(tournamentId !== undefined ? { tournamentId } : {}),
    };
  }

  await markTaskRunning({ db, resource, season, taskKey, tournamentId });

  try {
    const step = await runStep({ action, resource, season, tournamentId });

    await markTaskComplete({
      db,
      resource,
      result: step.result,
      status: "succeeded",
      taskKey,
    });

    return {
      ...step,
      taskStatus: "succeeded",
    };
  } catch (error) {
    await markTaskComplete({
      db,
      error: errorMessage(error),
      resource,
      status: "failed",
      taskKey,
    });
    throw error;
  }
}

function emptyHistoryResult(): BallDontLieSyncResult {
  return {
    booksUpserted: 0,
    courseHolesUpserted: 0,
    coursesUpserted: 0,
    fieldEntriesUpserted: 0,
    marketsUpserted: 0,
    oddsSnapshotsInserted: 0,
    pagesFetched: 0,
    playerRoundResultsUpserted: 0,
    playerRoundStatsUpserted: 0,
    playerScorecardsUpserted: 0,
    playerSeasonStatsUpserted: 0,
    playersUpserted: 0,
    providerStatDefinitionsUpserted: 0,
    rawSnapshots: [],
    skipped: [],
    teeTimesUpserted: 0,
    tournamentCourseHoleStatsUpserted: 0,
    tournamentCoursesUpserted: 0,
    tournamentResultsUpserted: 0,
    tournamentsUpserted: 0,
  };
}

function syncResultCounts(result: BallDontLieSyncResult) {
  return {
    booksUpserted: result.booksUpserted,
    courseHolesUpserted: result.courseHolesUpserted,
    coursesUpserted: result.coursesUpserted,
    fieldEntriesUpserted: result.fieldEntriesUpserted,
    marketsUpserted: result.marketsUpserted,
    oddsSnapshotsInserted: result.oddsSnapshotsInserted,
    pagesFetched: result.pagesFetched,
    playerRoundResultsUpserted: result.playerRoundResultsUpserted,
    playerRoundStatsUpserted: result.playerRoundStatsUpserted,
    playerScorecardsUpserted: result.playerScorecardsUpserted,
    playerSeasonStatsUpserted: result.playerSeasonStatsUpserted,
    playersUpserted: result.playersUpserted,
    providerStatDefinitionsUpserted: result.providerStatDefinitionsUpserted,
    rawSnapshots: result.rawSnapshots.length,
    skipped: result.skipped.length,
    teeTimesUpserted: result.teeTimesUpserted,
    tournamentCourseHoleStatsUpserted: result.tournamentCourseHoleStatsUpserted,
    tournamentCoursesUpserted: result.tournamentCoursesUpserted,
    tournamentResultsUpserted: result.tournamentResultsUpserted,
    tournamentsUpserted: result.tournamentsUpserted,
  };
}

function countsForHistorySteps(steps: BallDontLieHistoryStep[]) {
  return {
    steps: steps.map((step) => ({
      ...syncResultCounts(step.result),
      elapsedMs: step.elapsedMs,
      resource: step.resource,
      season: step.season ?? null,
      taskStatus: step.taskStatus ?? null,
      tournamentId: step.tournamentId ?? null,
    })),
  };
}

function rawSnapshotKeysForHistorySteps(steps: BallDontLieHistoryStep[]) {
  return steps.flatMap((step) => step.result.rawSnapshots);
}

function skippedRecordsForHistorySteps(steps: BallDontLieHistoryStep[]) {
  return steps.flatMap((step) =>
    step.result.skipped.map((skipped) =>
      [step.resource, step.season, step.tournamentId, skipped]
        .filter((value) => value !== undefined)
        .join(":"),
    ),
  );
}

function syncRunStatusForHistorySteps(steps: BallDontLieHistoryStep[]): SyncRunStatus {
  return skippedRecordsForHistorySteps(steps).length > 0 ? "partial" : "succeeded";
}

function historyParams(args: BallDontLieHistoryArgs) {
  return {
    fromSeason: args.fromSeason,
    maxPages: args.maxPages ?? null,
    pageDelayMs: args.pageDelayMs ?? null,
    perPage: args.perPage ?? null,
    resources: args.resources,
    resume: args.resume,
    sample: args.sample,
    stepDelayMs: args.stepDelayMs ?? null,
    toSeason: args.toSeason,
    tournamentIds: args.tournamentIds,
  };
}

async function runDelayedStep(
  steps: BallDontLieHistoryStep[],
  stepDelayMs: number,
  action: () => Promise<BallDontLieHistoryStep>,
) {
  if (steps.length > 0 && stepDelayMs > 0) {
    await sleep(stepDelayMs);
  }

  steps.push(await action());
}

export async function runBallDontLieHistory({
  env,
  historyArgs,
  rawSnapshotStore,
}: RunBallDontLieHistoryOptions): Promise<BallDontLieHistorySummary> {
  const apiKey = requireBallDontLieApiKey(env);
  const dbClient = createDatabaseClient(env.DATABASE_URL);
  const s3 = createS3RawSnapshotStoreFromEnv(env);
  const store = rawSnapshotStore ?? s3.store;
  const startedAt = performance.now();
  const steps: BallDontLieHistoryStep[] = [];
  const selectedResources = expandedHistoryResources(historyArgs.resources);
  const syncRunId = await startSyncRun(dbClient.db, {
    codeVersion: defaultSyncRunCodeVersion(),
    jobType: "balldontlie_history",
    params: historyParams(historyArgs),
    source: "balldontlie",
  });
  const recorder = new DatabaseSyncRunRecorder(dbClient.db, syncRunId, "balldontlie");

  try {
    const bucketStatus =
      rawSnapshotStore === undefined
        ? await ensureRawSnapshotBucket({ bucket: s3.bucket, client: s3.client })
        : "exists";
    const client = createBallDontLieClient({
      apiKey,
      ...(env.BALL_DONT_LIE_BASE_URL ? { baseUrl: env.BALL_DONT_LIE_BASE_URL } : {}),
      maxRetries: 1,
      timeoutMs: 20_000,
    });
    const commonOptions: BallDontLieSyncOptions = {
      client,
      pageOptions: historyPageOptionsFromArgs(historyArgs),
      rawSnapshotStore: store,
      recordRawSnapshot: (input) => recorder.recordRawSnapshot(input),
      repository: createDrizzleCanonicalRepository(dbClient.db),
    };
    const stepDelayMs = historyArgs.stepDelayMs ?? DEFAULT_STEP_DELAY_MS;

    if (historyArgs.resources.includes("core")) {
      await runDelayedStep(steps, stepDelayMs, () =>
        runStep({
          action: () => syncBallDontLieCourses(commonOptions),
          resource: "courses",
        }),
      );
      await runDelayedStep(steps, stepDelayMs, () =>
        runStep({
          action: () => syncBallDontLiePlayers(commonOptions),
          resource: "players",
        }),
      );
    }

    for (let season = historyArgs.fromSeason; season <= historyArgs.toSeason; season += 1) {
      if (historyArgs.resources.includes("core")) {
        await runDelayedStep(steps, stepDelayMs, () =>
          runStep({
            action: () => syncBallDontLieTournaments({ ...commonOptions, season }),
            resource: "tournaments",
            season,
          }),
        );
      }

      if (selectedResources.has("course_holes") && season === historyArgs.fromSeason) {
        await runDelayedStep(steps, stepDelayMs, () =>
          runTask({
            action: () => syncBallDontLieCourseHoles(commonOptions),
            db: dbClient.db,
            resource: "course_holes",
            resume: historyArgs.resume,
            season,
          }),
        );
      }

      if (selectedResources.has("player_season_stats")) {
        await runDelayedStep(steps, stepDelayMs, () =>
          runTask({
            action: () => syncBallDontLiePlayerSeasonStats({ ...commonOptions, season }),
            db: dbClient.db,
            resource: "player_season_stats",
            resume: historyArgs.resume,
            season,
          }),
        );
      }

      const tournamentIds =
        historyArgs.tournamentIds.length > 0
          ? historyArgs.tournamentIds
          : await selectBallDontLieCompletedTournamentIds(dbClient.db, { season });

      for (const tournamentId of tournamentIds) {
        if (selectedResources.has("tournament_results")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () => syncBallDontLieTournamentResults({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "tournament_results",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }

        if (selectedResources.has("tournament_course_stats")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () =>
                syncBallDontLieTournamentCourseStats({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "tournament_course_stats",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }

        if (selectedResources.has("player_round_results")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () => syncBallDontLiePlayerRoundResults({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "player_round_results",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }

        if (selectedResources.has("player_round_stats")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () => syncBallDontLiePlayerRoundStats({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "player_round_stats",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }

        if (selectedResources.has("futures")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () => syncBallDontLieFutures({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "futures",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }

        if (selectedResources.has("scorecards")) {
          await runDelayedStep(steps, stepDelayMs, () =>
            runTask({
              action: () => syncBallDontLiePlayerScorecards({ ...commonOptions, tournamentId }),
              db: dbClient.db,
              resource: "scorecards",
              resume: historyArgs.resume,
              season,
              tournamentId,
            }),
          );
        }
      }
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    const status = syncRunStatusForHistorySteps(steps);

    await recorder.complete({
      counts: countsForHistorySteps(steps),
      durationMs: elapsedMs,
      rawSnapshotKeys: rawSnapshotKeysForHistorySteps(steps),
      skipped: skippedRecordsForHistorySteps(steps),
      status,
    });

    return {
      bucketStatus,
      elapsedMs,
      fromSeason: historyArgs.fromSeason,
      resources: historyArgs.resources,
      status,
      steps,
      syncRunId,
      toSeason: historyArgs.toSeason,
    };
  } catch (error) {
    await recorder.complete({
      counts: countsForHistorySteps(steps),
      durationMs: Math.round(performance.now() - startedAt),
      error: errorMessage(error),
      rawSnapshotKeys: rawSnapshotKeysForHistorySteps(steps),
      skipped: skippedRecordsForHistorySteps(steps),
      status: "failed",
    });

    throw error;
  } finally {
    await dbClient.close();
  }
}

async function main() {
  try {
    const historyArgs = parseBallDontLieHistoryArgs(process.argv.slice(2));
    const summary = await runBallDontLieHistory({
      env: loadLocalEnv(),
      historyArgs,
    });

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
