import { z } from "zod";
import {
  alertTypes,
  betStatuses,
  confidenceLevels,
  contestTypes,
  dataSources,
  marketTypes,
  subscriptionTiers,
} from "./constants";

export const idSchema = z.string().min(1);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
export const isoDateTimeSchema = z.string().datetime();

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
  americanOdds: z.number().int(),
  thesis: z.string().max(500).optional(),
  status: z.enum(betStatuses).default("open"),
  placedAt: isoDateTimeSchema,
});

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
  createdAt: isoDateTimeSchema,
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
export type Market = z.infer<typeof marketSchema>;
export type Prediction = z.infer<typeof predictionSchema>;
export type UserBet = z.infer<typeof userBetSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type DfsOptimizerInput = z.infer<typeof dfsOptimizerInputSchema>;
