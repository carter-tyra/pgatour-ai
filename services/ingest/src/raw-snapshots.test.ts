import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { ensureRawSnapshotBucket, persistRawSnapshot, S3RawSnapshotStore } from "./raw-snapshots";

class FakeS3Client implements Pick<S3Client, "send"> {
  readonly commands: unknown[] = [];
  missingBucket = false;

  async send(command: unknown) {
    this.commands.push(command);

    if (command instanceof HeadBucketCommand && this.missingBucket) {
      const error = new Error("NotFound");
      error.name = "NotFound";
      throw error;
    }

    return {};
  }
}

describe("raw snapshots", () => {
  it("writes validated snapshots to S3 as JSON", async () => {
    const client = new FakeS3Client();
    const store = new S3RawSnapshotStore({
      bucket: "pgatour-ai-raw",
      client,
    });

    const key = await persistRawSnapshot(store, {
      capturedAt: "2026-05-25T12:00:00.000Z",
      endpoint: "players",
      params: { per_page: "1" },
      payload: { data: [] },
      requestHash: "players-hash-0000000000000000",
      source: "balldontlie",
    });

    const command = client.commands[0];

    expect(key).toBe("balldontlie/2026-05-25/players/players-hash-0000000000000000.json");
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: "pgatour-ai-raw",
      ContentType: "application/json",
      Key: key,
    });
    expect(JSON.parse(String((command as PutObjectCommand).input.Body))).toMatchObject({
      endpoint: "players",
      source: "balldontlie",
    });
  });

  it("creates the raw snapshot bucket when missing", async () => {
    const client = new FakeS3Client();
    client.missingBucket = true;

    await expect(
      ensureRawSnapshotBucket({
        bucket: "pgatour-ai-raw",
        client,
      }),
    ).resolves.toBe("created");

    expect(client.commands[0]).toBeInstanceOf(HeadBucketCommand);
    expect(client.commands[1]).toBeInstanceOf(CreateBucketCommand);
  });
});
