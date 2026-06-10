import { z } from "zod";
import {
  alertDeliveryChannels,
  alertDeliveryStatuses,
  alertTypes,
  betStatuses,
  confidenceLevels,
  contestTypes,
  dataSources,
  fieldEntryStatuses,
  marketTypes,
  modelEdgeAlertDefaultLimit,
  modelEdgeAlertDefaultMinEdgePercent,
  modelEdgeAlertMaxLimit,
  subscriptionTiers,
} from "./constants";

export const idSchema = z.string().min(1);
export const uuidSchema = z.string().uuid();
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
export const isoDateTimeSchema = z.string().datetime();
export const americanOddsSchema = z
  .number()
  .int()
  .min(-100_000)
  .max(100_000)
  .refine((value) => value !== 0, "American odds cannot be zero");
export const stakeSchema = z.number().finite().positive().max(1_000_000);

export const playerSchema = z.object({
  id: idSchema,
  sourceIds: z.record(z.string(), z.string()).default({}),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(2).optional(),
  status: z.enum(["active", "withdrawn", "inactive"]).default("active"),
});

export const tournamentSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  season: z.number().int().min(1900),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  courseId: idSchema,
  status: z.enum(["scheduled", "in_progress", "complete"]).default("scheduled"),
});

export const courseSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1).optional(),
  country: z.string().min(2),
  par: z.number().int().min(60).max(80),
  yardage: z.number().int().min(5000).max(9000),
  grass: z.string().optional(),
});

export const fieldEntrySchema = z.object({
  id: idSchema,
  tournamentId: idSchema,
  playerId: idSchema,
  status: z.enum(fieldEntryStatuses).default("unknown"),
  seed: z.number().int().positive().nullable().optional(),
  teeWave: z.string().nullable().optional(),
});

export const marketSchema = z.object({
  id: idSchema,
  tournamentId: idSchema,
  marketType: z.enum(marketTypes),
  book: z.string().min(1),
  playerId: idSchema,
  americanOdds: z.number().int(),
  decimalOdds: z.number().positive(),
  impliedProbability: z.number().positive(),
  noVigProbability: z.number().positive().optional(),
  capturedAt: isoDateTimeSchema,
});

export const predictionSchema = z.object({
  id: idSchema,
  modelRunId: idSchema,
  tournamentId: idSchema,
  playerId: idSchema,
  marketType: z.enum(marketTypes),
  probability: z.number().gt(0).lt(1),
  fairAmericanOdds: z.number().int(),
  confidence: z.enum(confidenceLevels),
  drivers: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).default([]),
});

export const userBetSchema = z.object({
  id: idSchema,
  userId: idSchema,
  tournamentId: idSchema,
  playerId: idSchema,
  marketType: z.enum(marketTypes),
  book: z.string().min(1),
  stake: z.number().positive(),
  americanOdds: americanOddsSchema,
  thesis: z.string().max(500).optional(),
  status: z.enum(betStatuses).default("open"),
  placedAt: isoDateTimeSchema,
});

export const trackerTournamentQuerySchema = z.object({
  tournamentId: uuidSchema.optional(),
});

