import { pathToFileURL } from "node:url";
import type { AppEnv } from "@pgatour-ai/config";
import { createDatabaseClient } from "@pgatour-ai/db";
import type { SyncRunStatus } from "@pgatour-ai/domain";
import { createBallDontLieClient } from "@pgatour-ai/providers";
import {
  type BallDontLieSyncOptions,
  type BallDontLieSyncResult,
  createDrizzleCanonicalRepository,
  selectBallDontLieFieldTournamentIds,
  syncBallDontLieCourses,
  syncBallDontLieFutures,
  syncBallDontLiePlayers,
  syncBallDontLieTournamentField,
  syncBallDontLieTournaments,
  syncBallDontLieTournamentTeeTimes,
} from "../ball-dont-lie";
import { loadLocalEnv } from "../local-env";
import {
  createS3RawSnapshotStoreFromEnv,
  ensureRawSnapshotBucket,
  type RawSnapshotStore,
} from "../raw-snapshots";
import { DatabaseSyncRunRecorder, defaultSyncRunCodeVersion, startSyncRun } from "../sync-runs";

const DEFAULT_TRIAL_REQUEST_DELAY_MS = 12_500;
const DEFAULT_FULL_SYNC_MAX_PAGES = 100;

export type BallDontLieSeedArgs = {
  autoFields: boolean;
  maxPages?: number;
  pageDelayMs?: number;
  perPage?: number;
  sample: boolean;
  skipCore: boolean;
  season: number;
  skipFields: boolean;
  skipFutures: boolean;
  skipTeeTimes: boolean;
  stepDelayMs?: number;
  tournamentIds: number[];
};

export type BallDontLieSeedSummary = {
  bucketStatus: "created" | "exists";
  coreSkipped: boolean;
  elapsedMs: number;
  fieldsSkipped: boolean;
  season: number;
  status: SyncRunStatus;
  steps: Array<{
    elapsedMs: number;
    result: BallDontLieSyncResult;
    step: string;
  }>;
  syncRunId: string;
  tournamentIds: number[];
};

type RunBallDontLieSeedOptions = {
  env: AppEnv;
  rawSnapshotStore?: RawSnapshotStore;
  seedArgs: BallDontLieSeedArgs;
};

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function parseTournamentIds(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parsePositiveInteger("--tournament-id", part));
}

