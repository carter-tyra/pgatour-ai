"use client";

import { motion, useReducedMotion } from "framer-motion";

import { SignalDot } from "@/components/terminal-primitives";
import type {
  EventReadinessResource,
  EventReadinessResourceId,
  EventReadinessStatus,
  IntelligenceSourceState,
} from "@/lib/intelligence-types";

type Tone = "neutral" | "positive" | "warning" | "danger";

const itemLabels: Record<
  EventReadinessResourceId,
  { missing: string; pending?: string; ready: string }
> = {
  field: {
    missing: "Field not in",
    ready: "Field set",
  },
  markets: {
    missing: "Odds not in",
    ready: "Odds loaded",
  },
  model: {
    missing: "Model not run",
    ready: "Model ready",
  },
  tee_times: {
    missing: "Tee times not in",
    pending: "Tee times pending",
    ready: "Tee times loaded",
  },
  tournament: {
    missing: "Event not set",
    ready: "Event set",
  },
};

function toneForStatus(status: EventReadinessStatus): Tone {
  if (status === "ready") {
    return "positive";
  }

  if (status === "unavailable") {
    return "danger";
  }

  return "warning";
}

function resourceItem(
  state: IntelligenceSourceState,
  id: EventReadinessResourceId,
): { label: string; tone: Tone } {
  const resource = state.readiness.resources.find((item) => item.id === id);
  const fallback: EventReadinessResource = {
    count: 0,
    helper: "Not loaded.",
    id,
    label: itemLabels[id].missing,
    required: true,
    status: "missing",
    total: null,
  };
  const item = resource ?? fallback;

  return {
    label:
      item.status === "ready"
        ? itemLabels[id].ready
        : item.status === "pending"
          ? (itemLabels[id].pending ?? itemLabels[id].missing)
          : itemLabels[id].missing,
    tone: toneForStatus(item.status),
  };
}

/**
 * A single quiet line of context — who's in, where the numbers come from, and
 * the reminder that nothing here places a bet. Deliberately not a tile grid.
 */
export function MarketSignalStrip({ sourceState }: { sourceState: IntelligenceSourceState }) {
  const reduce = useReducedMotion() ?? false;

  const items: Array<{ label: string; tone: Tone }> = [
    resourceItem(sourceState, "field"),
    resourceItem(sourceState, "markets"),
    resourceItem(sourceState, "model"),
    resourceItem(sourceState, "tee_times"),
  ];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-full corner-squircle border border-border/70 bg-primary-foreground px-4 py-2 text-sm shadow-sm"
      initial={reduce ? false : { opacity: 0, y: -6 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {items.map((item, index) => (
        <span className="flex items-center" key={item.label}>
          {index > 0 ? <span aria-hidden className="mx-2.5 h-3.5 w-px bg-border/70" /> : null}
          <span className="flex items-center gap-2 whitespace-nowrap">
            <SignalDot tone={item.tone} />
            <span className="font-medium text-foreground/85">{item.label}</span>
          </span>
        </span>
      ))}
    </motion.div>
  );
}
