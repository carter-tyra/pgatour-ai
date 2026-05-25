import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export type DatabaseClient = {
  close: () => Promise<void>;
  db: AppDatabase;
};

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const client = postgres(databaseUrl, {
    max: 10,
    prepare: false,
  });

  return {
    close: () => client.end(),
    db: drizzle(client, { schema }),
  };
}
