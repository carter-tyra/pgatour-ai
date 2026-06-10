import { uuidSchema } from "@pgatour-ai/domain";
import { deleteUserWatchlist, updateUserWatchlist } from "@/features/tracker/server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WatchlistRouteContext = {
  params: Promise<{
    watchlistId: string;
  }>;
};

export async function PATCH(request: Request, context: WatchlistRouteContext) {
  try {
    const session = await requireApiSession(request);
    const { watchlistId } = await context.params;
    const input = await readJsonBody(request);
    const watchlist = await updateUserWatchlist({
      input,
      userId: session.user.id,
      watchlistId: uuidSchema.parse(watchlistId),
    });

    return apiJson({ watchlist });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: WatchlistRouteContext) {
  try {
    const session = await requireApiSession(request);
    const { watchlistId } = await context.params;
    const deletedWatchlist = await deleteUserWatchlist({
      userId: session.user.id,
      watchlistId: uuidSchema.parse(watchlistId),
    });

    return apiJson({ watchlist: deletedWatchlist });
  } catch (error) {
    return handleApiError(error);
  }
}
