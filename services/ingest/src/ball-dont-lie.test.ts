import type { SourceEntityType } from "@pgatour-ai/domain";
import {
  ballDontLieEndpoints,
  type ProviderClient,
  type ProviderRequest,
  type ProviderResponse,
} from "@pgatour-ai/providers";
import { describe, expect, it } from "vitest";
import {
  type CanonicalBookInput,
  type CanonicalCourseHoleInput,
  type CanonicalCourseInput,
  type CanonicalFieldEntryInput,
  type CanonicalMarketInput,
  type CanonicalOddsSnapshotInput,
  type CanonicalPlayerInput,
  type CanonicalPlayerRoundResultInput,
  type CanonicalPlayerRoundStatsInput,
  type CanonicalPlayerScorecardInput,
  type CanonicalPlayerSeasonStatInput,
  type CanonicalProviderStatDefinitionInput,
  type CanonicalRepository,
  type CanonicalTeeTimeInput,
  type CanonicalTournamentCourseHoleStatInput,
  type CanonicalTournamentCourseInput,
  type CanonicalTournamentInput,
  type CanonicalTournamentResultInput,
  syncBallDontLieCourseHoles,
  syncBallDontLieCourses,
  syncBallDontLieFutures,
  syncBallDontLiePlayerRoundResults,
  syncBallDontLiePlayerRoundStats,
  syncBallDontLiePlayerScorecards,
  syncBallDontLiePlayerSeasonStats,
  syncBallDontLiePlayers,
  syncBallDontLieTournamentCourseStats,
  syncBallDontLieTournamentField,
  syncBallDontLieTournamentResults,
  syncBallDontLieTournaments,
  syncBallDontLieTournamentTeeTimes,
} from "./ball-dont-lie";
import { InMemoryRawSnapshotStore } from "./raw-snapshots";

class InMemoryCanonicalRepository implements CanonicalRepository {
  readonly books = new Map<string, CanonicalBookInput>();
  readonly courseHoles = new Map<string, CanonicalCourseHoleInput>();
  readonly courses = new Map<string, CanonicalCourseInput>();
  readonly fieldEntries = new Map<string, CanonicalFieldEntryInput>();
  readonly mappings = new Map<string, string>();
  readonly markets = new Map<string, CanonicalMarketInput>();
  readonly oddsSnapshots = new Map<string, CanonicalOddsSnapshotInput>();
  readonly playerRoundResults = new Map<string, CanonicalPlayerRoundResultInput>();
  readonly playerRoundStats = new Map<string, CanonicalPlayerRoundStatsInput>();
  readonly playerScorecards = new Map<string, CanonicalPlayerScorecardInput>();
  readonly playerSeasonStats = new Map<string, CanonicalPlayerSeasonStatInput>();
  readonly players = new Map<string, CanonicalPlayerInput>();
  readonly providerStatDefinitions = new Map<string, CanonicalProviderStatDefinitionInput>();
  readonly teeTimes = new Map<string, CanonicalTeeTimeInput>();
  readonly tournamentCourseHoleStats = new Map<string, CanonicalTournamentCourseHoleStatInput>();
  readonly tournamentCourses = new Map<string, CanonicalTournamentCourseInput>();
  readonly tournamentResults = new Map<string, CanonicalTournamentResultInput>();
  readonly tournaments = new Map<string, CanonicalTournamentInput>();

  async findCanonicalId(entityType: SourceEntityType, sourceEntityId: string) {
    return this.mappings.get(this.mappingKey(entityType, sourceEntityId)) ?? null;
  }

  async ensureFieldEntry(input: CanonicalFieldEntryInput) {
    const key = this.fieldEntryKey(input);
    const existing = this.fieldEntries.get(key);

    if (!existing) {
      const id = await this.idFor("field_entry", input.sourceEntityId);
      this.fieldEntries.set(key, input);

      return id;
    }

    const id = await this.aliasExistingId(
      "field_entry",
      input.sourceEntityId,
      existing.sourceEntityId,
    );
    this.fieldEntries.set(key, {
      ...existing,
      seed: existing.seed ?? input.seed,
      sourceIds: { ...input.sourceIds, ...existing.sourceIds },
      status: existing.status === "unknown" ? input.status : existing.status,
      teeWave: existing.teeWave ?? input.teeWave,
    });

    return id;
  }

