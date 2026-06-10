import type { TrackerAlertsParams, TrackerSnapshotParams } from "./api-client";

export const trackerKeys = {
  all: ["tracker"] as const,
  alertPreferences: () => [...trackerKeys.all, "alert-preferences"] as const,
  alerts: (params?: TrackerAlertsParams) =>
    [
      ...trackerKeys.all,
      "alerts",
      { limit: params?.limit ?? null, status: params?.status ?? "all" },
    ] as const,
  snapshot: (params?: TrackerSnapshotParams) =>
    [...trackerKeys.all, "snapshot", { tournamentId: params?.tournamentId ?? null }] as const,
};