export function parseBallDontLieSeedArgs(argv: string[]): BallDontLieSeedArgs {
  const args: BallDontLieSeedArgs = {
    autoFields: true,
    sample: false,
    skipCore: false,
    season: new Date().getFullYear(),
    skipFields: false,
    skipFutures: false,
    skipTeeTimes: false,
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

    if (arg === "--sample") {
      args.sample = true;
      continue;
    }

    if (arg === "--skip-fields") {
      args.skipFields = true;
      continue;
    }

    if (arg === "--skip-futures") {
      args.skipFutures = true;
      continue;
    }

    if (arg === "--skip-core") {
      args.skipCore = true;
      continue;
    }

    if (arg === "--skip-tee-times") {
      args.skipTeeTimes = true;
      continue;
    }

    if (arg === "--no-auto-fields") {
      args.autoFields = false;
      continue;
    }

    const next = argv[index + 1];

    if (next === undefined) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--season") {
      args.season = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--tournament-id") {
      args.tournamentIds.push(...parseTournamentIds(next));
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
      args.pageDelayMs = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--step-delay-ms") {
      args.stepDelayMs = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function helpText() {
  return [
    "Usage: pnpm ingest:balldontlie:seed [options]",
    "",
    "Options:",
    "  --season <year>             Tournament season to sync. Defaults to current year.",
    "  --tournament-id <id[,id]>   BALLDONTLIE tournament id to include for field/tee sync. Repeatable.",
    "  --no-auto-fields            Disable automatic current/next field tournament selection.",
    "  --skip-core                 Skip courses, tournaments, and players. Use for targeted field/tee refreshes after core data exists.",
    "  --skip-fields               Skip tournament field sync.",
    "  --skip-futures              Skip futures odds sync.",
    "  --skip-tee-times            Skip tee time sync.",
    "  --max-pages <count>         Maximum cursor pages per endpoint.",
    "  --per-page <count>          Page size. BALLDONTLIE supports up to 100.",
    "  --page-delay-ms <ms>        Delay between pages. Default is provider-safe.",
    "  --step-delay-ms <ms>        Delay between endpoint steps. Default is provider-safe.",
    "  --sample                    Fetch one page per endpoint and stop intentionally.",
  ].join("\n");
}

export function pageOptionsFromArgs(args: BallDontLieSeedArgs) {
  if (args.sample) {
    return {
      maxPages: args.maxPages ?? 1,
      pageDelayMs: args.pageDelayMs ?? DEFAULT_TRIAL_REQUEST_DELAY_MS,
      perPage: args.perPage ?? 1,
      stopAfterMaxPages: true,
    };
  }

  return {
    maxPages: args.maxPages ?? DEFAULT_FULL_SYNC_MAX_PAGES,
    ...(args.pageDelayMs !== undefined ? { pageDelayMs: args.pageDelayMs } : {}),
    ...(args.perPage !== undefined ? { perPage: args.perPage } : {}),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStep(
  step: string,
  action: () => Promise<BallDontLieSyncResult>,
): Promise<BallDontLieSeedSummary["steps"][number]> {
  const startedAt = performance.now();
  const result = await action();

  return {
    elapsedMs: Math.round(performance.now() - startedAt),
    result,
    step,
  };
}

async function runDelayedStep(
  steps: BallDontLieSeedSummary["steps"],
  stepDelayMs: number,
  step: string,
  action: () => Promise<BallDontLieSyncResult>,
) {
  if (steps.length > 0 && stepDelayMs > 0) {
    await sleep(stepDelayMs);
  }

  steps.push(await runStep(step, action));
}

export function rawSnapshotKeysForSeedSteps(steps: BallDontLieSeedSummary["steps"]) {
  return steps.flatMap((step) => step.result.rawSnapshots);
}

export function skippedRecordsForSeedSteps(steps: BallDontLieSeedSummary["steps"]) {
  return steps.flatMap((step) => step.result.skipped.map((skipped) => `${step.step}:${skipped}`));
}

export function syncRunStatusForSeedSteps(steps: BallDontLieSeedSummary["steps"]): SyncRunStatus {
  return skippedRecordsForSeedSteps(steps).length > 0 ? "partial" : "succeeded";
}

export function countsForSeedSteps(steps: BallDontLieSeedSummary["steps"]) {
  const totals = {
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
    rawSnapshots: 0,
    skipped: 0,
    teeTimesUpserted: 0,
    tournamentCourseHoleStatsUpserted: 0,
    tournamentCoursesUpserted: 0,
    tournamentResultsUpserted: 0,
    tournamentsUpserted: 0,
  };

  for (const { result } of steps) {
    totals.booksUpserted += result.booksUpserted;
    totals.courseHolesUpserted += result.courseHolesUpserted;
    totals.coursesUpserted += result.coursesUpserted;
    totals.fieldEntriesUpserted += result.fieldEntriesUpserted;
    totals.marketsUpserted += result.marketsUpserted;
    totals.oddsSnapshotsInserted += result.oddsSnapshotsInserted;
    totals.pagesFetched += result.pagesFetched;
    totals.playerRoundResultsUpserted += result.playerRoundResultsUpserted;
    totals.playerRoundStatsUpserted += result.playerRoundStatsUpserted;
    totals.playerScorecardsUpserted += result.playerScorecardsUpserted;
    totals.playerSeasonStatsUpserted += result.playerSeasonStatsUpserted;
    totals.playersUpserted += result.playersUpserted;
    totals.providerStatDefinitionsUpserted += result.providerStatDefinitionsUpserted;
    totals.rawSnapshots += result.rawSnapshots.length;
    totals.skipped += result.skipped.length;
    totals.teeTimesUpserted += result.teeTimesUpserted;
    totals.tournamentCourseHoleStatsUpserted += result.tournamentCourseHoleStatsUpserted;
    totals.tournamentCoursesUpserted += result.tournamentCoursesUpserted;
    totals.tournamentResultsUpserted += result.tournamentResultsUpserted;
    totals.tournamentsUpserted += result.tournamentsUpserted;
  }

  return {
    steps: steps.map(({ elapsedMs, result, step }) => ({
      booksUpserted: result.booksUpserted,
      courseHolesUpserted: result.courseHolesUpserted,
      coursesUpserted: result.coursesUpserted,
      elapsedMs,
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
      skipped: result.skipped,
      step,
      teeTimesUpserted: result.teeTimesUpserted,
      tournamentCourseHoleStatsUpserted: result.tournamentCourseHoleStatsUpserted,
      tournamentCoursesUpserted: result.tournamentCoursesUpserted,
      tournamentResultsUpserted: result.tournamentResultsUpserted,
      tournamentsUpserted: result.tournamentsUpserted,
    })),
    totals,
  };
}

function seedParams(seedArgs: BallDontLieSeedArgs) {
  return {
    autoFields: seedArgs.autoFields,
    maxPages: seedArgs.maxPages ?? null,
    pageDelayMs: seedArgs.pageDelayMs ?? null,
    perPage: seedArgs.perPage ?? null,
    sample: seedArgs.sample,
    season: seedArgs.season,
    skipCore: seedArgs.skipCore,
    skipFields: seedArgs.skipFields,
    skipFutures: seedArgs.skipFutures,
    skipTeeTimes: seedArgs.skipTeeTimes,
    stepDelayMs: seedArgs.stepDelayMs ?? null,
    tournamentIds: seedArgs.tournamentIds,
  };
}

function requireBallDontLieApiKey(env: AppEnv) {
  const apiKey = env.BALL_DONT_LIE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("BALL_DONT_LIE_API_KEY is required in the workspace root .env.local file");
  }

  return apiKey;
}

function errorMessage(error: unknown) {
  const messages: string[] = [];
  const seen = new Set<unknown>();

  function visit(value: unknown) {
    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    if (value instanceof AggregateError) {
      messages.push(value.message || value.name);

      for (const nested of value.errors) {
        visit(nested);
      }

      return;
    }

    if (value instanceof Error) {
      const record = value as Error & Record<string, unknown>;
      const metadata = record.$metadata;
      const statusCode =
        typeof metadata === "object" && metadata !== null && "httpStatusCode" in metadata
          ? metadata.httpStatusCode
          : undefined;
      const fields = ["code", "errno", "address", "port"]
        .map((field) => {
          const fieldValue = record[field];

          return fieldValue === undefined || fieldValue === ""
            ? null
            : `${field}=${String(fieldValue)}`;
        })
        .filter((fieldValue) => fieldValue !== null);

      if (statusCode !== undefined) {
        fields.push(`status=${String(statusCode)}`);
      }

      messages.push([value.message || value.name, fields.join(" ")].filter(Boolean).join(" "));
      visit(value.cause);
      return;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const fields = ["message", "name", "code", "errno", "address", "port"]
        .map((field) => {
          const fieldValue = record[field];

          return fieldValue === undefined || fieldValue === ""
            ? null
            : `${field}=${String(fieldValue)}`;
        })
        .filter((fieldValue) => fieldValue !== null);

      if (fields.length > 0) {
        messages.push(fields.join(" "));
      }

      return;
    }

    if (typeof value === "string" && value.length > 0) {
      messages.push(value);
    }
  }

  visit(error);

  return [...new Set(messages.filter(Boolean))].join(": ") || "Unknown ingest failure";
}

export async function runBallDontLieSeed({
  env,
  rawSnapshotStore,
  seedArgs,
}: RunBallDontLieSeedOptions): Promise<BallDontLieSeedSummary> {
  const apiKey = requireBallDontLieApiKey(env);

  const startedAt = performance.now();
  const dbClient = createDatabaseClient(env.DATABASE_URL);
  const s3 = createS3RawSnapshotStoreFromEnv(env);
  const store = rawSnapshotStore ?? s3.store;
  const steps: BallDontLieSeedSummary["steps"] = [];
  const syncRunId = await startSyncRun(dbClient.db, {
    codeVersion: defaultSyncRunCodeVersion(),
    jobType: "balldontlie_seed",
    params: seedParams(seedArgs),
    season: seedArgs.season,
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
      timeoutMs: 15_000,
    });
    const commonOptions: BallDontLieSyncOptions = {
      client,
      pageOptions: pageOptionsFromArgs(seedArgs),
      rawSnapshotStore: store,
      recordRawSnapshot: (input) => recorder.recordRawSnapshot(input),
      repository: createDrizzleCanonicalRepository(dbClient.db),
    };
    const stepDelayMs = seedArgs.stepDelayMs ?? DEFAULT_TRIAL_REQUEST_DELAY_MS;

    if (!seedArgs.skipCore) {
      await runDelayedStep(steps, stepDelayMs, "courses", () =>
        syncBallDontLieCourses(commonOptions),
      );
      await runDelayedStep(steps, stepDelayMs, "tournaments", () =>
        syncBallDontLieTournaments({ ...commonOptions, season: seedArgs.season }),
      );
      await runDelayedStep(steps, stepDelayMs, "players", () =>
        syncBallDontLiePlayers(commonOptions),
      );
    }

    const needsTournamentScopedSync =
      !seedArgs.skipFields || !seedArgs.skipTeeTimes || !seedArgs.skipFutures;
    const tournamentIds = !needsTournamentScopedSync
      ? []
      : seedArgs.autoFields
        ? await selectBallDontLieFieldTournamentIds(dbClient.db, {
            explicitTournamentIds: seedArgs.tournamentIds,
            season: seedArgs.season,
          })
        : seedArgs.tournamentIds;

    if (!seedArgs.skipFields) {
      for (const tournamentId of tournamentIds) {
        await runDelayedStep(steps, stepDelayMs, `field:${tournamentId}`, () =>
          syncBallDontLieTournamentField({
            ...commonOptions,
            tournamentId,
          }),
        );
      }
    }

    if (!seedArgs.skipTeeTimes) {
      for (const tournamentId of tournamentIds) {
        await runDelayedStep(steps, stepDelayMs, `tee-times:${tournamentId}`, () =>
          syncBallDontLieTournamentTeeTimes({
            ...commonOptions,
            tournamentId,
          }),
        );
      }
    }

    if (!seedArgs.skipFutures) {
      for (const tournamentId of tournamentIds) {
        await runDelayedStep(steps, stepDelayMs, `futures:${tournamentId}`, () =>
          syncBallDontLieFutures({
            ...commonOptions,
            tournamentId,
          }),
        );
      }
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    const status = syncRunStatusForSeedSteps(steps);

    await recorder.complete({
      counts: countsForSeedSteps(steps),
      durationMs: elapsedMs,
      rawSnapshotKeys: rawSnapshotKeysForSeedSteps(steps),
      skipped: skippedRecordsForSeedSteps(steps),
      status,
    });

    return {
      bucketStatus,
      coreSkipped: seedArgs.skipCore,
      elapsedMs,
      fieldsSkipped: seedArgs.skipFields || tournamentIds.length === 0,
      season: seedArgs.season,
      status,
      steps,
      syncRunId,
      tournamentIds,
    };
  } catch (error) {
    await recorder.complete({
      counts: countsForSeedSteps(steps),
      durationMs: Math.round(performance.now() - startedAt),
      error: errorMessage(error),
      rawSnapshotKeys: rawSnapshotKeysForSeedSteps(steps),
      skipped: skippedRecordsForSeedSteps(steps),
      status: "failed",
    });

    throw error;
  } finally {
    await dbClient.close();
  }
}

async function main() {
  try {
    const seedArgs = parseBallDontLieSeedArgs(process.argv.slice(2));
    const summary = await runBallDontLieSeed({
      env: loadLocalEnv(),
      seedArgs,
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
