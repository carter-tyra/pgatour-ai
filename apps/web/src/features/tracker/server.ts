import "server-only";

import {
  type AppDatabase,
  fieldEntries,
  players,
  userBets,
  userWatchlistPlayers,
  userWatchlists,
} from "@pgatour-ai/db";
import {
  type CreateUserBetInput,
  createModelBackedUserBetInputSchema,
  createUserBetInputSchema,
  createUserWatchlistInputSchema,
  updateUserBetInputSchema,
  updateUserWatchlistInputSchema,
  upsertModelBackedWatchlistInputSchema,
} from "@pgatour-ai/domain";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api-response";
import { getDatabase } from "@/lib/database";
import {
  fullPlayerName,
  getTournamentSnapshot,
  requireTournament,
  requireTournamentFieldPlayers,
  toIsoString,
} from "../tournament/server";
import { resolveModelSignal, toTrackerModelSignal } from "./model-signals-server";
import { buildModelBackedBetInput, hasCurrentMarketPrice } from "./model-tracker";
import type { TrackerBet, TrackerSnapshot, TrackerSummary, TrackerWatchlist } from "./types";

type Db = AppDatabase;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type QueryDb = Db | Transaction;

type DatabaseError = Error & {
  code?: string;
  constraint_name?: string;
};

function moneyToDatabase(value: number) {
  return value.toFixed(2);
}

function moneyFromDatabase(value: string | number) {
  return Number(value);
}

function dateFromInput(value?: string) {
  return value ? new Date(value) : new Date();
}

function requiredIsoString(value: Date | string | null) {
  return toIsoString(value) ?? new Date().toISOString();
}

function normalizeOptionalText(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

function toTrackerBet(row: {
  americanOdds: number;
  book: string;
  createdAt: Date | string | null;
  id: string;
  marketType: TrackerBet["marketType"];
  placedAt: Date | string | null;
  playerCountry: string | null;
  playerFirstName: string;
  playerId: string;
  playerLastName: string;
  stake: string | number;
  status: TrackerBet["status"];
  thesis: string | null;
  tournamentId: string;
  updatedAt: Date | string | null;
}): TrackerBet {
  return {
    americanOdds: row.americanOdds,
    book: row.book,
    createdAt: requiredIsoString(row.createdAt),
    id: row.id,
    marketType: row.marketType,
    placedAt: requiredIsoString(row.placedAt),
    playerCountry: row.playerCountry,
    playerId: row.playerId,
    playerName: fullPlayerName(row.playerFirstName, row.playerLastName),
    stake: moneyFromDatabase(row.stake),
    status: row.status,
    thesis: row.thesis,
    tournamentId: row.tournamentId,
    updatedAt: requiredIsoString(row.updatedAt),
  };
}

function buildSummary(bets: TrackerBet[], watchlists: TrackerWatchlist[]): TrackerSummary {
  return {
    openBetCount: bets.filter((bet) => bet.status === "open").length,
    openStake: bets
      .filter((bet) => bet.status === "open")
      .reduce((total, bet) => total + bet.stake, 0),
    settledBetCount: bets.filter((bet) => bet.status !== "open").length,
    totalStake: bets.reduce((total, bet) => total + bet.stake, 0),
    watchlistCount: watchlists.length,
  };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Error && (error as DatabaseError).code === "23505";
}

function throwTrackerDatabaseError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ApiError({
      code: "duplicate_tracker_record",
      message: "A tracker record with those details already exists.",
      status: 409,
    });
  }

  throw error;
}

async function selectUserBetById(db: QueryDb, userId: string, betId: string) {
  const [row] = await db
    .select({
      americanOdds: userBets.americanOdds,
      book: userBets.book,
      createdAt: userBets.createdAt,
      id: userBets.id,
      marketType: userBets.marketType,
      placedAt: userBets.placedAt,
      playerCountry: players.country,
      playerFirstName: players.firstName,
      playerId: userBets.playerId,
      playerLastName: players.lastName,
      stake: userBets.stake,
      status: userBets.status,
      thesis: userBets.thesis,
      tournamentId: userBets.tournamentId,
      updatedAt: userBets.updatedAt,
    })
    .from(userBets)
    .innerJoin(players, eq(userBets.playerId, players.id))
    .where(and(eq(userBets.userId, userId), eq(userBets.id, betId)))
    .limit(1);

  return row ? toTrackerBet(row) : null;
}

