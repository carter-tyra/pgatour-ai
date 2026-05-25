import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { AppEnv } from "@pgatour-ai/config";
import { type ProviderResponse, rawSnapshotSchema } from "@pgatour-ai/providers";
import { rawSnapshotKey } from "./jobs";

export type RawSnapshotStore = {
  put: (key: string, snapshot: unknown) => Promise<void>;
};

export type S3RawSnapshotStoreOptions = {
  bucket: string;
  client: Pick<S3Client, "send">;
};

export class InMemoryRawSnapshotStore implements RawSnapshotStore {
  readonly snapshots = new Map<string, unknown>();

  async put(key: string, snapshot: unknown) {
    this.snapshots.set(key, snapshot);
  }
}

export class S3RawSnapshotStore implements RawSnapshotStore {
  private readonly bucket: string;
  private readonly client: Pick<S3Client, "send">;

  constructor(options: S3RawSnapshotStoreOptions) {
    this.bucket = options.bucket;
    this.client = options.client;
  }

  async put(key: string, snapshot: unknown) {
    await this.client.send(
      new PutObjectCommand({
        Body: JSON.stringify(snapshot),
        Bucket: this.bucket,
        ContentType: "application/json",
        Key: key,
      }),
    );
  }
}

export function createS3ClientFromEnv(env: AppEnv) {
  const config: S3ClientConfig = {
    forcePathStyle: env.S3_ENDPOINT !== undefined,
    region: env.S3_REGION,
  };

  if (env.S3_ENDPOINT) {
    config.endpoint = env.S3_ENDPOINT;
  }

  if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
}

function isMissingBucketError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const metadata = "$metadata" in error ? error.$metadata : undefined;
  const statusCode =
    typeof metadata === "object" && metadata !== null && "httpStatusCode" in metadata
      ? metadata.httpStatusCode
      : undefined;

  return error.name === "NotFound" || error.name === "NoSuchBucket" || statusCode === 404;
}

export async function ensureRawSnapshotBucket({
  bucket,
  client,
}: {
  bucket: string;
  client: Pick<S3Client, "send">;
}) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));

    return "exists";
  } catch (error) {
    if (!isMissingBucketError(error)) {
      throw error;
    }
  }

  await client.send(new CreateBucketCommand({ Bucket: bucket }));

  return "created";
}

export function createS3RawSnapshotStoreFromEnv(env: AppEnv) {
  const client = createS3ClientFromEnv(env);

  return {
    bucket: env.RAW_SNAPSHOT_BUCKET,
    client,
    store: new S3RawSnapshotStore({
      bucket: env.RAW_SNAPSHOT_BUCKET,
      client,
    }),
  };
}

export async function persistRawSnapshot(
  store: RawSnapshotStore,
  response: ProviderResponse<unknown>,
) {
  const snapshot = rawSnapshotSchema.parse(response);
  const key = rawSnapshotKey(response);

  await store.put(key, snapshot);

  return key;
}
