import { defineConfig } from "drizzle-kit";
import { loadWorkspaceEnv } from "./packages/config/src/workspace-env";

loadWorkspaceEnv();

export default defineConfig({
  schema: "./packages/db/src/schema.ts",
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pgatour_ai",
  },
});
