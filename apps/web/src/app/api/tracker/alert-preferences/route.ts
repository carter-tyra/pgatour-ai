import {
  getUserAlertPreferences,
  updateUserAlertPreferences,
} from "@/features/tracker/alert-preferences-server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request);
    const snapshot = await getUserAlertPreferences({
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
    const result = await updateUserAlertPreferences({
      input,
      userId: session.user.id,
    });

    return apiJson(result);
  } catch (error) {
    return handleApiError(error);
  }
}