export const trackerAlertsQuerySchema = z.object({
  status: z.enum(["all", "acknowledged", "unacknowledged"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const claimAlertDeliveriesInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  now: isoDateTimeSchema.optional(),
});

const playerIdsSchema = z
  .array(uuidSchema)
  .max(200)
  .transform((playerIds) => Array.from(new Set(playerIds)));

const alertIdsSchema = z
  .array(uuidSchema)
  .min(1)
  .max(200)
  .transform((alertIds) => Array.from(new Set(alertIds)));

export const createUserBetInputSchema = z.object({
  tournamentId: uuidSchema,
  playerId: uuidSchema,
  marketType: z.enum(marketTypes),
  book: z.string().trim().min(1).max(80),
  stake: z.coerce.number().pipe(stakeSchema),
  americanOdds: z.coerce.number().pipe(americanOddsSchema),
  thesis: z.string().trim().max(500).optional(),
  placedAt: isoDateTimeSchema.optional(),
});

export const updateUserBetInputSchema = z
  .object({
    tournamentId: uuidSchema.optional(),
    playerId: uuidSchema.optional(),
    marketType: z.enum(marketTypes).optional(),
    book: z.string().trim().min(1).max(80).optional(),
    stake: z.coerce.number().pipe(stakeSchema).optional(),
    americanOdds: z.coerce.number().pipe(americanOddsSchema).optional(),
    thesis: z.string().trim().max(500).nullable().optional(),
    status: z.enum(betStatuses).optional(),
    placedAt: isoDateTimeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const createUserWatchlistInputSchema = z.object({
  tournamentId: uuidSchema,
  name: z.string().trim().min(1).max(80),
  playerIds: playerIdsSchema.default([]),
});

export const createModelBackedUserBetInputSchema = z.object({
  tournamentId: uuidSchema,
  playerId: uuidSchema,
  marketType: z.enum(marketTypes),
  stake: z.coerce.number().pipe(stakeSchema),
  thesis: z.string().trim().max(500).optional(),
  placedAt: isoDateTimeSchema.optional(),
});

export const upsertModelBackedWatchlistInputSchema = z.object({
  tournamentId: uuidSchema,
  playerId: uuidSchema,
  marketType: z.enum(marketTypes),
  name: z.string().trim().min(1).max(80).default("Model edges"),
});

const modelEdgeAlertMarketTypesSchema = z
  .array(z.enum(marketTypes))
  .min(1)
  .max(marketTypes.length)
  .transform((marketTypeValues) => Array.from(new Set(marketTypeValues)));

export const generateModelEdgeAlertsInputSchema = z.object({
  tournamentId: uuidSchema,
  marketTypes: modelEdgeAlertMarketTypesSchema.optional(),
  minEdgePercent: z.coerce
    .number()
    .finite()
    .min(0)
    .max(100)
    .default(modelEdgeAlertDefaultMinEdgePercent),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(modelEdgeAlertMaxLimit)
    .default(modelEdgeAlertDefaultLimit),
});

export const updateUserWatchlistInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    playerIds: playerIdsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const subscriptionSchema = z.object({
  userId: idSchema,
  tier: z.enum(subscriptionTiers),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  currentPeriodEndsAt: isoDateTimeSchema.optional(),
});

export const alertSchema = z.object({
  id: idSchema,
  userId: idSchema,
  alertType: z.enum(alertTypes),
  title: z.string().min(1),
  reason: z.string().min(1),
  source: z.enum(dataSources),
  dedupeKey: z.string().min(1),
  deliveredAt: isoDateTimeSchema.nullable().optional(),
  acknowledgedAt: isoDateTimeSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});

export const alertPreferenceSchema = z.object({
  id: uuidSchema,
  userId: idSchema,
  alertType: z.enum(alertTypes),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  mutedUntil: isoDateTimeSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const alertPreferenceInputSchema = z.object({
  alertType: z.enum(alertTypes),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  mutedUntil: isoDateTimeSchema.nullable().optional(),
});

export const updateTrackerAlertPreferencesInputSchema = z
  .object({
    preferences: z.array(alertPreferenceInputSchema).min(1).max(alertTypes.length),
  })
  .superRefine((value, context) => {
    const seenAlertTypes = new Set<string>();

    for (const [index, preference] of value.preferences.entries()) {
      if (seenAlertTypes.has(preference.alertType)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate preference for alert type "${preference.alertType}".`,
          path: ["preferences", index, "alertType"],
        });
      }

      seenAlertTypes.add(preference.alertType);
    }
  });

export const alertDeliverySchema = z.object({
  id: uuidSchema,
  alertId: uuidSchema,
  userId: idSchema,
  channel: z.enum(alertDeliveryChannels),
  status: z.enum(alertDeliveryStatuses),
  claimedAt: isoDateTimeSchema,
  deliveredAt: isoDateTimeSchema.nullable().optional(),
  failedAt: isoDateTimeSchema.nullable().optional(),
  failureReason: z.string().nullable().optional(),
  attemptCount: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const acknowledgeTrackerAlertsInputSchema = z.object({
  alertIds: alertIdsSchema,
});

export const dfsOptimizerInputSchema = z.object({
  tournamentId: idSchema,
  contestType: z.enum(contestTypes),
  salaryCap: z.number().int().positive(),
  rosterSize: z.number().int().min(4).max(8),
  lockedPlayerIds: z.array(idSchema).default([]),
  excludedPlayerIds: z.array(idSchema).default([]),
  maxAverageOwnership: z.number().gt(0).lte(1).optional(),
});

export type Player = z.infer<typeof playerSchema>;
export type Tournament = z.infer<typeof tournamentSchema>;
export type Course = z.infer<typeof courseSchema>;
export type FieldEntry = z.infer<typeof fieldEntrySchema>;
export type Market = z.infer<typeof marketSchema>;
export type Prediction = z.infer<typeof predictionSchema>;
export type UserBet = z.infer<typeof userBetSchema>;
export type TrackerTournamentQuery = z.infer<typeof trackerTournamentQuerySchema>;
export type TrackerAlertsQuery = z.infer<typeof trackerAlertsQuerySchema>;
export type ClaimAlertDeliveriesInput = z.infer<typeof claimAlertDeliveriesInputSchema>;
export type CreateUserBetInput = z.infer<typeof createUserBetInputSchema>;
export type UpdateUserBetInput = z.infer<typeof updateUserBetInputSchema>;
export type CreateUserWatchlistInput = z.infer<typeof createUserWatchlistInputSchema>;
export type CreateModelBackedUserBetInput = z.infer<typeof createModelBackedUserBetInputSchema>;
export type UpsertModelBackedWatchlistInput = z.infer<typeof upsertModelBackedWatchlistInputSchema>;
export type GenerateModelEdgeAlertsInput = z.infer<typeof generateModelEdgeAlertsInputSchema>;
export type UpdateUserWatchlistInput = z.infer<typeof updateUserWatchlistInputSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type AlertPreference = z.infer<typeof alertPreferenceSchema>;
export type AlertDelivery = z.infer<typeof alertDeliverySchema>;
export type AcknowledgeTrackerAlertsInput = z.infer<typeof acknowledgeTrackerAlertsInputSchema>;
export type UpdateTrackerAlertPreferencesInput = z.infer<
  typeof updateTrackerAlertPreferencesInputSchema
>;
export type DfsOptimizerInput = z.infer<typeof dfsOptimizerInputSchema>;
