import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as nextEnv from "@next/env";

type LoadEnvConfig = typeof nextEnv.loadEnvConfig;
type NextEnvModule = {
  default?: {
    loadEnvConfig?: LoadEnvConfig;
  };
  loadEnvConfig?: LoadEnvConfig;
};

const nextEnvModule = nextEnv as NextEnvModule;
const loadNextEnvConfig = nextEnvModule.loadEnvConfig ?? nextEnvModule.default?.loadEnvConfig;

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const silentLog = {
  error: () => undefined,
  info: () => undefined,
};

type LoadWorkspaceEnvOptions = {
  dev?: boolean;
  forceReload?: boolean;
};

let loaded = false;

export function getWorkspaceRoot() {
  return workspaceRoot;
}

export function loadWorkspaceEnv(options: LoadWorkspaceEnvOptions = {}) {
  if (loaded && !options.forceReload) {
    return;
  }

  const dev = options.dev ?? (process.env.NODE_ENV === "development" || !process.env.NODE_ENV);

  if (!loadNextEnvConfig) {
    throw new Error("@next/env loadEnvConfig export was not found");
  }

  loadNextEnvConfig(workspaceRoot, dev, silentLog, options.forceReload);
  loaded = true;
}
