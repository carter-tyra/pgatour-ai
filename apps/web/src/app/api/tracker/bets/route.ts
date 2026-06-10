import { createUserBet } from "@/features/tracker/server";
import { requireApiSession } from "@/lib/api-auth";
import { apiJson, handleApiError, readJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(request);
    const input = await readJsonBody(request);
    const bet = await createUserBet({
      input,
      userId: session.user.id,
    });

    return apiJson({ bet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
