import type { z } from "zod";
import { z as zod } from "zod";
import type { ProviderClient, ProviderRequest, ProviderResponse } from "./types";

const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 25;
const DEFAULT_TRIAL_PAGE_DELAY_MS = 12_500;

const maybeString = zod.string().nullable().optional();
const maybeNumber = zod.number().nullable().optional();
const maybeBoolean = zod.boolean().nullable().optional();

export const ballDontLieEndpoints = {
  courseHoles: "v1/course_holes",
  courses: "v1/courses",
  futures: "v1/futures",
  playerRoundResults: "v1/player_round_results",
  playerRoundStats: "v1/player_round_stats",
  playerScorecards: "v1/player_scorecards",
  playerSeasonStats: "v1/player_season_stats",
  players: "v1/players",
  teeTimes: "v1/tee_times",
  tournamentCourseStats: "v1/tournament_course_stats",
  tournamentField: "v1/tournament_field",
  tournamentResults: "v1/tournament_results",
  tournaments: "v2/tournaments",
} as const;

export const ballDontLiePlayerSchema = zod
  .object({
    id: zod.number().int(),
    first_name: maybeString,
    last_name: maybeString,
    display_name: maybeString,
    country: maybeString,
    country_code: maybeString,
    active: zod.boolean().optional(),
    owgr: maybeNumber,
  })
  .passthrough();

export const ballDontLieCourseSchema = zod
  .object({
    id: zod.number().int(),
    name: zod.string(),
    city: zod.string(),
    state: maybeString,
    country: zod.string(),
    par: zod.number().int(),
    yardage: zod.union([zod.string(), zod.number()]).nullable().optional(),
    fairway_grass: maybeString,
    rough_grass: maybeString,
    green_grass: maybeString,
  })
  .passthrough();

export const ballDontLieTournamentCourseSchema = zod
  .object({
    course: ballDontLieCourseSchema.pick({
      id: true,
      name: true,
      city: true,
      state: true,
      country: true,
      par: true,
    }),
    rounds: zod.array(zod.number().int()).default([]),
  })
  .passthrough();

export const ballDontLieTournamentSchema = zod
  .object({
    id: zod.number().int(),
    season: zod.number().int(),
    name: zod.string(),
    start_date: zod.string(),
    end_date: zod.string(),
    city: maybeString,
    state: maybeString,
    country: maybeString,
    course_name: maybeString,
    purse: maybeString,
    status: zod.string(),
    courses: zod.array(ballDontLieTournamentCourseSchema).default([]),
  })
  .passthrough();

export const ballDontLieTournamentFieldEntrySchema = zod
  .object({
    id: zod.number().int(),
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    player: ballDontLiePlayerSchema,
    entry_status: zod.string(),
    qualifier: maybeString,
    owgr: maybeNumber,
    is_amateur: maybeBoolean,
  })
  .passthrough();

export const ballDontLieTeeTimeSchema = zod
  .object({
    id: zod.number().int(),
    round_number: zod.number().int(),
    group_number: maybeNumber,
    tee_time: maybeString,
    start_tee: maybeNumber,
    back_nine: maybeBoolean,
    player: ballDontLiePlayerSchema,
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    course: ballDontLieCourseSchema.nullable().optional(),
  })
  .passthrough();

export const ballDontLieFutureSchema = zod
  .object({
    american_odds: zod.number().int(),
    id: zod.number().int(),
    market_name: zod.string(),
    market_type: zod.string(),
    player: ballDontLiePlayerSchema,
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    updated_at: zod.string().datetime(),
    vendor: zod.string(),
  })
  .passthrough();

export const ballDontLieCourseHoleSchema = zod
  .object({
    course: ballDontLieCourseSchema,
    hole_number: zod.number().int(),
    par: zod.number().int(),
    yardage: maybeNumber,
  })
  .passthrough();

export const ballDontLieTournamentResultSchema = zod
  .object({
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    player: ballDontLiePlayerSchema,
    position: maybeString,
    position_numeric: maybeNumber,
    total_score: maybeNumber,
    par_relative_score: maybeNumber,
    earnings: maybeNumber,
  })
  .passthrough();

