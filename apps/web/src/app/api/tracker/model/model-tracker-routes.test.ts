import {
  alertDeliveries,
  alertPreferences,
  alerts,
  authUsers,
  books,
  courses,
  fieldEntries,
  markets,
  modelBacktests,
  modelEvaluations,
  modelFeatureSets,
  modelRuns,
  oddsSnapshots,
  players,
  predictions,
  tournaments,
  userBets,
  userWatchlistPlayers,
  userWatchlists,
} from "@pgatour-ai/db";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireApiSession } from "@/lib/api-auth";
import { getDatabase, getDatabaseClient } from "@/lib/database";
import { GET as deliverEligibleAlertDeliveries } from "../../cron/alerts/deliveries/route";
import {
  GET as getAlertPreferences,
  PATCH as updateAlertPreferences,
} from "../alert-preferences/route";
import { PATCH as acknowledgeTrackerAlerts, GET as getTrackerAlerts } from "../alerts/route";
import { POST as generateModelEdgeAlerts } from "./alerts/route";
import { POST as createModelBackedBet } from "./bets/route";
import { POST as upsertModelBackedWatchlist } from "./watchlists/route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api-auth", () => ({
  requireApiSession: vi.fn(),
}));

const TEST_USER_ID = "model-tracker-route-user";
const TEST_COURSE_ID = "10000000-0000-4000-8000-000000000001";
const TEST_TOURNAMENT_ID = "10000000-0000-4000-8000-000000000002";
const TEST_PRICED_PLAYER_ID = "10000000-0000-4000-8000-000000000003";
const TEST_UNPRICED_PLAYER_ID = "10000000-0000-4000-8000-000000000004";
const TEST_BOOK_ID = "10000000-0000-4000-8000-000000000005";
const TEST_MARKET_ID = "10000000-0000-4000-8000-000000000006";
const TEST_FEATURE_SET_ID = "10000000-0000-4000-8000-000000000007";
const TEST_MODEL_RUN_ID = "10000000-0000-4000-8000-000000000008";
const TEST_MODEL_BACKTEST_ID = "10000000-0000-4000-8000-000000000009";
const TEST_CRON_SECRET = "model-tracker-route-cron-secret";
const TEST_MODEL_NAME = "model-tracker-route-v0";
const TEST_MODEL_VERSION = "0.1.0";

const TEST_PLAYER_IDS = [TEST_PRICED_PLAYER_ID, TEST_UNPRICED_PLAYER_ID];
const TEST_DATE = new Date("2026-06-08T12:00:00.000Z");

const db = getDatabase();
const mockedRequireApiSession = vi.mocked(requireApiSession);
let originalCronSecret: string | undefined;

