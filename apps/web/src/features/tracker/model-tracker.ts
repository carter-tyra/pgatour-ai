import type {
  CreateModelBackedUserBetInput,
  CreateUserBetInput,
  MarketType,
} from "@pgatour-ai/domain";
import type { PlayerMarketModel } from "@/lib/intelligence-types";

export type PricedPlayerMarketModel = PlayerMarketModel & {
  currentMarketBook: string;
  currentMarketOdds: number;
};

export function hasCurrentMarketPrice(
  signal: PlayerMarketModel,
): signal is PricedPlayerMarketModel {
  return signal.currentMarketBook !== null && signal.currentMarketOdds !== null;
}

export function formatMarketType(marketType: MarketType) {
  return marketType.replaceAll("_", " ");
}

export function formatOdds(americanOdds: number) {
  return americanOdds > 0 ? `+${americanOdds}` : String(americanOdds);
}

export function formatPercent(probability: number) {
  return `${(probability * 100).toFixed(1)}%`;
}

export function formatEdge(edgePercent: number | null) {
  return edgePercent === null
    ? null
    : `${edgePercent >= 0 ? "+" : ""}${edgePercent.toFixed(1)}% EV`;
}

export function buildModelBackedThesis({
  marketType,
  signal,
}: {
  marketType: MarketType;
  signal: PlayerMarketModel;
}) {
  const price = hasCurrentMarketPrice(signal)
    ? `market ${formatOdds(signal.currentMarketOdds)} at ${signal.currentMarketBook}`
    : "no current market price";
  const edge = formatEdge(signal.currentExpectedValuePercent);

  return [
    `Model v0 ${formatMarketType(marketType)} ${formatPercent(signal.probability)}`,
    `fair ${formatOdds(signal.fairAmericanOdds)}`,
    price,
    edge,
  ]
    .filter(Boolean)
    .join("; ");
}

export function buildModelBackedBetInput({
  input,
  signal,
}: {
  input: CreateModelBackedUserBetInput;
  signal: PricedPlayerMarketModel;
}): CreateUserBetInput {
  const betInput: CreateUserBetInput = {
    americanOdds: signal.currentMarketOdds,
    book: signal.currentMarketBook,
    marketType: input.marketType,
    playerId: input.playerId,
    stake: input.stake,
    tournamentId: input.tournamentId,
  };

  if (input.placedAt) {
    betInput.placedAt = input.placedAt;
  }

  betInput.thesis =
    input.thesis ?? buildModelBackedThesis({ marketType: input.marketType, signal });

  return betInput;
}
