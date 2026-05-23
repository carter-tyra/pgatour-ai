import { createHash } from "node:crypto";
import type { DataSource } from "@pgatour-ai/domain";
import type { ProviderAdapterOptions, ProviderRequest, ProviderResponse } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;

function toSearchParams(params: ProviderRequest["params"] = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

function hashRequest(source: DataSource, endpoint: string, params: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify({ source, endpoint, params })).digest("hex");
}

export function createProviderFetcher(source: DataSource, options: ProviderAdapterOptions) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  return async function fetchJson<TPayload>(
    request: ProviderRequest,
  ): Promise<ProviderResponse<TPayload>> {
    const params = Object.fromEntries(toSearchParams(request.params));
    const url = new URL(request.endpoint, options.baseUrl);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    if (options.apiKey) {
      url.searchParams.set("key", options.apiKey);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json",
            "user-agent": "pgatour-ai-ingest/0.1",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`${source} ${request.endpoint} returned ${response.status}`);
        }

        return {
          source,
          endpoint: request.endpoint,
          params,
          capturedAt: new Date().toISOString(),
          requestHash: hashRequest(source, request.endpoint, params),
          payload: (await response.json()) as TPayload,
        };
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${source}`);
  };
}
