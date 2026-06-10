import type { TournamentSnapshot } from "./types";

export type TournamentSnapshotParams = {
  tournamentId?: string | null;
};

function withTournamentSearchParams(path: string, params?: TournamentSnapshotParams) {
  const searchParams = new URLSearchParams();

  if (params?.tournamentId) {
    searchParams.set("tournamentId", params.tournamentId);
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function readApiResponse<TData>(response: Response): Promise<TData> {
  if (response.ok) {
    return response.json() as Promise<TData>;
  }

  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;

  throw new Error(body?.error?.message ?? "Request failed.");
}

export async function fetchTournamentSnapshot(params?: TournamentSnapshotParams) {
  const response = await fetch(withTournamentSearchParams("/api/tournament", params), {
    credentials: "same-origin",
  });

  return readApiResponse<TournamentSnapshot>(response);
}
