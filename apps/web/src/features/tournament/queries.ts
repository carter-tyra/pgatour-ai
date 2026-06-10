"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchTournamentSnapshot, type TournamentSnapshotParams } from "./api-client";
import { tournamentKeys } from "./query-keys";

export function tournamentSnapshotQueryOptions(params?: TournamentSnapshotParams) {
  return queryOptions({
    queryFn: () => fetchTournamentSnapshot(params),
    queryKey: tournamentKeys.snapshot(params),
    staleTime: 60_000,
  });
}

export function useTournamentSnapshotQuery(params?: TournamentSnapshotParams) {
  return useQuery(tournamentSnapshotQueryOptions(params));
}
