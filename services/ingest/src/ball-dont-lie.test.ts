import type { ProviderClient, ProviderRequest, ProviderResponse } from "@pgatour-ai/providers";
import { describe, expect, it } from "vitest";
import {
  type CanonicalCourseInput,
  type CanonicalFieldEntryInput,
  type CanonicalPlayerInput,
  type CanonicalRepository,
  type CanonicalTournamentInput,
  type SourceEntityType,
  syncBallDontLieCourses,
  syncBallDontLiePlayers,
  syncBallDontLieTournamentField,
  syncBallDontLieTournaments,
} from "./ball-dont-lie";
import { InMemoryRawSnapshotStore } from "./raw-snapshots";

class InMemoryCanonicalRepository implements CanonicalRepository {
  readonly courses = new Map<string, CanonicalCourseInput>();
  readonly fieldEntries = new Map<string, CanonicalFieldEntryInput>();
  readonly mappings = new Map<string, string>();
  readonly players = new Map<string, CanonicalPlayerInput>();
  readonly tournaments = new Map<string, CanonicalTournamentInput>();

  async findCanonicalId(entityType: SourceEntityType, sourceEntityId: string) {
    return this.mappings.get(this.mappingKey(entityType, sourceEntityId)) ?? null;
  }

  async upsertCourse(input: CanonicalCourseInput) {
    const id = await this.idFor("course", input.sourceEntityId);
    this.courses.set(id, input);

    return id;
  }

  async upsertFieldEntry(input: CanonicalFieldEntryInput) {
    const id = await this.idFor("field_entry", input.sourceEntityId);
    this.fieldEntries.set(`${input.tournamentId}:${input.playerId}`, input);

    return id;
  }

  async upsertPlayer(input: CanonicalPlayerInput) {
    const id = await this.idFor("player", input.sourceEntityId);
    this.players.set(id, input);

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
  ],
  meta: { per_page: 100 },
};

describe("BALLDONTLIE ingest", () => {
  it("stores raw snapshots and idempotently syncs players", async () => {
    const client = createFakeBallDontLieClient({ players: playersPayload });
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

  it("syncs courses, tournaments, and field entries through canonical mappings", async () => {
    const client = createFakeBallDontLieClient({
      courses: coursesPayload,
      players: playersPayload,
      tournament_field: fieldPayload,
      tournaments: tournamentsPayload,
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
    await syncBallDontLieTournamentField({
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

    expect(coursesResult.coursesUpserted).toBe(1);
    expect(tournamentsResult.tournamentsUpserted).toBe(1);
    expect(tournamentsResult.skipped).toEqual([]);
    expect(repository.courses.size).toBe(1);
    expect(repository.tournaments.size).toBe(1);
    expect(repository.fieldEntries.size).toBe(1);
    expect(repository.fieldEntries.get("tournament-6:player-185")?.status).toBe("entered");
  });
});
