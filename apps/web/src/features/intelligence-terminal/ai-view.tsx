"use client";

import { ArrowRight, Calendar, SearchLocate, Wallet } from "@carbon/icons-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { DataLabel, ToneBadge } from "@/components/terminal-primitives";
import type { TournamentIntelligence } from "@/lib/intelligence-types";
import { easeOutQuart } from "@/lib/motion";

const CAPABILITIES = [
  {
    body: "Who fits, who's drawing money, and where the quiet value sits — pulled from the live board.",
    icon: SearchLocate,
    title: "Read the field",
  },
  {
    body: "Talk through what you're holding, what it'd take to hedge, and where your number beat the close.",
    icon: Wallet,
    title: "Work your book",
  },
  {
    body: "Morning or afternoon wave, who you'll be watching when, and how the draw sets up.",
    icon: Calendar,
    title: "Explain the draw",
  },
];

export function AiView({ tournament }: { tournament: TournamentIntelligence }) {
  const reduce = useReducedMotion() ?? false;
  const [noted, setNoted] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-10 text-center sm:py-16">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.45, ease: easeOutQuart }}
      >
        <div className="flex items-center justify-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-2xl corner-squircle border border-border/70 bg-primary-foreground font-heading text-lg font-medium text-primary shadow-sm">
            B
          </span>
          <ToneBadge tone="info">In the works</ToneBadge>
        </div>
        <h2 className="mt-6 text-pretty text-3xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-4xl">
          Brandel knows the tour.
          <br />
          He's almost ready to talk.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          Ask about the field, your bets, and the draw in plain language — no filters, no
          spreadsheets. Wired to the same live data behind every other tab.
        </p>
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-9 w-full max-w-xl"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.08, duration: 0.45, ease: easeOutQuart }}
      >
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-primary-foreground py-2 pl-5 pr-2 text-left shadow-sm">
          <span className="flex-1 truncate text-sm text-muted-foreground/60">
            Brandel is warming up…
          </span>
          <button
            aria-label="Send"
            className="grid size-9 cursor-not-allowed place-items-center rounded-full bg-muted text-muted-foreground/60"
            disabled
            type="button"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </motion.div>

      <div className="mt-12 grid w-full gap-3 sm:grid-cols-3">
        {CAPABILITIES.map((capability, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-5 text-left shadow-sm"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            key={capability.title}
            transition={{ delay: 0.12 + index * 0.06, duration: 0.4, ease: easeOutQuart }}
          >
            <span className="grid size-9 place-items-center rounded-xl border border-border/60 bg-background text-foreground/80">
              <capability.icon className="size-[1.05rem]" />
            </span>
            <div>
              <div className="text-[0.95rem] font-medium text-foreground">{capability.title}</div>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted-foreground">
                {capability.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-3">
        <DataLabel>{tournament.name}</DataLabel>
        {noted ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-foreground"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: easeOutQuart }}
          >
            Noted — you'll see Brandel here the day he ships.
          </motion.p>
        ) : (
          <button
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
            onClick={() => setNoted(true)}
            type="button"
          >
            Notify me when he's live
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
