import type { MarketType } from "@pgatour-ai/domain";
import { modelEdgeFor } from "@/lib/intelligence-math";
import type { IntelligenceSourceState, PlayerIntelligence } from "@/lib/intelligence-types";

export const marketOptions: Array<{ value: MarketType; label: string }> = [
  { value: "outright", label: "Outright" },
  { value: "top_5", label: "Top 5" },
  { value: "top_10", label: "Top 10" },
  { value: "top_20", label: "Top 20" },
  { value: "make_cut", label: "Make cut" },
  { value: "matchup", label: "Matchup" },
];

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatOdds(americanOdds: number | null) {
  if (americanOdds === null) {
    return "N/A";
  }

  return americanOdds > 0 ? `+${americanOdds}` : String(americanOdds);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function confidenceTone(confidence: PlayerIntelligence["confidence"]) {
  if (confidence === "high") {
    return "positive";
  }

  if (confidence === "medium") {
    return "warning";
  }

  return "neutral";
}

export type PlayerEdge = {
  player: PlayerIntelligence;
  edge: NonNullable<ReturnType<typeof modelEdgeFor>>;
};

export function marketEdgeRows(
  players: PlayerIntelligence[],
  selectedMarket: MarketType,
  edgeFloor = Number.NEGATIVE_INFINITY,
) {
  return players
    .map((player) => ({ player, edge: modelEdgeFor(player, selectedMarket) }))
    .filter((row): row is PlayerEdge => Boolean(row.edge && row.edge.edge >= edgeFloor))
    .sort((a, b) => b.edge.edge - a.edge.edge);
}

export function sourceTone(status: IntelligenceSourceState["canonicalStatus"]) {
  if (status === "ready") {
    return "positive" as const;
  }

  if (status === "unavailable") {
    return "danger" as const;
  }

  return "warning" as const;
}
