import { trackerAlertsQuerySchema } from "@pgatour-ai/domain";
import { acknowledgeUserAlerts, getUserAlerts } from "@/features/tracker/alerts-server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseAlertsQuery(request: Request) {
  const url = new URL(request.url);

  return trackerAlertsQuerySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request);
    const query = parseAlertsQuery(request);
    const snapshot = await getUserAlerts({
      query,
      userId: session.user.id,
    });

    return apiJson(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(request);
    const input = await readJsonBody(request);
    const result = await acknowledgeUserAlerts({
      input,
      userId: session.user.id,
    });

    return apiJson(result);
  } catch (error) {
    return handleApiError(error);
  }
}
