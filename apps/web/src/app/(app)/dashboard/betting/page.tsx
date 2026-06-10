import { BettingView } from "@/features/intelligence-terminal/betting-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function BettingPage() {
  const session = await requireCurrentSession();
  const { data } = await getDashboardData(session.user.id);

  return (
    <BettingView
      canonicalFieldPlayers={data.canonicalFieldPlayers}
      modelQuality={data.model.quality}
      players={data.players}
      sourceState={data.sourceState}
    />
  );
}
