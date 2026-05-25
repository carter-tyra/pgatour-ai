import { type DataSource, dataSources } from "@pgatour-ai/domain";
import { z } from "zod";

export const rawSnapshotSchema = z.object({
  source: z.enum(dataSources),
  endpoint: z.string().min(1),
  params: z.record(z.string(), z.string()).default({}),
  capturedAt: z.string().datetime(),
  requestHash: z.string().min(16),
  payload: z.unknown(),
});

export type RawSnapshot = z.infer<typeof rawSnapshotSchema>;

export type ProviderRequest = {
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
};

export type ProviderResponse<TPayload> = {
  source: DataSource;
  endpoint: string;
  params: Record<string, string>;
  capturedAt: string;
  requestHash: string;
  payload: TPayload;
};

export type ProviderClient = {
  source: DataSource;
  fetchJson<TPayload>(request: ProviderRequest): Promise<ProviderResponse<TPayload>>;
};

export type ProviderAdapterOptions = {
  apiKey?: string;
  authStrategy?: ProviderAuthStrategy;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
};

export type ProviderAuthStrategy =
  | {
      type: "query";
      paramName: string;
    }
  | {
      type: "authorization-header";
    };