  async insertOddsSnapshot(input: CanonicalOddsSnapshotInput) {
    const key = `${input.marketId}:${input.rawSnapshotKey}`;

    if (this.oddsSnapshots.has(key)) {
      return false;
    }

    this.oddsSnapshots.set(key, input);

    return true;
  }

  async upsertBook(input: CanonicalBookInput) {
    const id = `book-${input.region}-${input.name}`;
    this.books.set(id, input);

    return id;
  }

  async upsertCourse(input: CanonicalCourseInput) {
    const id = await this.idFor("course", input.sourceEntityId);
    this.courses.set(id, input);

    return id;
  }

  async upsertCourseHole(input: CanonicalCourseHoleInput) {
    const id = await this.idFor("course_hole", input.sourceEntityId);
    this.courseHoles.set(`${input.courseId}:${input.holeNumber}`, input);

    return id;
  }

  async upsertFieldEntry(input: CanonicalFieldEntryInput) {
    const existing = this.fieldEntries.get(this.fieldEntryKey(input));
    const id = existing
      ? await this.aliasExistingId("field_entry", input.sourceEntityId, existing.sourceEntityId)
      : await this.idFor("field_entry", input.sourceEntityId);

    this.fieldEntries.set(this.fieldEntryKey(input), input);

    return id;
  }

  async upsertMarket(input: CanonicalMarketInput) {
    const id = await this.idFor("market", input.sourceEntityId);
    this.markets.set(
      `${input.tournamentId}:${input.playerId}:${input.bookId}:${input.marketType}`,
      input,
    );

    return id;
  }

  async upsertPlayerRoundResult(input: CanonicalPlayerRoundResultInput) {
    const id = await this.idFor("player_round_result", input.sourceEntityId);
    this.playerRoundResults.set(
      `${input.tournamentId}:${input.playerId}:${input.roundNumber}`,
      input,
    );

    return id;
  }

  async upsertPlayerRoundStats(input: CanonicalPlayerRoundStatsInput) {
    const id = await this.idFor("player_round_stat", input.sourceEntityId);
    this.playerRoundStats.set(
      `${input.tournamentId}:${input.playerId}:${input.roundNumber}`,
      input,
    );

    return id;
  }

  async upsertPlayerScorecard(input: CanonicalPlayerScorecardInput) {
    const id = await this.idFor("player_scorecard", input.sourceEntityId);
    this.playerScorecards.set(
      `${input.tournamentId}:${input.playerId}:${input.roundNumber}:${input.holeNumber}`,
      input,
    );

    return id;
  }

  async upsertPlayerSeasonStat(input: CanonicalPlayerSeasonStatInput) {
    const id = await this.idFor("player_season_stat", input.sourceEntityId);
    this.playerSeasonStats.set(`${input.playerId}:${input.season}:${input.statId}`, input);

    return id;
  }

  async upsertPlayer(input: CanonicalPlayerInput) {
    const id = await this.idFor("player", input.sourceEntityId);
    this.players.set(id, input);

    return id;
  }

  async upsertProviderStatDefinition(input: CanonicalProviderStatDefinitionInput) {
    const id = `provider-stat-${input.source}-${input.statId}-${input.statKey}`;
    this.providerStatDefinitions.set(id, input);

    return id;
  }

  async upsertTeeTime(input: CanonicalTeeTimeInput) {
    const id = await this.idFor("tee_time", input.sourceEntityId);
    this.teeTimes.set(`${input.tournamentId}:${input.playerId}:${input.roundNumber}`, input);

    return id;
  }

  async upsertTournamentCourse(input: CanonicalTournamentCourseInput) {
    const id = await this.idFor("tournament_course", input.sourceEntityId);
    this.tournamentCourses.set(`${input.tournamentId}:${input.courseId}`, input);

    return id;
  }