export const ballDontLieTournamentCourseStatsSchema = zod
  .object({
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    course: ballDontLieCourseSchema,
    hole_number: zod.number().int(),
    round_number: maybeNumber,
    scoring_average: maybeNumber,
    scoring_diff: maybeNumber,
    difficulty_rank: maybeNumber,
    eagles: maybeNumber,
    birdies: maybeNumber,
    pars: maybeNumber,
    bogeys: maybeNumber,
    double_bogeys: maybeNumber,
  })
  .passthrough();

export const ballDontLiePlayerRoundResultSchema = zod
  .object({
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    player: ballDontLiePlayerSchema,
    round_number: zod.number().int(),
    score: maybeNumber,
    par_relative_score: maybeNumber,
  })
  .passthrough();

export const ballDontLiePlayerRoundStatsSchema = zod
  .object({
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    player: ballDontLiePlayerSchema,
    round_number: zod.number().int(),
    sg_off_tee: maybeNumber,
    sg_off_tee_rank: maybeNumber,
    sg_approach: maybeNumber,
    sg_approach_rank: maybeNumber,
    sg_around_green: maybeNumber,
    sg_around_green_rank: maybeNumber,
    sg_putting: maybeNumber,
    sg_putting_rank: maybeNumber,
    sg_total: maybeNumber,
    sg_total_rank: maybeNumber,
    driving_accuracy: maybeNumber,
    driving_accuracy_rank: maybeNumber,
    driving_distance: maybeNumber,
    driving_distance_rank: maybeNumber,
    longest_drive: maybeNumber,
    longest_drive_rank: maybeNumber,
    greens_in_regulation: maybeNumber,
    greens_in_regulation_rank: maybeNumber,
    sand_saves: maybeNumber,
    sand_saves_rank: maybeNumber,
    scrambling: maybeNumber,
    scrambling_rank: maybeNumber,
    putts_per_gir: maybeNumber,
    putts_per_gir_rank: maybeNumber,
    eagles: maybeNumber,
    birdies: maybeNumber,
    pars: maybeNumber,
    bogeys: maybeNumber,
    double_bogeys: maybeNumber,
  })
  .passthrough();

export const ballDontLiePlayerSeasonStatValueSchema = zod
  .object({
    statName: zod.string(),
    statValue: zod.string(),
  })
  .passthrough();

export const ballDontLiePlayerSeasonStatSchema = zod
  .object({
    player: ballDontLiePlayerSchema,
    stat_id: zod.number().int(),
    stat_name: zod.string(),
    stat_category: maybeString,
    season: zod.number().int(),
    rank: maybeNumber,
    stat_value: zod.array(ballDontLiePlayerSeasonStatValueSchema).nullable().optional(),
  })
  .passthrough();

export const ballDontLiePlayerScorecardSchema = zod
  .object({
    tournament: ballDontLieTournamentSchema.omit({ courses: true }).passthrough(),
    player: ballDontLiePlayerSchema,
    course: ballDontLieCourseSchema.nullable().optional(),
    round_number: zod.number().int(),
    hole_number: zod.number().int(),
    par: zod.number().int(),
    score: maybeNumber,
  })
  .passthrough();

export const ballDontLiePageMetaSchema = zod
  .object({
    next_cursor: zod.union([zod.number(), zod.string()]).nullable().optional(),
    per_page: zod.number().int().optional(),
  })
  .passthrough();

export function ballDontLiePageSchema<TItem extends z.ZodType>(itemSchema: TItem) {
  return zod
    .object({
      data: zod.array(itemSchema),
      meta: ballDontLiePageMetaSchema.optional(),
    })
    .passthrough();
}

