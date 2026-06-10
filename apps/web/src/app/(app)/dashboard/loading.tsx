import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const metricSkeletons = ["edge", "ownership", "course", "market"] as const;

export default function DashboardLoading() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Card className="rounded-lg">
          <CardHeader className="gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-10 w-full max-w-lg" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricSkeletons.map((skeleton) => (
              <Skeleton key={skeleton} className="h-24 rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <Skeleton className="min-h-56 rounded-lg" />
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </main>
  );
}
