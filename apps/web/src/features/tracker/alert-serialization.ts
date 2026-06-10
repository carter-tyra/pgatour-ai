import { alerts } from "@pgatour-ai/db";
import { toIsoString } from "../tournament/server";
import type { TrackerAlert } from "./types";

function requiredIsoString(value: Date | string | null) {
  return toIsoString(value) ?? new Date().toISOString();
}

export const alertSelect = {
  acknowledgedAt: alerts.acknowledgedAt,
  alertType: alerts.alertType,
  createdAt: alerts.createdAt,
  dedupeKey: alerts.dedupeKey,
  deliveredAt: alerts.deliveredAt,
  id: alerts.id,
  reason: alerts.reason,
  source: alerts.source,
  title: alerts.title,
};

export function toTrackerAlert(row: {
  acknowledgedAt: Date | string | null;
  alertType: TrackerAlert["alertType"];
  createdAt: Date | string | null;
  dedupeKey: string;
  deliveredAt: Date | string | null;
  id: string;
  reason: string;
  source: TrackerAlert["source"];
  title: string;
}): TrackerAlert {
  return {
    acknowledgedAt: toIsoString(row.acknowledgedAt),
    alertType: row.alertType,
    createdAt: requiredIsoString(row.createdAt),
    dedupeKey: row.dedupeKey,
    deliveredAt: toIsoString(row.deliveredAt),
    id: row.id,
    reason: row.reason,
    source: row.source,
    title: row.title,
  };
}
