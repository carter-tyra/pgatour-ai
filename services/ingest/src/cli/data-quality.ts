import { pathToFileURL } from "node:url";
import {
  createDatabaseClient,
  fieldEntries,
  ingestionTasks,
  markets,
  modelFeatureSets,
  modelPlayerFeatures,
  oddsSnapshots,
  playerRoundResults,
  playerRoundStats,
  playerScorecards,
  playerSeasonStats,
  sourceEntityMappings,
  tournamentCourseHoleStats,
  tournamentResults,
  tournaments,
} from "@pgatour-ai/db";
import { ballDontLieProviderEmptyHistoricalFacts } from "@pgatour-ai/domain";
import { and, between, desc, eq, sql } from "drizzle-orm";
import { loadLocalEnv } from "../local-env";

type DataQualityArgs = {
  fromSeason: number;
  strict: boolean;
  toSeason: number;
};

type CoverageIssue = {
  code: string;
  detail: string;
  severity: "error" | "warning";
  season?: number;
  tournamentId?: string;
  tournamentSourceId?: string | null;
};

const CURRENT_SEASON = new Date().getFullYear();

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function parseDataQualityArgs(argv: string[]): DataQualityArgs {
  const args: DataQualityArgs = {
    fromSeason: 2010,
    strict: false,
    toSeason: CURRENT_SEASON,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--strict") {
      args.strict = true;
      continue;
    }

    if (arg === "--") {
      continue;
    }

    const next = argv[index + 1];

    if (next === undefined) {
      throw new Error(`${arg} requires a value`);
    }

    if (arg === "--from-season") {
      args.fromSeason = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--to-season") {
      args.toSeason = parsePositiveInteger(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.fromSeason > args.toSeason) {
    throw new Error("--from-season must be less than or equal to --to-season");
  }

  return args;
}

async function countRows(query: Promise<Array<{ count: number | string }>>) {
  const [row] = await query;

  return Number(row?.count ?? 0);
}

function toCountMap(rows: Array<{ count: number | string; season: number | null }>) {
  return new Map(rows.map((row) => [row.season ?? 0, Number(row.count)]));
}

function toTournamentCountMap(rows: Array<{ count: number | string; tournamentId: string }>) {
  return new Map(rows.map((row) => [row.tournamentId, Number(row.count)]));
}

function seasonRange(fromSeason: number, toSeason: number) {
  return Array.from({ length: toSeason - fromSeason + 1 }, (_, index) => fromSeason + index);
}

function providerEmptyHistoricalFact({
  resource,
  season,
  tournamentSourceId,
}: {
  resource: string;
  season: number;
  tournamentSourceId: string | null;
}) {
  return ballDontLieProviderEmptyHistoricalFacts.find(
    (fact) =>
      fact.resource === resource &&
      fact.season === season &&
      fact.tournamentSourceId === tournamentSourceId,
  );
}

export async function buildDataQualitySummary(
  db: ReturnType<typeof createDatabaseClient>["db"],
  args: DataQualityArgs,
) {
  const seasons = seasonRange(args.fromSeason, args.toSeason);
  const completedTournamentCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(*)::int`,
        season: tournaments.season,
      })
      .from(tournaments)
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
        ),
      )
      .groupBy(tournaments.season),
  );
  const tournamentResultCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${tournamentResults.id})::int`,
        season: tournaments.season,
      })
      .from(tournamentResults)
      .innerJoin(tournaments, eq(tournamentResults.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );
  const roundResultCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${playerRoundResults.id})::int`,
        season: tournaments.season,
      })
      .from(playerRoundResults)
      .innerJoin(tournaments, eq(playerRoundResults.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );
  const roundStatCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${playerRoundStats.id})::int`,
        season: tournaments.season,
      })
      .from(playerRoundStats)
      .innerJoin(tournaments, eq(playerRoundStats.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );
  const scorecardCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${playerScorecards.id})::int`,
        season: tournaments.season,
      })
      .from(playerScorecards)
      .innerJoin(tournaments, eq(playerScorecards.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );
  const courseStatCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${tournamentCourseHoleStats.id})::int`,
        season: tournaments.season,
      })
      .from(tournamentCourseHoleStats)
      .innerJoin(tournaments, eq(tournamentCourseHoleStats.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );
  const seasonStatCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(*)::int`,
        season: playerSeasonStats.season,
      })
      .from(playerSeasonStats)
      .where(between(playerSeasonStats.season, args.fromSeason, args.toSeason))
      .groupBy(playerSeasonStats.season),
  );
  const marketCounts = toCountMap(
    await db
      .select({
        count: sql<number>`count(distinct ${markets.id})::int`,
        season: tournaments.season,
      })
      .from(markets)
      .innerJoin(tournaments, eq(markets.tournamentId, tournaments.id))
      .where(between(tournaments.season, args.fromSeason, args.toSeason))
      .groupBy(tournaments.season),
  );

  const completedTournaments = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      season: tournaments.season,
      sourceEntityId: sourceEntityMappings.sourceEntityId,
      startsOn: tournaments.startsOn,
    })
    .from(tournaments)
    .innerJoin(
      sourceEntityMappings,
      and(
        eq(sourceEntityMappings.source, "balldontlie"),
        eq(sourceEntityMappings.entityType, "tournament"),
        eq(sourceEntityMappings.canonicalId, tournaments.id),
      ),
    )
    .where(
      and(
        between(tournaments.season, args.fromSeason, args.toSeason),
        eq(tournaments.status, "completed"),
      ),
    )
    .orderBy(desc(tournaments.startsOn));
  const tournamentResultCoverage = toTournamentCountMap(
    await db
      .select({
        count: sql<number>`count(*)::int`,
        tournamentId: tournamentResults.tournamentId,
      })
      .from(tournamentResults)
      .innerJoin(tournaments, eq(tournamentResults.tournamentId, tournaments.id))
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
        ),
      )
      .groupBy(tournamentResults.tournamentId),
  );
  const roundResultCoverage = toTournamentCountMap(
    await db
      .select({
        count: sql<number>`count(*)::int`,
        tournamentId: playerRoundResults.tournamentId,
      })
      .from(playerRoundResults)
      .innerJoin(tournaments, eq(playerRoundResults.tournamentId, tournaments.id))
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
        ),
      )
      .groupBy(playerRoundResults.tournamentId),
  );
  const roundStatCoverage = toTournamentCountMap(
    await db
      .select({
        count: sql<number>`count(*)::int`,
        tournamentId: playerRoundStats.tournamentId,
      })
      .from(playerRoundStats)
      .innerJoin(tournaments, eq(playerRoundStats.tournamentId, tournaments.id))
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
        ),
      )
      .groupBy(playerRoundStats.tournamentId),
  );

  const failedTasks = await db
    .select({
      lastError: ingestionTasks.lastError,
      resource: ingestionTasks.resource,
      season: ingestionTasks.season,
      taskKey: ingestionTasks.taskKey,
      tournamentSourceId: ingestionTasks.tournamentSourceId,
      updatedAt: ingestionTasks.updatedAt,
    })
    .from(ingestionTasks)
    .where(
      and(
        eq(ingestionTasks.source, "balldontlie"),
        between(ingestionTasks.season, args.fromSeason, args.toSeason),
        eq(ingestionTasks.status, "failed"),
      ),
    )
    .orderBy(desc(ingestionTasks.updatedAt))
    .limit(50);

  const issues: CoverageIssue[] = [];

  for (const tournament of completedTournaments) {
    if ((tournamentResultCoverage.get(tournament.id) ?? 0) === 0) {
      const providerGap = providerEmptyHistoricalFact({
        resource: "tournament_results",
        season: tournament.season,
        tournamentSourceId: tournament.sourceEntityId,
      });

      issues.push({
        code: providerGap
          ? "provider-empty-tournament-results"
          : "completed-tournament-missing-results",
        detail: providerGap?.reason ?? `${tournament.name} has no normalized tournament results.`,
        season: tournament.season,
        severity: providerGap ? "warning" : "error",
        tournamentId: tournament.id,
        tournamentSourceId: tournament.sourceEntityId,
      });
    }

    if ((roundResultCoverage.get(tournament.id) ?? 0) === 0) {
      const providerGap = providerEmptyHistoricalFact({
        resource: "player_round_results",
        season: tournament.season,
        tournamentSourceId: tournament.sourceEntityId,
      });

      issues.push({
        code: providerGap
          ? "provider-empty-player-round-results"
          : "completed-tournament-missing-round-results",
        detail: providerGap?.reason ?? `${tournament.name} has no normalized round results.`,
        season: tournament.season,
        severity: providerGap ? "warning" : "error",
        tournamentId: tournament.id,
        tournamentSourceId: tournament.sourceEntityId,
      });
    }

    if ((roundStatCoverage.get(tournament.id) ?? 0) === 0) {
      const providerGap = providerEmptyHistoricalFact({
        resource: "player_round_stats",
        season: tournament.season,
        tournamentSourceId: tournament.sourceEntityId,
      });

      issues.push({
        code: providerGap
          ? "provider-empty-player-round-stats"
          : "completed-tournament-missing-round-stats",
        detail: providerGap?.reason ?? `${tournament.name} has no normalized round stats.`,
        season: tournament.season,
        severity: providerGap ? "warning" : "error",
        tournamentId: tournament.id,
        tournamentSourceId: tournament.sourceEntityId,
      });
    }
  }

  for (const task of failedTasks) {
    issues.push({
      code: "failed-history-task",
      detail: `${task.resource}:${task.taskKey} failed${task.lastError ? `: ${task.lastError}` : ""}`,
      severity: "error",
      ...(task.season === null ? {} : { season: task.season }),
      tournamentSourceId: task.tournamentSourceId,
    });
  }

  const featureSetCount = await countRows(
    db.select({ count: sql<number>`count(*)::int` }).from(modelFeatureSets),
  );
  const featureRowCount = await countRows(
    db.select({ count: sql<number>`count(*)::int` }).from(modelPlayerFeatures),
  );
  const activeFieldCount = await countRows(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fieldEntries)
      .where(sql`${fieldEntries.status} in ('entered', 'qualified', 'alternate')`),
  );
  const backtestEligibleTournamentCount = await countRows(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tournaments)
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
          sql`exists (
            select 1
            from field_entries fe
            where fe.tournament_id = ${tournaments.id}
              and fe.status in ('entered', 'qualified', 'alternate')
          )`,
          sql`exists (
            select 1
            from tournament_results tr
            where tr.tournament_id = ${tournaments.id}
          )`,
        ),
      ),
  );
  const clvEligibleTournamentCount = await countRows(
    db
      .select({ count: sql<number>`count(distinct ${tournaments.id})::int` })
      .from(tournaments)
      .innerJoin(markets, eq(markets.tournamentId, tournaments.id))
      .innerJoin(oddsSnapshots, eq(oddsSnapshots.marketId, markets.id))
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
          sql`${oddsSnapshots.capturedAt} <= (${tournaments.startsOn}::date::timestamp at time zone 'UTC')`,
          sql`exists (
            select 1
            from field_entries fe
            where fe.tournament_id = ${tournaments.id}
              and fe.status in ('entered', 'qualified', 'alternate')
          )`,
          sql`exists (
            select 1
            from tournament_results tr
            where tr.tournament_id = ${tournaments.id}
          )`,
        ),
      ),
  );
  const preStartMarketPriceCount = await countRows(
    db
      .select({ count: sql<number>`count(distinct ${oddsSnapshots.id})::int` })
      .from(oddsSnapshots)
      .innerJoin(markets, eq(oddsSnapshots.marketId, markets.id))
      .innerJoin(tournaments, eq(markets.tournamentId, tournaments.id))
      .where(
        and(
          between(tournaments.season, args.fromSeason, args.toSeason),
          eq(tournaments.status, "completed"),
          sql`${oddsSnapshots.capturedAt} <= (${tournaments.startsOn}::date::timestamp at time zone 'UTC')`,
        ),
      ),
  );
  const playerRoundStatCount = await countRows(
    db.select({ count: sql<number>`count(*)::int` }).from(playerRoundStats),
  );
  const errorCount = issues.filter((issue) => issue.severity === "error").length;

  return {
    errorCount,
    generatedAt: new Date().toISOString(),
    issueCount: issues.length,
    issues: issues.slice(0, 250),
    pass: errorCount === 0,
    range: {
      fromSeason: args.fromSeason,
      toSeason: args.toSeason,
    },
    seasons: seasons.map((season) => ({
      completedTournaments: completedTournamentCounts.get(season) ?? 0,
      courseStats: courseStatCounts.get(season) ?? 0,
      playerRoundResults: roundResultCounts.get(season) ?? 0,
      playerRoundStats: roundStatCounts.get(season) ?? 0,
      playerScorecards: scorecardCounts.get(season) ?? 0,
      playerSeasonStats: seasonStatCounts.get(season) ?? 0,
      markets: marketCounts.get(season) ?? 0,
      season,
      tournamentResults: tournamentResultCounts.get(season) ?? 0,
    })),
    modelReadiness: {
      activeFieldEntries: activeFieldCount,
      backtestEligibleTournaments: backtestEligibleTournamentCount,
      canBuildFeatureSet: activeFieldCount > 0 && playerRoundStatCount > 0,
      clvEligibleTournaments: clvEligibleTournamentCount,
      featureRows: featureRowCount,
      featureSets: featureSetCount,
      preStartMarketPrices: preStartMarketPriceCount,
    },
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  return typeof error === "string" && error.length > 0 ? error : "Unknown data quality failure";
}

async function main() {
  const args = parseDataQualityArgs(process.argv.slice(2));
  const env = loadLocalEnv();
  const dbClient = createDatabaseClient(env.DATABASE_URL);

  try {
    const summary = await buildDataQualitySummary(dbClient.db, args);

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

    if (args.strict && !summary.pass) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  } finally {
    await dbClient.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