export const ballDontLiePlayersPageSchema = ballDontLiePageSchema(ballDontLiePlayerSchema);
export const ballDontLieCoursesPageSchema = ballDontLiePageSchema(ballDontLieCourseSchema);
export const ballDontLieTournamentsPageSchema = ballDontLiePageSchema(ballDontLieTournamentSchema);
export const ballDontLieCourseHolesPageSchema = ballDontLiePageSchema(ballDontLieCourseHoleSchema);
export const ballDontLieTournamentFieldPageSchema = ballDontLiePageSchema(
  ballDontLieTournamentFieldEntrySchema,
);
export const ballDontLieTeeTimesPageSchema = ballDontLiePageSchema(ballDontLieTeeTimeSchema);
export const ballDontLieFuturesPageSchema = ballDontLiePageSchema(ballDontLieFutureSchema);
export const ballDontLieTournamentResultsPageSchema = ballDontLiePageSchema(
  ballDontLieTournamentResultSchema,
);
export const ballDontLieTournamentCourseStatsPageSchema = ballDontLiePageSchema(
  ballDontLieTournamentCourseStatsSchema,
);
export const ballDontLiePlayerRoundResultsPageSchema = ballDontLiePageSchema(
  ballDontLiePlayerRoundResultSchema,
);
export const ballDontLiePlayerRoundStatsPageSchema = ballDontLiePageSchema(
  ballDontLiePlayerRoundStatsSchema,
);
export const ballDontLiePlayerSeasonStatsPageSchema = ballDontLiePageSchema(
  ballDontLiePlayerSeasonStatSchema,
);
export const ballDontLiePlayerScorecardsPageSchema = ballDontLiePageSchema(
  ballDontLiePlayerScorecardSchema,
);

export type BallDontLiePlayer = z.infer<typeof ballDontLiePlayerSchema>;
export type BallDontLieCourse = z.infer<typeof ballDontLieCourseSchema>;
export type BallDontLieTournament = z.infer<typeof ballDontLieTournamentSchema>;
export type BallDontLieTournamentFieldEntry = z.infer<typeof ballDontLieTournamentFieldEntrySchema>;
export type BallDontLieTeeTime = z.infer<typeof ballDontLieTeeTimeSchema>;
export type BallDontLieFuture = z.infer<typeof ballDontLieFutureSchema>;
export type BallDontLieCourseHole = z.infer<typeof ballDontLieCourseHoleSchema>;
export type BallDontLieTournamentResult = z.infer<typeof ballDontLieTournamentResultSchema>;
export type BallDontLieTournamentCourseStats = z.infer<
  typeof ballDontLieTournamentCourseStatsSchema
>;
export type BallDontLiePlayerRoundResult = z.infer<typeof ballDontLiePlayerRoundResultSchema>;
export type BallDontLiePlayerRoundStats = z.infer<typeof ballDontLiePlayerRoundStatsSchema>;
export type BallDontLiePlayerSeasonStat = z.infer<typeof ballDontLiePlayerSeasonStatSchema>;
export type BallDontLiePlayerScorecard = z.infer<typeof ballDontLiePlayerScorecardSchema>;
export type BallDontLiePage<TItem> = {
  data: TItem[];
  meta?: z.infer<typeof ballDontLiePageMetaSchema> | undefined;
};

export type BallDontLiePageOptions = {
  maxPages?: number;
  pageDelayMs?: number;
  perPage?: number;
  stopAfterMaxPages?: boolean;
};

type PageWithCursor = {
  meta?: {
    next_cursor?: null | number | string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* fetchBallDontLiePages<TSchema extends z.ZodType>({
  client,
  pageSchema,
  request,
  options = {},
}: {
  client: ProviderClient;
  pageSchema: TSchema;
  request: ProviderRequest;
  options?: BallDontLiePageOptions | undefined;
}): AsyncGenerator<ProviderResponse<z.output<TSchema>>> {
  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const pageDelayMs = options.pageDelayMs ?? DEFAULT_TRIAL_PAGE_DELAY_MS;
  const stopAfterMaxPages = options.stopAfterMaxPages ?? false;
  let cursor: string | number | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await client.fetchJson<unknown>({
      endpoint: request.endpoint,
      params: {
        ...request.params,
        cursor,
        per_page: perPage,
      },
    });
    const payload = pageSchema.parse(response.payload);

    yield {
      ...response,
      payload,
    };

    cursor = (payload as PageWithCursor).meta?.next_cursor ?? undefined;

    if (cursor === undefined || cursor === null) {
      return;
    }

    if (stopAfterMaxPages && page === maxPages - 1) {
      return;
    }

    if (pageDelayMs > 0) {
      await sleep(pageDelayMs);
    }
  }

  throw new Error(`BALLDONTLIE pagination exceeded ${maxPages} pages for ${request.endpoint}`);
}
