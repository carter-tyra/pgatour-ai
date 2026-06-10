import { createHash } from "node:crypto";
import { type AppDatabase, ingestionFreshness, rawSnapshotRecords, syncRuns } from "@pgatour-ai/db";
import type { DataSource, IngestionFreshnessStatus, SyncRunStatus } from "@pgatour-ai/domain";
import type { ProviderResponse } from "@pgatour-ai/providers";
import { eq, sql } from "drizzle-orm";

export type StartSyncRunInput = {
  codeVersion?: string | undefined;
  jobType: string;
  params: Record<string, unknown>;
  season?: number | undefined;
  source: DataSource;
};

export type CompleteSyncRunInput = {
  counts: Record<string, unknown>;
  durationMs: number;
  error?: string | undefined;
  rawSnapshotKeys: string[];
  skipped: string[];
  status: SyncRunStatus;
};

export type SnapshotRecordInput = {
  response: ProviderResponse<unknown>;
  snapshotKey: string;
};

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function currentCodeVersion() {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? undefined;
}

export function defaultSyncRunCodeVersion() {
  return currentCodeVersion();
}

export async function startSyncRun(db: AppDatabase, input: StartSyncRunInput) {
  const [run] = await db
    .insert(syncRuns)
    .values({
      codeVersion: input.codeVersion,
      jobType: input.jobType,
      params: input.params,
      season: input.season,
      source: input.source,
    })
    .returning({ id: syncRuns.id });

  if (!run) {
    throw new Error(`Failed to start ${input.source} sync run`);
  }

  return run.id;
}

async function upsertFreshness({
  db,
  latestCapturedAt,
  latestCompletedAt,
  latestSyncRunId,
  resource,
  source,
  status,
  details,
}: {
  db: AppDatabase;
  details: Record<string, unknown>;
  latestCapturedAt?: Date | undefined;
  latestCompletedAt?: Date | undefined;
  latestSyncRunId: string;
  resource: string;
  source: DataSource;
  status: IngestionFreshnessStatus;
}) {
  await db
    .insert(ingestionFreshness)
    .values({
      details,
      latestCapturedAt,
      latestCompletedAt,
      latestSyncRunId,
      resource,
      source,
      status,
    })
    .onConflictDoUpdate({
      target: [ingestionFreshness.source, ingestionFreshness.resource],
      set: {
        details,
        latestCapturedAt,
        latestCompletedAt,
        latestSyncRunId,
        status,
        updatedAt: sql`now()`,
      },
    });
}

export class DatabaseSyncRunRecorder {
  private readonly resources = new Set<string>();

  constructor(
    private readonly db: AppDatabase,
    private readonly syncRunId: string,
    private readonly source: DataSource,
  ) {}

  async recordRawSnapshot({ response, snapshotKey }: SnapshotRecordInput) {
    const capturedAt = new Date(response.capturedAt);

    await this.db
      .insert(rawSnapshotRecords)
      .values({
        capturedAt,
        endpoint: response.endpoint,
        payloadHash: hashPayload(response.payload),
        requestHash: response.requestHash,
        requestParams: response.params,
        snapshotKey,
        source: response.source,
        syncRunId: this.syncRunId,
      })
      .onConflictDoUpdate({
        target: rawSnapshotRecords.snapshotKey,
        set: {
          capturedAt,
          endpoint: response.endpoint,
          payloadHash: hashPayload(response.payload),
          requestHash: response.requestHash,
          requestParams: response.params,
          source: response.source,
          syncRunId: this.syncRunId,
        },
      });

    this.resources.add(response.endpoint);

    await upsertFreshness({
      db: this.db,
      details: {
        latestRequestHash: response.requestHash,
        latestSnapshotKey: snapshotKey,
      },
      latestCapturedAt: capturedAt,
      latestSyncRunId: this.syncRunId,
      resource: response.endpoint,
      source: response.source,
      status: "fresh",
    });
  }

  async complete(input: CompleteSyncRunInput) {
    const completedAt = new Date();

    await this.db
      .update(syncRuns)
      .set({
        completedAt,
        counts: input.counts,
        durationMs: input.durationMs,
        error: input.error,
        rawSnapshotKeys: input.rawSnapshotKeys,
        skipped: input.skipped,
        status: input.status,
        updatedAt: sql`now()`,
      })
      .where(eq(syncRuns.id, this.syncRunId));

    for (const resource of this.resources) {
      await upsertFreshness({
        db: this.db,
        details: {
          latestStatus: input.status,
        },
        latestCompletedAt: completedAt,
        latestSyncRunId: this.syncRunId,
        resource,
        source: this.source,
        status: input.status === "failed" ? "failed" : "fresh",
      });
    }
  }
}
