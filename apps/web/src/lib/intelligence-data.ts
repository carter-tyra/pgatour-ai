import { type MarketType, marketTypes } from "@pgatour-ai/domain";
import { cache } from "react";
import { getTournamentSnapshot } from "@/features/tournament/server";
import type { CanonicalTournament, TournamentSnapshot } from "@/features/tournament/types";
import { buildEventReadiness } from "./event-readiness";
import type {
  CanonicalFieldPlayer,
  EventReadiness,
  EventReadinessResource,
  EventReadinessResourceId,
  IntelligenceData,
  IntelligenceModelState,
  IntelligenceSourceState,
  PlayerIntelligence,
  PlayerMarketModel,
  TournamentIntelligence,
} from "./intelligence-types";
import {
  buildIntelligenceModelContract,
  type LatestTournamentModelOutput,
  sampleModelState,
  unavailableModelState,
} from "./model-contract";
import { selectLatestTournamentModelOutput } from "./model-output";
import {
  alertFeed,
  defaultContest,
  players as samplePlayers,
  tournament as sampleTournament,
  trackedBets,
} from "./sample-data";

type LoadIntelligenceDataOptions = {
  tournamentId?: string | null | undefined;
  tournamentSnapshot?: TournamentSnapshot;
};

function emptyMarketOdds(): Record<MarketType, number | null> {
  return Object.fromEntries(marketTypes.map((marketType) => [marketType, null])) as Record<
    MarketType,
    number | null
  >;
}

function finiteNumberFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function boundedScore(value: number | null, scale: number, fallback = 50) {
  if (value === null) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(50 + value * scale)));
}

function currentOddsFromCanonicalPlayer(player: CanonicalFieldPlayer) {
  const odds = emptyMarketOdds();

  for (const marketType of marketTypes) {
    odds[marketType] = player.odds[marketType]?.americanOdds ?? null;
  }

  return odds;
}

function modelProbabilitiesFromMarkets(
  modelMarkets: Partial<Record<MarketType, PlayerMarketModel>>,
) {
  const probabilities: Partial<Record<MarketType, number>> = {};

  for (const marketType of marketTypes) {
    const probability = modelMarkets[marketType]?.probability;

    if (probability !== undefined) {
      probabilities[marketType] = probability;
    }
  }

  return probabilities;
}

function formatAmericanOdds(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

const coreReadinessResourceIds = ["field", "markets", "tee_times", "model"] as const;

const listFormatter = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
});

function sentenceCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function resourceLabel(resource: EventReadinessResource) {
  return resource.label.toLowerCase();
}

function readinessResource(
  readiness: EventReadiness,
  id: EventReadinessResourceId,
): EventReadinessResource | null {
  return readiness.resources.find((resource) => resource.id === id) ?? null;
}

function resourceBlockerSentence(resource: EventReadinessResource) {
  if (resource.id === "tee_times" && resource.status === "pending") {
    return "Tee times are not available yet for this event.";
  }

  if (resource.id === "tee_times" && resource.status === "missing") {
    return "Tee times are not loaded for this event.";
  }

  if (resource.id === "markets" && resource.status === "missing") {
    return "Market prices are not loaded for this event.";
  }

  if (resource.id === "model" && resource.status === "missing") {
    return "Model output is not loaded for this event.";
  }

  if (resource.id === "field" && resource.status === "missing") {
    return "Field data is not loaded for this event.";
  }

  return resource.helper;
}

function readinessWarning(readiness: EventReadiness) {
  const resources = coreReadinessResourceIds
    .map((id) => readinessResource(readiness, id))
    .filter((resource): resource is EventReadinessResource => Boolean(resource));
  const readyLabels = resources
    .filter((resource) => resource.status === "ready")
    .map(resourceLabel);
  const readySentence =
    readyLabels.length > 0
      ? `${sentenceCase(listFormatter.format(readyLabels))} ${
          readyLabels.length === 1 ? "is" : "are"
        } ready.`
      : "No core event feeds are ready.";
  const blockers = resources
    .filter((resource) => resource.status !== "ready")
    .map(resourceBlockerSentence);

  return [readySentence, ...blockers].join(" ");
}

function sourceWarnings({
  hasCanonicalField,
  modelState,
  readiness,
  selectedTournament,
}: {
  hasCanonicalField: boolean;
  modelState: IntelligenceModelState;
  readiness: EventReadiness;
  selectedTournament: CanonicalTournament | null;
}) {
  if (!selectedTournament) {
    return [
      "Betting, fantasy, live, portfolio, and AI numbers are sample data.",
      "Run provider sync to replace the sample tournament.",
    ];
  }

  if (!hasCanonicalField) {
    return [readinessWarning(readiness), "Run provider sync before using event views."];
  }

  if (modelState.status === "ready" && !modelState.quality.canAutomate) {
    return [
      readinessWarning(readiness),
      `${modelState.quality.label}. ${modelState.quality.helper}`,
      "Live scores, fantasy entries, portfolio actions, and AI output are still gated.",
    ];
  }

  return [
    readinessWarning(readiness),
    "Live scores, fantasy entries, portfolio actions, and AI output are still gated.",
  ];
}

