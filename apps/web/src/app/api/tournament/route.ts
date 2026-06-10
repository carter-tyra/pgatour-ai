import { trackerTournamentQuerySchema } from "@pgatour-ai/domain";
import { getTournamentSnapshot } from "@/features/tournament/server";
import { requireApiSession } from "@/lib/api-auth";
import { ApiError, apiJson, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTournamentQuery(request: Request) {
  const url = new URL(request.url);

  return trackerTournamentQuerySchema.parse({
    tournamentId: url.searchParams.get("tournamentId") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    await requireApiSession(request);
    const query = parseTournamentQuery(request);
    const snapshot = await getTournamentSnapshot(query);

    if (query.tournamentId && !snapshot.tournament) {
      throw new ApiError({
        code: "tournament_not_found",
        message: "Tournament was not found.",
        status: 404,
      });
    }

    return apiJson(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
