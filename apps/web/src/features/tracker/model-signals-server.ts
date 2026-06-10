import "server-only";

import type { AppDatabase } from "@pgatour-ai/db";
import type { MarketType } from "@pgatour-ai/domain";
import { ApiError } from "@/lib/api-response";
import type { ModelQualitySummary, PlayerMarketModel } from "@/lib/intelligence-types";
import { buildIntelligenceModelContract } from "@/lib/model-contract";
import { selectLatestTournamentModelOutput } from "@/lib/model-output";
import { getTournamentSnapshot } from "../tournament/server";
import type { TrackerModelSignal } from "./types";

type Db = AppDatabase;

export type ResolvedModelSignal = {
  modelQuality: ModelQualitySummary;
  modelRunId: string;
  modelVersion: string;
  playerId: string;
  playerName: string;
  signal: PlayerMarketModel;
  tournamentId: string;
};

type TournamentModelSignalSet = {
  modelQuality: ModelQualitySummary;
  modelRunId: string;
  modelVersion: string;
  signals: TrackerModelSignal[];
  tournamentId: string;
};

type TrackerModelSignalInput = Omit<ResolvedModelSignal, "modelQuality">;

function toTrackerModelSignal({
  modelRunId,
  modelVersion,
  playerId,
  playerName,
  signal,
  tournamentId,
}: TrackerModelSignalInput): TrackerModelSignal {
  return {
    ...signal,
    modelRunId,
    modelVersion,
    playerId,
    playerName,
    tournamentId,
  };
}

function assertModelAutomationAllowed(quality: ModelQualitySummary) {
  if (quality.canAutomate) {
    return;
  }

  throw new ApiError({
    code: "model_quality_not_promotable",
    message: `${quality.label}. ${quality.helper}`,
    status: 412,
  });
}

async function loadTournamentModelContract(db: Db, tournamentId: string) {
  const snapshot = await getTournamentSnapshot({
    db,
    tournamentId,
  });

  if (!snapshot.tournament) {
    throw new ApiError({
      code: "tournament_not_found",
      message: "Tournament was not found.",
      status: 404,
    });
  }

  const modelOutput = await selectLatestTournamentModelOutput(tournamentId);
  const modelContract = buildIntelligenceModelContract({
    fieldPlayers: snapshot.fieldPlayers,
    modelOutput,
  });

  if (modelContract.model.status !== "ready" || !modelOutput) {
    throw new ApiError({
      code: "model_run_not_found",
      message: "No completed model run is available for this tournament.",
      status: 404,
    });
  }

  return {
    modelContract,
    modelOutput,
    snapshot,
  };
}

export async function resolveModelSignal(
  db: Db,
  input: {
    marketType: MarketType;
    playerId: string;
    tournamentId: string;
  },
): Promise<ResolvedModelSignal> {
  const { modelContract, modelOutput, snapshot } = await loadTournamentModelContract(
    db,
    input.tournamentId,
  );
  const fieldPlayer = snapshot.fieldPlayers.find((player) => player.id === input.playerId);

  if (!fieldPlayer) {
    throw new ApiError({
      code: "field_player_not_found",
      message: "Player is not in this tournament field.",
      status: 404,
    });
  }

  if (fieldPlayer.status !== "entered") {
    throw new ApiError({
      code: "field_player_unavailable",
      message: "Only entered players can be tracked from model signals.",
      status: 400,
    });
  }

  const signal = modelContract.playerModelMarketsById.get(input.playerId)?.[input.marketType];

  if (!signal) {
    throw new ApiError({
      code: "model_signal_not_found",
      message: "No model signal is available for that player and market.",
      status: 404,
    });
  }

  assertModelAutomationAllowed(modelOutput.quality);

  return {
    modelQuality: modelOutput.quality,
    modelRunId: modelOutput.run.id,
    modelVersion: `${modelOutput.run.modelName} ${modelOutput.run.modelVersion}`,
    playerId: input.playerId,
    playerName: fieldPlayer.name,
    signal,
    tournamentId: input.tournamentId,
  };
}

export async function resolveTournamentModelSignals(
  db: Db,
  tournamentId: string,
): Promise<TournamentModelSignalSet> {
  const { modelContract, modelOutput, snapshot } = await loadTournamentModelContract(
    db,
    tournamentId,
  );
  const enteredFieldPlayersById = new Map(
    snapshot.fieldPlayers
      .filter((player) => player.status === "entered")
      .map((player) => [player.id, player]),
  );
  const modelRunId = modelOutput.run.id;
  const modelVersion = `${modelOutput.run.modelName} ${modelOutput.run.modelVersion}`;
  const signals: TrackerModelSignal[] = [];

  assertModelAutomationAllowed(modelOutput.quality);

  for (const [playerId, marketSignals] of modelContract.playerModelMarketsById.entries()) {
    const fieldPlayer = enteredFieldPlayersById.get(playerId);

    if (!fieldPlayer) {
      continue;
    }

    for (const signal of Object.values(marketSignals)) {
      if (!signal) {
        continue;
      }

      signals.push(
        toTrackerModelSignal({
          modelRunId,
          modelVersion,
          playerId,
          playerName: fieldPlayer.name,
          signal,
          tournamentId,
        }),
      );
    }
  }

  return {
    modelQuality: modelOutput.quality,
    modelRunId,
    modelVersion,
    signals,
    tournamentId,
  };
}

export { toTrackerModelSignal };
