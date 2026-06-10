import type {
  AlertDeliveryChannel,
  AlertDeliveryStatus,
  AlertType,
  BetStatus,
  DataSource,
  MarketType,
} from "@pgatour-ai/domain";
import type { TournamentSnapshot } from "@/features/tournament/types";
import type { ModelQualitySummary, PlayerMarketModel } from "@/lib/intelligence-types";

export type TrackerBet = {
  americanOdds: number;
  book: string;
  createdAt: string;
  id: string;
  marketType: MarketType;
  placedAt: string;
  playerCountry: string | null;
  playerId: string;
  playerName: string;
  stake: number;
  status: BetStatus;
  thesis: string | null;
  tournamentId: string;
  updatedAt: string;
};

export type TrackerWatchlistPlayer = {
  country: string | null;
  id: string;
  name: string;
  position: number;
  status: string | null;
  teeWave: string | null;
};

export type TrackerWatchlist = {
  createdAt: string;
  id: string;
  name: string;
  players: TrackerWatchlistPlayer[];
  tournamentId: string;
  updatedAt: string;
};

export type TrackerSummary = {
  openBetCount: number;
  openStake: number;
  settledBetCount: number;
  totalStake: number;
  watchlistCount: number;
};

export type TrackerModelSignal = PlayerMarketModel & {
  modelRunId: string;
  modelVersion: string;
  playerId: string;
  playerName: string;
  tournamentId: string;
};

export type ModelBackedTrackerBetResult = {
  bet: TrackerBet;
  modelQuality: ModelQualitySummary;
  modelSignal: TrackerModelSignal;
};

export type ModelBackedTrackerWatchlistResult = {
  modelQuality: ModelQualitySummary;
  modelSignal: TrackerModelSignal;
  watchlist: TrackerWatchlist;
};

export type TrackerAlert = {
  acknowledgedAt: string | null;
  alertType: AlertType;
  createdAt: string;
  dedupeKey: string;
  deliveredAt: string | null;
  id: string;
  reason: string;
  source: DataSource;
  title: string;
};

export type TrackerAlertsQueryStatus = "acknowledged" | "all" | "unacknowledged";

export type TrackerAlertsSnapshot = {
  alerts: TrackerAlert[];
  generatedAt: string;
  summary: {
    acknowledgedCount: number;
    returnedCount: number;
    unacknowledgedCount: number;
  };
};

export type TrackerAlertPreference = {
  alertType: AlertType;
  createdAt: string | null;
  emailEnabled: boolean;
  id: string | null;
  inAppEnabled: boolean;
  mutedUntil: string | null;
  updatedAt: string | null;
};

export type TrackerAlertPreferencesSnapshot = {
  generatedAt: string;
  preferences: TrackerAlertPreference[];
};

export type UpdateTrackerAlertPreferencesResult = TrackerAlertPreferencesSnapshot & {
  updatedCount: number;
};

export type TrackerAlertDelivery = {
  alert: TrackerAlert;
  alertId: string;
  attemptCount: number;
  channel: AlertDeliveryChannel;
  claimedAt: string;
  createdAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  id: string;
  status: AlertDeliveryStatus;
  updatedAt: string;
  userId: string;
};

export type DeliverEligibleAlertsResult = {
  claimedCount: number;
  completedCount: number;
  deliveredAt: string;
  deliveries: TrackerAlertDelivery[];
};

export type AcknowledgeTrackerAlertsResult = {
  acknowledgedCount: number;
  acknowledgedAt: string;
  alerts: TrackerAlert[];
};

export type GeneratedModelEdgeAlerts = {
  alerts: TrackerAlert[];
  createdCount: number;
  generatedAt: string;
  modelQuality: ModelQualitySummary;
  modelRunId: string;
  modelVersion: string;
  signals: TrackerModelSignal[];
  tournamentId: string;
};

export type TrackerSnapshot = TournamentSnapshot & {
  bets: TrackerBet[];
  summary: TrackerSummary;
  watchlists: TrackerWatchlist[];
};
