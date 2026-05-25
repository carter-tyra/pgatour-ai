import { describe, expect, it } from "vitest";
import { parseBallDontLieSeedArgs } from "./ball-dont-lie-seed";

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
        "--sample",
      ]),
    ).toMatchObject({
      maxPages: 2,
      pageDelayMs: 1000,
      perPage: 25,
      sample: true,
      season: 2026,
      stepDelayMs: 2000,
      tournamentIds: [6, 7, 12],
    });
  });

  it("fails fast on unknown args", () => {
    expect(() => parseBallDontLieSeedArgs(["--bogus"])).toThrow("requires a value");
  });
});
