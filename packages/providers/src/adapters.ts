import { createProviderFetcher } from "./fetcher";
import type { ProviderAdapterOptions, ProviderClient } from "./types";

export function createDataGolfClient(
  options: Omit<ProviderAdapterOptions, "baseUrl">,
): ProviderClient {
  return {
    source: "datagolf",
    fetchJson: createProviderFetcher("datagolf", {
      ...options,
      baseUrl: "https://feeds.datagolf.com/",
    }),
  };
}

export function createSportsDataIoClient(
  options: Omit<ProviderAdapterOptions, "baseUrl">,
): ProviderClient {
  return {
    source: "sportsdataio",
    fetchJson: createProviderFetcher("sportsdataio", {
      ...options,
      baseUrl: "https://api.sportsdata.io/golf/v2/json/",
    }),
  };
}

export function createTheOddsApiClient(
  options: Omit<ProviderAdapterOptions, "baseUrl">,
): ProviderClient {
  return {
    source: "the-odds-api",
    fetchJson: createProviderFetcher("the-odds-api", {
      ...options,
      authStrategy: options.authStrategy ?? { type: "query", paramName: "apiKey" },
      baseUrl: "https://api.the-odds-api.com/v4/",
    }),
  };
}

export type BallDontLieClientOptions = Omit<ProviderAdapterOptions, "baseUrl" | "authStrategy"> & {
  baseUrl?: string;
};

export function createBallDontLieClient(options: BallDontLieClientOptions): ProviderClient {
  const { baseUrl = "https://api.balldontlie.io/pga/", ...fetcherOptions } = options;

  return {
    source: "balldontlie",
    fetchJson: createProviderFetcher("balldontlie", {
      ...fetcherOptions,
      authStrategy: { type: "authorization-header" },
      baseUrl,
    }),
  };
}