  async upsertTournamentCourseHoleStat(input: CanonicalTournamentCourseHoleStatInput) {
    const id = await this.idFor("tournament_course_hole_stat", input.sourceEntityId);
    this.tournamentCourseHoleStats.set(
      `${input.tournamentId}:${input.courseId}:${input.holeNumber}:${input.roundScope}`,
      input,
    );

    return id;
  }

  async upsertTournamentResult(input: CanonicalTournamentResultInput) {
    const id = await this.idFor("tournament_result", input.sourceEntityId);
    this.tournamentResults.set(`${input.tournamentId}:${input.playerId}`, input);

    return id;
  }

  async upsertTournament(input: CanonicalTournamentInput) {
    const id = await this.idFor("tournament", input.sourceEntityId);
    this.tournaments.set(id, input);

    return id;
  }

  private async idFor(entityType: SourceEntityType, sourceEntityId: string) {
    const key = this.mappingKey(entityType, sourceEntityId);
    const existingId = this.mappings.get(key);

    if (existingId) {
      return existingId;
    }

    const id = `${entityType}-${sourceEntityId}`;
    this.mappings.set(key, id);

    return id;
  }

  private async aliasExistingId(
    entityType: SourceEntityType,
    sourceEntityId: string,
    existingSourceEntityId: string,
  ) {
    const id = await this.idFor(entityType, existingSourceEntityId);

    this.mappings.set(this.mappingKey(entityType, sourceEntityId), id);

    return id;
  }

  private fieldEntryKey(input: Pick<CanonicalFieldEntryInput, "playerId" | "tournamentId">) {
    return `${input.tournamentId}:${input.playerId}`;
  }

  private mappingKey(entityType: SourceEntityType, sourceEntityId: string) {
    return `${entityType}:${sourceEntityId}`;
  }
}

function createFakeBallDontLieClient(payloads: Record<string, unknown>): ProviderClient {
  return {
    source: "balldontlie",
    async fetchJson<TPayload>(request: ProviderRequest): Promise<ProviderResponse<TPayload>> {
      const payload = payloads[request.endpoint];

      if (!payload) {
        throw new Error(`No fake payload for ${request.endpoint}`);
      }

      return {
        capturedAt: "2026-05-25T12:00:00.000Z",
        endpoint: request.endpoint,
        params: Object.fromEntries(
          Object.entries(request.params ?? {})
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ),
        payload: payload as TPayload,
        requestHash: `${request.endpoint}-hash-0000000000000000`,
        source: "balldontlie",
      };
    },
  };
}

const playersPayload = {
  data: [
    {
      active: true,
      country: "United States",
      first_name: "Scottie",
      id: 185,
      last_name: "Scheffler",
    },
    {
      active: true,
      country: "Northern Ireland",
      first_name: "Rory",
      id: 134,
      last_name: "McIlroy",
    },
  ],
  meta: { per_page: 100 },
};

const coursesPayload = {
  data: [
    {
      city: "Kapalua, Maui",
      country: "USA",
      fairway_grass: "Bermudagrass",
      green_grass: "TifEagle Bermudagrass",
      id: 56,
      name: "Plantation Course at Kapalua",
      par: 73,
      rough_grass: "Bermudagrass",
      state: "Hawaii",
      yardage: "7,596",
    },
  ],
  meta: { per_page: 100 },
};

const tournamentsPayload = {
  data: [
    {
      city: "Kapalua, Maui",
      country: "United States of America",
      course_name: "Plantation Course at Kapalua",
      courses: [
        {
          course: {
            city: "Kapalua, Maui",
            country: "USA",
            id: 56,
            name: "Plantation Course at Kapalua",
            par: 73,
            state: "Hawaii",
          },
          rounds: [1, 2, 3, 4],
        },
      ],
      end_date: "Jan 2 - 5",
      id: 6,
      name: "The Sentry",
      purse: "$20,000,000",
      season: 2026,
      start_date: "2026-01-01T19:00:00.000Z",
      state: "Hawaii",
      status: "SCHEDULED",
    },
  ],
  meta: { per_page: 100 },
};

