import {
  type ConfidenceLevel,
  edgePercentage,
  impliedProbabilityFromAmerican,
  type MarketType,
  marketTypes,
} from "@pgatour-ai/domain";
import type {
  CanonicalFieldPlayer,
  IntelligenceModelState,
  ModelMarketCoverage,
  ModelQualitySummary,
  ModelRunSummary,
  PlayerMarketModel,
} from "./intelligence-types";
import { unvalidatedModelQuality } from "./model-quality";

export type TournamentModelPredictionOutput = {
  baselineProbability: number | null;
  confidence: ConfidenceLevel;
  createdAt: string;
  drivers: string[];
  fairAmericanOdds: number;
  marketId: string | null;
  marketImpliedProbability: number | null;
  marketType: MarketType;
  modelEdge: number | null;
  probability: number;
  rank: number | null;
  risks: string[];
  simulationSummary: Record<string, unknown>;
  uncertainty: number | null;
};

export type PlayerTournamentModelOutput = {
  confidence: ConfidenceLevel;
  drivers: string[];
  predictions: Partial<Record<MarketType, TournamentModelPredictionOutput>>;
  probabilities: Partial<Record<MarketType, number>>;
  risks: string[];
  sourceFeatures: Record<string, unknown>;
};

export type LatestTournamentModelOutput = {
  playersById: Map<string, PlayerTournamentModelOutput>;
  predictionCount: number;
  quality: ModelQualitySummary;
  run: ModelRunSummary;
};

export type IntelligenceModelContract = {
  model: IntelligenceModelState;
  playerModelMarketsById: Map<string, Partial<Record<MarketType, PlayerMarketModel>>>;
};

type BuildModelContractInput = {
  fieldPlayers: CanonicalFieldPlayer[];
  modelOutput: LatestTournamentModelOutput | null;
};

function emptyMarketCoverage(): Record<MarketType, ModelMarketCoverage> {
  return Object.fromEntries(
    marketTypes.map((marketType) => [
      marketType,
      {
        currentPricedPredictionCount: 0,
        currentPriceCount: 0,
        marketType,
        predictionCount: 0,
        runPricedPredictionCount: 0,
      },
    ]),
  ) as Record<MarketType, ModelMarketCoverage>;
}

export function emptyModelState(
  overrides: Partial<IntelligenceModelState> = {},
): IntelligenceModelState {
  return {
    currentPricedPredictionCount: 0,
    helper: "Run Model v0 to rank the field",
    label: "No model run",
    marketCoverage: emptyMarketCoverage(),
    modeledPlayerCount: 0,
    predictionCount: 0,
    quality: unvalidatedModelQuality(),
    run: null,
    runPricedPredictionCount: 0,
    status: "empty",
    ...overrides,
  };
}

export function sampleModelState(modeledPlayerCount: number): IntelligenceModelState {
  return emptyModelState({
    helper: "Sample model output is not connected to canonical predictions",
    label: "Sample model",
    modeledPlayerCount,
    quality: unvalidatedModelQuality({
      helper: "Sample output cannot unlock model-backed actions.",
      label: "Sample only",
      status: "unvalidated",
      warnings: ["Sample model output is not validated."],
    }),
    status: "sample",
  });
}

export function unavailableModelState(): IntelligenceModelState {
  return emptyModelState({
    helper: "Check DATABASE_URL, migrations, and model run status",
    label: "Model unavailable",
    quality: unvalidatedModelQuality({
      helper: "Check DATABASE_URL and model evaluation tables.",
      label: "Quality unavailable",
      status: "unavailable",
      warnings: ["Model quality could not be loaded."],
    }),
    status: "unavailable",
  });
}

function safeImpliedProbability(americanOdds: number | null) {
  if (americanOdds === null) {
    return null;
  }

  try {
    return impliedProbabilityFromAmerican(americanOdds);
  } catch {
    return null;
  }
}

