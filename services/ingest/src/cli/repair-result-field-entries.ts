import { pathToFileURL } from "node:url";
import { createDatabaseClient } from "@pgatour-ai/db";
import { loadLocalEnv } from "../local-env";
import { repairResultFieldEntries } from "../result-field-entries";

const CURRENT_SEASON = new Date().getFullYear();

type RepairResultFieldEntriesArgs = {
  dryRun: boolean;
  fromSeason: number;
  toSeason: number;
};

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function parseRepairResultFieldEntriesArgs(argv: string[]): RepairResultFieldEntriesArgs {
  const args: RepairResultFieldEntriesArgs = {
    dryRun: false,
    fromSeason: 2010,
    toSeason: CURRENT_SEASON,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--") {
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.fromSeason > args.toSeason) {
    throw new Error("--from-season must be less than or equal to --to-season");
  }

  return args;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  return typeof error === "string" && error.length > 0
    ? error
    : "Unknown result field-entry repair failure";
}

async function main() {
  const args = parseRepairResultFieldEntriesArgs(process.argv.slice(2));
  const env = loadLocalEnv();
  const dbClient = createDatabaseClient(env.DATABASE_URL);

  try {
    const summary = await repairResultFieldEntries(dbClient.db, args);

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  } finally {
    await dbClient.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
