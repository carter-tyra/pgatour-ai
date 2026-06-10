import type {
  ConfidenceLevel,
  ContestType,
  IngestionFreshnessStatus,
  MarketType,
  ModelRunType,
  SyncRunStatus,
} from "@pgatour-ai/domain";

export type MarketPrice = {
  americanOdds: number;
  book: string;
  capturedAt: string;
  impliedProbability: number;
};

export type PlayerIntelligence = {
  id: string;
  name: string;
  country: string;
  archetype: string;
  tier: "elite" | "contender" | "longshot";
  teeWave: string;
  salary: number;
  ownership: number;
  projectedPoints: number;
  cutProbability: number;
  winProbability: number;
  top20Probability: number;
  modelMarkets: Partial<Record<MarketType, PlayerMarketModel>>;
  modelProbabilities?: Partial<Record<MarketType, number>>;
  currentOdds: Record<MarketType, number | null>;
  strokesGained: {
    total: number;
    approach: number;
    offTee: number;
    putting: number;
  };
  courseFit: number;
  form: number;
  volatility: number;
  confidence: ConfidenceLevel;
  drivers: string[];
  risks: string[];
  lineMovement: number[];
  live: {
    position: string;
    total: number;
    today: number;
    thru: string;
  };
};

export type PlayerMarketModel = {
  baselineProbability: number | null;
  confidence: ConfidenceLevel;
  currentExpectedValuePercent: number | null;
  currentMarketBook: string | null;
  currentMarketCapturedAt: string | null;
  currentMarketImpliedProbability: number | null;
  currentMarketOdds: number | null;
  drivers: string[];
  fairAmericanOdds: number;
  marketType: MarketType;
  probability: number;
  rank: number | null;
  risks: string[];
  runMarketImpliedProbability: number | null;
  runProbabilityEdge: number | null;
  uncertainty: number | null;
};

export type ModelMarketCoverage = {
  currentPricedPredictionCount: number;
  currentPriceCount: number;
  marketType: MarketType;
  predictionCount: number;
  runPricedPredictionCount: number;
};

export type ModelRunSummary = {
  asOf: string | null;
  codeVersion: string;
  completedAt: string | null;
  config: Record<string, unknown>;
  featureSetId: string | null;
  id: string;
  inputHash: string;
  marketTypes: MarketType[];
  metrics: Record<string, unknown>;
  modelName: string;
  modelVersion: string;
  outputSchemaVersion: string;
  runType: ModelRunType;
  seed: number | null;
  startedAt: string;
  status: string;
  tournamentId: string | null;
  trainingWindowEnd: string | null;
  trainingWindowStart: string | null;
};

export type ModelQualityStatus = "validated" | "limited" | "unvalidated" | "unavailable";

export type ModelQualityGateId =
  | "known_outcomes"
  | "coverage"
  | "calibration"
  | "brier"
  | "log_loss";

export type ModelQualityGate = {
  id: ModelQualityGateId;
  label: string;
  helper: string;
  passed: boolean;
  threshold: number;
  value: number | null;
};

export type ModelCalibrationBin = {
  averageProbability: number;
  count: number;
  endProbability: number;
  outcomeRate: number;
  startProbability: number;
};

export type ModelQualitySummary = {
  averageClosingLineValue: number | null;
  backtestId: string | null;
  brierScore: number | null;
  calibrationBins: ModelCalibrationBin[];
  calibrationError: number | null;
  canAutomate: boolean;
  closingLineValueCoverage: number | null;
  closingLineValuePredictionCount: number;
  createdAt: string | null;
  coverage: number | null;
  evaluationCount: number;
  gates: ModelQualityGate[];
  helper: string;
  knownOutcomeCount: number;
  label: string;
  logLoss: number | null;
  marketCount: number;
  modelName: string | null;
  modelVersion: string | null;
  predictionCount: number;
  probabilityDrift: number | null;
  status: ModelQualityStatus;
  tournamentCount: number;
  warnings: string[];
};

export type IntelligenceModelState = {
  currentPricedPredictionCount: number;
  helper: string;
  label: string;
  marketCoverage: Record<MarketType, ModelMarketCoverage>;
  modeledPlayerCount: number;
  predictionCount: number;
  quality: ModelQualitySummary;
  run: ModelRunSummary | null;
  runPricedPredictionCount: number;
  status: "ready" | "empty" | "sample" | "unavailable";
};

export type TournamentIntelligence = {
  id: string;
  name: string;
  course: string;
  startsOn: string;
  status: string;
  modelRunId: string;
  modelVersion: string;
  dataFreshness: string;
};

export type TrackedBet = {
  id: string;
  playerId: string;
  marketType: MarketType;
  book: string;
  stake: number;
  odds: number;
  closingOdds: number;
  status: string;
  thesis: string;
};

export type AlertFeedItem = {
  id: string;
  title: string;
  reason: string;
  severity: "positive" | "warning";
  time: string;
};

export type FantasyContestConfig = {
  type: ContestType;
  salaryCap: number;
  rosterSize: number;
};

export type CanonicalFieldPlayer = {
  id: string;
  name: string;
  odds: Partial<Record<MarketType, MarketPrice>>;
  country: string | null;
  status: string;
  teeWave: string | null;
  teeTimes: Array<{
    groupNumber: number | null;
    roundNumber: number;
    startsAt: string | null;
    tee: string;
    wave: string;
  }>;
};

export type SourceFreshness = {
  latestCapturedAt: string | null;
  latestCompletedAt: string | null;
  resource: string;
  source: string;
  staleAfter: string | null;
  status: IngestionFreshnessStatus;
  updatedAt: string;
};

export type LatestSyncRun = {
  completedAt: string | null;
  jobType: string;
  source: string;
  startedAt: string;
  status: SyncRunStatus;
};

export type IntelligenceSourceState = {
  canonicalStatus: "ready" | "empty" | "unavailable";
  canonicalLabel: string;
  canonicalHelper: string;
  readiness: EventReadiness;
  fieldCount: number;
  freshness: SourceFreshness[];
  latestSyncRun: LatestSyncRun | null;
  marketHelper: string;
  marketLabel: string;
  modelHelper: string;
  modelLabel: string;
  pricedCount: number;
  tournamentSource: "canonical" | "sample";
  warnings: string[];
};

export type EventReadinessStatus = "ready" | "partial" | "pending" | "missing" | "unavailable";

export type EventReadinessResourceId = "tournament" | "field" | "markets" | "tee_times" | "model";

export type EventReadinessResource = {
  count: number;
  helper: string;
  id: EventReadinessResourceId;
  label: string;
  required: boolean;
  status: EventReadinessStatus;
  total: number | null;
};

export type EventReadiness = {
  helper: string;
  label: string;
  resources: EventReadinessResource[];
  score: number;
  status: EventReadinessStatus;
};

export type IntelligenceData = {
  alertFeed: AlertFeedItem[];
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  defaultContest: FantasyContestConfig;
  model: IntelligenceModelState;
  players: PlayerIntelligence[];
  sourceState: IntelligenceSourceState;
  tournament: TournamentIntelligence;
  trackedBets: TrackedBet[];
};
