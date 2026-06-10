import "server-only";

import { parseEnv } from "@pgatour-ai/config";
import { authAccounts, authSessions, authUsers, authVerifications } from "@pgatour-ai/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_PREFIX } from "./auth-options";
import { getDatabase } from "./database";

function authSecret() {
  const env = parseEnv(process.env);

  if (env.BETTER_AUTH_SECRET) {
    return env.BETTER_AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }

  return "pgai-local-better-auth-secret-change-before-prod";
}

function authBaseUrl() {
  const env = parseEnv(process.env);
  return env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL;
}

function createAuth() {
  const env = parseEnv(process.env);
  const baseURL = authBaseUrl();
  const trustedOrigins = Array.from(new Set([baseURL, env.NEXT_PUBLIC_APP_URL]));

  return betterAuth({
    appName: "PGAI",
    baseURL,
    secret: authSecret(),
    trustedOrigins,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        account: authAccounts,
        session: authSessions,
        user: authUsers,
        verification: authVerifications,
      },
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 10,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [nextCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

export async function getCurrentSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
