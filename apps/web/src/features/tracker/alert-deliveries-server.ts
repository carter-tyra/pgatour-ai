import "server-only";

import { alertDeliveries, alertPreferences, alerts } from "@pgatour-ai/db";
import { type AlertDeliveryChannel, claimAlertDeliveriesInputSchema } from "@pgatour-ai/domain";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database";
import { toIsoString } from "../tournament/server";
import { alertSelect, toTrackerAlert } from "./alert-serialization";
import type { DeliverEligibleAlertsResult, TrackerAlertDelivery } from "./types";

function requiredIsoString(value: Date | string | null) {
  return toIsoString(value) ?? new Date().toISOString();
}

function preferenceEnabledPredicate(channel: AlertDeliveryChannel) {
  if (channel === "email") {
    return sql<boolean>`coalesce(${alertPreferences.emailEnabled}, false) = true`;
  }

  return sql<boolean>`coalesce(${alertPreferences.inAppEnabled}, true) = true`;
}

function notMutedPredicate(now: Date) {
  return sql<boolean>`(${alertPreferences.mutedUntil} is null or ${alertPreferences.mutedUntil} <= ${now.toISOString()}::timestamptz)`;
}

const deliverySelect = {
  alert: alertSelect,
  delivery: {
    alertId: alertDeliveries.alertId,
    attemptCount: alertDeliveries.attemptCount,
    channel: alertDeliveries.channel,
    claimedAt: alertDeliveries.claimedAt,
    createdAt: alertDeliveries.createdAt,
    deliveredAt: alertDeliveries.deliveredAt,
    failedAt: alertDeliveries.failedAt,
    failureReason: alertDeliveries.failureReason,
    id: alertDeliveries.id,
    status: alertDeliveries.status,
    updatedAt: alertDeliveries.updatedAt,
    userId: alertDeliveries.userId,
  },
};

function toTrackerAlertDelivery(row: {
  alert: Parameters<typeof toTrackerAlert>[0];
  delivery: {
    alertId: string;
    attemptCount: number;
    channel: TrackerAlertDelivery["channel"];
    claimedAt: Date | string | null;
    createdAt: Date | string | null;
    deliveredAt: Date | string | null;
    failedAt: Date | string | null;
    failureReason: string | null;
    id: string;
    status: TrackerAlertDelivery["status"];
    updatedAt: Date | string | null;
    userId: string;
  };
}): TrackerAlertDelivery {
  return {
    alert: toTrackerAlert(row.alert),
    alertId: row.delivery.alertId,
    attemptCount: row.delivery.attemptCount,
    channel: row.delivery.channel,
    claimedAt: requiredIsoString(row.delivery.claimedAt),
    createdAt: requiredIsoString(row.delivery.createdAt),
    deliveredAt: toIsoString(row.delivery.deliveredAt),
    failedAt: toIsoString(row.delivery.failedAt),
    failureReason: row.delivery.failureReason,
    id: row.delivery.id,
    status: row.delivery.status,
    updatedAt: requiredIsoString(row.delivery.updatedAt),
    userId: row.delivery.userId,
  };
}

async function getAlertDeliveriesByIds(deliveryIds: string[]) {
  if (deliveryIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  const rows = await db
    .select(deliverySelect)
    .from(alertDeliveries)
    .innerJoin(alerts, eq(alerts.id, alertDeliveries.alertId))
    .where(inArray(alertDeliveries.id, deliveryIds))
    .orderBy(asc(alertDeliveries.createdAt));

  return rows.map(toTrackerAlertDelivery);
}

export async function claimEligibleAlertDeliveries(options: {
  channel: AlertDeliveryChannel;
  limit: number;
  now: Date;
}) {
  const db = getDatabase();
  const candidates = await db
    .select({
      alertId: alerts.id,
      userId: alerts.userId,
    })
    .from(alerts)
    .leftJoin(
      alertPreferences,
      and(
        eq(alertPreferences.userId, alerts.userId),
        eq(alertPreferences.alertType, alerts.alertType),
      ),
    )
    .leftJoin(
      alertDeliveries,
      and(eq(alertDeliveries.alertId, alerts.id), eq(alertDeliveries.channel, options.channel)),
    )
    .where(
      and(
        isNull(alerts.acknowledgedAt),
        isNull(alertDeliveries.id),
        preferenceEnabledPredicate(options.channel),
        notMutedPredicate(options.now),
      ),
    )
    .orderBy(asc(alerts.createdAt))
    .limit(options.limit);

  if (candidates.length === 0) {
    return [];
  }

  const insertedRows = await db
    .insert(alertDeliveries)
    .values(
      candidates.map((candidate) => ({
        alertId: candidate.alertId,
        attemptCount: 1,
        channel: options.channel,
        claimedAt: options.now,
        status: "pending" as const,
        updatedAt: options.now,
        userId: candidate.userId,
      })),
    )
    .onConflictDoNothing({
      target: [alertDeliveries.alertId, alertDeliveries.channel],
    })
    .returning({ id: alertDeliveries.id });

  return getAlertDeliveriesByIds(insertedRows.map((row) => row.id));
}

export async function completeAlertDeliveries(options: {
  deliveredAt: Date;
  deliveryIds: string[];
}) {
  if (options.deliveryIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  const updatedRows = await db
    .update(alertDeliveries)
    .set({
      deliveredAt: options.deliveredAt,
      status: "delivered",
      updatedAt: options.deliveredAt,
    })
    .where(
      and(inArray(alertDeliveries.id, options.deliveryIds), eq(alertDeliveries.status, "pending")),
    )
    .returning({
      alertId: alertDeliveries.alertId,
      id: alertDeliveries.id,
    });
  const alertIds = Array.from(new Set(updatedRows.map((row) => row.alertId)));

  if (alertIds.length > 0) {
    await db
      .update(alerts)
      .set({ deliveredAt: options.deliveredAt })
      .where(and(inArray(alerts.id, alertIds), isNull(alerts.deliveredAt)));
  }

  return getAlertDeliveriesByIds(updatedRows.map((row) => row.id));
}

export async function deliverEligibleInAppAlerts(options: {
  input?: unknown;
}): Promise<DeliverEligibleAlertsResult> {
  const input = claimAlertDeliveriesInputSchema.parse(options.input ?? {});
  const deliveredAt = input.now ? new Date(input.now) : new Date();
  const claimedDeliveries = await claimEligibleAlertDeliveries({
    channel: "in_app",
    limit: input.limit,
    now: deliveredAt,
  });
  const completedDeliveries = await completeAlertDeliveries({
    deliveredAt,
    deliveryIds: claimedDeliveries.map((delivery) => delivery.id),
  });

  return {
    claimedCount: claimedDeliveries.length,
    completedCount: completedDeliveries.length,
    deliveredAt: deliveredAt.toISOString(),
    deliveries: completedDeliveries,
  };
}
