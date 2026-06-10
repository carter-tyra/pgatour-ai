import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim().length === 0 ? undefined : value;
}

const optionalString = z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.url().optional());
const optionalSecret = optionalString;
const optionalSecretMin = (minLength: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().min(minLength).optional());
const stringWithDefault = (defaultValue: string) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().min(1).default(defaultValue));
const urlWithDefault = (defaultValue: string) =>
  z.preprocess(emptyStringToUndefined, z.url().default(defaultValue));

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: urlWithDefault("http://localhost:3000"),
  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: urlWithDefault("https://us.i.posthog.com"),
  BETTER_AUTH_SECRET: optionalSecretMin(32),
  BETTER_AUTH_URL: optionalUrl,
  STRIPE_SECRET_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  DATAGOLF_API_KEY: optionalSecret,
  SPORTSDATAIO_API_KEY: optionalSecret,
  THE_ODDS_API_KEY: optionalSecret,
  BALL_DONT_LIE_API_KEY: optionalSecret,
  BALL_DONT_LIE_BASE_URL: optionalUrl,
  OPENWEATHER_API_KEY: optionalSecret,
  DATABASE_URL: stringWithDefault("postgres://postgres:postgres@localhost:5432/pgatour_ai"),
  CLICKHOUSE_URL: stringWithDefault("http://default:password@localhost:8123/default"),
  REDIS_URL: stringWithDefault("redis://localhost:6379"),
  RAW_SNAPSHOT_BUCKET: stringWithDefault("pgatour-ai-raw"),
  S3_REGION: stringWithDefault("us-east-1"),
  S3_ACCESS_KEY_ID: optionalSecret,
  S3_SECRET_ACCESS_KEY: optionalSecret,
  S3_ENDPOINT: optionalUrl,
  AI_GATEWAY_API_KEY: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  AI_DAILY_COST_LIMIT_USD: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().positive().default(25),
  ),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
