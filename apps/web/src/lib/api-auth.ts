import "server-only";

import { ApiError } from "./api-response";
import { getAuth } from "./auth";

export async function requireApiSession(request: Request) {
  const session = await getAuth().api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new ApiError({
      code: "unauthorized",
      message: "Authentication is required.",
      status: 401,
    });
  }

  return session;
}
