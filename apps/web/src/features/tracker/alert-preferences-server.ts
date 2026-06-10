import "server-only";

import { alertPreferences } from "@pgatour-ai/db";
import {
  type AlertType,
  alertTypes,
  updateTrackerAlertPreferencesInputSchema,
} from "@pgatour-ai/domain";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database";
import { toIsoString } from "../tournament/server";
import type {
  TrackerAlertPreference,
  TrackerAlertPreferencesSnapshot,
  UpdateTrackerAlertPreferencesResult,
} from "./types";

const defaultAlertPreference = (alertType: AlertType): TrackerAlertPreference => ({
  alertType,
  createdAt: null,
  emailEnabled: false,
  id: null,
  inAppEnabled: true,
  mutedUntil: null,
  updatedAt: null,
});

function toTrackerAlertPreference(row: {
  alertType: AlertType;
  createdAt: Date | string | null;
  emailEnabled: boolean;
  id: string;
  inAppEnabled: boolean;
  mutedUntil: Date | string | null;
  updatedAt: Date | string | null;
}): TrackerAlertPreference {
  return {
    alertType: row.alertType,
    createdAt: toIsoString(row.createdAt),
    emailEnabled: row.emailEnabled,
    id: row.id,
    inAppEnabled: row.inAppEnabled,
    mutedUntil: toIsoString(row.mutedUntil),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mergeDefaultPreferences(rows: TrackerAlertPreference[]) {
  const preferencesByAlertType = new Map(rows.map((row) => [row.alertType, row]));

  return alertTypes.map((alertType) => {
    return preferencesByAlertType.get(alertType) ?? defaultAlertPreference(alertType);
  });
}

export async function getUserAlertPreferences(options: {
  userId: string;
}): Promise<TrackerAlertPreferencesSnapshot> {
  const db = getDatabase();
  const rows = await db
    .select({
      alertType: alertPreferences.alertType,
      createdAt: alertPreferences.createdAt,
      emailEnabled: alertPreferences.emailEnabled,
      id: alertPreferences.id,
      inAppEnabled: alertPreferences.inAppEnabled,
      mutedUntil: alertPreferences.mutedUntil,
      updatedAt: alertPreferences.updatedAt,
    })
    .from(alertPreferences)
    .where(eq(alertPreferences.userId, options.userId));

  return {
    generatedAt: new Date().toISOString(),
    preferences: mergeDefaultPreferences(rows.map(toTrackerAlertPreference)),
  };
}

export async function updateUserAlertPreferences(options: {
  input: unknown;
  userId: string;
}): Promise<UpdateTrackerAlertPreferencesResult> {
  const input = updateTrackerAlertPreferencesInputSchema.parse(options.input);
  const db = getDatabase();
  const updatedAt = new Date();

  await db
    .insert(alertPreferences)
    .values(
      input.preferences.map((preference) => ({
        alertType: preference.alertType,
        emailEnabled: preference.emailEnabled,
        inAppEnabled: preference.inAppEnabled,
        mutedUntil: preference.mutedUntil ? new Date(preference.mutedUntil) : null,
        updatedAt,
        userId: options.userId,
      })),
    )
    .onConflictDoUpdate({
      set: {
        emailEnabled: sql`excluded.email_enabled`,
        inAppEnabled: sql`excluded.in_app_enabled`,
        mutedUntil: sql`excluded.muted_until`,
        updatedAt,
      },
      target: [alertPreferences.userId, alertPreferences.alertType],
    });

  const snapshot = await getUserAlertPreferences({ userId: options.userId });

  return {
    ...snapshot,
    updatedCount: input.preferences.length,
  };
}
