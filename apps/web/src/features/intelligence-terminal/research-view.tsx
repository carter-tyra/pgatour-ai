"use client";

import { ChartHistogram, Launch, ListChecked, Search, Time } from "@carbon/icons-react";
import type { MarketType } from "@pgatour-ai/domain";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel, SignalDot, ToneBadge } from "@/components/terminal-primitives";
import type {
  CanonicalFieldPlayer,
  ModelQualitySummary,
  PlayerIntelligence,
  TournamentIntelligence,
} from "@/lib/intelligence-types";
import { easeOutQuart, springBar } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CanonicalPlayerSheet } from "./canonical-player-sheet";
import { formatOdds, formatPercent } from "./helpers";
import {
  buildModelEdgeCandidates,
  ModelEdgeContextPanel,
  ModelQualityContextCard,
} from "./model-quality-surface";

type LensId = "shape" | "draw" | "field";

const LENSES: Array<{ id: LensId; label: string; icon: typeof ChartHistogram }> = [
  { id: "shape", label: "Market shape", icon: ChartHistogram },
  { id: "draw", label: "The draw", icon: Time },
  { id: "field", label: "The field", icon: ListChecked },
];

const LADDER: Array<{ market: MarketType; label: string }> = [
  { market: "outright", label: "Win" },
  { market: "top_5", label: "Top 5" },
  { market: "top_10", label: "Top 10" },
  { market: "top_20", label: "Top 20" },
];
const RESEARCH_EDGE_MARKETS = LADDER.map((item) => item.market);

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function impliedFor(player: CanonicalFieldPlayer, market: MarketType) {
  return player.odds[market]?.impliedProbability ?? null;
}

function isEntered(player: CanonicalFieldPlayer) {
  return player.status === "entered";
}

function firstTeeLabel(player: CanonicalFieldPlayer) {
  const teed = [...player.teeTimes]
    .filter((t) => t.startsAt)
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))[0];
  if (teed?.startsAt) {
    return `R${teed.roundNumber} · ${timeFormatter.format(new Date(teed.startsAt))}`;
  }
  return player.teeWave ?? "TBD";
}

// — The probability ladder: nested bars, win in front, place markets fanning out behind.
function ProbabilityLadder({
  player,
  markets,
  max,
  size = "mini",
}: {
  player: CanonicalFieldPlayer;
  markets: Array<{ market: MarketType; label: string }>;
  max: number;
  size?: "mini" | "hero";
}) {
  const reduce = useReducedMotion() ?? false;
  const steps = markets
    .map((m) => ({ ...m, value: impliedFor(player, m.market) }))
    .filter((s): s is { market: MarketType; label: string; value: number } => s.value !== null);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted/55",
        size === "hero" ? "h-3.5" : "h-2",
      )}
    >
      {[...steps].reverse().map((step, reversedIndex) => {
        const ascIndex = steps.length - 1 - reversedIndex;
        const tint = [100, 52, 28, 18][ascIndex] ?? 18;
        const widthPct = Math.min(100, Math.max(3, (step.value / max) * 100));
        return (
          <motion.span
            className="absolute inset-y-0 left-0 origin-left rounded-full"
            initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
            key={step.market}
            style={{
              width: `${widthPct}%`,
              background: `color-mix(in oklch, var(--citrus) ${tint}%, transparent)`,
            }}
            transition={{ ...springBar, delay: reduce ? 0 : ascIndex * 0.05 }}
            viewport={{ margin: "-40px", once: true }}
            whileInView={{ scaleX: 1 }}
          />
        );
      })}
    </div>
  );
}

