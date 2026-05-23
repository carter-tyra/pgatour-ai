import type { ReactNode } from "react";
import { cn } from "./cn";

type BadgeTone = "neutral" | "positive" | "warning" | "danger" | "info";

const toneClassName: Record<BadgeTone, string> = {
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold leading-4",
        toneClassName[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
