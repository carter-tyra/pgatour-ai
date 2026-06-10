import { deliverEligibleInAppAlerts } from "@/features/tracker/alert-deliveries-server";
import { apiJson, handleApiError } from "@/lib/api-response";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDeliveryQuery(request: Request) {
  const url = new URL(request.url);

  return {
    limit: url.searchParams.get("limit") ?? undefined,
    now: url.searchParams.get("now") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await deliverEligibleInAppAlerts({
      input: parseDeliveryQuery(request),
    });

    return apiJson(result);
  } catch (error) {
    return handleApiError(error);
  }
}
