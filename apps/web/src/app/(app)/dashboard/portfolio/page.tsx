import { PortfolioView } from "@/features/intelligence-terminal/portfolio-view";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await requireCurrentSession();
  const { data, trackerSnapshot } = await getDashboardData(session.user.id);

  return (
    <PortfolioView
      canonicalFieldPlayers={data.canonicalFieldPlayers}
      initialSnapshot={trackerSnapshot}
      tournament={data.tournament}
    />
  );
}