async function selectUserBets(
  db: QueryDb,
  userId: string,
  tournamentId: string,
): Promise<TrackerBet[]> {
  const rows = await db
    .select({
      americanOdds: userBets.americanOdds,
      book: userBets.book,
      createdAt: userBets.createdAt,
      id: userBets.id,
      marketType: userBets.marketType,
      placedAt: userBets.placedAt,
      playerCountry: players.country,
      playerFirstName: players.firstName,
      playerId: userBets.playerId,
      playerLastName: players.lastName,
      stake: userBets.stake,
      status: userBets.status,
      thesis: userBets.thesis,
      tournamentId: userBets.tournamentId,
      updatedAt: userBets.updatedAt,
    })
    .from(userBets)
    .innerJoin(players, eq(userBets.playerId, players.id))
    .where(and(eq(userBets.userId, userId), eq(userBets.tournamentId, tournamentId)))
    .orderBy(desc(userBets.createdAt))
    .limit(500);

  return rows.map(toTrackerBet);
}

async function selectUserWatchlistById(db: QueryDb, userId: string, watchlistId: string) {
  const [row] = await db
    .select({
      id: userWatchlists.id,
      tournamentId: userWatchlists.tournamentId,
    })
    .from(userWatchlists)
    .where(and(eq(userWatchlists.userId, userId), eq(userWatchlists.id, watchlistId)))
    .limit(1);

  return row ?? null;
}

