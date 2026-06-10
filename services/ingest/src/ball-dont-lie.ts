import {
  type AppDatabase,
  books,
  courses,
  fieldEntries,
  holes,
  markets,
  oddsSnapshots,
  playerRoundResults,
  playerRoundStats,
  playerScorecards,
  playerSeasonStats,
  players,
  providerStatDefinitions,
  sourceEntityMappings,
  teeTimes,
  tournamentCourseHoleStats,
  tournamentCourses,
  tournamentResults,
  tournaments,
} from "@pgatour-ai/db";
import {
  americanToDecimal,
  type FieldEntryStatus,
  impliedProbabilityFromAmerican,
  type MarketType,
  type SourceEntityType,
} from "@pgatour-ai/domain";
import {
  type BallDontLieCourse,
  type BallDontLieCourseHole,
  type BallDontLieFuture,
  type BallDontLiePageOptions,
  type BallDontLiePlayer,
  type BallDontLiePlayerRoundResult,
  type BallDontLiePlayerRoundStats,
  type BallDontLiePlayerScorecard,
  type BallDontLiePlayerSeasonStat,
  type BallDontLieTeeTime,
  type BallDontLieTournament,
  type BallDontLieTournamentCourseStats,
  type BallDontLieTournamentFieldEntry,
  type BallDontLieTournamentResult,
  ballDontLieCourseHolesPageSchema,
  ballDontLieCoursesPageSchema,
  ballDontLieEndpoints,
  ballDontLieFuturesPageSchema,
  ballDontLiePlayerRoundResultsPageSchema,
  ballDontLiePlayerRoundStatsPageSchema,
  ballDontLiePlayerScorecardsPageSchema,
  ballDontLiePlayerSeasonStatsPageSchema,
  ballDontLiePlayersPageSchema,
  ballDontLieTeeTimesPageSchema,
  ballDontLieTournamentCourseStatsPageSchema,
  ballDontLieTournamentFieldPageSchema,
  ballDontLieTournamentResultsPageSchema,
  ballDontLieTournamentsPageSchema,
  fetchBallDontLiePages,
  type ProviderClient,
  type ProviderResponse,
} from "@pgatour-ai/providers";
import { and, eq, sql } from "drizzle-orm";
import { persistRawSnapshot, type RawSnapshotStore } from "./raw-snapshots";

const BALL_DONT_LIE_SOURCE = "balldontlie";

export type CanonicalBookInput = {
  isActive: boolean;
  name: string;
  region: string;
};

export type CanonicalPlayerInput = {
  country: string | null;
  firstName: string;
  lastName: string;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  status: string;
};

export type CanonicalCourseInput = {
  city: string;
  country: string;
  demandProfile: Record<string, unknown>;
  grass: string | null;
  name: string;
  par: number;
  region: string | null;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  yardage: number;
};

export type CanonicalTournamentInput = {
  courseId: string;
  endsOn: string;
  name: string;
  purseUsd: number | null;
  season: number;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  startsOn: string;
  status: string;
};

export type CanonicalTournamentCourseInput = {
  courseId: string;
  rounds: number[];
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  tournamentId: string;
};

export type CanonicalCourseHoleInput = {
  capturedAt: Date;
  courseId: string;
  holeNumber: number;
  par: number;
  rawSnapshotKey: string;
  scoringProfile: Record<string, unknown>;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  yardage: number;
};

export type CanonicalFieldEntryInput = {
  playerId: string;
  seed: number | null;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  status: FieldEntryStatus;
  teeWave: string | null;
  tournamentId: string;
};

export type CanonicalTeeTimeInput = {
  courseId: null | string;
  groupNumber: null | number;
  playerId: string;
  roundNumber: number;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  startsAt: Date | null;
  startTee: null | number;
  tee: string;
  tournamentId: string;
  wave: string;
};

export type CanonicalMarketInput = {
  bookId: string;
  externalMarketId: string;
  marketType: MarketType;
  playerId: string;
  sourceEntityId: string;
  tournamentId: string;
};

export type CanonicalOddsSnapshotInput = {
  americanOdds: number;
  capturedAt: Date;
  decimalOdds: string;
  impliedProbability: string;
  marketId: string;
  rawSnapshotKey: string;
};

export type CanonicalTournamentResultInput = {
  capturedAt: Date;
  disqualified: boolean;
  earningsUsd: null | string;
  madeCut: boolean | null;
  parRelativeScore: null | number;
  playerId: string;
  position: null | string;
  positionNumeric: null | number;
  rawSnapshotKey: string;
  sourceEntityId: string;
  totalStrokes: null | number;
  tournamentId: string;
  withdrawn: boolean;
};

export type CanonicalTournamentCourseHoleStatInput = {
  birdies: null | number;
  bogeys: null | number;
  capturedAt: Date;
  courseId: string;
  difficultyRank: null | number;
  doubleBogeys: null | number;
  eagles: null | number;
  holeNumber: number;
  pars: null | number;
  rawSnapshotKey: string;
  roundNumber: null | number;
  roundScope: string;
  scoringAverage: null | string;
  scoringDiff: null | string;
  sourceEntityId: string;
  tournamentId: string;
};

export type CanonicalPlayerRoundResultInput = {
  capturedAt: Date;
  courseId: null | string;
  parRelativeScore: null | number;
  playerId: string;
  rawSnapshotKey: string;
  roundNumber: number;
  score: null | number;
  sourceEntityId: string;
  tournamentId: string;
};

export type CanonicalPlayerRoundStatsInput = {
  birdies: null | number;
  bogeys: null | number;
  capturedAt: Date;
  doubleBogeys: null | number;
  drivingAccuracy: null | string;
  drivingAccuracyRank: null | number;
  drivingDistance: null | string;
  drivingDistanceRank: null | number;
  eagles: null | number;
  greensInRegulation: null | string;
  greensInRegulationRank: null | number;
  longestDrive: null | string;
  longestDriveRank: null | number;
  metrics: Record<string, unknown>;
  pars: null | number;
  playerId: string;
  puttsPerGir: null | string;
  puttsPerGirRank: null | number;
  rawSnapshotKey: string;
  roundNumber: number;
  sandSaves: null | string;
  sandSavesRank: null | number;
  scrambling: null | string;
  scramblingRank: null | number;
  sgApproach: null | string;
  sgApproachRank: null | number;
  sgAroundGreen: null | string;
  sgAroundGreenRank: null | number;
  sgOffTee: null | string;
  sgOffTeeRank: null | number;
  sgPutting: null | string;
  sgPuttingRank: null | number;
  sgTotal: null | string;
  sgTotalRank: null | number;
  sourceEntityId: string;
  tournamentId: string;
};

export type CanonicalPlayerScorecardInput = {
  capturedAt: Date;
  courseId: null | string;
  holeNumber: number;
  par: number;
  playerId: string;
  rawSnapshotKey: string;
  roundNumber: number;
  score: null | number;
  sourceEntityId: string;
  tournamentId: string;
};

export type CanonicalPlayerSeasonStatInput = {
  capturedAt: Date;
  playerId: string;
  rank: null | number;
  rawSnapshotKey: string;
  season: number;
  sourceEntityId: string;
  statCategory: null | string;
  statId: number;
  statName: string;
  statValue: Array<Record<string, string>> | null;
  valueNumeric: null | string;
  valueText: null | string;
};

export type CanonicalProviderStatDefinitionInput = {
  canonicalName: null | string;
  direction: null | string;
  parsePolicy: Record<string, unknown>;
  source: typeof BALL_DONT_LIE_SOURCE;
  statCategory: null | string;
  statId: string;
  statKey: string;
  statName: string;
  unit: null | string;
};

