import type { ReactNode } from "react";
import { cn } from "./cn";

export function DataPanel({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-zinc-200 bg-white shadow-sm", className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-zinc-200 border-b px-4">
        <h2 className="text-sm font-medium text-zinc-950">{title}</h2>
        {meta ? <div className="text-xs text-zinc-500">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}
