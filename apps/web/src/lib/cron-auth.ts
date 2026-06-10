import "server-only";

import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./api-response";

function safeEquals(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

export function requireCronSecret(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedHeader = cronSecret ? `Bearer ${cronSecret}` : null;

  if (!expectedHeader || !authHeader || !safeEquals(authHeader, expectedHeader)) {
    throw new ApiError({
      code: "unauthorized",
      message: "Cron authentication is required.",
      status: 401,
    });
  }
}
