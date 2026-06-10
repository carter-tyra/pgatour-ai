import { LiveView } from "@/features/intelligence-terminal/live-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await requireCurrentSession();
  const { data } = await getDashboardData(session.user.id);

  return (
    <LiveView canonicalFieldPlayers={data.canonicalFieldPlayers} tournament={data.tournament} />
  );
}