export type CanonicalRepository = {
  findCanonicalId: (entityType: SourceEntityType, sourceEntityId: string) => Promise<null | string>;
  ensureFieldEntry: (input: CanonicalFieldEntryInput) => Promise<string>;
  insertOddsSnapshot: (input: CanonicalOddsSnapshotInput) => Promise<boolean>;
  upsertBook: (input: CanonicalBookInput) => Promise<string>;
  upsertCourse: (input: CanonicalCourseInput) => Promise<string>;
  upsertCourseHole: (input: CanonicalCourseHoleInput) => Promise<string>;
  upsertFieldEntry: (input: CanonicalFieldEntryInput) => Promise<string>;
  upsertMarket: (input: CanonicalMarketInput) => Promise<string>;
  upsertPlayerRoundResult: (input: CanonicalPlayerRoundResultInput) => Promise<string>;
  upsertPlayerRoundStats: (input: CanonicalPlayerRoundStatsInput) => Promise<string>;
  upsertPlayerScorecard: (input: CanonicalPlayerScorecardInput) => Promise<string>;
  upsertPlayerSeasonStat: (input: CanonicalPlayerSeasonStatInput) => Promise<string>;
  upsertPlayer: (input: CanonicalPlayerInput) => Promise<string>;
  upsertProviderStatDefinition: (input: CanonicalProviderStatDefinitionInput) => Promise<string>;
  upsertTeeTime: (input: CanonicalTeeTimeInput) => Promise<string>;
  upsertTournamentCourse: (input: CanonicalTournamentCourseInput) => Promise<string>;
  upsertTournamentCourseHoleStat: (
    input: CanonicalTournamentCourseHoleStatInput,
  ) => Promise<string>;
  upsertTournamentResult: (input: CanonicalTournamentResultInput) => Promise<string>;
  upsertTournament: (input: CanonicalTournamentInput) => Promise<string>;
};

export type BallDontLieSyncResult = {
  booksUpserted: number;
  courseHolesUpserted: number;
  coursesUpserted: number;
  fieldEntriesUpserted: number;
  marketsUpserted: number;
  oddsSnapshotsInserted: number;
  pagesFetched: number;
  playerRoundResultsUpserted: number;
  playerRoundStatsUpserted: number;
  playerScorecardsUpserted: number;
  playerSeasonStatsUpserted: number;
  playersUpserted: number;
  providerStatDefinitionsUpserted: number;
  rawSnapshots: string[];
  skipped: string[];
  teeTimesUpserted: number;
  tournamentCourseHoleStatsUpserted: number;
  tournamentCoursesUpserted: number;
  tournamentResultsUpserted: number;
  tournamentsUpserted: number;
};

export type BallDontLieSyncOptions = {
  client: ProviderClient;
  pageOptions?: BallDontLiePageOptions;
  rawSnapshotStore: RawSnapshotStore;
  recordRawSnapshot?: (input: {
    response: ProviderResponse<unknown>;
    snapshotKey: string;
  }) => Promise<void>;
  repository: CanonicalRepository;
};

async function persistAndRecordRawSnapshot(options: {
  rawSnapshotStore: RawSnapshotStore;
  recordRawSnapshot: BallDontLieSyncOptions["recordRawSnapshot"];
  response: ProviderResponse<unknown>;
}) {
  const snapshotKey = await persistRawSnapshot(options.rawSnapshotStore, options.response);

  await options.recordRawSnapshot?.({
    response: options.response,
    snapshotKey,
  });

  return snapshotKey;
}

function emptyResult(): BallDontLieSyncResult {
  return {
    booksUpserted: 0,
    courseHolesUpserted: 0,
    coursesUpserted: 0,
    fieldEntriesUpserted: 0,
    marketsUpserted: 0,
    oddsSnapshotsInserted: 0,
    pagesFetched: 0,
    playerRoundResultsUpserted: 0,
    playerRoundStatsUpserted: 0,
    playerScorecardsUpserted: 0,
    playerSeasonStatsUpserted: 0,
    playersUpserted: 0,
    providerStatDefinitionsUpserted: 0,
    rawSnapshots: [],
    skipped: [],
    teeTimesUpserted: 0,
    tournamentCourseHoleStatsUpserted: 0,
    tournamentCoursesUpserted: 0,
    tournamentResultsUpserted: 0,
    tournamentsUpserted: 0,
  };
}

function sourceIds(sourceEntityId: string) {
  return { [BALL_DONT_LIE_SOURCE]: sourceEntityId };
}

function parseYardage(value: BallDontLieCourse["yardage"]) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replaceAll(",", ""), 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function parsePurseUsd(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.replaceAll(/[,$]/g, ""), 10);

  return Number.isNaN(parsed) ? null : parsed;
}

function numberToNumeric(value: number | null | undefined, fractionDigits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return value.toFixed(fractionDigits);
}

function nullableInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function normalizeStatus(value: string) {
  return value.toLowerCase().replaceAll(" ", "_");
}

function normalizeFieldStatus(
  value: BallDontLieTournamentFieldEntry["entry_status"],
): FieldEntryStatus {
  const normalized = value.trim().toUpperCase().replaceAll(/\s+/g, "_");

  if (normalized === "IN" || normalized === "ENTERED" || normalized === "CONFIRMED") {
    return "entered";
  }

  if (normalized === "WITHDRAWN" || normalized === "WD") {
    return "withdrawn";
  }

  if (normalized === "ALTERNATE") {
    return "alternate";
  }

  if (normalized === "QUALIFIED" || normalized === "QUALIFIER") {
    return "qualified";
  }

  return "unknown";
}

function isoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoLikeDateOnly(value: string | null | undefined) {
  if (!value || !/\d{4}/u.test(value)) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : isoDateOnly(parsed);
}

const monthIndexes = new Map(
  ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map(
    (month, index) => [month, index],
  ),
);

