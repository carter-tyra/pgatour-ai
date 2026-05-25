import {
  type AppDatabase,
  courses,
  fieldEntries,
  players,
  sourceEntityMappings,
  tournaments,
} from "@pgatour-ai/db";
import {
  type BallDontLieCourse,
  type BallDontLiePageOptions,
  type BallDontLiePlayer,
  type BallDontLieTournament,
  type BallDontLieTournamentFieldEntry,
  ballDontLieCoursesPageSchema,
  ballDontLiePlayersPageSchema,
  ballDontLieTournamentFieldPageSchema,
  ballDontLieTournamentsPageSchema,
  fetchBallDontLiePages,
  type ProviderClient,
} from "@pgatour-ai/providers";
import { and, eq, sql } from "drizzle-orm";
import { persistRawSnapshot, type RawSnapshotStore } from "./raw-snapshots";

const BALL_DONT_LIE_SOURCE = "balldontlie";

export type SourceEntityType = "course" | "field_entry" | "player" | "tournament";

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

export type CanonicalFieldEntryInput = {
  playerId: string;
  seed: number | null;
  sourceEntityId: string;
  sourceIds: Record<string, string>;
  status: string;
  teeWave: string | null;
  tournamentId: string;
};

export type CanonicalRepository = {
  findCanonicalId: (entityType: SourceEntityType, sourceEntityId: string) => Promise<null | string>;
  upsertCourse: (input: CanonicalCourseInput) => Promise<string>;
  upsertFieldEntry: (input: CanonicalFieldEntryInput) => Promise<string>;
  upsertPlayer: (input: CanonicalPlayerInput) => Promise<string>;
  upsertTournament: (input: CanonicalTournamentInput) => Promise<string>;
};

export type BallDontLieSyncResult = {
  coursesUpserted: number;
  fieldEntriesUpserted: number;
  pagesFetched: number;
  playersUpserted: number;
  rawSnapshots: string[];
  skipped: string[];
  tournamentsUpserted: number;
};

export type BallDontLieSyncOptions = {
  client: ProviderClient;
  pageOptions?: BallDontLiePageOptions;
  rawSnapshotStore: RawSnapshotStore;
  repository: CanonicalRepository;
};

function emptyResult(): BallDontLieSyncResult {
  return {
    coursesUpserted: 0,
    fieldEntriesUpserted: 0,
    pagesFetched: 0,
    playersUpserted: 0,
    rawSnapshots: [],
    skipped: [],
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

function normalizeStatus(value: string) {
  return value.toLowerCase().replaceAll(" ", "_");
}

function normalizeFieldStatus(value: BallDontLieTournamentFieldEntry["entry_status"]) {
  if (value === "IN") {
    return "entered";
  }

  return value.toLowerCase();
}

export function normalizeBallDontLiePlayer(player: BallDontLiePlayer): CanonicalPlayerInput {
  const sourceEntityId = String(player.id);

  return {
    country: player.country ?? null,
    firstName: player.first_name,
    lastName: player.last_name,
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

  return {
    courseId,
    endsOn: tournament.end_date,
    name: tournament.name,
    purseUsd: parsePurseUsd(tournament.purse),
    season: tournament.season,
    sourceEntityId,
    sourceIds: sourceIds(sourceEntityId),
    startsOn: tournament.start_date,
    status: normalizeStatus(tournament.status),
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
          },
        })
        .returning({ id: fieldEntries.id });

      if (!upserted) {
        throw new Error(`Failed to upsert BALLDONTLIE field entry ${sourceEntityId}`);
      }

      await recordMapping("field_entry", sourceEntityId, upserted.id);

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

export async function syncBallDontLiePlayers({
  client,
  pageOptions,
  rawSnapshotStore,
  repository,
}: BallDontLieSyncOptions) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLiePlayersPageSchema,
    request: { endpoint: "players" },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(await persistRawSnapshot(rawSnapshotStore, response));

    for (const player of response.payload.data) {
      await repository.upsertPlayer(normalizeBallDontLiePlayer(player));
      result.playersUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieCourses({
  client,
  pageOptions,
  rawSnapshotStore,
  repository,
}: BallDontLieSyncOptions) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieCoursesPageSchema,
    request: { endpoint: "courses" },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(await persistRawSnapshot(rawSnapshotStore, response));

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
  repository,
  season,
}: BallDontLieSyncOptions & { season: number }) {
  const result = emptyResult();

  for await (const response of fetchBallDontLiePages({
    client,
    options: pageOptions,
    pageSchema: ballDontLieTournamentsPageSchema,
    request: { endpoint: "tournaments", params: { season } },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(await persistRawSnapshot(rawSnapshotStore, response));

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

      await repository.upsertTournament(normalizeBallDontLieTournament({ courseId, tournament }));
      result.tournamentsUpserted += 1;
    }
  }

  return result;
}

export async function syncBallDontLieTournamentField({
  client,
  pageOptions,
  rawSnapshotStore,
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
    request: { endpoint: "tournament_field", params: { tournament_id: tournamentId } },
  })) {
    result.pagesFetched += 1;
    result.rawSnapshots.push(await persistRawSnapshot(rawSnapshotStore, response));

    for (const entry of response.payload.data) {
      const playerId = await repository.upsertPlayer(normalizeBallDontLiePlayer(entry.player));
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
