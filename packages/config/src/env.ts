import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DATAGOLF_API_KEY: z.string().optional(),
  SPORTSDATAIO_API_KEY: z.string().optional(),
  THE_ODDS_API_KEY: z.string().optional(),
  BALL_DONT_LIE_API_KEY: z.string().optional(),
  OPENWEATHER_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/pgatour_ai"),
  CLICKHOUSE_URL: z.string().default("http://default:password@localhost:8123/default"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RAW_SNAPSHOT_BUCKET: z.string().default("pgatour-ai-raw"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.url().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_DAILY_COST_LIMIT_USD: z.coerce.number().positive().default(25),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
