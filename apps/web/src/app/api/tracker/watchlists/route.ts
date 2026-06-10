import { createUserWatchlist } from "@/features/tracker/server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request);
    const input = await readJsonBody(request);
    const watchlist = await createUserWatchlist({
      input,
      userId: session.user.id,
    });

    return apiJson({ watchlist }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
