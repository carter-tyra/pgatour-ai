import { uuidSchema } from "@pgatour-ai/domain";
import { deleteUserBet, updateUserBet } from "@/features/tracker/server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BetRouteContext = {
  params: Promise<{
    betId: string;
  }>;
};

export async function PATCH(request: Request, context: BetRouteContext) {
  try {
    const session = await requireApiSession(request);
    const { betId } = await context.params;
    const input = await readJsonBody(request);
    const bet = await updateUserBet({
      betId: uuidSchema.parse(betId),
      input,
      userId: session.user.id,
    });

    return apiJson({ bet });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: BetRouteContext) {
  try {
    const session = await requireApiSession(request);
    const { betId } = await context.params;
    const deletedBet = await deleteUserBet({
      betId: uuidSchema.parse(betId),
      userId: session.user.id,
    });

    return apiJson({ bet: deletedBet });
  } catch (error) {
    return handleApiError(error);
  }
}