const fieldPayload = {
  data: [
    {
      entry_status: "IN",
      id: 11245,
      is_amateur: false,
      owgr: 1,
      player: {
        active: true,
        country: "United States",
        first_name: "Scottie",
        id: 185,
        last_name: "Scheffler",
      },
      qualifier: "Current Tournament Winners",
      tournament: {
        city: "Kapalua, Maui",
        country: "United States of America",
        course_name: "Plantation Course at Kapalua",
        end_date: "Jan 2 - 5",
        id: 6,
        name: "The Sentry",
        purse: "$20,000,000",
        season: 2026,
        start_date: "2026-01-01T19:00:00.000Z",
        state: "Hawaii",
        status: "SCHEDULED",
      },
    },
    {
      entry_status: "WITHDRAWN",
      id: 11246,
      is_amateur: false,
      owgr: 2,
      player: {
        active: true,
        country: "Northern Ireland",
        first_name: "Rory",
        id: 134,
        last_name: "McIlroy",
      },
      qualifier: "Top 50 on Prior Year's FedExCup Points List",
      tournament: {
        city: "Kapalua, Maui",
        country: "United States of America",
        course_name: "Plantation Course at Kapalua",
        end_date: "Jan 2 - 5",
        id: 6,
        name: "The Sentry",
        purse: "$20,000,000",
        season: 2026,
        start_date: "2026-01-01T19:00:00.000Z",
        state: "Hawaii",
        status: "SCHEDULED",
      },
    },
  ],
  meta: { per_page: 100 },
};

const teeTimesPayload = {
  data: [
    {
      back_nine: false,
      course: {
        city: "Kapalua, Maui",
        country: "USA",
        id: 56,
        name: "Plantation Course at Kapalua",
        par: 73,
        state: "Hawaii",
        yardage: "7,596",
      },
      group_number: 1,
      id: 9001,
      player: {
        active: true,
        country: "United States",
        first_name: "Scottie",
        id: 185,
        last_name: "Scheffler",
      },
      round_number: 1,
      start_tee: 1,
      tee_time: "2026-01-02T13:00:00.000Z",
      tournament: {
        city: "Kapalua, Maui",
        country: "United States of America",
        course_name: "Plantation Course at Kapalua",
        end_date: "Jan 2 - 5",
        id: 6,
        name: "The Sentry",
        purse: "$20,000,000",
        season: 2026,
        start_date: "2026-01-01T19:00:00.000Z",
        state: "Hawaii",
        status: "SCHEDULED",
      },
    },
  ],
  meta: { per_page: 100 },
};

const futuresPayload = {
  data: [
    {
      american_odds: 450,
      id: 30001,
      market_name: "2026 The Sentry",
      market_type: "tournament_winner",
      player: {
        active: true,
        country: "United States",
        first_name: "Scottie",
        id: 185,
        last_name: "Scheffler",
      },
      tournament: {
        city: "Kapalua, Maui",
        country: "United States of America",
        course_name: "Plantation Course at Kapalua",
        end_date: "Jan 2 - 5",
        id: 6,
        name: "The Sentry",
        purse: "$20,000,000",
        season: 2026,
        start_date: "2026-01-01T19:00:00.000Z",
        state: "Hawaii",
        status: "SCHEDULED",
      },
      updated_at: "2026-01-01T12:00:00.000Z",
      vendor: "draftkings",
    },
    {
      american_odds: 220,
      id: 30002,
      market_name: "2026 The Sentry Top 5",
      market_type: "top_5_finish",
      player: {
        active: true,
        country: "Northern Ireland",
        first_name: "Rory",
        id: 134,
        last_name: "McIlroy",
      },
      tournament: {
        city: "Kapalua, Maui",
        country: "United States of America",
        course_name: "Plantation Course at Kapalua",
        end_date: "Jan 2 - 5",
        id: 6,
        name: "The Sentry",
        purse: "$20,000,000",
        season: 2026,
        start_date: "2026-01-01T19:00:00.000Z",
        state: "Hawaii",
        status: "SCHEDULED",
      },
      updated_at: "2026-01-01T12:05:00.000Z",
      vendor: "draftkings",
    },
  ],
  meta: { per_page: 100 },
};

const courseHolesPayload = {
  data: [
    {
      course: coursesPayload.data[0],
      hole_number: 1,
      par: 4,
      yardage: 425,
    },
  ],
  meta: { per_page: 100 },
};

