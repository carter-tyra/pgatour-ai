"use client";

import { ErrorFilled, Rotate } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <main className="flex min-w-0 flex-1 flex-col p-4 md:p-6 lg:p-8">
      <div className="max-w-xl rounded-lg">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ErrorFilled className="size-5" />
          </div>
          <h2 className="text-2xl font-medium">Dashboard did not load</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try again or sign in again.</p>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={reset}>
            <Rotate data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
