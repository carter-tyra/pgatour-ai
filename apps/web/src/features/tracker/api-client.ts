import type {
  AcknowledgeTrackerAlertsInput,
  CreateModelBackedUserBetInput,
  CreateUserBetInput,
  CreateUserWatchlistInput,
  GenerateModelEdgeAlertsInput,
  TrackerAlertsQuery,
  UpdateTrackerAlertPreferencesInput,
  UpdateUserBetInput,
  UpdateUserWatchlistInput,
  UpsertModelBackedWatchlistInput,
} from "@pgatour-ai/domain";
import type {
  AcknowledgeTrackerAlertsResult,
  GeneratedModelEdgeAlerts,
  ModelBackedTrackerBetResult,
  ModelBackedTrackerWatchlistResult,
  TrackerAlertPreferencesSnapshot,
  TrackerAlertsSnapshot,
  TrackerBet,
  TrackerSnapshot,
  TrackerWatchlist,
  UpdateTrackerAlertPreferencesResult,
} from "./types";

export type TrackerSnapshotParams = {
  tournamentId?: string | null;
};

export type TrackerAlertsParams = Partial<TrackerAlertsQuery>;

type DeletedTrackerRecord = {
  id: string;
};

function withSearchParams(
  path: string,
  params?: Record<string, null | number | string | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
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

async function writeJson<TData>(path: string, method: "PATCH" | "POST", input: unknown) {
  const response = await fetch(path, {
    body: JSON.stringify(input),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method,
  });

  return readApiResponse<TData>(response);
}

export async function fetchTrackerSnapshot(params?: TrackerSnapshotParams) {
  const response = await fetch(withSearchParams("/api/tracker", params), {
    credentials: "same-origin",
  });

  return readApiResponse<TrackerSnapshot>(response);
}

export async function fetchTrackerAlerts(params?: TrackerAlertsParams) {
  const response = await fetch(withSearchParams("/api/tracker/alerts", params), {
    credentials: "same-origin",
  });

  return readApiResponse<TrackerAlertsSnapshot>(response);
}

export async function acknowledgeTrackerAlerts(input: AcknowledgeTrackerAlertsInput) {
  return writeJson<AcknowledgeTrackerAlertsResult>("/api/tracker/alerts", "PATCH", input);
}

export async function fetchTrackerAlertPreferences() {
  const response = await fetch("/api/tracker/alert-preferences", {
    credentials: "same-origin",
  });

  return readApiResponse<TrackerAlertPreferencesSnapshot>(response);
}

export async function updateTrackerAlertPreferences(input: UpdateTrackerAlertPreferencesInput) {
  return writeJson<UpdateTrackerAlertPreferencesResult>(
    "/api/tracker/alert-preferences",
    "PATCH",
    input,
  );
}

export async function createTrackerBet(input: CreateUserBetInput) {
  const response = await writeJson<{ bet: TrackerBet }>("/api/tracker/bets", "POST", input);
  return response.bet;
}

export async function createModelBackedTrackerBet(input: CreateModelBackedUserBetInput) {
  return writeJson<ModelBackedTrackerBetResult>("/api/tracker/model/bets", "POST", input);
}

export async function updateTrackerBet(input: { betId: string; patch: UpdateUserBetInput }) {
  const response = await writeJson<{ bet: TrackerBet }>(
    `/api/tracker/bets/${input.betId}`,
    "PATCH",
    input.patch,
  );
  return response.bet;
}

export async function deleteTrackerBet(betId: string) {
  const response = await fetch(`/api/tracker/bets/${betId}`, {
    credentials: "same-origin",
    method: "DELETE",
  });

  const body = await readApiResponse<{ bet: DeletedTrackerRecord }>(response);
  return body.bet;
}

export async function createTrackerWatchlist(input: CreateUserWatchlistInput) {
  const response = await writeJson<{ watchlist: TrackerWatchlist }>(
    "/api/tracker/watchlists",
    "POST",
    input,
  );
  return response.watchlist;
}

export async function upsertModelBackedTrackerWatchlist(input: UpsertModelBackedWatchlistInput) {
  return writeJson<ModelBackedTrackerWatchlistResult>(
    "/api/tracker/model/watchlists",
    "POST",
    input,
  );
}

export async function generateModelEdgeTrackerAlerts(input: GenerateModelEdgeAlertsInput) {
  return writeJson<GeneratedModelEdgeAlerts>("/api/tracker/model/alerts", "POST", input);
}

export async function updateTrackerWatchlist(input: {
  patch: UpdateUserWatchlistInput;
  watchlistId: string;
}) {
  const response = await writeJson<{ watchlist: TrackerWatchlist }>(
    `/api/tracker/watchlists/${input.watchlistId}`,
    "PATCH",
    input.patch,
  );
  return response.watchlist;
}

export async function deleteTrackerWatchlist(watchlistId: string) {
  const response = await fetch(`/api/tracker/watchlists/${watchlistId}`, {
    credentials: "same-origin",
    method: "DELETE",
  });

  const body = await readApiResponse<{ watchlist: DeletedTrackerRecord }>(response);
  return body.watchlist;
}
