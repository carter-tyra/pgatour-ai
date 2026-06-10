import { ResearchView } from "@/features/intelligence-terminal/research-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const session = await requireCurrentSession();
  const { data } = await getDashboardData(session.user.id);

  return (
    <ResearchView
      canonicalFieldPlayers={data.canonicalFieldPlayers}
      modelQuality={data.model.quality}
      players={data.players}
      tournament={data.tournament}
    />
  );
}