async function selectUserWatchlistByName(
  db: QueryDb,
  userId: string,
  tournamentId: string,
  name: string,
) {
  const [row] = await db
    .select({
      id: userWatchlists.id,
      tournamentId: userWatchlists.tournamentId,
    })
    .from(userWatchlists)
    .where(
      and(
        eq(userWatchlists.userId, userId),
        eq(userWatchlists.tournamentId, tournamentId),
        eq(userWatchlists.name, name),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function selectUserWatchlists(
  db: QueryDb,
  userId: string,
  tournamentId: string,
): Promise<TrackerWatchlist[]> {
  const watchlistRows = await db
    .select({
      createdAt: userWatchlists.createdAt,
      id: userWatchlists.id,
      name: userWatchlists.name,
      tournamentId: userWatchlists.tournamentId,
      updatedAt: userWatchlists.updatedAt,
    })
    .from(userWatchlists)
    .where(and(eq(userWatchlists.userId, userId), eq(userWatchlists.tournamentId, tournamentId)))
    .orderBy(desc(userWatchlists.updatedAt), asc(userWatchlists.name))
    .limit(100);

  if (watchlistRows.length === 0) {
    return [];
  }

  const watchlistIds = watchlistRows.map((watchlist) => watchlist.id);
  const playerRows = await db
    .select({
      country: players.country,
      firstName: players.firstName,
      id: userWatchlistPlayers.playerId,
      lastName: players.lastName,
      position: userWatchlistPlayers.position,
      status: fieldEntries.status,
      teeWave: fieldEntries.teeWave,
      watchlistId: userWatchlistPlayers.watchlistId,
    })
    .from(userWatchlistPlayers)
    .innerJoin(players, eq(userWatchlistPlayers.playerId, players.id))
    .leftJoin(
      fieldEntries,
      and(
        eq(fieldEntries.tournamentId, tournamentId),
        eq(fieldEntries.playerId, userWatchlistPlayers.playerId),
      ),
    )
    .where(inArray(userWatchlistPlayers.watchlistId, watchlistIds))
    .orderBy(asc(userWatchlistPlayers.position), asc(players.lastName), asc(players.firstName));

  const playersByWatchlist = new Map<string, TrackerWatchlist["players"]>();

  for (const row of playerRows) {
    const watchlistPlayers = playersByWatchlist.get(row.watchlistId) ?? [];
    watchlistPlayers.push({
      country: row.country,
      id: row.id,
      name: fullPlayerName(row.firstName, row.lastName),
      position: row.position,
      status: row.status,
      teeWave: row.teeWave,
    });
    playersByWatchlist.set(row.watchlistId, watchlistPlayers);
  }

  return watchlistRows.map((watchlist) => ({
    createdAt: requiredIsoString(watchlist.createdAt),
    id: watchlist.id,
    name: watchlist.name,
    players: playersByWatchlist.get(watchlist.id) ?? [],
    tournamentId: watchlist.tournamentId,
    updatedAt: requiredIsoString(watchlist.updatedAt),
  }));
}

export async function getUserTracker(options: {
  tournamentId?: string | null | undefined;
  userId: string;
}): Promise<TrackerSnapshot> {
  const db = getDatabase();
  const snapshot = await getTournamentSnapshot({
    db,
    tournamentId: options.tournamentId,
  });

  if (options.tournamentId && !snapshot.tournament) {
    throw new ApiError({
      code: "tournament_not_found",
      message: "Tournament was not found.",
      status: 404,
    });
  }

  if (!snapshot.tournament) {
    return {
      ...snapshot,
      bets: [],
      summary: buildSummary([], []),
      watchlists: [],
    };
  }

  const [bets, watchlists] = await Promise.all([
    selectUserBets(db, options.userId, snapshot.tournament.id),
    selectUserWatchlists(db, options.userId, snapshot.tournament.id),
  ]);

  return {
    ...snapshot,
    bets,
    summary: buildSummary(bets, watchlists),
    watchlists,
  };
}

async function insertUserBet(db: Db, userId: string, input: CreateUserBetInput) {
  try {
    const [createdBet] = await db
      .insert(userBets)
      .values({
        americanOdds: input.americanOdds,
        book: input.book,
        marketType: input.marketType,
        placedAt: dateFromInput(input.placedAt),
        playerId: input.playerId,
        stake: moneyToDatabase(input.stake),
        thesis: normalizeOptionalText(input.thesis),
        tournamentId: input.tournamentId,
        userId,
      })
      .returning({ id: userBets.id });

    if (!createdBet) {
      throw new ApiError({
        code: "bet_create_failed",
        message: "Bet tracker entry could not be created.",
        status: 500,
      });
    }

    const bet = await selectUserBetById(db, userId, createdBet.id);

    if (!bet) {
      throw new ApiError({
        code: "bet_create_failed",
        message: "Bet tracker entry could not be loaded.",
        status: 500,
      });
    }

    return bet;
  } catch (error) {
    throwTrackerDatabaseError(error);
  }
}

export async function createUserBet(options: { input: unknown; userId: string }) {
  const input = createUserBetInputSchema.parse(options.input);
  const db = getDatabase();

  await requireTournament(db, input.tournamentId);
  await requireTournamentFieldPlayers(db, input.tournamentId, [input.playerId]);

  return insertUserBet(db, options.userId, input);
}

export async function createModelBackedUserBet(options: { input: unknown; userId: string }) {
  const input = createModelBackedUserBetInputSchema.parse(options.input);
  const db = getDatabase();
  const resolved = await resolveModelSignal(db, input);

  if (!hasCurrentMarketPrice(resolved.signal)) {
    throw new ApiError({
      code: "model_signal_unpriced",
      message: "That model signal does not have a current market price.",
      status: 400,
    });
  }

  const betInput = buildModelBackedBetInput({
    input,
    signal: resolved.signal,
  });
  const bet = await insertUserBet(db, options.userId, betInput);

  return {
    bet,
    modelQuality: resolved.modelQuality,
    modelSignal: toTrackerModelSignal(resolved),
  };
}

export async function updateUserBet(options: { betId: string; input: unknown; userId: string }) {
  const input = updateUserBetInputSchema.parse(options.input);
  const db = getDatabase();
  const [currentBet] = await db
    .select({
      playerId: userBets.playerId,
      tournamentId: userBets.tournamentId,
    })
    .from(userBets)
    .where(and(eq(userBets.id, options.betId), eq(userBets.userId, options.userId)))
    .limit(1);

  if (!currentBet) {
    throw new ApiError({
      code: "bet_not_found",
      message: "Bet tracker entry was not found.",
      status: 404,
    });
  }

  const nextTournamentId = input.tournamentId ?? currentBet.tournamentId;
  const nextPlayerId = input.playerId ?? currentBet.playerId;
  await requireTournament(db, nextTournamentId);
  await requireTournamentFieldPlayers(db, nextTournamentId, [nextPlayerId]);

  const updates: Partial<typeof userBets.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.tournamentId) {
    updates.tournamentId = input.tournamentId;
  }
  if (input.playerId) {
    updates.playerId = input.playerId;
  }
  if (input.marketType) {
    updates.marketType = input.marketType;
  }
  if (input.book) {
    updates.book = input.book;
  }
  if (input.stake !== undefined) {
    updates.stake = moneyToDatabase(input.stake);
  }
  if (input.americanOdds !== undefined) {
    updates.americanOdds = input.americanOdds;
  }
  if (input.status) {
    updates.status = input.status;
  }
  if (input.placedAt) {
    updates.placedAt = dateFromInput(input.placedAt);
  }
  if ("thesis" in input) {
    updates.thesis = normalizeOptionalText(input.thesis);
  }

  await db
    .update(userBets)
    .set(updates)
    .where(and(eq(userBets.id, options.betId), eq(userBets.userId, options.userId)));

  const bet = await selectUserBetById(db, options.userId, options.betId);

  if (!bet) {
    throw new ApiError({
      code: "bet_not_found",
      message: "Bet tracker entry was not found.",
      status: 404,
    });
  }

  return bet;
}

export async function deleteUserBet(options: { betId: string; userId: string }) {
  const db = getDatabase();
  const [deletedBet] = await db
    .delete(userBets)
    .where(and(eq(userBets.id, options.betId), eq(userBets.userId, options.userId)))
    .returning({ id: userBets.id });

  if (!deletedBet) {
    throw new ApiError({
      code: "bet_not_found",
      message: "Bet tracker entry was not found.",
      status: 404,
    });
  }

  return { id: deletedBet.id };
}

export async function createUserWatchlist(options: { input: unknown; userId: string }) {
  const input = createUserWatchlistInputSchema.parse(options.input);
  const db = getDatabase();

  await requireTournament(db, input.tournamentId);
  await requireTournamentFieldPlayers(db, input.tournamentId, input.playerIds);

  try {
    const watchlistId = await db.transaction(async (tx) => {
      const [createdWatchlist] = await tx
        .insert(userWatchlists)
        .values({
          name: input.name,
          tournamentId: input.tournamentId,
          userId: options.userId,
        })
        .returning({ id: userWatchlists.id });

      if (!createdWatchlist) {
        throw new ApiError({
          code: "watchlist_create_failed",
          message: "Watchlist could not be created.",
          status: 500,
        });
      }

      if (input.playerIds.length > 0) {
        await tx.insert(userWatchlistPlayers).values(
          input.playerIds.map((playerId, position) => ({
            playerId,
            position,
            watchlistId: createdWatchlist.id,
          })),
        );
      }

      return createdWatchlist.id;
    });

    const watchlists = await selectUserWatchlists(db, options.userId, input.tournamentId);
    const watchlist = watchlists.find((candidate) => candidate.id === watchlistId);

    if (!watchlist) {
      throw new ApiError({
        code: "watchlist_create_failed",
        message: "Watchlist could not be loaded.",
        status: 500,
      });
    }

    return watchlist;
  } catch (error) {
    throwTrackerDatabaseError(error);
  }
}

export async function upsertModelBackedWatchlist(options: { input: unknown; userId: string }) {
  const input = upsertModelBackedWatchlistInputSchema.parse(options.input);
  const db = getDatabase();
  const resolved = await resolveModelSignal(db, input);
  const watchlistId = await db.transaction(async (tx) => {
    const existingWatchlist = await selectUserWatchlistByName(
      tx,
      options.userId,
      input.tournamentId,
      input.name,
    );
    let nextWatchlistId = existingWatchlist?.id ?? null;

    if (!nextWatchlistId) {
      const [createdWatchlist] = await tx
        .insert(userWatchlists)
        .values({
          name: input.name,
          tournamentId: input.tournamentId,
          userId: options.userId,
        })
        .onConflictDoNothing({
          target: [userWatchlists.userId, userWatchlists.tournamentId, userWatchlists.name],
        })
        .returning({ id: userWatchlists.id });

      nextWatchlistId = createdWatchlist?.id ?? null;
    }

    if (!nextWatchlistId) {
      const rereadWatchlist = await selectUserWatchlistByName(
        tx,
        options.userId,
        input.tournamentId,
        input.name,
      );
      nextWatchlistId = rereadWatchlist?.id ?? null;
    }

    if (!nextWatchlistId) {
      throw new ApiError({
        code: "watchlist_create_failed",
        message: "Watchlist could not be created.",
        status: 500,
      });
    }

    const [positionRow] = await tx
      .select({
        position: sql<number>`coalesce(max(${userWatchlistPlayers.position}) + 1, 0)::int`,
      })
      .from(userWatchlistPlayers)
      .where(eq(userWatchlistPlayers.watchlistId, nextWatchlistId));

    await tx
      .insert(userWatchlistPlayers)
      .values({
        playerId: input.playerId,
        position: positionRow?.position ?? 0,
        watchlistId: nextWatchlistId,
      })
      .onConflictDoNothing({
        target: [userWatchlistPlayers.watchlistId, userWatchlistPlayers.playerId],
      });

    await tx
      .update(userWatchlists)
      .set({ updatedAt: new Date() })
      .where(
        and(eq(userWatchlists.id, nextWatchlistId), eq(userWatchlists.userId, options.userId)),
      );

    return nextWatchlistId;
  });
  const watchlists = await selectUserWatchlists(db, options.userId, input.tournamentId);
  const watchlist = watchlists.find((candidate) => candidate.id === watchlistId);

  if (!watchlist) {
    throw new ApiError({
      code: "watchlist_create_failed",
      message: "Watchlist could not be loaded.",
      status: 500,
    });
  }

  return {
    modelQuality: resolved.modelQuality,
    modelSignal: toTrackerModelSignal(resolved),
    watchlist,
  };
}

export async function updateUserWatchlist(options: {
  input: unknown;
  userId: string;
  watchlistId: string;
}) {
  const input = updateUserWatchlistInputSchema.parse(options.input);
  const db = getDatabase();
  const currentWatchlist = await selectUserWatchlistById(db, options.userId, options.watchlistId);

  if (!currentWatchlist) {
    throw new ApiError({
      code: "watchlist_not_found",
      message: "Watchlist was not found.",
      status: 404,
    });
  }

  if (input.playerIds) {
    await requireTournamentFieldPlayers(db, currentWatchlist.tournamentId, input.playerIds);
  }

  try {
    await db.transaction(async (tx) => {
      if (input.name) {
        await tx
          .update(userWatchlists)
          .set({
            name: input.name,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userWatchlists.id, options.watchlistId),
              eq(userWatchlists.userId, options.userId),
            ),
          );
      } else {
        await tx
          .update(userWatchlists)
          .set({ updatedAt: new Date() })
          .where(
            and(
              eq(userWatchlists.id, options.watchlistId),
              eq(userWatchlists.userId, options.userId),
            ),
          );
      }

      if (input.playerIds) {
        await tx
          .delete(userWatchlistPlayers)
          .where(eq(userWatchlistPlayers.watchlistId, options.watchlistId));

        if (input.playerIds.length > 0) {
          await tx.insert(userWatchlistPlayers).values(
            input.playerIds.map((playerId, position) => ({
              playerId,
              position,
              watchlistId: options.watchlistId,
            })),
          );
        }
      }
    });

    const watchlists = await selectUserWatchlists(
      db,
      options.userId,
      currentWatchlist.tournamentId,
    );
    const watchlist = watchlists.find((candidate) => candidate.id === options.watchlistId);

    if (!watchlist) {
      throw new ApiError({
        code: "watchlist_not_found",
        message: "Watchlist was not found.",
        status: 404,
      });
    }

    return watchlist;
  } catch (error) {
    throwTrackerDatabaseError(error);
  }
}

export async function deleteUserWatchlist(options: { userId: string; watchlistId: string }) {
  const db = getDatabase();
  const [deletedWatchlist] = await db
    .delete(userWatchlists)
    .where(
      and(eq(userWatchlists.id, options.watchlistId), eq(userWatchlists.userId, options.userId)),
    )
    .returning({ id: userWatchlists.id });

  if (!deletedWatchlist) {
    throw new ApiError({
      code: "watchlist_not_found",
      message: "Watchlist was not found.",
      status: 404,
    });
  }

  return { id: deletedWatchlist.id };
}
