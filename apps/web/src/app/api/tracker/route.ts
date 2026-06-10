import { trackerTournamentQuerySchema } from "@pgatour-ai/domain";
import { getUserTracker } from "@/features/tracker/server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTrackerQuery(request: Request) {
  const url = new URL(request.url);

  return trackerTournamentQuerySchema.parse({
    tournamentId: url.searchParams.get("tournamentId") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(request);
    const query = parseTrackerQuery(request);
    const snapshot = await getUserTracker({
      tournamentId: query.tournamentId,
      userId: session.user.id,
    });

    return apiJson(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
