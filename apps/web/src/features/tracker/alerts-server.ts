import "server-only";

import { alerts } from "@pgatour-ai/db";
import {
  acknowledgeTrackerAlertsInputSchema,
  generateModelEdgeAlertsInputSchema,
  type TrackerAlertsQuery,
  trackerAlertsQuerySchema,
} from "@pgatour-ai/domain";
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDatabase } from "@/lib/database";
import { alertSelect, toTrackerAlert } from "./alert-serialization";
import { buildModelEdgeAlertCandidates } from "./model-alerts";
import { resolveTournamentModelSignals } from "./model-signals-server";
import type {
  AcknowledgeTrackerAlertsResult,
  GeneratedModelEdgeAlerts,
  TrackerAlertsSnapshot,
} from "./types";

function alertStatusPredicate(status: TrackerAlertsQuery["status"]) {
  if (status === "acknowledged") {
    return isNotNull(alerts.acknowledgedAt);
  }

  if (status === "unacknowledged") {
    return isNull(alerts.acknowledgedAt);
  }

  return undefined;
}

export async function getUserAlerts(options: {
  query?: unknown;
  userId: string;
}): Promise<TrackerAlertsSnapshot> {
  const query = trackerAlertsQuerySchema.parse(options.query ?? {});
  const db = getDatabase();
  const statusPredicate = alertStatusPredicate(query.status);
  const whereConditions = [eq(alerts.userId, options.userId), statusPredicate].filter(
    (condition) => condition !== undefined,
  );
  const [rows, unacknowledgedCountRow, acknowledgedCountRow] = await Promise.all([
    db
      .select(alertSelect)
      .from(alerts)
      .where(and(...whereConditions))
      .orderBy(desc(alerts.createdAt))
      .limit(query.limit),
    db
      .select({ value: count() })
      .from(alerts)
      .where(and(eq(alerts.userId, options.userId), isNull(alerts.acknowledgedAt))),
    db
      .select({ value: count() })
      .from(alerts)
      .where(and(eq(alerts.userId, options.userId), isNotNull(alerts.acknowledgedAt))),
  ]);
  const serializedAlerts = rows.map(toTrackerAlert);

  return {
    alerts: serializedAlerts,
    generatedAt: new Date().toISOString(),
    summary: {
      acknowledgedCount: acknowledgedCountRow[0]?.value ?? 0,
      returnedCount: serializedAlerts.length,
      unacknowledgedCount: unacknowledgedCountRow[0]?.value ?? 0,
    },
  };
}

export async function acknowledgeUserAlerts(options: {
  input: unknown;
  userId: string;
}): Promise<AcknowledgeTrackerAlertsResult> {
  const input = acknowledgeTrackerAlertsInputSchema.parse(options.input);
  const db = getDatabase();
  const acknowledgedAt = new Date();
  const updatedRows = await db
    .update(alerts)
    .set({ acknowledgedAt })
    .where(
      and(
        eq(alerts.userId, options.userId),
        inArray(alerts.id, input.alertIds),
        isNull(alerts.acknowledgedAt),
      ),
    )
    .returning({ id: alerts.id });
  const rows = await db
    .select(alertSelect)
    .from(alerts)
    .where(and(eq(alerts.userId, options.userId), inArray(alerts.id, input.alertIds)))
    .orderBy(desc(alerts.createdAt));

  return {
    acknowledgedAt: acknowledgedAt.toISOString(),
    acknowledgedCount: updatedRows.length,
    alerts: rows.map(toTrackerAlert),
  };
}

export async function generateModelEdgeAlerts(options: {
  input: unknown;
  userId: string;
}): Promise<GeneratedModelEdgeAlerts> {
  const input = generateModelEdgeAlertsInputSchema.parse(options.input);
  const db = getDatabase();
  const resolved = await resolveTournamentModelSignals(db, input.tournamentId);
  const candidates = buildModelEdgeAlertCandidates({
    limit: input.limit,
    marketTypes: input.marketTypes,
    minEdgePercent: input.minEdgePercent,
    signals: resolved.signals,
  });
  const generatedAt = new Date().toISOString();

  if (candidates.length === 0) {
    return {
      alerts: [],
      createdCount: 0,
      generatedAt,
      modelQuality: resolved.modelQuality,
      modelRunId: resolved.modelRunId,
      modelVersion: resolved.modelVersion,
      signals: [],
      tournamentId: resolved.tournamentId,
    };
  }

  const createdRows = await db
    .insert(alerts)
    .values(
      candidates.map((candidate) => ({
        alertType: candidate.alertType,
        dedupeKey: candidate.dedupeKey,
        reason: candidate.reason,
        source: candidate.source,
        title: candidate.title,
        userId: options.userId,
      })),
    )
    .onConflictDoNothing({
      target: [alerts.userId, alerts.dedupeKey],
    })
    .returning({ id: alerts.id });
  const dedupeKeys = candidates.map((candidate) => candidate.dedupeKey);
  const rows = await db
    .select({
      acknowledgedAt: alerts.acknowledgedAt,
      alertType: alerts.alertType,
      createdAt: alerts.createdAt,
      dedupeKey: alerts.dedupeKey,
      deliveredAt: alerts.deliveredAt,
      id: alerts.id,
      reason: alerts.reason,
      source: alerts.source,
      title: alerts.title,
    })
    .from(alerts)
    .where(and(eq(alerts.userId, options.userId), inArray(alerts.dedupeKey, dedupeKeys)));
  const alertsByDedupeKey = new Map(rows.map((row) => [row.dedupeKey, toTrackerAlert(row)]));

  return {
    alerts: candidates.flatMap((candidate) => {
      const alert = alertsByDedupeKey.get(candidate.dedupeKey);
      return alert ? [alert] : [];
    }),
    createdCount: createdRows.length,
    generatedAt,
    modelQuality: resolved.modelQuality,
    modelRunId: resolved.modelRunId,
    modelVersion: resolved.modelVersion,
    signals: candidates.map((candidate) => candidate.signal),
    tournamentId: resolved.tournamentId,
  };
}