const tournamentResultsPayload = {
  data: [
    {
      earnings: 3600000,
      par_relative_score: -21,
      player: playersPayload.data[0],
      position: "1",
      position_numeric: 1,
      total_score: 271,
      tournament: tournamentsPayload.data[0],
    },
    {
      earnings: null,
      par_relative_score: 4,
      player: playersPayload.data[1],
      position: "CUT",
      position_numeric: null,
      total_score: 148,
      tournament: tournamentsPayload.data[0],
    },
  ],
  meta: { per_page: 100 },
};

const tournamentCourseStatsPayload = {
  data: [
    {
      birdies: 40,
      bogeys: 20,
      course: coursesPayload.data[0],
      difficulty_rank: 7,
      double_bogeys: 2,
      eagles: 1,
      hole_number: 1,
      pars: 90,
      round_number: null,
      scoring_average: 4.12,
      scoring_diff: 0.12,
      tournament: tournamentsPayload.data[0],
    },
  ],
  meta: { per_page: 100 },
};

const playerRoundResultsPayload = {
  data: [
    {
      par_relative_score: -3,
      player: playersPayload.data[0],
      round_number: 1,
      score: 70,
      tournament: tournamentsPayload.data[0],
    },
  ],
  meta: { per_page: 100 },
};

const playerRoundStatsPayload = {
  data: [
    {
      birdies: 5,
      bogeys: 1,
      double_bogeys: 0,
      driving_accuracy: 64.29,
      driving_accuracy_rank: 21,
      driving_distance: 313.5,
      driving_distance_rank: 12,
      eagles: 0,
      greens_in_regulation: 72.22,
      greens_in_regulation_rank: 18,
      longest_drive: 352,
      longest_drive_rank: 8,
      pars: 12,
      player: playersPayload.data[0],
      putts_per_gir: 1.62,
      putts_per_gir_rank: 15,
      round_number: 1,
      sand_saves: 50,
      sand_saves_rank: 40,
      scrambling: 66.67,
      scrambling_rank: 22,
      sg_approach: 1.2,
      sg_approach_rank: 9,
      sg_around_green: 0.3,
      sg_around_green_rank: 24,
      sg_off_tee: 0.8,
      sg_off_tee_rank: 13,
      sg_putting: 1.1,
      sg_putting_rank: 11,
      sg_total: 3.4,
      sg_total_rank: 3,
      tournament: tournamentsPayload.data[0],
    },
  ],
  meta: { per_page: 100 },
};

const playerSeasonStatsPayload = {
  data: [
    {
      player: playersPayload.data[0],
      rank: 1,
      season: 2026,
      stat_category: "STROKES_GAINED",
      stat_id: 101,
      stat_name: "SG: Total",
      stat_value: [{ statName: "Average", statValue: "2.125" }],
    },
  ],
  meta: { per_page: 100 },
};

const playerScorecardsPayload = {
  data: [
    {
      course: coursesPayload.data[0],
      hole_number: 1,
      par: 4,
      player: playersPayload.data[0],
      round_number: 1,
      score: 3,
      tournament: tournamentsPayload.data[0],
    },
  ],
  meta: { per_page: 100 },
};

