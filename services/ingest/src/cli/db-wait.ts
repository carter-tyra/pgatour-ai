import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { loadLocalEnv } from "../local-env";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_INTERVAL_MS = 1_000;

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}"`);
  }

  return parsed;
}

function optionValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  return [...new Set(messages)].join(" Cause: ") || "Unknown database error";
}

async function probeDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    connect_timeout: 2,
    max: 1,
    prepare: false,
  });

  try {
    await client`select 1`;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function waitForDatabase({
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  intervalMs?: number;
  timeoutMs?: number;
} = {}) {
  const env = loadLocalEnv();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      await probeDatabase(env.DATABASE_URL);

      return;
    } catch (error) {
      lastError = error;
      await sleep(intervalMs);
    }
  }

  throw new Error(
    [
      `Database is not reachable after ${timeoutMs}ms.`,
      "Start local Postgres with `pnpm db:bootstrap` or start your configured database.",
      `Detail: ${errorDetail(lastError)}`,
    ].join(" "),
  );
}

async function main() {
  const timeoutMs = parsePositiveInteger(optionValue("--timeout-ms"), DEFAULT_TIMEOUT_MS);
  const intervalMs = parsePositiveInteger(optionValue("--interval-ms"), DEFAULT_INTERVAL_MS);

  try {
    await waitForDatabase({ intervalMs, timeoutMs });
    process.stdout.write("Database is reachable.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown database error"}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
