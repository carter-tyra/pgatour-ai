"use client";

import type { MarketType } from "@pgatour-ai/domain";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel } from "@/components/terminal-primitives";
import type { CanonicalFieldPlayer } from "@/lib/intelligence-types";
import { easeOutQuart } from "@/lib/motion";
import { CanonicalPlayerSheet } from "./canonical-player-sheet";
import { formatPercent } from "./helpers";

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

type PoolPlayer = {
  player: CanonicalFieldPlayer;
  value: number;
  market: MarketType;
};

const MARKET_TAG: Partial<Record<MarketType, string>> = {
  outright: "Win",
  top_10: "T10",
  top_20: "T20",
  top_5: "T5",
};

function poolValueFor(player: CanonicalFieldPlayer): PoolPlayer | null {
  for (const market of ["top_10", "top_5", "top_20", "outright"] as const) {
    const price = player.odds[market];
    if (price) {
      return { market, player, value: price.impliedProbability };
    }
  }
  return null;
}

const TIERS: Array<{ name: string; helper: string; tint: number; share: number }> = [
  { helper: "the market's headliners", name: "Studs", share: 0.12, tint: 100 },
  { helper: "steady cores", name: "Mid-tier", share: 0.28, tint: 60 },
  { helper: "live longer shots", name: "Value", share: 0.35, tint: 36 },
  { helper: "deep dart throws", name: "Punts", share: 1, tint: 20 },
];

function PoolChip({
  entry,
  onOpen,
}: {
  entry: PoolPlayer;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  return (
    <button
      className="group flex w-40 shrink-0 snap-start flex-col gap-3 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-3.5 text-left shadow-sm transition-colors hover:bg-background active:scale-[0.98]"
      onClick={() => onOpen(entry.player)}
      type="button"
    >
      <PlayerPortrait
        className="size-12 rounded-xl after:rounded-xl"
        fallbackClassName="rounded-xl"
        imageClassName="rounded-xl"
        name={entry.player.name}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium leading-tight text-foreground">
          {entry.player.name}
        </div>
        <div className="truncate text-[0.7rem] leading-tight text-muted-foreground">
          {entry.player.country ?? "—"}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-medium tabular-nums text-foreground">
          {formatPercent(entry.value)}
        </span>
        <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground/70">
          {MARKET_TAG[entry.market] ?? ""}
        </span>
      </div>
    </button>
  );
}

export function FantasyView({
  canonicalFieldPlayers,
}: {
  canonicalFieldPlayers: CanonicalFieldPlayer[];
}) {
  const reduce = useReducedMotion() ?? false;
  const [selected, setSelected] = useState<CanonicalFieldPlayer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openPlayer = useCallback((player: CanonicalFieldPlayer) => {
    setSelected(player);
    setSheetOpen(true);
  }, []);

  const pool = useMemo(
    () =>
      canonicalFieldPlayers
        .filter((p) => p.status === "entered")
        .map(poolValueFor)
        .filter((entry): entry is PoolPlayer => entry !== null)
        .sort((a, b) => b.value - a.value),
    [canonicalFieldPlayers],
  );

  const tiers = useMemo(() => {
    const total = pool.length;
    let cursor = 0;
    return TIERS.map((tier, index) => {
      const count =
        index === TIERS.length - 1 ? total - cursor : Math.max(1, Math.round(total * tier.share));
      const players = pool.slice(cursor, cursor + count);
      cursor += count;
      return { ...tier, players };
    }).filter((tier) => tier.players.length > 0);
  }, [pool]);

  const pairings = useMemo(() => {
    const valueById = new Map(pool.map((entry) => [entry.player.id, entry]));
    const rounds = new Set<number>();
    for (const entry of pool) {
      for (const tee of entry.player.teeTimes) {
        if (tee.groupNumber !== null) {
          rounds.add(tee.roundNumber);
        }
      }
    }
    const round = [...rounds].sort((a, b) => a - b).at(-1);
    if (round === undefined) {
      return [];
    }

    const groups = new Map<number, { startsAt: string | null; entries: PoolPlayer[] }>();
    for (const entry of pool) {
      const tee = entry.player.teeTimes.find(
        (t) => t.roundNumber === round && t.groupNumber !== null,
      );
      if (!tee || tee.groupNumber === null) {
        continue;
      }
      const group = groups.get(tee.groupNumber) ?? { entries: [], startsAt: tee.startsAt };
      group.entries.push(entry);
      groups.set(tee.groupNumber, group);
    }

    return [...groups.entries()]
      .map(([groupNumber, group]) => ({
        entries: group.entries
          .map((e) => valueById.get(e.player.id) ?? e)
          .sort((a, b) => b.value - a.value),
        groupNumber,
        startsAt: group.startsAt,
        strength:
          group.entries.reduce((total, e) => total + e.value, 0) /
          Math.max(1, group.entries.length),
      }))
      .filter((group) => group.entries.length >= 2)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 12);
  }, [pool]);

  if (pool.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-10 text-center shadow-sm">
        <p className="max-w-sm text-sm text-muted-foreground">No priced field to build from yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-9">
        <header>
          <h2 className="text-pretty text-[1.7rem] font-medium leading-tight tracking-tight text-foreground">
            Build your pool
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Tiers come straight from the live board — ranked by place-market odds, not salaries.
            Salary and projection tools light up when DFS pricing connects.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          {tiers.map((tier, index) => (
            <motion.section
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-3 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:gap-5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              key={tier.name}
              transition={{ delay: index * 0.06, duration: 0.4, ease: easeOutQuart }}
            >
              <div className="flex items-center gap-2.5 lg:flex-col lg:items-start lg:gap-1.5 lg:pt-1">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{
                    background: `color-mix(in oklch, var(--citrus) ${tier.tint}%, transparent)`,
                  }}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{tier.name}</div>
                  <div className="text-[0.72rem] text-muted-foreground">{tier.helper}</div>
                </div>
                <span className="ml-auto text-[0.72rem] tabular-nums text-muted-foreground/60 lg:ml-0 lg:mt-1">
                  {tier.players.length}
                </span>
              </div>
              <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                {tier.players.map((entry) => (
                  <PoolChip entry={entry} key={entry.player.id} onOpen={openPlayer} />
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {pairings.length > 0 ? (
          <section>
            <DataLabel className="mb-4">Stack by group</DataLabel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pairings.map((group) => (
                <div
                  className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm"
                  key={group.groupNumber}
                >
                  <div className="flex items-center justify-between border-b border-border/55 bg-background px-4 py-2.5">
                    <DataLabel>Group {group.groupNumber}</DataLabel>
                    <span className="text-[0.72rem] tabular-nums text-muted-foreground/70">
                      {group.startsAt ? timeFormatter.format(new Date(group.startsAt)) : "TBD"}
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {group.entries.map((entry) => (
                      <button
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background active:scale-[0.99]"
                        key={entry.player.id}
                        onClick={() => openPlayer(entry.player)}
                        type="button"
                      >
                        <PlayerPortrait
                          className="size-8 rounded-lg after:rounded-lg"
                          fallbackClassName="rounded-lg text-[0.65rem]"
                          imageClassName="rounded-lg"
                          name={entry.player.name}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {entry.player.name}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatPercent(entry.value)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <CanonicalPlayerSheet onOpenChange={setSheetOpen} open={sheetOpen} player={selected} />
    </>
  );
}
