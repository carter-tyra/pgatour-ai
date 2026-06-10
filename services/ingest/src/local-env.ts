import { parseEnv } from "@pgatour-ai/config";
import { loadWorkspaceEnv } from "@pgatour-ai/config/workspace-env";

export function loadLocalEnv() {
  loadWorkspaceEnv();

  return parseEnv(process.env);
}
