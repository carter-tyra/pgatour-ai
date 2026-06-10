import "server-only";

import { parseEnv } from "@pgatour-ai/config";
import { createDatabaseClient } from "@pgatour-ai/db";

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

let databaseClient: DatabaseClient | undefined;

export function getDatabaseClient() {
  if (!databaseClient) {
    const env = parseEnv(process.env);
    databaseClient = createDatabaseClient(env.DATABASE_URL);
  }

  return databaseClient;
}

export function getDatabase() {
  return getDatabaseClient().db;
}
