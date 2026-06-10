"use client";

import { CheckmarkOutline } from "@carbon/icons-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel, SignalDot } from "@/components/terminal-primitives";
import type { CanonicalFieldPlayer, TournamentIntelligence } from "@/lib/intelligence-types";
import { springBar } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CanonicalPlayerSheet } from "./canonical-player-sheet";

const ROUND_DURATION_MS = 4.5 * 60 * 60 * 1000;
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

type Status = "done" | "live" | "upcoming";

type Group = {
  groupNumber: number;
  startsAt: string;
  start: number;
  players: CanonicalFieldPlayer[];
};

function statusFor(group: Group, now: number | null): Status {
  if (now === null || now < group.start) {
    return "upcoming";
  }
  if (now >= group.start + ROUND_DURATION_MS) {
    return "done";
  }
  return "live";
}

export function LiveView({
  canonicalFieldPlayers,
  tournament,
}: {
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  tournament: TournamentIntelligence;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [round, setRound] = useState<number | null>(null);
  const [selected, setSelected] = useState<CanonicalFieldPlayer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const openPlayer = useCallback((player: CanonicalFieldPlayer) => {
    setSelected(player);
    setSheetOpen(true);
  }, []);

  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const player of canonicalFieldPlayers) {
      for (const tee of player.teeTimes) {
        if (tee.startsAt) {
          set.add(tee.roundNumber);
        }
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [canonicalFieldPlayers]);

  const activeRound = round ?? rounds.at(-1) ?? null;

  const groups = useMemo<Group[]>(() => {
    if (activeRound === null) {
      return [];
    }
    const map = new Map<number, Group>();
    for (const player of canonicalFieldPlayers) {
      if (player.status !== "entered") {
        continue;
      }
      const tee = player.teeTimes.find(
        (t) => t.roundNumber === activeRound && t.startsAt && t.groupNumber !== null,
      );
      if (!tee?.startsAt || tee.groupNumber === null) {
        continue;
      }
      const group = map.get(tee.groupNumber) ?? {
        groupNumber: tee.groupNumber,
        players: [],
        start: new Date(tee.startsAt).getTime(),
        startsAt: tee.startsAt,
      };
      group.players.push(player);
      map.set(tee.groupNumber, group);
    }
    return [...map.values()].sort((a, b) => a.start - b.start);
  }, [canonicalFieldPlayers, activeRound]);

  const counts = useMemo(() => {
    let done = 0;
    let live = 0;
    let upcoming = 0;
    for (const group of groups) {
      const status = statusFor(group, now);
      if (status === "done") {
        done += 1;
      } else if (status === "live") {
        live += 1;
      } else {
        upcoming += 1;
      }
    }
    return { done, live, upcoming };
  }, [groups, now]);

  const nowDividerIndex = useMemo(() => {
    if (now === null) {
      return -1;
    }
    const index = groups.findIndex((group) => group.start > now);
    return index;
  }, [groups, now]);

  if (rounds.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-10 text-center shadow-sm">
        <p className="max-w-sm text-sm text-muted-foreground">
          No tee times posted for {tournament.name} yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-pretty text-[1.7rem] font-medium leading-tight tracking-tight text-foreground">
              On the course
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <SignalDot tone="warning" /> {counts.live} out now
              </span>
              <span className="flex items-center gap-1.5">
                <SignalDot tone="neutral" /> {counts.upcoming} to come
              </span>
              <span className="flex items-center gap-1.5">
                <SignalDot tone="positive" /> {counts.done} done
              </span>
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border/70 bg-primary-foreground p-1">
            {rounds.map((roundNumber) => {
              const active = roundNumber === activeRound;
              return (
                <button
                  className="relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
                  key={roundNumber}
                  onClick={() => setRound(roundNumber)}
                  type="button"
                >
                  {active ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-background"
                      layoutId="live-round-pill"
                      transition={springBar}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                    )}
                  >
                    R{roundNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
          <div className="flex items-center justify-between border-b border-border/55 bg-background px-4 py-2.5">
            <DataLabel>Round {activeRound} tee sheet</DataLabel>
            <span className="text-[0.7rem] text-muted-foreground/70">
              Scores connect with the live feed
            </span>
          </div>
          <ul>
            {groups.map((group, index) => {
              const status = statusFor(group, now);
              return (
                <li key={group.groupNumber}>
                  {index === nowDividerIndex ? <NowDivider now={now} /> : null}
                  <div
                    className={cn(
                      "grid grid-cols-[4rem_auto_1fr] items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0",
                      status === "done" && "opacity-55",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {timeFormatter.format(new Date(group.startsAt))}
                      </span>
                      <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground/60">
                        Grp {group.groupNumber}
                      </span>
                    </div>
                    <StatusPip status={status} />
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      {group.players.map((player) => (
                        <button
                          className="flex min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-80 active:scale-[0.99]"
                          key={player.id}
                          onClick={() => openPlayer(player)}
                          type="button"
                        >
                          <PlayerPortrait
                            className="size-7 rounded-lg after:rounded-lg"
                            fallbackClassName="rounded-lg text-[0.6rem]"
                            imageClassName="rounded-lg"
                            name={player.name}
                          />
                          <span className="truncate text-[0.88rem] font-medium text-foreground">
                            {player.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
            {now !== null && nowDividerIndex === -1 ? (
              <li>
                <div className="px-4 py-3 text-center text-[0.72rem] text-muted-foreground/70">
                  Every group is out — round complete.
                </div>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <CanonicalPlayerSheet onOpenChange={setSheetOpen} open={sheetOpen} player={selected} />
    </>
  );
}

function StatusPip({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground">
        <CheckmarkOutline className="size-3.5" />
        Done
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-[var(--warning)]">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--warning)] opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-[var(--warning)]" />
        </span>
        Out now
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground/70">
      <SignalDot tone="neutral" />
      Next off
    </span>
  );
}

function NowDivider({ now }: { now: number | null }) {
  return (
    <div className="flex items-center gap-3 bg-background/40 px-4 py-2">
      <span className="text-[0.66rem] font-medium uppercase tracking-wide text-[var(--warning)]">
        Now {now !== null ? `· ${timeFormatter.format(new Date(now))}` : ""}
      </span>
      <span className="h-px flex-1 bg-[color-mix(in_oklch,var(--warning)_45%,transparent)]" />
    </div>
  );
}
