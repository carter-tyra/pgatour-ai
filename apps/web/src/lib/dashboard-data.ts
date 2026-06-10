import "server-only";

import { marketTypes } from "@pgatour-ai/domain";
import { cache } from "react";

import { formatCurrency } from "@/features/intelligence-terminal/helpers";
import { getUserTracker } from "@/features/tracker/server";
import { loadIntelligenceData } from "@/lib/intelligence-data";
import { modelEdgeFor } from "@/lib/intelligence-math";
import type { EventReadinessStatus, IntelligenceModelState } from "./intelligence-types";

export type DashboardShellData = {
  bestEdge: string;
  courseName: string;
  dataFreshness: string;
  eventName: string;
  exposure: string;
  currentPricedPredictionCount: number;
  modeledPlayerCount: number;
  modelQualityHelper: string;
  modelQualityLabel: string;
  modelQualityStatus: IntelligenceModelState["quality"]["status"];
  modelRunId: string | null;
  modelStatus: IntelligenceModelState["status"];
  modelVersion: string;
  predictionCount: number;
  readinessHelper: string;
  readinessLabel: string;
  readinessScore: number;
  readinessStatus: EventReadinessStatus;
};

/**
 * Loads the dashboard's data once per request. Wrapped in React `cache`, so the
 * layout and every section route share a single DB round-trip. Uses the default
 * (current) tournament — layouts can't read search params, and the tournament
 * isn't user-switchable yet; a future selector would move it to a route param.
 */
export const getDashboardData = cache(async (userId: string) => {
  const trackerSnapshot = await getUserTracker({ userId });
  const data = await loadIntelligenceData({ tournamentSnapshot: trackerSnapshot });

  const bestPricedEdge = data.players
    .flatMap((player) =>
      marketTypes.map((marketType) => ({
        player,
        edge: modelEdgeFor(player, marketType),
        marketType,
      })),
    )
    .filter((row) => row.edge !== null)
    .sort((a, b) => (b.edge?.edge ?? 0) - (a.edge?.edge ?? 0))[0];
  const liveExposure = data.trackedBets.reduce((total, bet) => total + bet.stake, 0);

  const shell: DashboardShellData = {
    bestEdge: bestPricedEdge?.edge ? `${bestPricedEdge.edge.edge.toFixed(1)}%` : "N/A",
    courseName: data.tournament.course,
    currentPricedPredictionCount: data.model.currentPricedPredictionCount,
    dataFreshness: data.tournament.dataFreshness,
    eventName: data.tournament.name,
    exposure: formatCurrency(liveExposure),
    modeledPlayerCount: data.model.modeledPlayerCount,
    modelQualityHelper: data.model.quality.helper,
    modelQualityLabel: data.model.quality.label,
    modelQualityStatus: data.model.quality.status,
    modelRunId: data.model.run?.id ?? null,
    modelStatus: data.model.status,
    modelVersion: data.tournament.modelVersion,
    predictionCount: data.model.predictionCount,
    readinessHelper: data.sourceState.readiness.helper,
    readinessLabel: data.sourceState.readiness.label,
    readinessScore: data.sourceState.readiness.score,
    readinessStatus: data.sourceState.readiness.status,
  };

  return { data, shell, trackerSnapshot };
});
