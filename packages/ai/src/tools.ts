import { marketTypes } from "@pgatour-ai/domain";
import { z } from "zod";

export const toolCitationSchema = z.object({
  sourceType: z.enum([
    "model_run",
    "market_snapshot",
    "user_bet",
    "news_item",
    "fantasy_projection",
  ]),
  sourceId: z.string().min(1),
  capturedAt: z.string().datetime(),
});

export const explainMarketEdgeInputSchema = z.object({
  tournamentId: z.string().min(1),
  playerId: z.string().min(1),
  marketType: z.enum(marketTypes),
});

export const explainMarketEdgeOutputSchema = z.object({
  summary: z.string().min(1),
  modelProbability: z.number().gt(0).lt(1),
  fairAmericanOdds: z.number().int(),
  marketAmericanOdds: z.number().int(),
  edgePercent: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  drivers: z.array(z.string().min(1)),
  risks: z.array(z.string().min(1)),
  citations: z.array(toolCitationSchema).min(1),
});

export const compareLineupsInputSchema = z.object({
  lineupIds: z.array(z.string().min(1)).min(2).max(6),
});

export const portfolioSummaryInputSchema = z.object({
  userId: z.string().min(1),
  tournamentId: z.string().min(1).optional(),
});

export type ExplainMarketEdgeInput = z.infer<typeof explainMarketEdgeInputSchema>;
export type ExplainMarketEdgeOutput = z.infer<typeof explainMarketEdgeOutputSchema>;
export type CompareLineupsInput = z.infer<typeof compareLineupsInputSchema>;
export type PortfolioSummaryInput = z.infer<typeof portfolioSummaryInputSchema>;
