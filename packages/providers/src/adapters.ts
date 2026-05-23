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
      baseUrl: "https://api.the-odds-api.com/v4/",
    }),
  };
}
