import type { z } from "zod";
import { z as zod } from "zod";
import type { ProviderClient, ProviderRequest, ProviderResponse } from "./types";

const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 25;
const DEFAULT_TRIAL_PAGE_DELAY_MS = 12_500;

const maybeString = zod.string().nullable().optional();
const maybeNumber = zod.number().nullable().optional();
const maybeBoolean = zod.boolean().nullable().optional();

export const ballDontLiePlayerSchema = zod
  .object({
    id: zod.number().int(),
    first_name: zod.string(),
    last_name: zod.string(),
    display_name: zod.string().optional(),
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
    entry_status: zod.enum(["IN", "WITHDRAWN", "ALTERNATE"]),
    qualifier: maybeString,
    owgr: maybeNumber,
    is_amateur: maybeBoolean,
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
export const ballDontLieTournamentFieldPageSchema = ballDontLiePageSchema(
  ballDontLieTournamentFieldEntrySchema,
);

export type BallDontLiePlayer = z.infer<typeof ballDontLiePlayerSchema>;
export type BallDontLieCourse = z.infer<typeof ballDontLieCourseSchema>;
export type BallDontLieTournament = z.infer<typeof ballDontLieTournamentSchema>;
export type BallDontLieTournamentFieldEntry = z.infer<typeof ballDontLieTournamentFieldEntrySchema>;
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