function safeExpectedValuePercent(probability: number, americanOdds: number | null) {
  if (americanOdds === null) {
    return null;
  }

  try {
    return edgePercentage(probability, americanOdds);
  } catch {
    return null;
  }
}

function indexFieldPlayersById(fieldPlayers: CanonicalFieldPlayer[]) {
  return new Map(fieldPlayers.map((player) => [player.id, player]));
}

function buildSignal({
  fieldPlayer,
  prediction,
}: {
  fieldPlayer: CanonicalFieldPlayer | undefined;
  prediction: TournamentModelPredictionOutput;
}): PlayerMarketModel {
  const currentPrice = fieldPlayer?.odds[prediction.marketType] ?? null;
  const currentMarketOdds = currentPrice?.americanOdds ?? null;

  return {
    baselineProbability: prediction.baselineProbability,
    confidence: prediction.confidence,
    currentExpectedValuePercent: safeExpectedValuePercent(
      prediction.probability,
      currentMarketOdds,
    ),
    currentMarketBook: currentPrice?.book ?? null,
    currentMarketCapturedAt: currentPrice?.capturedAt ?? null,
    currentMarketImpliedProbability: safeImpliedProbability(currentMarketOdds),
    currentMarketOdds,
    drivers: prediction.drivers,
    fairAmericanOdds: prediction.fairAmericanOdds,
    marketType: prediction.marketType,
    probability: prediction.probability,
    rank: prediction.rank,
    risks: prediction.risks,
    runMarketImpliedProbability: prediction.marketImpliedProbability,
    runProbabilityEdge: prediction.modelEdge,
    uncertainty: prediction.uncertainty,
  };
}

export function buildIntelligenceModelContract({
  fieldPlayers,
  modelOutput,
}: BuildModelContractInput): IntelligenceModelContract {
  const coverage = emptyMarketCoverage();
  const fieldPlayersById = indexFieldPlayersById(fieldPlayers);
  const playerModelMarketsById = new Map<string, Partial<Record<MarketType, PlayerMarketModel>>>();

  for (const player of fieldPlayers) {
    for (const marketType of marketTypes) {
      if (player.odds[marketType]) {
        coverage[marketType].currentPriceCount += 1;
      }
    }
  }

  if (!modelOutput) {
    return {
      model: emptyModelState({ marketCoverage: coverage }),
      playerModelMarketsById,
    };
  }

  let currentPricedPredictionCount = 0;
  let runPricedPredictionCount = 0;

  for (const [playerId, playerModel] of modelOutput.playersById) {
    const fieldPlayer = fieldPlayersById.get(playerId);
    const marketSignals: Partial<Record<MarketType, PlayerMarketModel>> = {};

    for (const marketType of marketTypes) {
      const prediction = playerModel.predictions[marketType];

      if (!prediction) {
        continue;
      }

      const signal = buildSignal({ fieldPlayer, prediction });
      marketSignals[marketType] = signal;
      coverage[marketType].predictionCount += 1;

      if (signal.runMarketImpliedProbability !== null) {
        coverage[marketType].runPricedPredictionCount += 1;
        runPricedPredictionCount += 1;
      }

      if (signal.currentMarketOdds !== null) {
        coverage[marketType].currentPricedPredictionCount += 1;
        currentPricedPredictionCount += 1;
      }
    }

    playerModelMarketsById.set(playerId, marketSignals);
  }

  return {
    model: {
      currentPricedPredictionCount,
      helper: `${modelOutput.run.modelName} ${modelOutput.run.modelVersion}`,
      label: `${modelOutput.playersById.size} modeled players`,
      marketCoverage: coverage,
      modeledPlayerCount: modelOutput.playersById.size,
      predictionCount: modelOutput.predictionCount,
      quality: modelOutput.quality,
      run: modelOutput.run,
      runPricedPredictionCount,
      status: modelOutput.playersById.size > 0 ? "ready" : "empty",
    },
    playerModelMarketsById,
  };
}