function canonicalPlayerMeta(player: CanonicalFieldPlayer) {
  const firstPricedMarket = marketTypes.find((marketType) => player.odds[marketType]);

  if (firstPricedMarket) {
    const price = player.odds[firstPricedMarket];

    if (price) {
      return `${firstPricedMarket.replaceAll("_", " ")} ${formatAmericanOdds(price.americanOdds)} at ${price.book}`;
    }
  }

  const firstTeeTime = player.teeTimes[0];

  if (firstTeeTime?.startsAt) {
    return `R${firstTeeTime.roundNumber} tee ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(firstTeeTime.startsAt))}`;
  }

  return player.teeWave ?? player.status;
}

function playerIntelligenceFromCanonicalField(
  fieldPlayers: CanonicalFieldPlayer[],
  modelOutput: LatestTournamentModelOutput | null,
  playerModelMarketsById: Map<string, Partial<Record<MarketType, PlayerMarketModel>>>,
): PlayerIntelligence[] {
  return fieldPlayers.map((player) => {
    const model = modelOutput?.playersById.get(player.id);
    const modelMarkets = playerModelMarketsById.get(player.id) ?? {};
    const sourceFeatures = model?.sourceFeatures ?? {};
    const longTermSgTotal = finiteNumberFromRecord(sourceFeatures, "longTermSgTotal");
    const recentSgTotal = finiteNumberFromRecord(sourceFeatures, "recentSgTotal");
    const courseFit = finiteNumberFromRecord(sourceFeatures, "courseFit");
    const volatility = finiteNumberFromRecord(sourceFeatures, "volatility");
    const uncertainty =
      modelMarkets.top_20?.uncertainty ?? modelMarkets.outright?.uncertainty ?? null;
    const winProbability = modelMarkets.outright?.probability ?? 0;
    const top20Probability = modelMarkets.top_20?.probability ?? 0;
    const cutProbability = modelMarkets.make_cut?.probability ?? 0;
    const hasModelSignals = marketTypes.some((marketType) => Boolean(modelMarkets[marketType]));

    return {
      archetype:
        player.status === "withdrawn"
          ? "Withdrawn field entry"
          : hasModelSignals
            ? "Model v0 projection"
            : "Canonical field entry",
      confidence: model?.confidence ?? "low",
      country: player.country ?? "Unknown",
      courseFit: model ? boundedScore(courseFit, 18) : 0,
      currentOdds: currentOddsFromCanonicalPlayer(player),
      cutProbability,
      drivers: model?.drivers.length ? model.drivers : [canonicalPlayerMeta(player)],
      form: model ? boundedScore(recentSgTotal, 12) : 0,
      id: player.id,
      lineMovement: [0],
      live: {
        position: "N/A",
        thru: "N/A",
        today: 0,
        total: 0,
      },
      modelMarkets,
      modelProbabilities: modelProbabilitiesFromMarkets(modelMarkets),
      name: player.name,
      ownership: 0,
      projectedPoints: top20Probability > 0 ? Math.round(top20Probability * 1000) / 10 : 0,
      risks: model?.risks.length ? model.risks : ["No model prediction loaded."],
      salary: 0,
      strokesGained: {
        approach: finiteNumberFromRecord(sourceFeatures, "sgApproach") ?? 0,
        offTee: finiteNumberFromRecord(sourceFeatures, "sgOffTee") ?? 0,
        putting: finiteNumberFromRecord(sourceFeatures, "sgPutting") ?? 0,
        total: longTermSgTotal ?? 0,
      },
      teeWave: canonicalPlayerMeta(player),
      tier: winProbability >= 0.05 ? "elite" : top20Probability >= 0.2 ? "contender" : "longshot",
      top20Probability,
      volatility:
        uncertainty !== null
          ? Math.round(uncertainty * 100)
          : volatility !== null
            ? Math.max(0, Math.min(100, Math.round(volatility * 12)))
            : 0,
      winProbability,
    };
  });
}

function sampleSourceState(overrides?: Partial<IntelligenceSourceState>): IntelligenceSourceState {
  const canonicalStatus = overrides?.canonicalStatus ?? "empty";
  const readiness =
    overrides?.readiness ??
    buildEventReadiness({
      canonicalStatus,
      fieldPlayers: [],
      model: sampleModelState(samplePlayers.length),
      tournamentName: null,
    });

  return {
    canonicalHelper: "Run provider sync to load the field",
    canonicalLabel: "No canonical data",
    canonicalStatus: "empty",
    fieldCount: 0,
    freshness: [],
    latestSyncRun: null,
    marketHelper: "No odds feed connected",
    marketLabel: "Sample prices",
    modelHelper: "No model run in DB",
    modelLabel: "Sample model",
    pricedCount: samplePlayers.length,
    readiness,
    tournamentSource: "sample",
    warnings: ["Sample betting, fantasy, live, portfolio, and AI data."],
    ...overrides,
  };
}