function jsonPost(body: Record<string, unknown>) {
  return new Request("http://localhost/api/tracker/model", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function jsonPatch(body: Record<string, unknown>, url = "http://localhost/api/tracker/alerts") {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

function cronGet(queryString = "") {
  return new Request(`http://localhost/api/cron/alerts/deliveries${queryString}`, {
    headers: {
      Authorization: `Bearer ${TEST_CRON_SECRET}`,
    },
  });
}

async function cleanupModelTrackerRouteFixtures() {
  await db.delete(alertDeliveries).where(eq(alertDeliveries.userId, TEST_USER_ID));
  await db.delete(alertPreferences).where(eq(alertPreferences.userId, TEST_USER_ID));
  await db.delete(alerts).where(eq(alerts.userId, TEST_USER_ID));
  await db
    .delete(userWatchlistPlayers)
    .where(inArray(userWatchlistPlayers.playerId, TEST_PLAYER_IDS));
  await db.delete(userWatchlists).where(eq(userWatchlists.userId, TEST_USER_ID));
  await db.delete(userBets).where(eq(userBets.userId, TEST_USER_ID));
  await db
    .delete(modelEvaluations)
    .where(eq(modelEvaluations.modelBacktestId, TEST_MODEL_BACKTEST_ID));
  await db.delete(modelBacktests).where(eq(modelBacktests.id, TEST_MODEL_BACKTEST_ID));
  await db.delete(predictions).where(eq(predictions.modelRunId, TEST_MODEL_RUN_ID));
  await db.delete(modelRuns).where(eq(modelRuns.id, TEST_MODEL_RUN_ID));
  await db.delete(modelFeatureSets).where(eq(modelFeatureSets.id, TEST_FEATURE_SET_ID));
  await db.delete(oddsSnapshots).where(eq(oddsSnapshots.marketId, TEST_MARKET_ID));
  await db.delete(markets).where(eq(markets.id, TEST_MARKET_ID));
  await db.delete(fieldEntries).where(eq(fieldEntries.tournamentId, TEST_TOURNAMENT_ID));
  await db.delete(tournaments).where(eq(tournaments.id, TEST_TOURNAMENT_ID));
  await db.delete(players).where(inArray(players.id, TEST_PLAYER_IDS));
  await db.delete(courses).where(eq(courses.id, TEST_COURSE_ID));
  await db.delete(books).where(eq(books.id, TEST_BOOK_ID));
  await db.delete(authUsers).where(eq(authUsers.id, TEST_USER_ID));
}

async function seedPricedModelSignalFixture() {
  await db.insert(authUsers).values({
    email: "model-tracker-route-user@example.com",
    emailVerified: true,
    id: TEST_USER_ID,
    name: "Model Tracker Route User",
  });

  await db.insert(courses).values({
    city: "Test City",
    country: "USA",
    id: TEST_COURSE_ID,
    name: "Model Route Test Club",
    par: 72,
    yardage: 7200,
  });

  await db.insert(tournaments).values({
    courseId: TEST_COURSE_ID,
    endsOn: "2026-06-14",
    id: TEST_TOURNAMENT_ID,
    name: "Model Tracker Route Invitational",
    season: 2026,
    startsOn: "2026-06-11",
    status: "scheduled",
  });

  await db.insert(players).values([
    {
      country: "USA",
      firstName: "Priced",
      id: TEST_PRICED_PLAYER_ID,
      lastName: "Player",
    },
    {
      country: "USA",
      firstName: "Unpriced",
      id: TEST_UNPRICED_PLAYER_ID,
      lastName: "Player",
    },
  ]);

  await db.insert(fieldEntries).values(
    TEST_PLAYER_IDS.map((playerId, seed) => ({
      playerId,
      seed: seed + 1,
      status: "entered" as const,
      teeWave: "AM",
      tournamentId: TEST_TOURNAMENT_ID,
    })),
  );

  await db.insert(books).values({
    id: TEST_BOOK_ID,
    isActive: true,
    name: "DraftKings",
    region: "US",
  });

  await db.insert(markets).values({
    bookId: TEST_BOOK_ID,
    externalMarketId: "model-tracker-route-top-5",
    id: TEST_MARKET_ID,
    marketType: "top_5",
    playerId: TEST_PRICED_PLAYER_ID,
    source: "manual",
    tournamentId: TEST_TOURNAMENT_ID,
  });

  await db.insert(oddsSnapshots).values({
    americanOdds: 500,
    capturedAt: TEST_DATE,
    decimalOdds: "6.0000",
    impliedProbability: "0.166667",
    marketId: TEST_MARKET_ID,
    rawSnapshotKey: "model-tracker-route-top-5-odds",
  });

  await db.insert(modelFeatureSets).values({
    codeVersion: "test",
    featureSetName: "model-tracker-route",
    featureSetVersion: "0.1.0",
    generatedAt: TEST_DATE,
    id: TEST_FEATURE_SET_ID,
    inputHash: "model-tracker-route-feature-input",
    rowCount: 2,
  });

  await db.insert(modelRuns).values({
    asOf: TEST_DATE,
    codeVersion: "test",
    completedAt: new Date("2026-06-08T12:10:00.000Z"),
    config: { iterations: 20_000 },
    featureSetId: TEST_FEATURE_SET_ID,
    id: TEST_MODEL_RUN_ID,
    inputHash: "model-tracker-route-run-input",
    marketTypes: ["top_5", "top_20"],
    metrics: {},
    modelName: TEST_MODEL_NAME,
    modelVersion: TEST_MODEL_VERSION,
    outputSchemaVersion: "1.0.0",
    runType: "inference",
    seed: 17,
    startedAt: TEST_DATE,
    status: "complete",
    tournamentId: TEST_TOURNAMENT_ID,
  });

  await db.insert(modelBacktests).values({
    calibration: {},
    createdAt: TEST_DATE,
    featureSetId: TEST_FEATURE_SET_ID,
    featureSetVersion: "0.1.0",
    id: TEST_MODEL_BACKTEST_ID,
    marketTypes: ["top_5", "top_20"],
    metrics: {
      inputHash: "model-tracker-route-backtest-input",
      rowCounts: {
        knownOutcomePredictions: 750,
        predictions: 900,
        pricedClosingPredictions: 200,
      },
      summary: {
        averageClosingLineValue: 0.02,
        brierScore: 0.16,
        calibrationError: 0.06,
        coverage: 0.83,
        logLoss: 0.92,
      },
    },
    modelName: TEST_MODEL_NAME,
    modelVersion: TEST_MODEL_VERSION,
    status: "complete",
    testWindowEnd: new Date("2026-06-08T00:00:00.000Z"),
    testWindowStart: new Date("2026-06-01T00:00:00.000Z"),
    trainingWindowEnd: new Date("2026-05-31T00:00:00.000Z"),
    trainingWindowStart: new Date("2026-01-01T00:00:00.000Z"),
  });

  await db.insert(modelEvaluations).values({
    averageClosingLineValue: "0.020000",
    brierScore: "0.160000",
    calibrationError: "0.060000",
    coverage: "0.830000",
    logLoss: "0.920000",
    metrics: {
      knownOutcomeCount: 750,
      outcomeRate: 0.18,
      predictionCount: 900,
      probabilityDrift: 0.01,
    },
    modelBacktestId: TEST_MODEL_BACKTEST_ID,
    scope: "overall",
  });

  await db.insert(predictions).values([
    {
      baselineProbability: "0.200000",
      confidence: "high",
      drivers: ["Approach form"],
      fairAmericanOdds: 300,
      marketId: TEST_MARKET_ID,
      marketImpliedProbability: "0.130000",
      marketType: "top_5",
      modelEdge: "0.120000",
      modelRunId: TEST_MODEL_RUN_ID,
      playerId: TEST_PRICED_PLAYER_ID,
      probability: "0.250000",
      rank: 1,
      risks: ["Short price window"],
      simulationSummary: { sourceFeatures: { recentSgTotal: 1.2 } },
      tournamentId: TEST_TOURNAMENT_ID,
      uncertainty: "0.080000",
    },
    {
      baselineProbability: "0.350000",
      confidence: "medium",
      drivers: ["Baseline top 20 profile"],
      fairAmericanOdds: 150,
      marketId: null,
      marketImpliedProbability: null,
      marketType: "top_20",
      modelEdge: null,
      modelRunId: TEST_MODEL_RUN_ID,
      playerId: TEST_UNPRICED_PLAYER_ID,
      probability: "0.400000",
      rank: 2,
      risks: [],
      simulationSummary: {},
      tournamentId: TEST_TOURNAMENT_ID,
      uncertainty: "0.120000",
    },
  ]);
}

beforeEach(async () => {
  originalCronSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = TEST_CRON_SECRET;

  mockedRequireApiSession.mockResolvedValue({
    user: {
      id: TEST_USER_ID,
    },
  } as Awaited<ReturnType<typeof requireApiSession>>);

  await cleanupModelTrackerRouteFixtures();
  await seedPricedModelSignalFixture();
});

afterEach(async () => {
  vi.clearAllMocks();
  await cleanupModelTrackerRouteFixtures();

  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

afterAll(async () => {
  await getDatabaseClient().close();
});

describe("model tracker API routes", () => {
  it("creates a bet from server-resolved model and market data", async () => {
    const response = await createModelBackedBet(
      jsonPost({
        marketType: "top_5",
        playerId: TEST_PRICED_PLAYER_ID,
        stake: 25,
        tournamentId: TEST_TOURNAMENT_ID,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.bet).toMatchObject({
      americanOdds: 500,
      book: "DraftKings",
      marketType: "top_5",
      playerId: TEST_PRICED_PLAYER_ID,
      playerName: "Priced Player",
      stake: 25,
      status: "open",
      tournamentId: TEST_TOURNAMENT_ID,
    });
    expect(body.bet.thesis).toContain("market +500 at DraftKings");
    expect(body.modelQuality).toMatchObject({
      canAutomate: true,
      label: "Model validated",
      status: "validated",
    });
    expect(body.modelSignal).toMatchObject({
      currentMarketBook: "DraftKings",
      currentMarketOdds: 500,
      marketType: "top_5",
      modelRunId: TEST_MODEL_RUN_ID,
      playerId: TEST_PRICED_PLAYER_ID,
      tournamentId: TEST_TOURNAMENT_ID,
    });

    const persistedBets = await db
      .select({
        americanOdds: userBets.americanOdds,
        book: userBets.book,
        playerId: userBets.playerId,
      })
      .from(userBets)
      .where(eq(userBets.userId, TEST_USER_ID));

    expect(persistedBets).toEqual([
      {
        americanOdds: 500,
        book: "DraftKings",
        playerId: TEST_PRICED_PLAYER_ID,
      },
    ]);
  });

  it("upserts a model-backed watchlist idempotently", async () => {
    const input = {
      marketType: "top_5",
      playerId: TEST_PRICED_PLAYER_ID,
      tournamentId: TEST_TOURNAMENT_ID,
    };

    const firstResponse = await upsertModelBackedWatchlist(jsonPost(input));
    const secondResponse = await upsertModelBackedWatchlist(jsonPost(input));
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstBody.watchlist).toMatchObject({
      name: "Model edges",
      tournamentId: TEST_TOURNAMENT_ID,
    });
    expect(secondBody.watchlist.players).toHaveLength(1);
    expect(secondBody.watchlist.players[0]).toMatchObject({
      id: TEST_PRICED_PLAYER_ID,
      name: "Priced Player",
      position: 0,
    });
    expect(secondBody.modelSignal).toMatchObject({
      marketType: "top_5",
      modelRunId: TEST_MODEL_RUN_ID,
      playerId: TEST_PRICED_PLAYER_ID,
    });
    expect(secondBody.modelQuality).toMatchObject({
      canAutomate: true,
      status: "validated",
    });

    const watchlists = await db
      .select({ id: userWatchlists.id })
      .from(userWatchlists)
      .where(
        and(
          eq(userWatchlists.userId, TEST_USER_ID),
          eq(userWatchlists.tournamentId, TEST_TOURNAMENT_ID),
        ),
      );

    expect(watchlists).toHaveLength(1);

    const watchlistPlayers = await db
      .select({ playerId: userWatchlistPlayers.playerId })
      .from(userWatchlistPlayers)
      .where(eq(userWatchlistPlayers.watchlistId, watchlists[0]?.id ?? ""));

    expect(watchlistPlayers).toEqual([{ playerId: TEST_PRICED_PLAYER_ID }]);
  });

  it("generates model edge alerts idempotently from priced model signals", async () => {
    const input = {
      marketTypes: ["top_5", "top_20"],
      minEdgePercent: 5,
      tournamentId: TEST_TOURNAMENT_ID,
    };
    const firstResponse = await generateModelEdgeAlerts(jsonPost(input));
    const secondResponse = await generateModelEdgeAlerts(jsonPost(input));
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstBody).toMatchObject({
      createdCount: 1,
      modelQuality: {
        canAutomate: true,
        status: "validated",
      },
      modelRunId: TEST_MODEL_RUN_ID,
      modelVersion: `${TEST_MODEL_NAME} ${TEST_MODEL_VERSION}`,
      tournamentId: TEST_TOURNAMENT_ID,
    });
    expect(firstBody.alerts).toHaveLength(1);
    expect(firstBody.alerts[0]).toMatchObject({
      alertType: "new_edge",
      dedupeKey: `model-edge:${TEST_MODEL_RUN_ID}:${TEST_TOURNAMENT_ID}:${TEST_PRICED_PLAYER_ID}:top_5:DraftKings:500`,
      reason: `Model ${TEST_MODEL_NAME} ${TEST_MODEL_VERSION} has 25.0% for top 5; fair +300; market +500 at DraftKings; +50.0% EV`,
      source: "model",
      title: "Priced Player top 5 edge",
    });
    expect(firstBody.signals).toHaveLength(1);
    expect(firstBody.signals[0]).toMatchObject({
      currentMarketBook: "DraftKings",
      currentMarketOdds: 500,
      marketType: "top_5",
      playerId: TEST_PRICED_PLAYER_ID,
    });
    expect(secondBody.createdCount).toBe(0);
    expect(secondBody.alerts).toHaveLength(1);

    const persistedAlerts = await db
      .select({
        alertType: alerts.alertType,
        dedupeKey: alerts.dedupeKey,
        userId: alerts.userId,
      })
      .from(alerts)
      .where(eq(alerts.userId, TEST_USER_ID));

    expect(persistedAlerts).toEqual([
      {
        alertType: "new_edge",
        dedupeKey: `model-edge:${TEST_MODEL_RUN_ID}:${TEST_TOURNAMENT_ID}:${TEST_PRICED_PLAYER_ID}:top_5:DraftKings:500`,
        userId: TEST_USER_ID,
      },
    ]);
  });

  it("lists and acknowledges tracker alerts for the authenticated user", async () => {
    await generateModelEdgeAlerts(
      jsonPost({
        marketTypes: ["top_5"],
        minEdgePercent: 5,
        tournamentId: TEST_TOURNAMENT_ID,
      }),
    );

    const unacknowledgedResponse = await getTrackerAlerts(
      new Request("http://localhost/api/tracker/alerts?status=unacknowledged&limit=10"),
    );
    const unacknowledgedBody = await unacknowledgedResponse.json();

    expect(unacknowledgedResponse.status).toBe(200);
    expect(unacknowledgedBody.summary).toMatchObject({
      acknowledgedCount: 0,
      returnedCount: 1,
      unacknowledgedCount: 1,
    });
    expect(unacknowledgedBody.alerts[0]).toMatchObject({
      acknowledgedAt: null,
      alertType: "new_edge",
      title: "Priced Player top 5 edge",
    });

    const alertId = unacknowledgedBody.alerts[0].id;
    const firstAckResponse = await acknowledgeTrackerAlerts(jsonPatch({ alertIds: [alertId] }));
    const secondAckResponse = await acknowledgeTrackerAlerts(jsonPatch({ alertIds: [alertId] }));
    const firstAckBody = await firstAckResponse.json();
    const secondAckBody = await secondAckResponse.json();

    expect(firstAckResponse.status).toBe(200);
    expect(firstAckBody.acknowledgedCount).toBe(1);
    expect(firstAckBody.alerts[0].acknowledgedAt).toEqual(expect.any(String));
    expect(secondAckResponse.status).toBe(200);
    expect(secondAckBody.acknowledgedCount).toBe(0);

    const acknowledgedResponse = await getTrackerAlerts(
      new Request("http://localhost/api/tracker/alerts?status=acknowledged&limit=10"),
    );
    const acknowledgedBody = await acknowledgedResponse.json();

    expect(acknowledgedBody.summary).toMatchObject({
      acknowledgedCount: 1,
      returnedCount: 1,
      unacknowledgedCount: 0,
    });
    expect(acknowledgedBody.alerts[0]).toMatchObject({
      id: alertId,
      title: "Priced Player top 5 edge",
    });
  });

  it("updates alert preferences and delivers eligible in-app alerts idempotently", async () => {
    const defaultPreferencesResponse = await getAlertPreferences(
      new Request("http://localhost/api/tracker/alert-preferences"),
    );
    const defaultPreferencesBody = await defaultPreferencesResponse.json();

    expect(defaultPreferencesResponse.status).toBe(200);
    expect(
      defaultPreferencesBody.preferences.find(
        (preference: { alertType: string }) => preference.alertType === "new_edge",
      ),
    ).toMatchObject({
      alertType: "new_edge",
      emailEnabled: false,
      id: null,
      inAppEnabled: true,
      mutedUntil: null,
    });

    const disabledPreferenceResponse = await updateAlertPreferences(
      jsonPatch(
        {
          preferences: [
            {
              alertType: "new_edge",
              emailEnabled: false,
              inAppEnabled: false,
              mutedUntil: null,
            },
          ],
        },
        "http://localhost/api/tracker/alert-preferences",
      ),
    );

    expect(disabledPreferenceResponse.status).toBe(200);

    await generateModelEdgeAlerts(
      jsonPost({
        marketTypes: ["top_5"],
        minEdgePercent: 5,
        tournamentId: TEST_TOURNAMENT_ID,
      }),
    );

    const disabledDeliveryResponse = await deliverEligibleAlertDeliveries(
      cronGet("?limit=10&now=2026-06-09T12:00:00.000Z"),
    );
    const disabledDeliveryBody = await disabledDeliveryResponse.json();

    expect(disabledDeliveryResponse.status).toBe(200);
    expect(disabledDeliveryBody).toMatchObject({
      claimedCount: 0,
      completedCount: 0,
      deliveries: [],
    });

    await updateAlertPreferences(
      jsonPatch(
        {
          preferences: [
            {
              alertType: "new_edge",
              emailEnabled: false,
              inAppEnabled: true,
              mutedUntil: "2026-06-10T12:00:00.000Z",
            },
          ],
        },
        "http://localhost/api/tracker/alert-preferences",
      ),
    );

    const mutedDeliveryResponse = await deliverEligibleAlertDeliveries(
      cronGet("?limit=10&now=2026-06-09T12:00:00.000Z"),
    );
    const mutedDeliveryBody = await mutedDeliveryResponse.json();

    expect(mutedDeliveryBody.claimedCount).toBe(0);

    await updateAlertPreferences(
      jsonPatch(
        {
          preferences: [
            {
              alertType: "new_edge",
              emailEnabled: false,
              inAppEnabled: true,
              mutedUntil: null,
            },
          ],
        },
        "http://localhost/api/tracker/alert-preferences",
      ),
    );

    const firstDeliveryResponse = await deliverEligibleAlertDeliveries(
      cronGet("?limit=10&now=2026-06-09T12:00:00.000Z"),
    );
    const secondDeliveryResponse = await deliverEligibleAlertDeliveries(
      cronGet("?limit=10&now=2026-06-09T12:00:00.000Z"),
    );
    const firstDeliveryBody = await firstDeliveryResponse.json();
    const secondDeliveryBody = await secondDeliveryResponse.json();

    expect(firstDeliveryResponse.status).toBe(200);
    expect(firstDeliveryBody).toMatchObject({
      claimedCount: 1,
      completedCount: 1,
      deliveredAt: "2026-06-09T12:00:00.000Z",
    });
    expect(firstDeliveryBody.deliveries[0]).toMatchObject({
      attemptCount: 1,
      channel: "in_app",
      status: "delivered",
    });
    expect(firstDeliveryBody.deliveries[0].alert).toMatchObject({
      deliveredAt: "2026-06-09T12:00:00.000Z",
      title: "Priced Player top 5 edge",
    });
    expect(secondDeliveryBody).toMatchObject({
      claimedCount: 0,
      completedCount: 0,
      deliveries: [],
    });

    const persistedDeliveries = await db
      .select({
        channel: alertDeliveries.channel,
        status: alertDeliveries.status,
        userId: alertDeliveries.userId,
      })
      .from(alertDeliveries)
      .where(eq(alertDeliveries.userId, TEST_USER_ID));

    expect(persistedDeliveries).toEqual([
      {
        channel: "in_app",
        status: "delivered",
        userId: TEST_USER_ID,
      },
    ]);
  });

  it("rejects alert delivery cron requests without the cron secret", async () => {
    const response = await deliverEligibleAlertDeliveries(
      new Request("http://localhost/api/cron/alerts/deliveries", {
        headers: {
          Authorization: "Bearer wrong-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "unauthorized",
        message: "Cron authentication is required.",
      },
    });
  });

  it("rejects model-backed bets when the current market price is missing", async () => {
    const response = await createModelBackedBet(
      jsonPost({
        marketType: "top_20",
        playerId: TEST_UNPRICED_PLAYER_ID,
        stake: 25,
        tournamentId: TEST_TOURNAMENT_ID,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "model_signal_unpriced",
        message: "That model signal does not have a current market price.",
      },
    });

    const unpricedBets = await db
      .select({ id: userBets.id })
      .from(userBets)
      .where(
        and(eq(userBets.userId, TEST_USER_ID), eq(userBets.playerId, TEST_UNPRICED_PLAYER_ID)),
      );

    expect(unpricedBets).toHaveLength(0);
  });

  it("rejects model-backed automation when validation gates do not pass", async () => {
    await db
      .update(modelBacktests)
      .set({
        metrics: {
          inputHash: "model-tracker-route-backtest-input",
          rowCounts: {
            knownOutcomePredictions: 284,
            predictions: 360,
            pricedClosingPredictions: 0,
          },
          summary: {
            averageClosingLineValue: null,
            brierScore: 0.165266,
            calibrationError: 0.09831,
            coverage: 0.788889,
            logLoss: 1.015567,
          },
        },
      })
      .where(eq(modelBacktests.id, TEST_MODEL_BACKTEST_ID));

    const response = await createModelBackedBet(
      jsonPost({
        marketType: "top_5",
        playerId: TEST_PRICED_PLAYER_ID,
        stake: 25,
        tournamentId: TEST_TOURNAMENT_ID,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(412);
    expect(body).toEqual({
      error: {
        code: "model_quality_not_promotable",
        message: "Validation limited. Needs 500 known outcomes before automation.",
      },
    });

    const persistedBets = await db
      .select({ id: userBets.id })
      .from(userBets)
      .where(eq(userBets.userId, TEST_USER_ID));

    expect(persistedBets).toHaveLength(0);
  });
});
