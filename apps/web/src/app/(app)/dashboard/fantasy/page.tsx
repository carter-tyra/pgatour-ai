import { FantasyView } from "@/features/intelligence-terminal/fantasy-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function FantasyPage() {
  const session = await requireCurrentSession();
  const { data } = await getDashboardData(session.user.id);

  return <FantasyView canonicalFieldPlayers={data.canonicalFieldPlayers} />;
}
