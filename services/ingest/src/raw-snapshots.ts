import { type ProviderResponse, rawSnapshotSchema } from "@pgatour-ai/providers";
import { rawSnapshotKey } from "./jobs";

export type RawSnapshotStore = {
  put: (key: string, snapshot: unknown) => Promise<void>;
};

export class InMemoryRawSnapshotStore implements RawSnapshotStore {
  readonly snapshots = new Map<string, unknown>();

  async put(key: string, snapshot: unknown) {
    this.snapshots.set(key, snapshot);
  }
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
