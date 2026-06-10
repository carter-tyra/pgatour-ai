import type { AlertType, MarketType } from "@pgatour-ai/domain";
import {
  formatEdge,
  formatMarketType,
  formatOdds,
  formatPercent,
  hasCurrentMarketPrice,
} from "./model-tracker";
import type { TrackerModelSignal } from "./types";

type ModelEdgeAlertSignal = TrackerModelSignal & {
  currentExpectedValuePercent: number;
  currentMarketBook: string;
  currentMarketOdds: number;
};

export type ModelEdgeAlertCandidate = {
  alertType: Extract<AlertType, "new_edge">;
  dedupeKey: string;
  reason: string;
  signal: ModelEdgeAlertSignal;
  source: "model";
  title: string;
};

type BuildModelEdgeAlertCandidatesInput = {
  limit: number;
  marketTypes: readonly MarketType[] | undefined;
  minEdgePercent: number;
  signals: TrackerModelSignal[];
};

function isModelEdgeAlertSignal(signal: TrackerModelSignal): signal is ModelEdgeAlertSignal {
  return hasCurrentMarketPrice(signal) && signal.currentExpectedValuePercent !== null;
}

function modelEdgeAlertDedupeKey(signal: ModelEdgeAlertSignal) {
  return [
    "model-edge",
    signal.modelRunId,
    signal.tournamentId,
    signal.playerId,
    signal.marketType,
    signal.currentMarketBook,
    signal.currentMarketOdds,
  ].join(":");
}

function modelEdgeAlertTitle(signal: ModelEdgeAlertSignal) {
  return `${signal.playerName} ${formatMarketType(signal.marketType)} edge`;
}

function modelEdgeAlertReason(signal: ModelEdgeAlertSignal) {
  const edge = formatEdge(signal.currentExpectedValuePercent);

  return [
    `Model ${signal.modelVersion} has ${formatPercent(signal.probability)} for ${formatMarketType(signal.marketType)}`,
    `fair ${formatOdds(signal.fairAmericanOdds)}`,
    `market ${formatOdds(signal.currentMarketOdds)} at ${signal.currentMarketBook}`,
    edge,
  ]
    .filter(Boolean)
    .join("; ");
}

function qualifiesForModelEdgeAlert(
  signal: TrackerModelSignal,
  marketTypes: Set<MarketType> | null,
  minEdgePercent: number,
): signal is ModelEdgeAlertSignal {
  if (marketTypes && !marketTypes.has(signal.marketType)) {
    return false;
  }

  if (!isModelEdgeAlertSignal(signal)) {
    return false;
  }

  return signal.currentExpectedValuePercent >= minEdgePercent;
}

function compareModelEdgeAlertCandidates(
  first: ModelEdgeAlertCandidate,
  second: ModelEdgeAlertCandidate,
) {
  const firstEdge = first.signal.currentExpectedValuePercent ?? Number.NEGATIVE_INFINITY;
  const secondEdge = second.signal.currentExpectedValuePercent ?? Number.NEGATIVE_INFINITY;

  if (firstEdge !== secondEdge) {
    return secondEdge - firstEdge;
  }

  if (first.signal.probability !== second.signal.probability) {
    return second.signal.probability - first.signal.probability;
  }

  return first.signal.playerName.localeCompare(second.signal.playerName);
}

export function buildModelEdgeAlertCandidates({
  limit,
  marketTypes,
  minEdgePercent,
  signals,
}: BuildModelEdgeAlertCandidatesInput) {
  const marketTypeFilter = marketTypes ? new Set(marketTypes) : null;

  return signals
    .filter((signal): signal is ModelEdgeAlertSignal =>
      qualifiesForModelEdgeAlert(signal, marketTypeFilter, minEdgePercent),
    )
    .map((signal): ModelEdgeAlertCandidate => {
      return {
        alertType: "new_edge",
        dedupeKey: modelEdgeAlertDedupeKey(signal),
        reason: modelEdgeAlertReason(signal),
        signal,
        source: "model",
        title: modelEdgeAlertTitle(signal),
      };
    })
    .sort(compareModelEdgeAlertCandidates)
    .slice(0, limit);
}
