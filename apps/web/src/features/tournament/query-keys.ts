import type { TournamentSnapshotParams } from "./api-client";

export const tournamentKeys = {
  all: ["tournament"] as const,
  snapshot: (params?: TournamentSnapshotParams) =>
    [...tournamentKeys.all, "snapshot", { tournamentId: params?.tournamentId ?? null }] as const,
};
