import { AiView } from "@/features/intelligence-terminal/ai-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const session = await requireCurrentSession();
  const { data } = await getDashboardData(session.user.id);

  return <AiView tournament={data.tournament} />;
}
