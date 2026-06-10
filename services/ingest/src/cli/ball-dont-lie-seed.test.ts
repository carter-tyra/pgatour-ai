import { describe, expect, it } from "vitest";
import {
  type BallDontLieSeedSummary,
  countsForSeedSteps,
  pageOptionsFromArgs,
  parseBallDontLieSeedArgs,
  rawSnapshotKeysForSeedSteps,
  skippedRecordsForSeedSteps,
  syncRunStatusForSeedSteps,
} from "./ball-dont-lie-seed";

describe("BALLDONTLIE seed CLI args", () => {
  it("parses season, repeated tournament ids, and sampling options", () => {
    expect(
      parseBallDontLieSeedArgs([
        "--season",
        "2026",
        "--tournament-id",
        "6,7",
        "--tournament-id",
        "12",
        "--max-pages",
        "2",
        "--per-page",
        "25",
        "--page-delay-ms",
        "1000",
        "--step-delay-ms",
        "2000",
        "--no-auto-fields",
        "--skip-core",
        "--skip-futures",
        "--skip-tee-times",
        "--sample",
      ]),
    ).toMatchObject({
      autoFields: false,
      maxPages: 2,
      pageDelayMs: 1000,
      perPage: 25,
      sample: true,
      season: 2026,
      skipCore: true,
      skipFutures: true,
      skipTeeTimes: true,
      stepDelayMs: 2000,
      tournamentIds: [6, 7, 12],
    });
  });

  it("fails fast on unknown args", () => {
    expect(() => parseBallDontLieSeedArgs(["--bogus"])).toThrow("requires a value");
  });

  it("uses a higher full-sync page cap than the provider fallback", () => {
    expect(pageOptionsFromArgs(parseBallDontLieSeedArgs(["--season", "2026"]))).toMatchObject({
      maxPages: 100,
    });
  });

  it("summarizes sync run counts and marks skipped records as partial", () => {
    const steps: BallDontLieSeedSummary["steps"] = [
      {
        elapsedMs: 50,
        result: {
          booksUpserted: 0,
          courseHolesUpserted: 0,
          coursesUpserted: 1,
          fieldEntriesUpserted: 0,
          marketsUpserted: 0,
          oddsSnapshotsInserted: 0,
          pagesFetched: 1,
          playerRoundResultsUpserted: 0,
          playerRoundStatsUpserted: 0,
          playerScorecardsUpserted: 0,
          playerSeasonStatsUpserted: 0,
          playersUpserted: 0,
          providerStatDefinitionsUpserted: 0,
          rawSnapshots: ["balldontlie/2026-05-25/courses/courses-a.json"],
          skipped: [],
          teeTimesUpserted: 0,
          tournamentCourseHoleStatsUpserted: 0,
          tournamentCoursesUpserted: 0,
          tournamentResultsUpserted: 0,
          tournamentsUpserted: 0,
        },
        step: "courses",
      },
      {
        elapsedMs: 75,
        result: {
          booksUpserted: 0,
          courseHolesUpserted: 0,
          coursesUpserted: 0,
          fieldEntriesUpserted: 0,
          marketsUpserted: 0,
          oddsSnapshotsInserted: 0,
          pagesFetched: 1,
          playerRoundResultsUpserted: 0,
          playerRoundStatsUpserted: 0,
          playerScorecardsUpserted: 0,
          playerSeasonStatsUpserted: 0,
          playersUpserted: 0,
          providerStatDefinitionsUpserted: 0,
          rawSnapshots: ["balldontlie/2026-05-25/tournaments/tournaments-b.json"],
          skipped: ["tournament:6:unmapped-course:11"],
          teeTimesUpserted: 0,
          tournamentCourseHoleStatsUpserted: 0,
          tournamentCoursesUpserted: 0,
          tournamentResultsUpserted: 0,
          tournamentsUpserted: 0,
        },
        step: "tournaments",
      },
    ];

    expect(rawSnapshotKeysForSeedSteps(steps)).toHaveLength(2);
    expect(skippedRecordsForSeedSteps(steps)).toEqual([
      "tournaments:tournament:6:unmapped-course:11",
    ]);
    expect(syncRunStatusForSeedSteps(steps)).toBe("partial");
    expect(countsForSeedSteps(steps).totals).toMatchObject({
      coursesUpserted: 1,
      pagesFetched: 2,
      rawSnapshots: 2,
      skipped: 1,
      teeTimesUpserted: 0,
    });
  });
});
