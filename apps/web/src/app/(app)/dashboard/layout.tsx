import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireCurrentSession();
  const { shell } = await getDashboardData(session.user.id);

  return (
    <Providers>
      <DashboardShell shell={shell}>{children}</DashboardShell>
    </Providers>
  );
}