function tournamentFromCanonical(
  tournament: CanonicalTournament | null,
  sourceState: IntelligenceSourceState,
  modelState: IntelligenceModelState,
): TournamentIntelligence {
  if (!tournament) {
    return {
      ...sampleTournament,
      dataFreshness: sourceState.readiness.label,
      modelRunId:
        modelState.run?.id ?? (modelState.status === "sample" ? "sample-model-run" : "unavailable"),
      modelVersion: modelState.run
        ? `${modelState.run.modelName} ${modelState.run.modelVersion}`
        : modelState.status === "sample"
          ? "sample-v0.1.0"
          : modelState.label,
    };
  }

  return {
    course: tournament.courseName,
    dataFreshness: sourceState.readiness.label,
    id: tournament.id,
    modelRunId: modelState.run?.id ?? "unavailable",
    modelVersion: modelState.run
      ? `${modelState.run.modelName} ${modelState.run.modelVersion}`
      : modelState.label,
    name: tournament.name,
    startsOn: tournament.startsOn,
    status: tournament.status,
  };
}

export const loadIntelligenceData = cache(
  async (options: LoadIntelligenceDataOptions = {}): Promise<IntelligenceData> => {
    try {
      const snapshot =
        options.tournamentSnapshot ??
        (await getTournamentSnapshot({
          tournamentId: options.tournamentId,
        }));
      const selectedTournament = snapshot.tournament;
      const fieldPlayers = snapshot.fieldPlayers;
      const modelOutput = selectedTournament
        ? await selectLatestTournamentModelOutput(selectedTournament.id)
        : null;
      const hasCanonicalField = fieldPlayers.length > 0;
      const modelContract = buildIntelligenceModelContract({ fieldPlayers, modelOutput });
      const modelState = hasCanonicalField
        ? modelContract.model
        : sampleModelState(samplePlayers.length);
      const pricedCount = fieldPlayers.filter((player) =>
        marketTypes.some((marketType) => player.odds[marketType]),
      ).length;
      const hasMarketPrices = pricedCount > 0;
      const readiness = buildEventReadiness({
        canonicalStatus: selectedTournament ? "ready" : "empty",
        fieldPlayers,
        model: modelState,
        tournamentName: selectedTournament?.name ?? null,
        tournamentStartsOn: selectedTournament?.startsOn ?? null,
      });
      const sourceState = sampleSourceState({
        canonicalHelper: selectedTournament
          ? `${fieldPlayers.length} field players from ${selectedTournament.season}`
          : "No canonical tournament found",
        canonicalLabel: selectedTournament
          ? fieldPlayers.length > 0
            ? "Canonical field"
            : "Canonical tournament"
          : "No canonical data",
        canonicalStatus: selectedTournament ? "ready" : "empty",
        fieldCount: fieldPlayers.length,
        freshness: snapshot.freshness,
        latestSyncRun: snapshot.latestSyncRun,
        ...(hasCanonicalField
          ? {
              marketHelper: hasMarketPrices
                ? "BALLDONTLIE futures"
                : "Connect odds sync to price the field",
              marketLabel: hasMarketPrices ? `${pricedCount} priced players` : "No market prices",
              modelHelper: modelState.helper,
              modelLabel: modelState.label,
              pricedCount,
            }
          : {}),
        readiness,
        tournamentSource: selectedTournament ? "canonical" : "sample",
        warnings: sourceWarnings({
          hasCanonicalField,
          modelState,
          readiness,
          selectedTournament,
        }),
      });

      return {
        alertFeed: hasCanonicalField ? [] : alertFeed,
        canonicalFieldPlayers: fieldPlayers,
        defaultContest,
        model: modelState,
        players: hasCanonicalField
          ? playerIntelligenceFromCanonicalField(
              fieldPlayers,
              modelOutput,
              modelContract.playerModelMarketsById,
            )
          : samplePlayers,
        sourceState,
        tournament: tournamentFromCanonical(selectedTournament, sourceState, modelState),
        trackedBets: hasCanonicalField ? [] : trackedBets,
      };
    } catch {
      const modelState = unavailableModelState();
      const readiness = buildEventReadiness({
        canonicalStatus: "unavailable",
        fieldPlayers: [],
        model: modelState,
        tournamentName: null,
      });
      const sourceState = sampleSourceState({
        canonicalHelper: "Check DATABASE_URL and migrations",
        canonicalLabel: "DB unavailable",
        canonicalStatus: "unavailable",
        modelHelper: modelState.helper,
        modelLabel: modelState.label,
        readiness,
        warnings: [
          "Database data could not be loaded.",
          "Betting, fantasy, live, portfolio, and AI numbers are sample data.",
        ],
      });

      return {
        alertFeed,
        canonicalFieldPlayers: [],
        defaultContest,
        model: modelState,
        players: samplePlayers,
        sourceState,
        tournament: tournamentFromCanonical(null, sourceState, modelState),
        trackedBets,
      };
    }
  },
);
