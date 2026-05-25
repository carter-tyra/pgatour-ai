import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { type AppEnv, parseEnv } from "@pgatour-ai/config";
import { createDatabaseClient } from "@pgatour-ai/db";
import { createBallDontLieClient } from "@pgatour-ai/providers";
import { config as loadDotenv } from "dotenv";
import {
  type BallDontLieSyncOptions,
  type BallDontLieSyncResult,
  createDrizzleCanonicalRepository,
  syncBallDontLieCourses,
  syncBallDontLiePlayers,
  syncBallDontLieTournamentField,
  syncBallDontLieTournaments,
} from "../ball-dont-lie";
import {
  createS3RawSnapshotStoreFromEnv,
  ensureRawSnapshotBucket,
  type RawSnapshotStore,
} from "../raw-snapshots";

const DEFAULT_TRIAL_REQUEST_DELAY_MS = 12_500;

export type BallDontLieSeedArgs = {
  maxPages?: number;
  pageDelayMs?: number;
  perPage?: number;
  sample: boolean;
  season: number;
  skipFields: boolean;
  stepDelayMs?: number;
  tournamentIds: number[];
};

export type BallDontLieSeedSummary = {
  bucketStatus: "created" | "exists";
  elapsedMs: number;
  fieldsSkipped: boolean;
  season: number;
  steps: Array<{
    elapsedMs: number;
    result: BallDontLieSyncResult;
    step: string;
  }>;
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
    sample: false,
    season: new Date().getFullYear(),
    skipFields: false,
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
    "  --tournament-id <id[,id]>   BALLDONTLIE tournament id for field sync. Repeatable.",
    "  --skip-fields               Skip tournament field sync.",
    "  --max-pages <count>         Maximum cursor pages per endpoint.",
    "  --per-page <count>          Page size. BALLDONTLIE supports up to 100.",
    "  --page-delay-ms <ms>        Delay between pages. Default is provider-safe.",
    "  --step-delay-ms <ms>        Delay between endpoint steps. Default is provider-safe.",
    "  --sample                    Fetch one page per endpoint and stop intentionally.",
  ].join("\n");
}

function pageOptionsFromArgs(args: BallDontLieSeedArgs) {
  return {
    ...(args.maxPages !== undefined ? { maxPages: args.maxPages } : {}),
    ...(args.pageDelayMs !== undefined ? { pageDelayMs: args.pageDelayMs } : {}),
    ...(args.perPage !== undefined ? { perPage: args.perPage } : {}),
    ...(args.sample
      ? {
          maxPages: args.maxPages ?? 1,
          pageDelayMs: args.pageDelayMs ?? DEFAULT_TRIAL_REQUEST_DELAY_MS,
          perPage: args.perPage ?? 1,
          stopAfterMaxPages: true,
        }
      : {}),
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

export async function runBallDontLieSeed({
  env,
  rawSnapshotStore,
  seedArgs,
}: RunBallDontLieSeedOptions): Promise<BallDontLieSeedSummary> {
  if (!env.BALL_DONT_LIE_API_KEY) {
    throw new Error("BALL_DONT_LIE_API_KEY is required");
  }

  const startedAt = performance.now();
  const dbClient = createDatabaseClient(env.DATABASE_URL);
  const s3 = createS3RawSnapshotStoreFromEnv(env);
  const store = rawSnapshotStore ?? s3.store;

  try {
    const bucketStatus =
      rawSnapshotStore === undefined
        ? await ensureRawSnapshotBucket({ bucket: s3.bucket, client: s3.client })
        : "exists";
    const client = createBallDontLieClient({
      apiKey: env.BALL_DONT_LIE_API_KEY,
      maxRetries: 1,
      timeoutMs: 15_000,
    });
    const commonOptions: BallDontLieSyncOptions = {
      client,
      pageOptions: pageOptionsFromArgs(seedArgs),
      rawSnapshotStore: store,
      repository: createDrizzleCanonicalRepository(dbClient.db),
    };
    const steps: BallDontLieSeedSummary["steps"] = [];
    const stepDelayMs = seedArgs.stepDelayMs ?? DEFAULT_TRIAL_REQUEST_DELAY_MS;

    await runDelayedStep(steps, stepDelayMs, "courses", () =>
      syncBallDontLieCourses(commonOptions),
    );
    await runDelayedStep(steps, stepDelayMs, "tournaments", () =>
      syncBallDontLieTournaments({ ...commonOptions, season: seedArgs.season }),
    );
    await runDelayedStep(steps, stepDelayMs, "players", () =>
      syncBallDontLiePlayers(commonOptions),
    );

    if (!seedArgs.skipFields) {
      for (const tournamentId of seedArgs.tournamentIds) {
        await runDelayedStep(steps, stepDelayMs, `field:${tournamentId}`, () =>
          syncBallDontLieTournamentField({
            ...commonOptions,
            tournamentId,
          }),
        );
      }
    }

    return {
      bucketStatus,
      elapsedMs: Math.round(performance.now() - startedAt),
      fieldsSkipped: seedArgs.skipFields || seedArgs.tournamentIds.length === 0,
      season: seedArgs.season,
      steps,
      tournamentIds: seedArgs.tournamentIds,
    };
  } finally {
    await dbClient.close();
  }
}

function loadLocalEnv(cwd: string) {
  const envPath = join(cwd, ".env");
  const envLocalPath = join(cwd, ".env.local");

  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, quiet: true });
  }

  if (existsSync(envLocalPath)) {
    loadDotenv({ override: true, path: envLocalPath, quiet: true });
  }

  return parseEnv(process.env);
}

async function main() {
  try {
    const seedArgs = parseBallDontLieSeedArgs(process.argv.slice(2));
    const summary = await runBallDontLieSeed({
      env: loadLocalEnv(process.env.INIT_CWD ?? process.cwd()),
      seedArgs,
    });

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown ingest failure"}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
