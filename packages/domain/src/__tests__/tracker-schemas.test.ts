import { describe, expect, it } from "vitest";
import {
  acknowledgeTrackerAlertsInputSchema,
  claimAlertDeliveriesInputSchema,
  createModelBackedUserBetInputSchema,
  createUserBetInputSchema,
  createUserWatchlistInputSchema,
  generateModelEdgeAlertsInputSchema,
  trackerAlertsQuerySchema,
  updateTrackerAlertPreferencesInputSchema,
  updateUserBetInputSchema,
  upsertModelBackedWatchlistInputSchema,
} from "../schemas";

const tournamentId = "11111111-1111-4111-8111-111111111111";
const playerId = "22222222-2222-4222-8222-222222222222";
const alertId = "33333333-3333-4333-8333-333333333333";

describe("tracker schemas", () => {
  it("normalizes bet tracker input", () => {
    const input = createUserBetInputSchema.parse({
      americanOdds: "-125",
      book: " DraftKings ",
      marketType: "top_20",
      playerId,
      stake: "25.50",
      thesis: " Ball striking ",
      tournamentId,
    });

    expect(input).toEqual({
      americanOdds: -125,
      book: "DraftKings",
      marketType: "top_20",
      playerId,
      stake: 25.5,
      thesis: "Ball striking",
      tournamentId,
    });
  });

  it("rejects invalid American odds", () => {
    const result = createUserBetInputSchema.safeParse({
      americanOdds: 0,
      book: "DraftKings",
      marketType: "top_20",
      playerId,
      stake: 25,
      tournamentId,
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one bet update field", () => {
    expect(updateUserBetInputSchema.safeParse({}).success).toBe(false);
    expect(updateUserBetInputSchema.safeParse({ status: "won" }).success).toBe(true);
  });

  it("deduplicates watchlist player ids", () => {
    const input = createUserWatchlistInputSchema.parse({
      name: "Sunday",
      playerIds: [playerId, playerId],
      tournamentId,
    });

    expect(input.playerIds).toEqual([playerId]);
  });

  it("normalizes model-backed bet tracker input without accepting client odds", () => {
    const input = createModelBackedUserBetInputSchema.parse({
      marketType: "top_5",
      playerId,
      stake: "50",
      thesis: " Model edge ",
      tournamentId,
    });

    expect(input).toEqual({
      marketType: "top_5",
      playerId,
      stake: 50,
      thesis: "Model edge",
      tournamentId,
    });
  });

  it("defaults model-backed watchlists to the model edge list", () => {
    const input = upsertModelBackedWatchlistInputSchema.parse({
      marketType: "top_10",
      playerId,
      tournamentId,
    });

    expect(input).toEqual({
      marketType: "top_10",
      name: "Model edges",
      playerId,
      tournamentId,
    });
  });

  it("normalizes model edge alert generation input", () => {
    const input = generateModelEdgeAlertsInputSchema.parse({
      limit: "10",
      marketTypes: ["top_20", "top_20", "top_5"],
      minEdgePercent: "7.5",
      tournamentId,
    });

    expect(input).toEqual({
      limit: 10,
      marketTypes: ["top_20", "top_5"],
      minEdgePercent: 7.5,
      tournamentId,
    });
  });

  it("defaults model edge alert generation thresholds", () => {
    const input = generateModelEdgeAlertsInputSchema.parse({
      tournamentId,
    });

    expect(input).toEqual({
      limit: 25,
      minEdgePercent: 5,
      tournamentId,
    });
  });

  it("normalizes tracker alert list query params", () => {
    expect(
      trackerAlertsQuerySchema.parse({
        limit: "20",
        status: "unacknowledged",
      }),
    ).toEqual({
      limit: 20,
      status: "unacknowledged",
    });

    expect(trackerAlertsQuerySchema.parse({})).toEqual({
      limit: 50,
      status: "all",
    });
  });

  it("deduplicates tracker alert acknowledgement ids", () => {
    expect(
      acknowledgeTrackerAlertsInputSchema.parse({
        alertIds: [alertId, alertId],
      }),
    ).toEqual({
      alertIds: [alertId],
    });
  });

  it("validates complete alert preference updates", () => {
    expect(
      updateTrackerAlertPreferencesInputSchema.parse({
        preferences: [
          {
            alertType: "new_edge",
            emailEnabled: true,
            inAppEnabled: false,
            mutedUntil: "2026-06-09T12:00:00.000Z",
          },
        ],
      }),
    ).toEqual({
      preferences: [
        {
          alertType: "new_edge",
          emailEnabled: true,
          inAppEnabled: false,
          mutedUntil: "2026-06-09T12:00:00.000Z",
        },
      ],
    });
  });

  it("rejects duplicate alert preference updates", () => {
    const result = updateTrackerAlertPreferencesInputSchema.safeParse({
      preferences: [
        {
          alertType: "new_edge",
          emailEnabled: false,
          inAppEnabled: true,
        },
        {
          alertType: "new_edge",
          emailEnabled: true,
          inAppEnabled: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("normalizes alert delivery claim input", () => {
    expect(
      claimAlertDeliveriesInputSchema.parse({
        limit: "25",
        now: "2026-06-09T12:00:00.000Z",
      }),
    ).toEqual({
      limit: 25,
      now: "2026-06-09T12:00:00.000Z",
    });

    expect(claimAlertDeliveriesInputSchema.parse({})).toEqual({
      limit: 100,
    });
  });
});
