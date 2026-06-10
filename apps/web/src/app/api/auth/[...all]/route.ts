import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

const handler = (request: Request) => getAuth().handler(request);

export const { DELETE, GET, PATCH, POST, PUT } = toNextJsHandler(handler);
