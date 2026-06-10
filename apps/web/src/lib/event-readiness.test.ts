import { describe, expect, it } from "vitest";
import { buildEventReadiness } from "./event-readiness";
import type { CanonicalFieldPlayer } from "./intelligence-types";
import { emptyModelState } from "./model-contract";

function player(id: string, overrides: Partial<CanonicalFieldPlayer> = {}): CanonicalFieldPlayer {
  return {
    country: "USA",
    id,
    name: `Player ${id}`,
    odds: {},
    status: "entered",
    teeTimes: [],
    teeWave: null,
    ...overrides,
  };
}

describe("buildEventReadiness", () => {
  it("marks a priced and modeled event without tee times as partial", () => {
    const model = emptyModelState({
      modeledPlayerCount: 2,
      status: "ready",
    });
    const readiness = buildEventReadiness({
      canonicalStatus: "ready",
      fieldPlayers: [
        player("1", {
          odds: {
            outright: {
              americanOdds: 2500,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.038,
            },
          },
        }),
        player("2", {
          odds: {
            outright: {
              americanOdds: 3000,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.032,
            },
          },
        }),
      ],
      model,
      tournamentName: "RBC Canadian Open",
    });

    expect(readiness.status).toBe("partial");
    expect(readiness.score).toBe(80);
    expect(readiness.resources.find((item) => item.id === "tee_times")).toMatchObject({
      count: 0,
      status: "missing",
    });
  });

  it("marks future-event tee times as pending instead of missing", () => {
    const model = emptyModelState({
      modeledPlayerCount: 2,
      status: "ready",
    });
    const readiness = buildEventReadiness({
      canonicalStatus: "ready",
      fieldPlayers: [
        player("1", {
          odds: {
            outright: {
              americanOdds: 2500,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.038,
            },
          },
        }),
        player("2", {
          odds: {
            outright: {
              americanOdds: 3000,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.032,
            },
          },
        }),
      ],
      model,
      now: new Date("2026-06-09T18:00:00.000Z"),
      tournamentName: "RBC Canadian Open",
      tournamentStartsOn: "2026-06-11",
    });

    expect(readiness.status).toBe("partial");
    expect(readiness.score).toBe(80);
    expect(readiness.resources.find((item) => item.id === "tee_times")).toMatchObject({
      count: 0,
      helper: "Tee times are not posted yet.",
      status: "pending",
    });
  });

  it("marks the event ready when every required feed is available", () => {
    const model = emptyModelState({
      modeledPlayerCount: 2,
      status: "ready",
    });
    const readiness = buildEventReadiness({
      canonicalStatus: "ready",
      fieldPlayers: [
        player("1", {
          odds: {
            outright: {
              americanOdds: 2500,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.038,
            },
          },
          teeTimes: [
            {
              groupNumber: 1,
              roundNumber: 1,
              startsAt: "2026-06-11T12:00:00.000Z",
              tee: "1",
              wave: "AM",
            },
          ],
        }),
        player("2", {
          odds: {
            outright: {
              americanOdds: 3000,
              book: "DraftKings",
              capturedAt: "2026-06-08T15:31:57.656Z",
              impliedProbability: 0.032,
            },
          },
          teeTimes: [
            {
              groupNumber: 1,
              roundNumber: 1,
              startsAt: "2026-06-11T12:10:00.000Z",
              tee: "1",
              wave: "AM",
            },
          ],
        }),
      ],
      model,
      tournamentName: "RBC Canadian Open",
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.score).toBe(100);
  });
});
