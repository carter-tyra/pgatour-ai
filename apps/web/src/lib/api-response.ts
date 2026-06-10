import "server-only";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

type ApiErrorOptions = {
  code: string;
  message: string;
  status: number;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({ code, message, status }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError({
      code: "invalid_json",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }
}

export function apiJson<TData>(data: TData, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

function apiErrorJson(status: number, code: string, message: string) {
  return apiJson(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return apiErrorJson(error.status, error.code, error.message);
  }

  if (error instanceof ZodError) {
    return apiErrorJson(400, "invalid_request", z.prettifyError(error));
  }

  return apiErrorJson(500, "internal_error", "Something went wrong.");
}
