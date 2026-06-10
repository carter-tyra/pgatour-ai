"use client";

import { motion, useReducedMotion } from "framer-motion";

import { MetricTile } from "@/components/terminal-primitives";
import { easeOutQuart, springBar } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Tone = "citrus" | "rose" | "positive" | "info" | "neutral";

const toneVar: Record<Tone, string> = {
  citrus: "var(--citrus)",
  rose: "var(--rose)",
  positive: "var(--positive)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
};

export function Sparkline({ values, tone = "neutral" }: { values: number[]; tone?: Tone }) {
  const reduce = useReducedMotion();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 96;
      const y = 28 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="h-8 w-24"
      style={{ color: toneVar[tone] }}
      viewBox="0 0 96 32"
    >
      <motion.polyline
        fill="none"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: easeOutQuart }}
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

/** Label + value over a track whose fill scales in (transform, GPU-friendly). */
export function SkillBar({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: Tone;
}) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[0.78rem] text-muted-foreground">{label}</span>
        <span className="text-[0.82rem] font-medium tabular-nums text-foreground">{value}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/70">
        <motion.span
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
          style={{ background: toneVar[tone] }}
          initial={reduce ? { scaleX: pct / 100 } : { scaleX: 0 }}
          whileInView={{ scaleX: pct / 100 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={springBar}
        />
      </div>
    </div>
  );
}

export function HeaderMetric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return <MetricTile helper={helper} label={label} tone={tone} value={value} />;
}

/** A row of bars filling left-to-right to encode a 0–100 value. */
export function SignalBars({
  value,
  tone = "citrus",
  bars = 36,
}: {
  value: number;
  tone?: Tone;
  bars?: number;
}) {
  const reduce = useReducedMotion();
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const filledBars = safeValue === 0 ? 0 : Math.max(1, Math.round((safeValue / 100) * bars));
  const barItems = Array.from({ length: bars }, (_, index) => ({
    id: `signal-bar-${index}`,
    isFilled: index < filledBars,
  }));

  return (
    <div
      aria-hidden="true"
      className="grid h-9 w-full auto-cols-fr grid-flow-col items-end gap-1 overflow-hidden"
    >
      {barItems.map((bar, index) => (
        <motion.span
          key={bar.id}
          className={cn("block h-full w-full origin-bottom rounded-full")}
          style={{ background: bar.isFilled ? toneVar[tone] : "var(--muted)" }}
          initial={reduce ? false : { scaleY: 0.25, opacity: 0 }}
          animate={{ scaleY: 1, opacity: bar.isFilled ? 1 : 0.5 }}
          transition={{ duration: 0.4, ease: easeOutQuart, delay: index * 0.012 }}
        />
      ))}
    </div>
  );
}

export function MicroLine({ values, tone = "rose" }: { values: number[]; tone?: Tone }) {
  const reduce = useReducedMotion();
  const safeValues = values.length > 0 ? values : [0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = Math.max(1, max - min);
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(1, safeValues.length - 1)) * 150;
      const y = 46 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="h-14 w-full"
      style={{ color: toneVar[tone] }}
      viewBox="0 0 150 54"
      preserveAspectRatio="none"
    >
      <motion.polyline
        fill="none"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: easeOutQuart }}
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}