function LadderLegend({
  player,
  markets,
}: {
  player: CanonicalFieldPlayer;
  markets: Array<{ market: MarketType; label: string }>;
}) {
  const steps = markets.filter((m) => impliedFor(player, m.market) !== null);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {steps.map((step, index) => {
        const value = impliedFor(player, step.market);
        const tint = [100, 52, 28, 18][index] ?? 18;
        return (
          <div className="flex items-center gap-2" key={step.market}>
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: `color-mix(in oklch, var(--citrus) ${tint}%, transparent)` }}
            />
            <span className="text-xs text-muted-foreground">{step.label}</span>
            <span className="text-sm font-medium tabular-nums text-foreground">
              {value !== null ? formatPercent(value) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ShapeHero({
  player,
  markets,
  max,
  onOpen,
}: {
  player: CanonicalFieldPlayer;
  markets: Array<{ market: MarketType; label: string }>;
  max: number;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const price = player.odds.outright;
  return (
    <div className="rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PlayerPortrait
            className="size-16 rounded-2xl after:rounded-2xl"
            fallbackClassName="rounded-2xl text-xl"
            imageClassName="rounded-2xl"
            name={player.name}
          />
          <div className="min-w-0">
            <DataLabel>Shortest to win</DataLabel>
            <h4 className="mt-1 truncate text-2xl font-medium leading-none tracking-tight text-foreground">
              {player.name}
            </h4>
            <div className="mt-2 text-sm text-muted-foreground">{player.country ?? "—"}</div>
          </div>
        </div>
        {price ? (
          <div className="text-right">
            <div className="text-[2.25rem] font-medium leading-none tabular-nums text-foreground">
              {formatOdds(price.americanOdds)}
            </div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              {price.book}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <DataLabel>How the market reads it</DataLabel>
          <span className="text-[0.7rem] text-muted-foreground/70">win → place</span>
        </div>
        <ProbabilityLadder markets={markets} max={max} player={player} size="hero" />
        <div className="mt-4">
          <LadderLegend markets={markets} player={player} />
        </div>
      </div>

      <button
        className="mt-7 flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground active:scale-[0.97]"
        onClick={() => onOpen(player)}
        type="button"
      >
        See every price
        <Launch className="size-3.5" />
      </button>
    </div>
  );
}

function ShapeCard({
  player,
  markets,
  max,
  onOpen,
}: {
  player: CanonicalFieldPlayer;
  markets: Array<{ market: MarketType; label: string }>;
  max: number;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const price = player.odds.outright;
  return (
    <button
      className="group flex flex-col gap-3.5 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-4 text-left shadow-sm transition-colors hover:bg-background active:scale-[0.99]"
      onClick={() => onOpen(player)}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlayerPortrait
            className="size-9 rounded-[0.7rem] after:rounded-[0.7rem]"
            fallbackClassName="rounded-[0.7rem] text-[0.7rem]"
            imageClassName="rounded-[0.7rem]"
            name={player.name}
          />
          <div className="min-w-0">
            <div className="truncate text-[0.92rem] font-medium leading-tight text-foreground">
              {player.name}
            </div>
            <div className="truncate text-[0.72rem] leading-tight text-muted-foreground">
              {player.country ?? "—"}
            </div>
          </div>
        </div>
        {price ? (
          <span className="shrink-0 text-base font-medium tabular-nums text-foreground">
            {formatOdds(price.americanOdds)}
          </span>
        ) : null}
      </div>
      <ProbabilityLadder markets={markets} max={max} player={player} />
    </button>
  );
}

function MarketShapeLens({
  players,
  onOpen,
}: {
  players: CanonicalFieldPlayer[];
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const ladderMarkets = useMemo(
    () => LADDER.filter((l) => players.some((p) => p.odds[l.market])),
    [players],
  );

  const rows = useMemo(
    () =>
      players
        .filter((p) => isEntered(p) && p.odds.outright)
        .sort(
          (a, b) =>
            (impliedFor(b, "outright") ?? 0) - (impliedFor(a, "outright") ?? 0) ||
            a.name.localeCompare(b.name),
        ),
    [players],
  );

  const max = useMemo(() => {
    const last = ladderMarkets.at(-1)?.market ?? "outright";
    return Math.max(
      0.0001,
      ...rows.map((p) => impliedFor(p, last) ?? impliedFor(p, "outright") ?? 0),
    );
  }, [rows, ladderMarkets]);

  if (rows.length === 0) {
    return <EmptyNote>No win prices loaded for this field yet.</EmptyNote>;
  }

  const [hero, ...rest] = rows;

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        Each bar fans from win odds out to the place markets. A long tail past the solid mark means
        the field rates a player to finish well more than to close it out.
      </p>
      {hero ? <ShapeHero markets={ladderMarkets} max={max} onOpen={onOpen} player={hero} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((player) => (
          <ShapeCard
            key={player.id}
            markets={ladderMarkets}
            max={max}
            onOpen={onOpen}
            player={player}
          />
        ))}
      </div>
    </div>
  );
}

function DrawColumn({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: Array<{ player: CanonicalFieldPlayer; startsAt: string; tee: string }>;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border/55 bg-background px-4 py-3">
        <DataLabel>{title}</DataLabel>
        <span className="text-[0.7rem] font-medium tabular-nums text-muted-foreground/70">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">No groups out this wave.</div>
      ) : (
        <ul className="divide-y divide-border/40">
          {rows.map((row) => (
            <li key={row.player.id}>
              <button
                className="grid w-full grid-cols-[3.5rem_auto_1fr] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background active:scale-[0.99]"
                onClick={() => onOpen(row.player)}
                type="button"
              >
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {timeFormatter.format(new Date(row.startsAt))}
                </span>
                <PlayerPortrait
                  className="size-8 rounded-lg after:rounded-lg"
                  fallbackClassName="rounded-lg text-[0.65rem]"
                  imageClassName="rounded-lg"
                  name={row.player.name}
                />
                <div className="min-w-0">
                  <div className="truncate text-[0.9rem] font-medium leading-tight text-foreground">
                    {row.player.name}
                  </div>
                  <div className="truncate text-[0.7rem] leading-tight text-muted-foreground">
                    {row.player.country ?? "—"}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DrawLens({
  players,
  onOpen,
}: {
  players: CanonicalFieldPlayer[];
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const player of players) {
      for (const tee of player.teeTimes) {
        if (tee.startsAt) {
          set.add(tee.roundNumber);
        }
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [players]);

  const [round, setRound] = useState<number | null>(null);
  const activeRound = round ?? rounds.at(-1) ?? null;

  const { morning, afternoon } = useMemo(() => {
    const am: Array<{ player: CanonicalFieldPlayer; startsAt: string; tee: string }> = [];
    const pm: Array<{ player: CanonicalFieldPlayer; startsAt: string; tee: string }> = [];
    if (activeRound === null) {
      return { afternoon: pm, morning: am };
    }
    for (const player of players) {
      if (!isEntered(player)) {
        continue;
      }
      const tee = player.teeTimes.find((t) => t.roundNumber === activeRound && t.startsAt);
      if (!tee?.startsAt) {
        continue;
      }
      const entry = { player, startsAt: tee.startsAt, tee: tee.tee };
      (new Date(tee.startsAt).getHours() < 12 ? am : pm).push(entry);
    }
    const byTime = (a: { startsAt: string }, b: { startsAt: string }) =>
      a.startsAt.localeCompare(b.startsAt);
    am.sort(byTime);
    pm.sort(byTime);
    return { afternoon: pm, morning: am };
  }, [players, activeRound]);

  if (rounds.length === 0) {
    return <EmptyNote>Tee times for this event haven't been posted yet.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          When each group goes out, split into morning and afternoon waves.
        </p>
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
                    layoutId="research-round-pill"
                    transition={springBar}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                  )}
                >
                  Round {roundNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DrawColumn onOpen={onOpen} rows={morning} title="Morning wave" />
        <DrawColumn onOpen={onOpen} rows={afternoon} title="Afternoon wave" />
      </div>
    </div>
  );
}

function FieldLens({
  players,
  onOpen,
}: {
  players: CanonicalFieldPlayer[];
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const [query, setQuery] = useState("");

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const player of players) {
      if (player.country) {
        counts.set(player.country, (counts.get(player.country) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [players]);

  const topCountry = countries[0]?.[1] ?? 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players;
    return [...base].sort(
      (a, b) => Number(isEntered(b)) - Number(isEntered(a)) || a.name.localeCompare(b.name),
    );
  }, [players, query]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,2fr)]">
      <div className="rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-5 shadow-sm">
        <DataLabel>Where they're from</DataLabel>
        <ul className="mt-4 flex flex-col gap-2.5">
          {countries.slice(0, 8).map(([country, count]) => (
            <li className="flex items-center gap-3" key={country}>
              <span className="w-28 shrink-0 truncate text-sm text-foreground">{country}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/55">
                <span
                  className="block h-full rounded-full bg-[color-mix(in_oklch,var(--citrus)_55%,transparent)]"
                  style={{ width: `${Math.max(6, (count / topCountry) * 100)}%` }}
                />
              </span>
              <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                {count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border/55 bg-background px-4 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a player"
            type="text"
            value={query}
          />
          <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground/70">
            {filtered.length}
          </span>
        </div>
        <div className="max-h-[32rem] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No player matches "{query}".
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((player) => {
                const out = !isEntered(player);
                return (
                  <li key={player.id}>
                    <button
                      className={cn(
                        "grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background active:scale-[0.99]",
                        out && "opacity-60",
                      )}
                      onClick={() => onOpen(player)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PlayerPortrait
                          className="size-8 rounded-lg after:rounded-lg"
                          fallbackClassName="rounded-lg text-[0.65rem]"
                          imageClassName="rounded-lg"
                          name={player.name}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[0.9rem] font-medium leading-tight text-foreground">
                              {player.name}
                            </span>
                            {out ? <ToneBadge tone="danger">withdrawn</ToneBadge> : null}
                          </div>
                          <div className="truncate text-[0.7rem] leading-tight text-muted-foreground">
                            {player.country ?? "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden items-center gap-1 sm:flex" aria-hidden="true">
                          {LADDER.map((l) => (
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                player.odds[l.market]
                                  ? "bg-[var(--citrus)]"
                                  : "bg-muted-foreground/25",
                              )}
                              key={l.market}
                            />
                          ))}
                        </span>
                        <span className="w-28 text-right text-[0.72rem] tabular-nums text-muted-foreground">
                          {firstTeeLabel(player)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-10 text-center shadow-sm">
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function ResearchView({
  canonicalFieldPlayers,
  modelQuality,
  players,
  tournament,
}: {
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  modelQuality: ModelQualitySummary;
  players: PlayerIntelligence[];
  tournament: TournamentIntelligence;
}) {
  const reduce = useReducedMotion() ?? false;
  const [readParam, setReadParam] = useQueryState(
    "read",
    parseAsString.withOptions({ clearOnDefault: true }),
  );
  const [selected, setSelected] = useState<CanonicalFieldPlayer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const canonicalPlayersById = useMemo(
    () => new Map(canonicalFieldPlayers.map((player) => [player.id, player])),
    [canonicalFieldPlayers],
  );

  const activeLens = LENSES.find((l) => l.id === readParam)?.id ?? "shape";

  const openPlayer = useCallback((player: CanonicalFieldPlayer) => {
    setSelected(player);
    setSheetOpen(true);
  }, []);
  const openPlayerById = useCallback(
    (playerId: string) => {
      const player = canonicalPlayersById.get(playerId);

      if (player) {
        openPlayer(player);
      }
    },
    [canonicalPlayersById, openPlayer],
  );

  const modelEdgeCandidates = useMemo(
    () =>
      buildModelEdgeCandidates({
        limit: 6,
        marketTypes: RESEARCH_EDGE_MARKETS,
        players,
      }),
    [players],
  );

  const stats = useMemo(() => {
    const entered = canonicalFieldPlayers.filter(isEntered).length;
    const out = canonicalFieldPlayers.length - entered;
    const countries = new Set(
      canonicalFieldPlayers.map((p) => p.country).filter((c): c is string => Boolean(c)),
    ).size;
    return { countries, entered, out };
  }, [canonicalFieldPlayers]);

  if (canonicalFieldPlayers.length === 0) {
    return <EmptyNote>The field for {tournament.name} hasn't been loaded yet.</EmptyNote>;
  }

  const factLine = [
    `${stats.entered} teeing it up`,
    stats.out > 0 ? `${stats.out} withdrawn` : null,
    `${stats.countries} countries`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <DataLabel>{tournament.name}</DataLabel>
          <h2 className="mt-2 text-pretty text-[1.7rem] font-medium leading-tight tracking-tight text-foreground">
            Read the field
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <SignalDot tone="positive" />
            {factLine}
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <ModelEdgeContextPanel
            candidates={modelEdgeCandidates}
            emptyCopy="No positive model edges across win or place markets."
            onOpenPlayer={openPlayerById}
            quality={modelQuality}
            title="Best model edges"
          />
          <ModelQualityContextCard quality={modelQuality} />
        </section>

        <div className="flex gap-1 border-b border-border/55">
          {LENSES.map((lens) => {
            const active = lens.id === activeLens;
            return (
              <button
                className={cn(
                  "relative flex items-center gap-2 px-2 pb-3 pt-1 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
                key={lens.id}
                onClick={() => void setReadParam(lens.id === "shape" ? null : lens.id)}
                type="button"
              >
                <lens.icon className="size-4" />
                {lens.label}
                {active ? (
                  <motion.span
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground"
                    layoutId="research-lens"
                    transition={springBar}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            key={activeLens}
            transition={{ duration: 0.2, ease: easeOutQuart }}
          >
            {activeLens === "shape" ? (
              <MarketShapeLens onOpen={openPlayer} players={canonicalFieldPlayers} />
            ) : null}
            {activeLens === "draw" ? (
              <DrawLens onOpen={openPlayer} players={canonicalFieldPlayers} />
            ) : null}
            {activeLens === "field" ? (
              <FieldLens onOpen={openPlayer} players={canonicalFieldPlayers} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <CanonicalPlayerSheet onOpenChange={setSheetOpen} open={sheetOpen} player={selected} />
    </>
  );
}