describe("BALLDONTLIE ingest", () => {
  it("stores raw snapshots and idempotently syncs players", async () => {
    const client = createFakeBallDontLieClient({
      [ballDontLieEndpoints.players]: playersPayload,
    });
    const rawSnapshotStore = new InMemoryRawSnapshotStore();
    const repository = new InMemoryCanonicalRepository();

    await syncBallDontLiePlayers({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });
    await syncBallDontLiePlayers({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });

    expect(repository.players.size).toBe(2);
    expect(rawSnapshotStore.snapshots.size).toBe(1);
    expect(await repository.findCanonicalId("player", "185")).toBe("player-185");
  });

  it("skips player records that cannot be named canonically", async () => {
    const client = createFakeBallDontLieClient({
      [ballDontLieEndpoints.players]: {
        data: [
          ...playersPayload.data,
          {
            active: false,
            country: null,
            display_name: null,
            first_name: null,
            id: 9999,
            last_name: null,
          },
        ],
        meta: { per_page: 100 },
      },
    });
    const rawSnapshotStore = new InMemoryRawSnapshotStore();
    const repository = new InMemoryCanonicalRepository();

    const result = await syncBallDontLiePlayers({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });

    expect(result.playersUpserted).toBe(2);
    expect(result.skipped).toEqual(["player:9999:missing-name"]);
    expect(repository.players.size).toBe(2);
  });

  it("syncs courses, tournaments, and field entries through canonical mappings", async () => {
    const client = createFakeBallDontLieClient({
      [ballDontLieEndpoints.courses]: coursesPayload,
      [ballDontLieEndpoints.players]: playersPayload,
      [ballDontLieEndpoints.teeTimes]: teeTimesPayload,
      [ballDontLieEndpoints.tournamentField]: fieldPayload,
      [ballDontLieEndpoints.tournamentResults]: tournamentResultsPayload,
      [ballDontLieEndpoints.tournaments]: tournamentsPayload,
    });
    const rawSnapshotStore = new InMemoryRawSnapshotStore();
    const repository = new InMemoryCanonicalRepository();

    const coursesResult = await syncBallDontLieCourses({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });
    const tournamentsResult = await syncBallDontLieTournaments({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      season: 2026,
    });
    const fieldResult = await syncBallDontLieTournamentField({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    await syncBallDontLieTournamentField({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const teeTimesResult = await syncBallDontLieTournamentTeeTimes({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const resultsResult = await syncBallDontLieTournamentResults({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });

    expect(coursesResult.coursesUpserted).toBe(1);
    expect(tournamentsResult.tournamentsUpserted).toBe(1);
    expect(tournamentsResult.tournamentCoursesUpserted).toBe(1);
    expect(tournamentsResult.skipped).toEqual([]);
    expect(repository.courses.size).toBe(1);
    expect(repository.tournaments.size).toBe(1);
    expect(repository.tournamentCourses.size).toBe(1);
    expect(repository.tournaments.get("tournament-6")?.startsOn).toBe("2026-01-01");
    expect(repository.tournaments.get("tournament-6")?.endsOn).toBe("2026-01-05");
    expect(fieldResult.fieldEntriesUpserted).toBe(2);
    expect(repository.fieldEntries.size).toBe(2);
    expect(repository.fieldEntries.get("tournament-6:player-185")).toMatchObject({
      sourceIds: { balldontlie: "11245" },
      status: "entered",
    });
    expect(repository.fieldEntries.get("tournament-6:player-134")).toMatchObject({
      sourceIds: { balldontlie: "11246" },
      status: "withdrawn",
    });
    expect(teeTimesResult.teeTimesUpserted).toBe(1);
    expect(repository.teeTimes.size).toBe(1);
    expect(repository.teeTimes.get("tournament-6:player-185:1")).toMatchObject({
      groupNumber: 1,
      startTee: 1,
      tee: "1",
      wave: "front_nine",
    });
    expect(resultsResult.fieldEntriesUpserted).toBe(2);
    expect(resultsResult.tournamentResultsUpserted).toBe(2);
    expect(await repository.findCanonicalId("field_entry", "result:6:185")).toBe(
      await repository.findCanonicalId("field_entry", "11245"),
    );
    expect(await repository.findCanonicalId("field_entry", "result:6:134")).toBe(
      await repository.findCanonicalId("field_entry", "11246"),
    );
  });

  it("syncs futures odds into canonical markets and snapshots", async () => {
    const client = createFakeBallDontLieClient({
      [ballDontLieEndpoints.courses]: coursesPayload,
      [ballDontLieEndpoints.futures]: futuresPayload,
      [ballDontLieEndpoints.tournaments]: tournamentsPayload,
    });
    const rawSnapshotStore = new InMemoryRawSnapshotStore();
    const repository = new InMemoryCanonicalRepository();

    await syncBallDontLieCourses({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });
    await syncBallDontLieTournaments({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      season: 2026,
    });
    const result = await syncBallDontLieFutures({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const duplicateResult = await syncBallDontLieFutures({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });

    expect(result.booksUpserted).toBe(1);
    expect(result.marketsUpserted).toBe(2);
    expect(result.oddsSnapshotsInserted).toBe(2);
    expect(duplicateResult.oddsSnapshotsInserted).toBe(0);
    expect(repository.books.size).toBe(1);
    expect(repository.markets.size).toBe(2);
    expect(repository.oddsSnapshots.size).toBe(2);
    expect(
      repository.markets.get("tournament-6:player-185:book-US-draftkings:outright"),
    ).toMatchObject({
      externalMarketId: "30001",
      marketType: "outright",
    });
  });

  it("syncs normalized historical stats and scorecards idempotently", async () => {
    const client = createFakeBallDontLieClient({
      [ballDontLieEndpoints.courseHoles]: courseHolesPayload,
      [ballDontLieEndpoints.courses]: coursesPayload,
      [ballDontLieEndpoints.playerRoundResults]: playerRoundResultsPayload,
      [ballDontLieEndpoints.playerRoundStats]: playerRoundStatsPayload,
      [ballDontLieEndpoints.playerScorecards]: playerScorecardsPayload,
      [ballDontLieEndpoints.playerSeasonStats]: playerSeasonStatsPayload,
      [ballDontLieEndpoints.tournamentCourseStats]: tournamentCourseStatsPayload,
      [ballDontLieEndpoints.tournamentResults]: tournamentResultsPayload,
      [ballDontLieEndpoints.tournaments]: tournamentsPayload,
    });
    const rawSnapshotStore = new InMemoryRawSnapshotStore();
    const repository = new InMemoryCanonicalRepository();

    await syncBallDontLieCourses({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });
    await syncBallDontLieTournaments({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      season: 2026,
    });

    const courseHolesResult = await syncBallDontLieCourseHoles({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
    });
    const tournamentResultsResult = await syncBallDontLieTournamentResults({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const courseStatsResult = await syncBallDontLieTournamentCourseStats({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const roundResultsResult = await syncBallDontLiePlayerRoundResults({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const roundStatsResult = await syncBallDontLiePlayerRoundStats({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });
    const seasonStatsResult = await syncBallDontLiePlayerSeasonStats({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      season: 2026,
    });
    const scorecardsResult = await syncBallDontLiePlayerScorecards({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });

    await syncBallDontLieTournamentResults({
      client,
      pageOptions: { pageDelayMs: 0 },
      rawSnapshotStore,
      repository,
      tournamentId: 6,
    });

    expect(courseHolesResult.courseHolesUpserted).toBe(1);
    expect(tournamentResultsResult.fieldEntriesUpserted).toBe(2);
    expect(tournamentResultsResult.tournamentResultsUpserted).toBe(2);
    expect(courseStatsResult.tournamentCourseHoleStatsUpserted).toBe(1);
    expect(roundResultsResult.playerRoundResultsUpserted).toBe(1);
    expect(roundStatsResult.playerRoundStatsUpserted).toBe(1);
    expect(seasonStatsResult.playerSeasonStatsUpserted).toBe(1);
    expect(seasonStatsResult.providerStatDefinitionsUpserted).toBe(1);
    expect(scorecardsResult.playerScorecardsUpserted).toBe(1);
    expect(repository.fieldEntries.size).toBe(2);
    expect(repository.fieldEntries.get("tournament-6:player-185")).toMatchObject({
      sourceIds: { balldontlie: "result:6:185" },
      status: "entered",
    });
    expect(repository.fieldEntries.get("tournament-6:player-134")).toMatchObject({
      sourceIds: { balldontlie: "result:6:134" },
      status: "entered",
    });
    expect(repository.tournamentResults.size).toBe(2);
    expect(repository.tournamentResults.get("tournament-6:player-134")).toMatchObject({
      madeCut: false,
      position: "CUT",
    });
    expect(repository.playerRoundStats.get("tournament-6:player-185:1")).toMatchObject({
      sgTotal: "3.4000",
    });
    expect(repository.playerSeasonStats.get("player-185:2026:101")).toMatchObject({
      valueNumeric: "2.125000",
    });
    expect(repository.playerScorecards.size).toBe(1);
  });
});
