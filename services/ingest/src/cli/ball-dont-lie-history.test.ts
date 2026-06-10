import { describe, expect, it } from "vitest";
import {
  expandedHistoryResources,
  historyPageOptionsFromArgs,
  parseBallDontLieHistoryArgs,
} from "./ball-dont-lie-history";

describe("BALLDONTLIE history CLI args", () => {
  it("parses season range, resources, resume, and pacing options", () => {
    expect(
      parseBallDontLieHistoryArgs([
        "--from-season",
        "2024",
        "--to-season",
        "2026",
        "--resources",
        "core,futures,scorecards",
        "--tournament-id",
        "28,29",
        "--resume",
        "--max-pages",
        "12",
        "--per-page",
        "50",
        "--page-delay-ms",
        "100",
        "--step-delay-ms",
        "200",
      ]),
    ).toMatchObject({
      fromSeason: 2024,
      maxPages: 12,
      pageDelayMs: 100,
      perPage: 50,
      resources: ["core", "futures", "scorecards"],
      resume: true,
      stepDelayMs: 200,
      toSeason: 2026,
      tournamentIds: [28, 29],
    });
  });

  it("expands core into non-scorecard historical resources", () => {
    expect(Array.from(expandedHistoryResources(["core"])).sort()).toEqual([
      "course_holes",
      "player_round_results",
      "player_round_stats",
      "player_season_stats",
      "tournament_course_stats",
      "tournament_results",
    ]);
  });

  it("keeps futures as an explicit market resource", () => {
    expect(Array.from(expandedHistoryResources(["futures"]))).toEqual(["futures"]);
  });

  it("includes futures in all resources", () => {
    expect(parseBallDontLieHistoryArgs(["--resources", "all"]).resources).toEqual([
      "core",
      "futures",
      "scorecards",
    ]);
  });

  it("keeps scorecards as a separate heavy resource", () => {
    expect(Array.from(expandedHistoryResources(["scorecards"]))).toEqual(["scorecards"]);
  });

  it("uses intentionally bounded page options for samples", () => {
    expect(historyPageOptionsFromArgs(parseBallDontLieHistoryArgs(["--sample"]))).toMatchObject({
      maxPages: 1,
      perPage: 3,
      stopAfterMaxPages: true,
    });
  });

  it("fails fast when the season range is invalid", () => {
    expect(() =>
      parseBallDontLieHistoryArgs(["--from-season", "2026", "--to-season", "2024"]),
    ).toThrow("--from-season must be less than or equal to --to-season");
  });
});
