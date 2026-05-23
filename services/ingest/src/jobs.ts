import type { ProviderClient, ProviderResponse } from "@pgatour-ai/providers";

export type IngestJobName =
  | "sync-tournament-schedule"
  | "sync-player-metadata"
  | "sync-field"
  | "sync-course-holes"
  | "sync-odds-snapshot"
  | "sync-live-leaderboard"
  | "sync-tee-times"
  | "sync-weather"
  | "sync-news"
  | "sync-fantasy";

export type IngestJobResult<TPayload = unknown> = {
  jobName: IngestJobName;
  source: ProviderResponse<TPayload>["source"];
  endpoint: string;
  capturedAt: string;
  requestHash: string;
  rawSnapshotKey: string;
};

export function rawSnapshotKey(response: ProviderResponse<unknown>) {
  const capturedDate = response.capturedAt.slice(0, 10);

  return `${response.source}/${capturedDate}/${response.endpoint.replaceAll("/", "_")}/${response.requestHash}.json`;
}

export async function runProviderSnapshotJob<TPayload>({
  jobName,
  client,
  endpoint,
  params,
}: {
  jobName: IngestJobName;
  client: ProviderClient;
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
}): Promise<IngestJobResult<TPayload>> {
  const request = params === undefined ? { endpoint } : { endpoint, params };
  const response = await client.fetchJson<TPayload>(request);

  return {
    jobName,
    source: response.source,
    endpoint: response.endpoint,
    capturedAt: response.capturedAt,
    requestHash: response.requestHash,
    rawSnapshotKey: rawSnapshotKey(response),
  };
}
