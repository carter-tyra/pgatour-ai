import "server-only";

import {
  type AppDatabase,
  books,
  courses,
  fieldEntries,
  ingestionFreshness,
  markets,
  oddsSnapshots,
  players,
  syncRuns,
  teeTimes,
  tournaments,
} from "@pgatour-ai/db";
import type { MarketType } from "@pgatour-ai/domain";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { ApiError } from "@/lib/api-response";
import { getDatabase } from "@/lib/database";
import type {
  CanonicalFieldPlayer,
  LatestSyncRun,
  SourceFreshness,
} from "@/lib/intelligence-types";
import type { CanonicalTournament, TournamentSnapshot } from "./types";

const tournamentSelect = {
  courseName: courses.name,
  endsOn: tournaments.endsOn,
  id: tournaments.id,
  name: tournaments.name,
  season: tournaments.season,
  startsOn: tournaments.startsOn,
  status: tournaments.status,
};

type Db = AppDatabase;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toISOString();
}

export function fullPlayerName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function numberFromNumeric(value: number | string) {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

async function selectTournamentById(db: Db, tournamentId: string) {
  const [tournament] = await db
    .select(tournamentSelect)
    .from(tournaments)
    .innerJoin(courses, eq(tournaments.courseId, courses.id))
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  return tournament ?? null;
}

async function selectCurrentTournament(db: Db) {
  const today = todayIsoDate();
  const [tournament] = await db
    .select(tournamentSelect)
    .from(tournaments)
    .innerJoin(courses, eq(tournaments.courseId, courses.id))
    .where(and(lte(tournaments.startsOn, today), gte(tournaments.endsOn, today)))
    .orderBy(desc(tournaments.startsOn))
    .limit(1);

  return tournament ?? null;
}

async function selectUpcomingTournament(db: Db) {
  const today = todayIsoDate();
  const [tournament] = await db
    .select(tournamentSelect)
    .from(tournaments)
    .innerJoin(courses, eq(tournaments.courseId, courses.id))
    .where(gte(tournaments.startsOn, today))
    .orderBy(asc(tournaments.startsOn))
    .limit(1);

  return tournament ?? null;
}

async function selectLatestTournament(db: Db) {
  const [tournament] = await db
    .select(tournamentSelect)
    .from(tournaments)
    .innerJoin(courses, eq(tournaments.courseId, courses.id))
    .orderBy(desc(tournaments.startsOn))
    .limit(1);

  return tournament ?? null;
}

export async function selectTournament(db: Db, tournamentId?: string | null) {
  if (tournamentId) {
    return selectTournamentById(db, tournamentId);
  }

  return (
    (await selectCurrentTournament(db)) ??
    (await selectUpcomingTournament(db)) ??
    (await selectLatestTournament(db))
  );
}

export async function selectFieldPlayers(
  db: Db,
  tournamentId: string,
): Promise<CanonicalFieldPlayer[]> {
  const [rows, teeTimeRows, oddsRows] = await Promise.all([
    db
      .select({
        country: players.country,
        firstName: players.firstName,
        id: players.id,
        lastName: players.lastName,
        status: fieldEntries.status,
        teeWave: fieldEntries.teeWave,
      })
      .from(fieldEntries)
      .innerJoin(players, eq(fieldEntries.playerId, players.id))
      .where(eq(fieldEntries.tournamentId, tournamentId))
      .orderBy(asc(players.lastName), asc(players.firstName))
      .limit(250),
    db
      .select({
        groupNumber: teeTimes.groupNumber,
        playerId: teeTimes.playerId,
        roundNumber: teeTimes.roundNumber,
        startsAt: teeTimes.startsAt,
        tee: teeTimes.tee,
        wave: teeTimes.wave,
      })
      .from(teeTimes)
      .where(eq(teeTimes.tournamentId, tournamentId))
      .orderBy(asc(teeTimes.roundNumber), asc(teeTimes.startsAt)),
    db
      .select({
        americanOdds: oddsSnapshots.americanOdds,
        book: books.name,
        capturedAt: oddsSnapshots.capturedAt,
        impliedProbability: oddsSnapshots.impliedProbability,
        marketId: markets.id,
        marketType: markets.marketType,
        playerId: markets.playerId,
      })
      .from(markets)
      .innerJoin(books, eq(markets.bookId, books.id))
      .innerJoin(oddsSnapshots, eq(oddsSnapshots.marketId, markets.id))
      .where(eq(markets.tournamentId, tournamentId))
      .orderBy(desc(oddsSnapshots.capturedAt))
      .limit(20_000),
  ]);
  const teeTimesByPlayerId = new Map<string, CanonicalFieldPlayer["teeTimes"]>();
  const latestOddsByMarketId = new Map<string, (typeof oddsRows)[number]>();
  const bestOddsByPlayerMarket = new Map<
    string,
    NonNullable<CanonicalFieldPlayer["odds"][MarketType]>
  >();
  const oddsByPlayerId = new Map<string, CanonicalFieldPlayer["odds"]>();

  for (const row of teeTimeRows) {
    const playerTeeTimes = teeTimesByPlayerId.get(row.playerId) ?? [];

    playerTeeTimes.push({
      groupNumber: row.groupNumber,
      roundNumber: row.roundNumber,
      startsAt: toIsoString(row.startsAt),
      tee: row.tee,
      wave: row.wave,
    });
    teeTimesByPlayerId.set(row.playerId, playerTeeTimes);
  }

  for (const row of oddsRows) {
    if (!latestOddsByMarketId.has(row.marketId)) {
      latestOddsByMarketId.set(row.marketId, row);
    }
  }

  for (const row of latestOddsByMarketId.values()) {
    const key = `${row.playerId}:${row.marketType}`;
    const existing = bestOddsByPlayerMarket.get(key);

    if (existing && existing.americanOdds >= row.americanOdds) {
      continue;
    }

    bestOddsByPlayerMarket.set(key, {
      americanOdds: row.americanOdds,
      book: row.book,
      capturedAt: toIsoString(row.capturedAt) ?? new Date().toISOString(),
      impliedProbability: numberFromNumeric(row.impliedProbability),
    });
  }

  for (const [key, price] of bestOddsByPlayerMarket.entries()) {
    const [playerId, marketType] = key.split(":") as [string, MarketType];
    const playerOdds = oddsByPlayerId.get(playerId) ?? {};

    playerOdds[marketType] = price;
    oddsByPlayerId.set(playerId, playerOdds);
  }

  return rows.map((row) => ({
    country: row.country,
    id: row.id,
    name: fullPlayerName(row.firstName, row.lastName),
    odds: oddsByPlayerId.get(row.id) ?? {},
    status: row.status,
    teeWave: row.teeWave,
    teeTimes: teeTimesByPlayerId.get(row.id) ?? [],
  }));
}

export async function selectFreshness(db: Db): Promise<SourceFreshness[]> {
  const freshnessRows = await db
    .select({
      latestCapturedAt: ingestionFreshness.latestCapturedAt,
      latestCompletedAt: ingestionFreshness.latestCompletedAt,
      resource: ingestionFreshness.resource,
      source: ingestionFreshness.source,
      staleAfter: ingestionFreshness.staleAfter,
      status: ingestionFreshness.status,
      updatedAt: ingestionFreshness.updatedAt,
    })
    .from(ingestionFreshness)
    .orderBy(desc(ingestionFreshness.updatedAt))
    .limit(24);

  return freshnessRows.map((row) => ({
    latestCapturedAt: toIsoString(row.latestCapturedAt),
    latestCompletedAt: toIsoString(row.latestCompletedAt),
    resource: row.resource,
    source: row.source,
    staleAfter: toIsoString(row.staleAfter),
    status: row.status,
    updatedAt: toIsoString(row.updatedAt) ?? new Date().toISOString(),
  }));
}

export async function selectLatestSyncRun(db: Db): Promise<LatestSyncRun | null> {
  const [run] = await db
    .select({
      completedAt: syncRuns.completedAt,
      jobType: syncRuns.jobType,
      source: syncRuns.source,
      startedAt: syncRuns.startedAt,
      status: syncRuns.status,
    })
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);

  if (!run) {
    return null;
  }

  return {
    completedAt: toIsoString(run.completedAt),
    jobType: run.jobType,
    source: run.source,
    startedAt: toIsoString(run.startedAt) ?? new Date().toISOString(),
    status: run.status,
  };
}