function parseProviderEndDate(value: string, startDate: string) {
  const isoEndDate = parseIsoLikeDateOnly(value);

  if (isoEndDate) {
    return isoEndDate;
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const match = /([A-Za-z]{3,9})\s+\d{1,2}\s*-\s*(?:([A-Za-z]{3,9})\s+)?(\d{1,2})/u.exec(value);

  if (!match || Number.isNaN(start.getTime())) {
    return startDate;
  }

  const startMonth = match[1]?.slice(0, 3).toLowerCase();
  const explicitEndMonth = match[2]?.slice(0, 3).toLowerCase();
  const endMonth = explicitEndMonth ?? startMonth;
  const endMonthIndex = endMonth ? monthIndexes.get(endMonth) : undefined;
  const endDay = Number.parseInt(match[3] ?? "", 10);

  if (endMonthIndex === undefined || Number.isNaN(endDay)) {
    return startDate;
  }

  const startYear = start.getUTCFullYear();
  const endYear = endMonthIndex < start.getUTCMonth() ? startYear + 1 : startYear;

  return isoDateOnly(new Date(Date.UTC(endYear, endMonthIndex, endDay)));
}

function parseNullableDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeBallDontLieTournamentDates(tournament: BallDontLieTournament) {
  const startsOn = parseIsoLikeDateOnly(tournament.start_date);

  if (!startsOn) {
    throw new Error(`BALLDONTLIE tournament ${tournament.id} has invalid start_date`);
  }

  return {
    endsOn: parseProviderEndDate(tournament.end_date, startsOn),
    startsOn,
  };
}

function cleanNamePart(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function namePartsFromDisplayName(displayName: string | null | undefined) {
  const parts = cleanNamePart(displayName)?.split(/\s+/) ?? [];

  if (parts.length < 2) {
    return null;
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function normalizeBallDontLiePlayer(player: BallDontLiePlayer): CanonicalPlayerInput | null {
  const sourceEntityId = String(player.id);
  const displayNameParts = namePartsFromDisplayName(player.display_name);
  const firstName = cleanNamePart(player.first_name) ?? displayNameParts?.firstName;
  const lastName = cleanNamePart(player.last_name) ?? displayNameParts?.lastName;

  if (!firstName || !lastName) {
    return null;
  }

  return {
    country: player.country ?? null,
    firstName,
    lastName,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    status: player.active === false ? "inactive" : "active",
  };
}

export function normalizeBallDontLieCourse(course: BallDontLieCourse): CanonicalCourseInput {
  const sourceEntityId = String(course.id);
  const grassValues = [course.fairway_grass, course.rough_grass, course.green_grass].filter(
    Boolean,
  );

  return {
    city: course.city,
    country: course.country,
    demandProfile: {
      fairwayGrass: course.fairway_grass ?? null,
      greenGrass: course.green_grass ?? null,
      roughGrass: course.rough_grass ?? null,
    },
    grass: grassValues.length > 0 ? grassValues.join(" / ") : null,
    name: course.name,
    par: course.par,
    region: course.state ?? null,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    yardage: parseYardage(course.yardage),
  };
}

export function normalizeBallDontLieTournament({
  courseId,
  tournament,
}: {
  courseId: string;
  tournament: BallDontLieTournament;
}): CanonicalTournamentInput {
  const sourceEntityId = String(tournament.id);
  const dates = normalizeBallDontLieTournamentDates(tournament);

  return {
    courseId,
    endsOn: dates.endsOn,
    name: tournament.name,
    purseUsd: parsePurseUsd(tournament.purse),
    season: tournament.season,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    startsOn: dates.startsOn,
    status: normalizeStatus(tournament.status),
  };
}

export function normalizeBallDontLieTournamentCourse({
  courseId,
  tournamentId,
  providerCourseId,
  providerTournamentId,
  rounds,
}: {
  courseId: string;
  providerCourseId: number;
  providerTournamentId: number;
  rounds: number[];
  tournamentId: string;
}): CanonicalTournamentCourseInput {
  const sourceEntityId = `${providerTournamentId}:${providerCourseId}`;

  return {
    courseId,
    rounds,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    tournamentId,
  };
}

export function normalizeBallDontLieCourseHole({
  capturedAt,
  courseHole,
  courseId,
  rawSnapshotKey,
}: {
  capturedAt: Date;
  courseHole: BallDontLieCourseHole;
  courseId: string;
  rawSnapshotKey: string;
}): CanonicalCourseHoleInput {
  const sourceEntityId = `${courseHole.course.id}:${courseHole.hole_number}`;

  return {
    capturedAt,
    courseId,
    holeNumber: courseHole.hole_number,
    par: courseHole.par,
    rawSnapshotKey,
    scoringProfile: {},
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    yardage: nullableInteger(courseHole.yardage) ?? 0,
  };
}

export function normalizeBallDontLieTeeTime({
  courseId,
  playerId,
  teeTime,
  tournamentId,
}: {
  courseId: null | string;
  playerId: string;
  teeTime: BallDontLieTeeTime;
  tournamentId: string;
}): CanonicalTeeTimeInput | null {
  if (teeTime.round_number <= 0) {
    return null;
  }

  const sourceEntityId = String(teeTime.id);
  const startTee = teeTime.start_tee ?? null;
  const startsAt = parseNullableDateTime(teeTime.tee_time);
  const wave =
    teeTime.back_nine === true || startTee === 10
      ? "back_nine"
      : teeTime.back_nine === false || startTee === 1
        ? "front_nine"
        : "unknown";

  return {
    courseId,
    groupNumber: teeTime.group_number ?? null,
    playerId,
    roundNumber: teeTime.round_number,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    startsAt,
    startTee,
    tee: startTee === null ? "unknown" : String(startTee),
    tournamentId,
    wave,
  };
}

function normalizeResultStatus(position: string | null | undefined) {
  const normalized = position?.trim().toUpperCase() ?? "";

  return {
    disqualified: normalized === "DQ",
    madeCut:
      normalized === "CUT"
        ? false
        : normalized === "WD" || normalized === "DQ" || normalized === ""
          ? null
          : true,
    withdrawn: normalized === "WD",
  };
}

function resultBackfilledFieldEntrySourceEntityId(result: BallDontLieTournamentResult) {
  return `result:${result.tournament.id}:${result.player.id}`;
}

export function normalizeBallDontLieFieldEntryFromTournamentResult({
  playerId,
  result,
  tournamentId,
}: {
  playerId: string;
  result: BallDontLieTournamentResult;
  tournamentId: string;
}): CanonicalFieldEntryInput {
  const sourceEntityId = resultBackfilledFieldEntrySourceEntityId(result);

  return {
    playerId,
    seed: null,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    status: "entered",
    teeWave: null,
    tournamentId,
  };
}

export function normalizeBallDontLieTournamentResult({
  capturedAt,
  playerId,
  rawSnapshotKey,
  result,
  tournamentId,
}: {
  capturedAt: Date;
  playerId: string;
  rawSnapshotKey: string;
  result: BallDontLieTournamentResult;
  tournamentId: string;
}): CanonicalTournamentResultInput {
  const sourceEntityId = `${result.tournament.id}:${result.player.id}`;
  const status = normalizeResultStatus(result.position);

  return {
    capturedAt,
    disqualified: status.disqualified,
    earningsUsd: numberToNumeric(result.earnings, 2),
    madeCut: status.madeCut,
    parRelativeScore: nullableInteger(result.par_relative_score),
    playerId,
    position: result.position ?? null,
    positionNumeric: nullableInteger(result.position_numeric),
    rawSnapshotKey,
    sourceEntityId,
    totalStrokes: nullableInteger(result.total_score),
    tournamentId,
    withdrawn: status.withdrawn,
  };
}

export function normalizeBallDontLieTournamentCourseHoleStat({
  capturedAt,
  courseId,
  rawSnapshotKey,
  stat,
  tournamentId,
}: {
  capturedAt: Date;
  courseId: string;
  rawSnapshotKey: string;
  stat: BallDontLieTournamentCourseStats;
  tournamentId: string;
}): CanonicalTournamentCourseHoleStatInput {
  const roundNumber = nullableInteger(stat.round_number);
  const roundScope = roundNumber === null ? "tournament_total" : `round:${roundNumber}`;
  const sourceEntityId = `${stat.tournament.id}:${stat.course.id}:${stat.hole_number}:${roundScope}`;

  return {
    birdies: nullableInteger(stat.birdies),
    bogeys: nullableInteger(stat.bogeys),
    capturedAt,
    courseId,
    difficultyRank: nullableInteger(stat.difficulty_rank),
    doubleBogeys: nullableInteger(stat.double_bogeys),
    eagles: nullableInteger(stat.eagles),
    holeNumber: stat.hole_number,
    pars: nullableInteger(stat.pars),
    rawSnapshotKey,
    roundNumber,
    roundScope,
    scoringAverage: numberToNumeric(stat.scoring_average),
    scoringDiff: numberToNumeric(stat.scoring_diff),
    sourceEntityId,
    tournamentId,
  };
}

export function normalizeBallDontLiePlayerRoundResult({
  capturedAt,
  courseId,
  playerId,
  rawSnapshotKey,
  result,
  tournamentId,
}: {
  capturedAt: Date;
  courseId: null | string;
  playerId: string;
  rawSnapshotKey: string;
  result: BallDontLiePlayerRoundResult;
  tournamentId: string;
}): CanonicalPlayerRoundResultInput {
  const sourceEntityId = `${result.tournament.id}:${result.player.id}:${result.round_number}`;

  return {
    capturedAt,
    courseId,
    parRelativeScore: nullableInteger(result.par_relative_score),
    playerId,
    rawSnapshotKey,
    roundNumber: result.round_number,
    score: nullableInteger(result.score),
    sourceEntityId,
    tournamentId,
  };
}

export function normalizeBallDontLiePlayerRoundStats({
  capturedAt,
  playerId,
  rawSnapshotKey,
  stats,
  tournamentId,
}: {
  capturedAt: Date;
  playerId: string;
  rawSnapshotKey: string;
  stats: BallDontLiePlayerRoundStats;
  tournamentId: string;
}): CanonicalPlayerRoundStatsInput {
  const sourceEntityId = `${stats.tournament.id}:${stats.player.id}:${stats.round_number}`;
  const { player: _player, tournament: _tournament, ...metrics } = stats;

  return {
    birdies: nullableInteger(stats.birdies),
    bogeys: nullableInteger(stats.bogeys),
    capturedAt,
    doubleBogeys: nullableInteger(stats.double_bogeys),
    drivingAccuracy: numberToNumeric(stats.driving_accuracy),
    drivingAccuracyRank: nullableInteger(stats.driving_accuracy_rank),
    drivingDistance: numberToNumeric(stats.driving_distance, 3),
    drivingDistanceRank: nullableInteger(stats.driving_distance_rank),
    eagles: nullableInteger(stats.eagles),
    greensInRegulation: numberToNumeric(stats.greens_in_regulation),
    greensInRegulationRank: nullableInteger(stats.greens_in_regulation_rank),
    longestDrive: numberToNumeric(stats.longest_drive, 3),
    longestDriveRank: nullableInteger(stats.longest_drive_rank),
    metrics,
    pars: nullableInteger(stats.pars),
    playerId,
    puttsPerGir: numberToNumeric(stats.putts_per_gir),
    puttsPerGirRank: nullableInteger(stats.putts_per_gir_rank),
    rawSnapshotKey,
    roundNumber: stats.round_number,
    sandSaves: numberToNumeric(stats.sand_saves),
    sandSavesRank: nullableInteger(stats.sand_saves_rank),
    scrambling: numberToNumeric(stats.scrambling),
    scramblingRank: nullableInteger(stats.scrambling_rank),
    sgApproach: numberToNumeric(stats.sg_approach),
    sgApproachRank: nullableInteger(stats.sg_approach_rank),
    sgAroundGreen: numberToNumeric(stats.sg_around_green),
    sgAroundGreenRank: nullableInteger(stats.sg_around_green_rank),
    sgOffTee: numberToNumeric(stats.sg_off_tee),
    sgOffTeeRank: nullableInteger(stats.sg_off_tee_rank),
    sgPutting: numberToNumeric(stats.sg_putting),
    sgPuttingRank: nullableInteger(stats.sg_putting_rank),
    sgTotal: numberToNumeric(stats.sg_total),
    sgTotalRank: nullableInteger(stats.sg_total_rank),
    sourceEntityId,
    tournamentId,
  };
}

export function normalizeBallDontLiePlayerScorecard({
  capturedAt,
  courseId,
  playerId,
  rawSnapshotKey,
  scorecard,
  tournamentId,
}: {
  capturedAt: Date;
  courseId: null | string;
  playerId: string;
  rawSnapshotKey: string;
  scorecard: BallDontLiePlayerScorecard;
  tournamentId: string;
}): CanonicalPlayerScorecardInput {
  const sourceEntityId = `${scorecard.tournament.id}:${scorecard.player.id}:${scorecard.round_number}:${scorecard.hole_number}`;

  return {
    capturedAt,
    courseId,
    holeNumber: scorecard.hole_number,
    par: scorecard.par,
    playerId,
    rawSnapshotKey,
    roundNumber: scorecard.round_number,
    score: nullableInteger(scorecard.score),
    sourceEntityId,
    tournamentId,
  };
}

function parseSeasonStatValue(stat: BallDontLiePlayerSeasonStat) {
  const statValue = stat.stat_value ?? null;
  const firstValue = statValue?.[0]?.statValue ?? null;
  const numeric =
    firstValue === null
      ? null
      : Number.parseFloat(firstValue.replaceAll(/[$,%]/g, "").replaceAll(",", ""));

  return {
    valueNumeric: numeric === null || Number.isNaN(numeric) ? null : numberToNumeric(numeric, 6),
    valueText: firstValue,
  };
}

export function normalizeBallDontLiePlayerSeasonStat({
  capturedAt,
  playerId,
  rawSnapshotKey,
  stat,
}: {
  capturedAt: Date;
  playerId: string;
  rawSnapshotKey: string;
  stat: BallDontLiePlayerSeasonStat;
}): CanonicalPlayerSeasonStatInput {
  const parsedValue = parseSeasonStatValue(stat);
  const sourceEntityId = `${stat.player.id}:${stat.season}:${stat.stat_id}`;

  return {
    capturedAt,
    playerId,
    rank: nullableInteger(stat.rank),
    rawSnapshotKey,
    season: stat.season,
    sourceEntityId,
    statCategory: stat.stat_category ?? null,
    statId: stat.stat_id,
    statName: stat.stat_name,
    statValue:
      stat.stat_value?.map((value) => ({
        statName: value.statName,
        statValue: value.statValue,
      })) ?? null,
    valueNumeric: parsedValue.valueNumeric,
    valueText: parsedValue.valueText,
  };
}

export function normalizeBallDontLieProviderStatDefinitions(
  stat: BallDontLiePlayerSeasonStat,
): CanonicalProviderStatDefinitionInput[] {
  const statValues = stat.stat_value ?? [{ statName: stat.stat_name, statValue: "" }];

  return statValues.map((value) => ({
    canonicalName: null,
    direction: null,
    parsePolicy: {},
    source: BALL_DONT_LIE_SOURCE,
    statCategory: stat.stat_category ?? null,
    statId: String(stat.stat_id),
    statKey: value.statName,
    statName: stat.stat_name,
    unit: null,
  }));
}

export function normalizeBallDontLieFutureMarketType(
  marketType: BallDontLieFuture["market_type"],
): MarketType | null {
  switch (marketType) {
    case "tournament_winner":
      return "outright";
    case "top_5_finish":
      return "top_5";
    case "top_10_finish":
      return "top_10";
    case "top_20_finish":
      return "top_20";
    case "make_cut":
      return "make_cut";
    case "miss_cut":
      return "miss_cut";
    case "first_round_leader":
      return "round_leader";
    default:
      return null;
  }
}

function normalizeBookName(vendor: string) {
  return vendor.trim().toLowerCase();
}

function parseProviderDateTime(value: string, fallback: string) {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(fallback);
}

function oddsSnapshotValues({
  americanOdds,
  capturedAt,
  rawSnapshotKey,
}: {
  americanOdds: number;
  capturedAt: Date;
  rawSnapshotKey: string;
}): Omit<CanonicalOddsSnapshotInput, "marketId"> {
  const decimalOdds = americanToDecimal(americanOdds);
  const impliedProbability = impliedProbabilityFromAmerican(americanOdds);

  return {
    americanOdds,
    capturedAt,
    decimalOdds: decimalOdds.toFixed(4),
    impliedProbability: impliedProbability.toFixed(6),
    rawSnapshotKey,
  };
}

export function createDrizzleCanonicalRepository(db: AppDatabase): CanonicalRepository {
  async function findCanonicalId(entityType: SourceEntityType, sourceEntityId: string) {
    const [mapping] = await db
      .select({ canonicalId: sourceEntityMappings.canonicalId })
      .from(sourceEntityMappings)
      .where(
        and(
          eq(sourceEntityMappings.source, BALL_DONT_LIE_SOURCE),
          eq(sourceEntityMappings.entityType, entityType),
          eq(sourceEntityMappings.sourceEntityId, sourceEntityId),
        ),
      )
      .limit(1);

    return mapping?.canonicalId ?? null;
  }

  async function recordMapping(
    entityType: SourceEntityType,
    sourceEntityId: string,
    canonicalId: string,
  ) {
    await db
      .insert(sourceEntityMappings)
      .values({
        canonicalId,
        entityType,
        source: BALL_DONT_LIE_SOURCE,
        sourceEntityId,
      })
      .onConflictDoUpdate({
        target: [
          sourceEntityMappings.source,
          sourceEntityMappings.entityType,
          sourceEntityMappings.sourceEntityId,
        ],
        set: {
          canonicalId,
          updatedAt: sql`now()`,
        },
      });
  }

  return {
    findCanonicalId,
    async insertOddsSnapshot(input) {
      const [inserted] = await db
        .insert(oddsSnapshots)
        .values({
          americanOdds: input.americanOdds,
          capturedAt: input.capturedAt,
          decimalOdds: input.decimalOdds,
          impliedProbability: input.impliedProbability,
          marketId: input.marketId,
          rawSnapshotKey: input.rawSnapshotKey,
        })
        .onConflictDoNothing({
          target: [oddsSnapshots.marketId, oddsSnapshots.rawSnapshotKey],
        })
        .returning({ id: oddsSnapshots.id });

      return Boolean(inserted);
    },
    async ensureFieldEntry(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(fieldEntries)
        .values(values)
        .onConflictDoUpdate({
          target: [fieldEntries.tournamentId, fieldEntries.playerId],
          set: {
            seed: sql`coalesce(${fieldEntries.seed}, ${input.seed})`,
            sourceIds: sql`${JSON.stringify(input.sourceIds)}::jsonb || ${fieldEntries.sourceIds}`,
            status: sql`case when ${fieldEntries.status} = 'unknown' then ${input.status} else ${fieldEntries.status} end`,
            teeWave: sql`coalesce(${fieldEntries.teeWave}, ${input.teeWave})`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: fieldEntries.id });

      if (!upserted) {
        throw new Error(`Failed to ensure BALLDONTLIE field entry ${sourceEntityId}`);
      }

      await recordMapping("field_entry", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertBook(input) {
      const [upserted] = await db
        .insert(books)
        .values(input)
        .onConflictDoUpdate({
          target: [books.name, books.region],
          set: {
            isActive: input.isActive,
          },
        })
        .returning({ id: books.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE book ${input.name}`);
      }

      return upserted.id;
    },
    async upsertCourse(input) {
      const { sourceEntityId, ...values } = input;
      const existingId = await findCanonicalId("course", input.sourceEntityId);

      if (existingId) {
        const [updated] = await db
          .update(courses)
          .set({
            city: input.city,
            country: input.country,
            demandProfile: input.demandProfile,
            grass: input.grass,
            name: input.name,
            par: input.par,
            region: input.region,
            sourceIds: sql`${courses.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            updatedAt: sql`now()`,
            yardage: input.yardage,
          })
          .where(eq(courses.id, existingId))
          .returning({ id: courses.id });

        return updated?.id ?? existingId;
      }

      const [inserted] = await db.insert(courses).values(values).returning({ id: courses.id });

      if (!inserted) {
        throw new Error(`Failed to insert BALLDONTLIE course ${sourceEntityId}`);
      }

      await recordMapping("course", sourceEntityId, inserted.id);

      return inserted.id;
    },
    async upsertCourseHole(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(holes)
        .values(values)
        .onConflictDoUpdate({
          target: [holes.courseId, holes.holeNumber],
          set: {
            capturedAt: input.capturedAt,
            par: input.par,
            rawSnapshotKey: input.rawSnapshotKey,
            scoringProfile: input.scoringProfile,
            sourceIds: sql`${holes.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            updatedAt: sql`now()`,
            yardage: input.yardage,
          },
        })
        .returning({ id: holes.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE course hole ${sourceEntityId}`);
      }

      await recordMapping("course_hole", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertFieldEntry(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(fieldEntries)
        .values(values)
        .onConflictDoUpdate({
          target: [fieldEntries.tournamentId, fieldEntries.playerId],
          set: {
            seed: input.seed,
            sourceIds: sql`${fieldEntries.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            status: input.status,
            teeWave: input.teeWave,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: fieldEntries.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE field entry ${sourceEntityId}`);
      }

      await recordMapping("field_entry", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertMarket(input) {
      const [upserted] = await db
        .insert(markets)
        .values({
          bookId: input.bookId,
          externalMarketId: input.externalMarketId,
          marketType: input.marketType,
          playerId: input.playerId,
          source: BALL_DONT_LIE_SOURCE,
          tournamentId: input.tournamentId,
        })
        .onConflictDoUpdate({
          target: [
            markets.tournamentId,
            markets.playerId,
            markets.bookId,
            markets.marketType,
            markets.source,
          ],
          set: {
            externalMarketId: input.externalMarketId,
          },
        })
        .returning({ id: markets.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE market ${input.sourceEntityId}`);
      }

      await recordMapping("market", input.sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertPlayerRoundResult(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(playerRoundResults)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            playerRoundResults.source,
            playerRoundResults.tournamentId,
            playerRoundResults.playerId,
            playerRoundResults.roundNumber,
          ],
          set: {
            capturedAt: input.capturedAt,
            courseId: input.courseId,
            parRelativeScore: input.parRelativeScore,
            rawSnapshotKey: input.rawSnapshotKey,
            score: input.score,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: playerRoundResults.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE player round result ${sourceEntityId}`);
      }

      await recordMapping("player_round_result", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertPlayerRoundStats(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(playerRoundStats)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            playerRoundStats.source,
            playerRoundStats.tournamentId,
            playerRoundStats.playerId,
            playerRoundStats.roundNumber,
          ],
          set: {
            birdies: input.birdies,
            bogeys: input.bogeys,
            capturedAt: input.capturedAt,
            doubleBogeys: input.doubleBogeys,
            drivingAccuracy: input.drivingAccuracy,
            drivingAccuracyRank: input.drivingAccuracyRank,
            drivingDistance: input.drivingDistance,
            drivingDistanceRank: input.drivingDistanceRank,
            eagles: input.eagles,
            greensInRegulation: input.greensInRegulation,
            greensInRegulationRank: input.greensInRegulationRank,
            longestDrive: input.longestDrive,
            longestDriveRank: input.longestDriveRank,
            metrics: input.metrics,
            pars: input.pars,
            puttsPerGir: input.puttsPerGir,
            puttsPerGirRank: input.puttsPerGirRank,
            rawSnapshotKey: input.rawSnapshotKey,
            sandSaves: input.sandSaves,
            sandSavesRank: input.sandSavesRank,
            scrambling: input.scrambling,
            scramblingRank: input.scramblingRank,
            sgApproach: input.sgApproach,
            sgApproachRank: input.sgApproachRank,
            sgAroundGreen: input.sgAroundGreen,
            sgAroundGreenRank: input.sgAroundGreenRank,
            sgOffTee: input.sgOffTee,
            sgOffTeeRank: input.sgOffTeeRank,
            sgPutting: input.sgPutting,
            sgPuttingRank: input.sgPuttingRank,
            sgTotal: input.sgTotal,
            sgTotalRank: input.sgTotalRank,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: playerRoundStats.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE player round stats ${sourceEntityId}`);
      }

      await recordMapping("player_round_stat", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertPlayerScorecard(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(playerScorecards)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            playerScorecards.source,
            playerScorecards.tournamentId,
            playerScorecards.playerId,
            playerScorecards.roundNumber,
            playerScorecards.holeNumber,
          ],
          set: {
            capturedAt: input.capturedAt,
            courseId: input.courseId,
            par: input.par,
            rawSnapshotKey: input.rawSnapshotKey,
            score: input.score,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: playerScorecards.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE player scorecard ${sourceEntityId}`);
      }

      await recordMapping("player_scorecard", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertPlayerSeasonStat(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(playerSeasonStats)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            playerSeasonStats.source,
            playerSeasonStats.playerId,
            playerSeasonStats.season,
            playerSeasonStats.statId,
          ],
          set: {
            capturedAt: input.capturedAt,
            rank: input.rank,
            rawSnapshotKey: input.rawSnapshotKey,
            statCategory: input.statCategory,
            statName: input.statName,
            statValue: input.statValue,
            updatedAt: sql`now()`,
            valueNumeric: input.valueNumeric,
            valueText: input.valueText,
          },
        })
        .returning({ id: playerSeasonStats.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE player season stat ${sourceEntityId}`);
      }

      await recordMapping("player_season_stat", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertPlayer(input) {
      const { sourceEntityId, ...values } = input;
      const existingId = await findCanonicalId("player", input.sourceEntityId);

      if (existingId) {
        const [updated] = await db
          .update(players)
          .set({
            country: input.country,
            firstName: input.firstName,
            lastName: input.lastName,
            sourceIds: sql`${players.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            status: input.status,
            updatedAt: sql`now()`,
          })
          .where(eq(players.id, existingId))
          .returning({ id: players.id });

        return updated?.id ?? existingId;
      }

      const [inserted] = await db.insert(players).values(values).returning({ id: players.id });

      if (!inserted) {
        throw new Error(`Failed to insert BALLDONTLIE player ${sourceEntityId}`);
      }

      await recordMapping("player", sourceEntityId, inserted.id);

      return inserted.id;
    },
    async upsertProviderStatDefinition(input) {
      const [upserted] = await db
        .insert(providerStatDefinitions)
        .values(input)
        .onConflictDoUpdate({
          target: [
            providerStatDefinitions.source,
            providerStatDefinitions.statId,
            providerStatDefinitions.statKey,
          ],
          set: {
            canonicalName: input.canonicalName,
            direction: input.direction,
            parsePolicy: input.parsePolicy,
            statCategory: input.statCategory,
            statName: input.statName,
            unit: input.unit,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: providerStatDefinitions.id });

      if (!upserted) {
        throw new Error(
          `Failed to upsert BALLDONTLIE provider stat definition ${input.statId}:${input.statKey}`,
        );
      }

      return upserted.id;
    },
    async upsertTeeTime(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(teeTimes)
        .values(values)
        .onConflictDoUpdate({
          target: [teeTimes.tournamentId, teeTimes.playerId, teeTimes.roundNumber],
          set: {
            courseId: input.courseId,
            groupNumber: input.groupNumber,
            sourceIds: sql`${teeTimes.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            startsAt: input.startsAt,
            startTee: input.startTee,
            tee: input.tee,
            updatedAt: sql`now()`,
            wave: input.wave,
          },
        })
        .returning({ id: teeTimes.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE tee time ${sourceEntityId}`);
      }

      await recordMapping("tee_time", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertTournamentCourse(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(tournamentCourses)
        .values(values)
        .onConflictDoUpdate({
          target: [tournamentCourses.tournamentId, tournamentCourses.courseId],
          set: {
            rounds: input.rounds,
            sourceIds: sql`${tournamentCourses.sourceIds} || ${JSON.stringify(
              input.sourceIds,
            )}::jsonb`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: tournamentCourses.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE tournament course ${sourceEntityId}`);
      }

      await recordMapping("tournament_course", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertTournamentCourseHoleStat(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(tournamentCourseHoleStats)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            tournamentCourseHoleStats.source,
            tournamentCourseHoleStats.tournamentId,
            tournamentCourseHoleStats.courseId,
            tournamentCourseHoleStats.holeNumber,
            tournamentCourseHoleStats.roundScope,
          ],
          set: {
            birdies: input.birdies,
            bogeys: input.bogeys,
            capturedAt: input.capturedAt,
            difficultyRank: input.difficultyRank,
            doubleBogeys: input.doubleBogeys,
            eagles: input.eagles,
            pars: input.pars,
            rawSnapshotKey: input.rawSnapshotKey,
            roundNumber: input.roundNumber,
            scoringAverage: input.scoringAverage,
            scoringDiff: input.scoringDiff,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: tournamentCourseHoleStats.id });

      if (!upserted) {
        throw new Error(
          `Failed to upsert BALLDONTLIE tournament course hole stat ${sourceEntityId}`,
        );
      }

      await recordMapping("tournament_course_hole_stat", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertTournamentResult(input) {
      const { sourceEntityId, ...values } = input;
      const [upserted] = await db
        .insert(tournamentResults)
        .values({
          ...values,
          source: BALL_DONT_LIE_SOURCE,
        })
        .onConflictDoUpdate({
          target: [
            tournamentResults.source,
            tournamentResults.tournamentId,
            tournamentResults.playerId,
          ],
          set: {
            capturedAt: input.capturedAt,
            disqualified: input.disqualified,
            earningsUsd: input.earningsUsd,
            madeCut: input.madeCut,
            parRelativeScore: input.parRelativeScore,
            position: input.position,
            positionNumeric: input.positionNumeric,
            rawSnapshotKey: input.rawSnapshotKey,
            totalStrokes: input.totalStrokes,
            updatedAt: sql`now()`,
            withdrawn: input.withdrawn,
          },
        })
        .returning({ id: tournamentResults.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE tournament result ${sourceEntityId}`);
      }

      await recordMapping("tournament_result", sourceEntityId, upserted.id);

      return upserted.id;
    },
    async upsertTournament(input) {
      const { sourceEntityId, ...values } = input;
      const existingId = await findCanonicalId("tournament", input.sourceEntityId);

      if (existingId) {
        const [updated] = await db
          .update(tournaments)
          .set({
            courseId: input.courseId,
            endsOn: input.endsOn,
            name: input.name,
            purseUsd: input.purseUsd,
            season: input.season,
            sourceIds: sql`${tournaments.sourceIds} || ${JSON.stringify(input.sourceIds)}::jsonb`,
            startsOn: input.startsOn,
            status: input.status,
            updatedAt: sql`now()`,
          })
          .where(eq(tournaments.id, existingId))
          .returning({ id: tournaments.id });

        return updated?.id ?? existingId;
      }

      const [inserted] = await db
        .insert(tournaments)
        .values(values)
        .returning({ id: tournaments.id });

      if (!inserted) {
        throw new Error(`Failed to insert BALLDONTLIE tournament ${sourceEntityId}`);
      }

      await recordMapping("tournament", sourceEntityId, inserted.id);

      return inserted.id;
    },
  };
}

export async function selectBallDontLieFieldTournamentIds(
  db: AppDatabase,
  {
    explicitTournamentIds = [],
    limit = 2,
    season,
    today = new Date(),
  }: {
    explicitTournamentIds?: number[];
    limit?: number;
    season: number;
    today?: Date;
  },
) {
  const todayIso = isoDateOnly(today);
  const rows = await db
    .select({
      endsOn: tournaments.endsOn,
      sourceEntityId: sourceEntityMappings.sourceEntityId,
      startsOn: tournaments.startsOn,
    })
    .from(tournaments)
    .innerJoin(
      sourceEntityMappings,
      and(
        eq(sourceEntityMappings.source, BALL_DONT_LIE_SOURCE),
        eq(sourceEntityMappings.entityType, "tournament"),
        eq(sourceEntityMappings.canonicalId, tournaments.id),
      ),
    )
    .where(eq(tournaments.season, season));

  const tournamentRows = rows
    .map((row) => ({
      ...row,
      providerTournamentId: Number.parseInt(row.sourceEntityId, 10),
    }))
    .filter((row) => Number.isInteger(row.providerTournamentId) && row.providerTournamentId > 0)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  const current = tournamentRows.filter(
    (row) => row.startsOn <= todayIso && row.endsOn >= todayIso,
  );
  const upcoming = tournamentRows.filter((row) => row.startsOn > todayIso);
  const autoSelected = [...current, ...upcoming]
    .slice(0, limit)
    .map((row) => row.providerTournamentId);

  return Array.from(new Set([...explicitTournamentIds, ...autoSelected]));
}

export async function selectBallDontLieCompletedTournamentIds(
  db: AppDatabase,
  {
    season,
  }: {
    season: number;
  },
) {
  const rows = await db
    .select({
      sourceEntityId: sourceEntityMappings.sourceEntityId,
      startsOn: tournaments.startsOn,
    })
    .from(tournaments)
    .innerJoin(
      sourceEntityMappings,
      and(
        eq(sourceEntityMappings.source, BALL_DONT_LIE_SOURCE),
        eq(sourceEntityMappings.entityType, "tournament"),
        eq(sourceEntityMappings.canonicalId, tournaments.id),
      ),
    )
    .where(and(eq(tournaments.season, season), eq(tournaments.status, "completed")));

  return rows
    .map((row) => ({
      providerTournamentId: Number.parseInt(row.sourceEntityId, 10),
      startsOn: row.startsOn,
    }))
    .filter((row) => Number.isInteger(row.providerTournamentId) && row.providerTournamentId > 0)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
    .map((row) => row.providerTournamentId);
}

export async function syncBallDontLiePlayers({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
}: BallDontLieSyncOptions) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayersPageSchema,
    request: { endpoint: ballDontLieEndpoints.players },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(
      await persistAndRecordRawSnapshot({
        rawSnapshotStore,
        recordRawSnapshot,
        response,
      }),
    );

    for (const player of response.payload.data) {
      const normalizedPlayer = normalizeBallDontLiePlayer(player);

      if (!normalizedPlayer) {
        result.skipped.push(`player:${player.id}:missing-name`);
        continue;
      }

      await repository.upsertPlayer(normalizedPlayer);
      result.playersUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieTournamentTeeTimes({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await repository.findCanonicalId(
    "tournament",
    String(tournamentId),
  );

  if (!canonicalTournamentId) {
    throw new Error(
      `Cannot sync BALLDONTLIE tee times before tournament ${tournamentId} is mapped`,
    );
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTeeTimesPageSchema,
    request: { endpoint: ballDontLieEndpoints.teeTimes, params: { tournament_id: tournamentId } },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(
      await persistAndRecordRawSnapshot({
        rawSnapshotStore,
        recordRawSnapshot,
        response,
      }),
    );

    for (const teeTime of response.payload.data) {
      const normalizedPlayer = normalizeBallDontLiePlayer(teeTime.player);

      if (!normalizedPlayer) {
        result.skipped.push(`tee_time:${teeTime.id}:player:${teeTime.player.id}:missing-name`);
        continue;
      }

      const playerId = await repository.upsertPlayer(normalizedPlayer);
      const courseId =
        teeTime.course === null || teeTime.course === undefined
          ? null
          : await repository.findCanonicalId("course", String(teeTime.course.id));

      if (teeTime.course && !courseId) {
        result.skipped.push(`tee_time:${teeTime.id}:unmapped-course:${teeTime.course.id}`);
      }

      const normalizedTeeTime = normalizeBallDontLieTeeTime({
        courseId,
        playerId,
        teeTime,
        tournamentId: canonicalTournamentId,
      });

      if (!normalizedTeeTime) {
        result.skipped.push(`tee_time:${teeTime.id}:invalid-round:${teeTime.round_number}`);
        continue;
      }

      await repository.upsertTeeTime(normalizedTeeTime);
      result.teeTimesUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieCourses({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
}: BallDontLieSyncOptions) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieCoursesPageSchema,
    request: { endpoint: ballDontLieEndpoints.courses },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(
      await persistAndRecordRawSnapshot({
        rawSnapshotStore,
        recordRawSnapshot,
        response,
      }),
    );

    for (const course of response.payload.data) {
      await repository.upsertCourse(normalizeBallDontLieCourse(course));
      result.coursesUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieTournaments({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  season,
}: BallDontLieSyncOptions & { season: number }) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTournamentsPageSchema,
    request: { endpoint: ballDontLieEndpoints.tournaments, params: { season } },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(
      await persistAndRecordRawSnapshot({
        rawSnapshotStore,
        recordRawSnapshot,
        response,
      }),
    );

    for (const tournament of response.payload.data) {
      const primaryCourse = tournament.courses[0]?.course;

      if (!primaryCourse) {
        result.skipped.push(`tournament:${tournament.id}:missing-course`);
        continue;
      }

      const courseId = await repository.findCanonicalId("course", String(primaryCourse.id));

      if (!courseId) {
        result.skipped.push(`tournament:${tournament.id}:unmapped-course:${primaryCourse.id}`);
        continue;
      }

      const canonicalTournamentId = await repository.upsertTournament(
        normalizeBallDontLieTournament({ courseId, tournament }),
      );
      result.tournamentsUpserted += 1;

      for (const tournamentCourse of tournament.courses) {
        const tournamentCourseId = await repository.findCanonicalId(
          "course",
          String(tournamentCourse.course.id),
        );

        if (!tournamentCourseId) {
          result.skipped.push(
            `tournament_course:${tournament.id}:unmapped-course:${tournamentCourse.course.id}`,
          );
          continue;
        }

        await repository.upsertTournamentCourse(
          normalizeBallDontLieTournamentCourse({
            courseId: tournamentCourseId,
            providerCourseId: tournamentCourse.course.id,
            providerTournamentId: tournament.id,
            rounds: tournamentCourse.rounds,
            tournamentId: canonicalTournamentId,
          }),
        );
        result.tournamentCoursesUpserted += 1;
      }
    }
  }

  return result;
}

export async function syncBallDontLieCourseHoles({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
}: BallDontLieSyncOptions) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieCourseHolesPageSchema,
    request: { endpoint: ballDontLieEndpoints.courseHoles },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const courseHole of response.payload.data) {
      const courseId = await repository.findCanonicalId("course", String(courseHole.course.id));

      if (!courseId) {
        result.skipped.push(
          `course_hole:${courseHole.course.id}:${courseHole.hole_number}:unmapped-course`,
        );
        continue;
      }

      await repository.upsertCourseHole(
        normalizeBallDontLieCourseHole({
          capturedAt,
          courseHole,
          courseId,
          rawSnapshotKey,
        }),
      );
      result.courseHolesUpserted += 1;
    }
  }

  return result;
}

async function canonicalTournamentIdForRepository(
  repository: CanonicalRepository,
  providerTournamentId: number,
) {
  return repository.findCanonicalId("tournament", String(providerTournamentId));
}

async function canonicalPlayerIdForRepository(
  repository: CanonicalRepository,
  providerPlayer: BallDontLiePlayer,
) {
  const normalizedPlayer = normalizeBallDontLiePlayer(providerPlayer);

  return normalizedPlayer ? repository.upsertPlayer(normalizedPlayer) : null;
}

export async function syncBallDontLieTournamentResults({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await canonicalTournamentIdForRepository(repository, tournamentId);

  if (!canonicalTournamentId) {
    throw new Error(`Cannot sync BALLDONTLIE results before tournament ${tournamentId} is mapped`);
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTournamentResultsPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.tournamentResults,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const tournamentResult of response.payload.data) {
      const playerId = await canonicalPlayerIdForRepository(repository, tournamentResult.player);

      if (!playerId) {
        result.skipped.push(
          `tournament_result:${tournamentResult.tournament.id}:${tournamentResult.player.id}:missing-player-name`,
        );
        continue;
      }

      await repository.ensureFieldEntry(
        normalizeBallDontLieFieldEntryFromTournamentResult({
          playerId,
          result: tournamentResult,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.fieldEntriesUpserted += 1;

      await repository.upsertTournamentResult(
        normalizeBallDontLieTournamentResult({
          capturedAt,
          playerId,
          rawSnapshotKey,
          result: tournamentResult,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.tournamentResultsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieTournamentCourseStats({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await canonicalTournamentIdForRepository(repository, tournamentId);

  if (!canonicalTournamentId) {
    throw new Error(
      `Cannot sync BALLDONTLIE course stats before tournament ${tournamentId} is mapped`,
    );
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTournamentCourseStatsPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.tournamentCourseStats,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const stat of response.payload.data) {
      const courseId = await repository.findCanonicalId("course", String(stat.course.id));

      if (!courseId) {
        result.skipped.push(
          `tournament_course_stat:${stat.tournament.id}:${stat.course.id}:${stat.hole_number}:unmapped-course`,
        );
        continue;
      }

      await repository.upsertTournamentCourseHoleStat(
        normalizeBallDontLieTournamentCourseHoleStat({
          capturedAt,
          courseId,
          rawSnapshotKey,
          stat,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.tournamentCourseHoleStatsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLiePlayerRoundResults({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await canonicalTournamentIdForRepository(repository, tournamentId);

  if (!canonicalTournamentId) {
    throw new Error(
      `Cannot sync BALLDONTLIE round results before tournament ${tournamentId} is mapped`,
    );
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayerRoundResultsPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.playerRoundResults,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const roundResult of response.payload.data) {
      const playerId = await canonicalPlayerIdForRepository(repository, roundResult.player);

      if (!playerId) {
        result.skipped.push(
          `player_round_result:${roundResult.tournament.id}:${roundResult.player.id}:${roundResult.round_number}:missing-player-name`,
        );
        continue;
      }

      await repository.upsertPlayerRoundResult(
        normalizeBallDontLiePlayerRoundResult({
          capturedAt,
          courseId: null,
          playerId,
          rawSnapshotKey,
          result: roundResult,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.playerRoundResultsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLiePlayerRoundStats({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await canonicalTournamentIdForRepository(repository, tournamentId);

  if (!canonicalTournamentId) {
    throw new Error(
      `Cannot sync BALLDONTLIE round stats before tournament ${tournamentId} is mapped`,
    );
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayerRoundStatsPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.playerRoundStats,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const stats of response.payload.data) {
      const playerId = await canonicalPlayerIdForRepository(repository, stats.player);

      if (!playerId) {
        result.skipped.push(
          `player_round_stat:${stats.tournament.id}:${stats.player.id}:${stats.round_number}:missing-player-name`,
        );
        continue;
      }

      await repository.upsertPlayerRoundStats(
        normalizeBallDontLiePlayerRoundStats({
          capturedAt,
          playerId,
          rawSnapshotKey,
          stats,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.playerRoundStatsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLiePlayerSeasonStats({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  season,
}: BallDontLieSyncOptions & { season: number }) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayerSeasonStatsPageSchema,
    request: { endpoint: ballDontLieEndpoints.playerSeasonStats, params: { season } },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const stat of response.payload.data) {
      const playerId = await canonicalPlayerIdForRepository(repository, stat.player);

      if (!playerId) {
        result.skipped.push(`player_season_stat:${stat.player.id}:${stat.season}:missing-name`);
        continue;
      }

      for (const definition of normalizeBallDontLieProviderStatDefinitions(stat)) {
        await repository.upsertProviderStatDefinition(definition);
        result.providerStatDefinitionsUpserted += 1;
      }

      await repository.upsertPlayerSeasonStat(
        normalizeBallDontLiePlayerSeasonStat({
          capturedAt,
          playerId,
          rawSnapshotKey,
          stat,
        }),
      );
      result.playerSeasonStatsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLiePlayerScorecards({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await canonicalTournamentIdForRepository(repository, tournamentId);

  if (!canonicalTournamentId) {
    throw new Error(
      `Cannot sync BALLDONTLIE scorecards before tournament ${tournamentId} is mapped`,
    );
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayerScorecardsPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.playerScorecards,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });
    const capturedAt = new Date(response.capturedAt);

    result.rawSnapshots.push(rawSnapshotKey);

    for (const scorecard of response.payload.data) {
      const playerId = await canonicalPlayerIdForRepository(repository, scorecard.player);

      if (!playerId) {
        result.skipped.push(
          `player_scorecard:${scorecard.tournament.id}:${scorecard.player.id}:${scorecard.round_number}:${scorecard.hole_number}:missing-player-name`,
        );
        continue;
      }

      const courseId =
        scorecard.course === null || scorecard.course === undefined
          ? null
          : await repository.findCanonicalId("course", String(scorecard.course.id));

      if (scorecard.course && !courseId) {
        result.skipped.push(
          `player_scorecard:${scorecard.tournament.id}:${scorecard.player.id}:${scorecard.round_number}:${scorecard.hole_number}:unmapped-course:${scorecard.course.id}`,
        );
      }

      await repository.upsertPlayerScorecard(
        normalizeBallDontLiePlayerScorecard({
          capturedAt,
          courseId,
          playerId,
          rawSnapshotKey,
          scorecard,
          tournamentId: canonicalTournamentId,
        }),
      );
      result.playerScorecardsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieTournamentField({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const canonicalTournamentId = await repository.findCanonicalId(
    "tournament",
    String(tournamentId),
  );

  if (!canonicalTournamentId) {
    throw new Error(`Cannot sync BALLDONTLIE field before tournament ${tournamentId} is mapped`);
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTournamentFieldPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.tournamentField,
      params: { tournament_id: tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(
      await persistAndRecordRawSnapshot({
        rawSnapshotStore,
        recordRawSnapshot,
        response,
      }),
    );

    for (const entry of response.payload.data) {
      const normalizedPlayer = normalizeBallDontLiePlayer(entry.player);

      if (!normalizedPlayer) {
        result.skipped.push(`field_entry:${entry.id}:player:${entry.player.id}:missing-name`);
        continue;
      }

      const playerId = await repository.upsertPlayer(normalizedPlayer);
      await repository.upsertFieldEntry({
        playerId,
        seed: entry.owgr ?? null,
        sourceEntityId: String(entry.id),
        sourceIds: sourceIds(String(entry.id)),
        status: normalizeFieldStatus(entry.entry_status),
        teeWave: entry.qualifier ?? null,
        tournamentId: canonicalTournamentId,
      });
      result.fieldEntriesUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieFutures({
  client,
  pageOptions,
  rawSnapshotStore,
  recordRawSnapshot,
  repository,
  tournamentId,
}: BallDontLieSyncOptions & { tournamentId: number }) {
  const result = emptyResult();
  const touchedBookKeys = new Set<string>();
  const canonicalTournamentId = await repository.findCanonicalId(
    "tournament",
    String(tournamentId),
  );

  if (!canonicalTournamentId) {
    throw new Error(`Cannot sync BALLDONTLIE futures before tournament ${tournamentId} is mapped`);
  }

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieFuturesPageSchema,
    request: {
      endpoint: ballDontLieEndpoints.futures,
      params: { "tournament_ids[]": tournamentId },
    },
  })) {
    result.pagesFetched += 1;
    const rawSnapshotKey = await persistAndRecordRawSnapshot({
      rawSnapshotStore,
      recordRawSnapshot,
      response,
    });

    result.rawSnapshots.push(rawSnapshotKey);

    for (const future of response.payload.data) {
      const marketType = normalizeBallDontLieFutureMarketType(future.market_type);

      if (!marketType) {
        result.skipped.push(`future:${future.id}:unsupported-market:${future.market_type}`);
        continue;
      }

      const normalizedPlayer = normalizeBallDontLiePlayer(future.player);

      if (!normalizedPlayer) {
        result.skipped.push(`future:${future.id}:player:${future.player.id}:missing-name`);
        continue;
      }

      let snapshotInput: Omit<CanonicalOddsSnapshotInput, "marketId">;

      try {
        snapshotInput = oddsSnapshotValues({
          americanOdds: future.american_odds,
          capturedAt: parseProviderDateTime(future.updated_at, response.capturedAt),
          rawSnapshotKey,
        });
      } catch {
        result.skipped.push(`future:${future.id}:invalid-odds:${future.american_odds}`);
        continue;
      }

      const playerId = await repository.upsertPlayer(normalizedPlayer);
      const bookName = normalizeBookName(future.vendor);
      const bookKey = `${bookName}:US`;
      const bookId = await repository.upsertBook({
        isActive: true,
        name: bookName,
        region: "US",
      });
      const marketId = await repository.upsertMarket({
        bookId,
        externalMarketId: String(future.id),
        marketType,
        playerId,
        sourceEntityId: String(future.id),
        tournamentId: canonicalTournamentId,
      });
      const inserted = await repository.insertOddsSnapshot({
        ...snapshotInput,
        marketId,
      });

      if (!touchedBookKeys.has(bookKey)) {
        touchedBookKeys.add(bookKey);
        result.booksUpserted += 1;
      }

      result.marketsUpserted += 1;

      if (inserted) {
        result.oddsSnapshotsInserted += 1;
      }
    }
  }

  return result;
}
