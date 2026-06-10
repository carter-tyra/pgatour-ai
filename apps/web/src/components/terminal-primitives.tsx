"use client";

import { type HTMLMotionProps, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { riseItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "positive" | "warning" | "danger" | "info";

const toneText: Record<BadgeTone, string> = {
  neutral: "text-muted-foreground",
  positive: "text-[var(--positive)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
};

const toneDot: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground/45",
  positive: "bg-[var(--positive)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
};

const badgeToneClassName: Record<BadgeTone, string> = {
  neutral: "border-border/70 bg-muted/50 text-muted-foreground",
  positive:
    "border-[color-mix(in_oklch,var(--positive)_30%,transparent)] bg-[color-mix(in_oklch,var(--positive)_12%,transparent)] text-[var(--positive)]",
  warning:
    "border-[color-mix(in_oklch,var(--warning)_32%,transparent)] bg-[color-mix(in_oklch,var(--warning)_13%,transparent)] text-[var(--warning)]",
  danger:
    "border-[color-mix(in_oklch,var(--danger)_32%,transparent)] bg-[color-mix(in_oklch,var(--danger)_12%,transparent)] text-[var(--danger)]",
  info: "border-[color-mix(in_oklch,var(--info)_32%,transparent)] bg-[color-mix(in_oklch,var(--info)_13%,transparent)] text-[var(--info)]",
};

/** A small status pill — tinted, translucent, reads on both themes. */
export function ToneBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium capitalize tabular-nums",
        badgeToneClassName[tone],
        className,
      )}
      variant="outline"
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
      {children}
    </Badge>
  );
}

/** A bare 6px tone indicator. */
export function SignalDot({
  tone = "neutral",
  className,
}: {
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 rounded-full", toneDot[tone], className)}
    />
  );
}

type TerminalPanelProps = Omit<HTMLMotionProps<"section">, "title" | "children" | "className"> & {
  title?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  /** Decorative accent dot beside the title. */
  accent?: BadgeTone;
  children: ReactNode;
  className?: string | undefined;
  headerClassName?: string | undefined;
  contentClassName?: string | undefined;
  /** Entrance variant — override with a reduced-motion set when needed. */
  variants?: Variants | undefined;
};

/**
 * Elevated surface with a hairline header. Renders as a motion.section that
 * participates in a parent stagger container (initial/animate are inherited).
 * When used outside a container it simply renders static — no regression.
 */
export function TerminalPanel({
  title,
  meta,
  icon,
  accent,
  children,
  className,
  headerClassName,
  contentClassName,
  variants = riseItem,
  ...props
}: TerminalPanelProps) {
  return (
    <motion.section
      variants={variants}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground",
        "shadow-sm",
        className,
      )}
      {...props}
    >
      {title ? (
        <header
          className={cn(
            "flex min-h-13 items-center justify-between gap-3 border-b border-border/55 px-4 sm:px-5 bg-background",
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? (
              <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground">
                {icon}
              </span>
            ) : accent ? (
              <SignalDot tone={accent} />
            ) : null}
            <h3 className="truncate text-[0.95rem] font-medium leading-none tracking-tight text-foreground">
              {title}
            </h3>
          </div>
          {meta ? (
            <div className="shrink-0 text-[0.7rem] font-medium uppercase leading-none tracking-wide text-muted-foreground/70 tabular-nums">
              {meta}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
    </motion.section>
  );
}

/** A raised stat tile (label / big value / helper). */
export function MetricTile({
  label,
  value,
  helper,
  className,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <div
      className={cn(
        "group/tile min-w-0 rounded-xl border border-border/65 bg-card px-3.5 py-3 shadow-(--shadow-tile)",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="truncate text-[0.66rem] font-medium uppercase leading-none tracking-wide text-muted-foreground">
          {label}
        </div>
        <SignalDot tone={tone} />
      </div>
      <div
        className={cn(
          "truncate text-[1.5rem] font-medium leading-none tabular-nums",
          toneText[tone],
        )}
      >
        {value}
      </div>
      {helper ? (
        <div className="mt-1.5 truncate text-xs leading-4 text-muted-foreground/75">{helper}</div>
      ) : null}
    </div>
  );
}

/** A recessed "data well" — inset, for nested metrics inside a panel. */
export function StatWell({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border/50 bg-muted/35 px-3 py-2.5 shadow-[var(--shadow-press)]",
        className,
      )}
    >
      <DataLabel>{label}</DataLabel>
      <div className={cn("mt-1.5 text-lg font-medium leading-none tabular-nums", toneText[tone])}>
        {value}
      </div>
    </div>
  );
}

export function DataLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[0.66rem] font-medium uppercase leading-none tracking-wide text-muted-foreground/75",
        className,
      )}
    >
      {children}
    </div>
  );
}