export async function getTournamentSnapshot(options?: {
  db?: Db;
  tournamentId?: string | null | undefined;
}): Promise<TournamentSnapshot> {
  const db = options?.db ?? getDatabase();
  const tournament = await selectTournament(db, options?.tournamentId);
  const [fieldPlayers, freshness, latestSyncRun] = await Promise.all([
    tournament ? selectFieldPlayers(db, tournament.id) : [],
    selectFreshness(db),
    selectLatestSyncRun(db),
  ]);

  return {
    fieldPlayers,
    freshness,
    latestSyncRun,
    tournament,
  };
}

export async function requireTournament(
  db: Db,
  tournamentId: string,
): Promise<CanonicalTournament> {
  const tournament = await selectTournamentById(db, tournamentId);

  if (!tournament) {
    throw new ApiError({
      code: "tournament_not_found",
      message: "Tournament was not found.",
      status: 404,
    });
  }

  return tournament;
}

export async function requireTournamentFieldPlayers(
  db: Db,
  tournamentId: string,
  playerIds: string[],
) {
  if (playerIds.length === 0) {
    return;
  }

  const uniquePlayerIds = Array.from(new Set(playerIds));
  const rows = await db
    .select({ playerId: fieldEntries.playerId })
    .from(fieldEntries)
    .where(
      and(
        eq(fieldEntries.tournamentId, tournamentId),
        inArray(fieldEntries.playerId, uniquePlayerIds),
      ),
    );

  const knownPlayerIds = new Set(rows.map((row) => row.playerId));
  const missingPlayerIds = uniquePlayerIds.filter((playerId) => !knownPlayerIds.has(playerId));

  if (missingPlayerIds.length > 0) {
    throw new ApiError({
      code: "field_player_required",
      message: "Every tracked player must belong to the selected tournament field.",
      status: 400,
    });
  }
}
