"use client";

import { ChartLine, CheckmarkFilled, Copy, Launch, ListChecked, Trophy } from "@carbon/icons-react";
import type { MarketType } from "@pgatour-ai/domain";
import { motion, useReducedMotion } from "framer-motion";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { PlayerPortrait } from "@/components/player-portrait";
import {
  DualButton,
  DualButtonAction,
  DualButtonTriggerButton,
} from "@/components/product/dual-button";
import { FloatingToolbar } from "@/components/product/floating-toolbar";
import { DataLabel, SignalDot, ToneBadge } from "@/components/terminal-primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClipboard } from "@/hooks/use-clipboard";
import { modelEdgeFor } from "@/lib/intelligence-math";
import type {
  CanonicalFieldPlayer,
  IntelligenceSourceState,
  MarketPrice,
  ModelQualitySummary,
  PlayerIntelligence,
} from "@/lib/intelligence-types";
import { motionSet } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CanonicalPlayerSheet } from "./canonical-player-sheet";
import { ChapterHeading, ChapterRail, useScrollSpy } from "./chapter-nav";
import { formatOdds, formatPercent, marketOptions } from "./helpers";
import {
  buildModelEdgeCandidates,
  formatEdgePercent,
  ModelEdgeContextPanel,
  ModelQualityContextCard,
} from "./model-quality-surface";

type PricedPlayer = {
  edge: ReturnType<typeof modelEdgeFor>;
  player: CanonicalFieldPlayer;
  price: MarketPrice;
};

const CHAPTERS = [
  { id: "shortest", label: "Shortest prices", icon: Trophy },
  { id: "board", label: "The full board", icon: ListChecked },
  { id: "longshots", label: "Longshots", icon: ChartLine },
] as const;

const teeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  weekday: "short",
});

function teeLabel(player: CanonicalFieldPlayer) {
  const startsAt = player.teeTimes[0]?.startsAt;
  if (startsAt) {
    return teeFormatter.format(new Date(startsAt));
  }
  return player.teeWave ?? "Tee TBD";
}

function ImpliedBar({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
      <motion.span
        className="block h-full origin-left rounded-full bg-[var(--citrus)]"
        initial={reduce ? { scaleX: pct / 100 } : { scaleX: 0 }}
        style={{ width: "100%" }}
        transition={{ type: "spring", stiffness: 190, damping: 26 }}
        viewport={{ margin: "-40px", once: true }}
        whileInView={{ scaleX: pct / 100 }}
      />
    </div>
  );
}

function MarketSwitcher({
  markets,
  selected,
  onSelect,
}: {
  markets: typeof marketOptions;
  selected: MarketType;
  onSelect: (market: MarketType) => void;
}) {
  if (markets.length <= 1) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-border/70 bg-primary-foreground px-3.5 py-1.5 text-sm font-medium text-foreground">
        <SignalDot tone="info" />
        {markets[0]?.label ?? "Outright"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-border/70 bg-primary-foreground p-1">
      {markets.map((market) => {
        const isActive = market.value === selected;
        return (
          <button
            className="relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            key={market.value}
            onClick={() => onSelect(market.value)}
            type="button"
          >
            {isActive ? (
              <motion.span
                className="absolute inset-0 rounded-full bg-background"
                layoutId="market-pill"
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {market.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FavoriteHero({
  row,
  onOpen,
}: {
  row: PricedPlayer;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const { player, price } = row;
  return (
    <div className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
      <div className="grid sm:grid-cols-[12rem_1fr]">
        <div className="hidden bg-background p-5 sm:block">
          <PlayerPortrait
            className="size-36 rounded-2xl after:rounded-2xl"
            fallbackClassName="rounded-2xl text-3xl"
            imageClassName="rounded-2xl"
            name={player.name}
          />
          <div className="mt-4">
            <DataLabel>Tees off</DataLabel>
            <div className="mt-1 text-xs text-muted-foreground">{teeLabel(player)}</div>
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DataLabel>Shortest price</DataLabel>
              <div className="mt-1.5 flex items-center gap-2.5">
                <PlayerPortrait
                  className="size-10 rounded-xl after:rounded-xl sm:hidden"
                  fallbackClassName="rounded-xl"
                  imageClassName="rounded-xl"
                  name={player.name}
                />
                <h4 className="truncate text-2xl font-medium leading-none tracking-tight text-foreground">
                  {player.name}
                </h4>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{player.country ?? "—"}</span>
                <ToneBadge tone={player.status === "entered" ? "positive" : "warning"}>
                  {player.status}
                </ToneBadge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[2.75rem] font-medium leading-none tabular-nums text-foreground">
                {formatOdds(price.americanOdds)}
              </div>
              <div className="mt-1 text-xs uppercase text-muted-foreground">{price.book}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Chance to win, by the price</span>
              <span className="text-sm font-medium tabular-nums text-foreground">
                {formatPercent(price.impliedProbability)}
              </span>
            </div>
            <ImpliedBar value={price.impliedProbability} />
          </div>

          <div className="mt-6">
            <button
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground active:scale-[0.97]"
              onClick={() => onOpen(player)}
              type="button"
            >
              See every price
              <Launch className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCard({
  row,
  onOpen,
}: {
  row: PricedPlayer;
  onOpen: (player: CanonicalFieldPlayer) => void;
}) {
  const { player, price } = row;
  return (
    <button
      className="group flex flex-col gap-4 p-5 text-left transition-colors hover:bg-background active:scale-[0.99]"
      onClick={() => onOpen(player)}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerPortrait
            className="size-10 rounded-xl after:rounded-xl"
            fallbackClassName="rounded-xl"
            imageClassName="rounded-xl"
            name={player.name}
          />
          <div className="min-w-0">
            <div className="truncate font-medium leading-tight text-foreground">{player.name}</div>
            <div className="truncate text-xs text-muted-foreground">{player.country ?? "—"}</div>
          </div>
        </div>
        <div className="text-lg font-medium tabular-nums text-foreground">
          {formatOdds(price.americanOdds)}
        </div>
      </div>
      <ImpliedBar value={price.impliedProbability} />
    </button>
  );
}

export function BettingView({
  canonicalFieldPlayers,
  modelQuality,
  players,
  sourceState,
}: {
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  modelQuality: ModelQualitySummary;
  players: PlayerIntelligence[];
  sourceState: IntelligenceSourceState;
}) {
  const reduce = useReducedMotion() ?? false;
  const { container, item } = motionSet(reduce);
  const { active, scrollTo, rootRef } = useScrollSpy(useMemo(() => CHAPTERS.map((c) => c.id), []));
  const [copied, copy] = useClipboard();
  const [marketParam, setMarketParam] = useQueryState(
    "market",
    parseAsString.withOptions({ clearOnDefault: true }),
  );
  const [selected, setSelected] = useState<CanonicalFieldPlayer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const canonicalPlayersById = useMemo(
    () => new Map(canonicalFieldPlayers.map((player) => [player.id, player])),
    [canonicalFieldPlayers],
  );
  const modelPlayersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const availableMarkets = useMemo(
    () => marketOptions.filter((m) => canonicalFieldPlayers.some((p) => p.odds[m.value])),
    [canonicalFieldPlayers],
  );
  const activeMarket: MarketType = (availableMarkets.find((m) => m.value === marketParam)?.value ??
    availableMarkets[0]?.value ??
    "outright") as MarketType;
  const onMarketChange = (market: MarketType) => {
    void setMarketParam(market);
  };

  const priced = useMemo<PricedPlayer[]>(() => {
    return canonicalFieldPlayers
      .flatMap((player) => {
        const price = player.odds[activeMarket];
        const modelPlayer = modelPlayersById.get(player.id);
        return price
          ? [{ edge: modelPlayer ? modelEdgeFor(modelPlayer, activeMarket) : null, player, price }]
          : [];
      })
      .sort(
        (a, b) =>
          b.price.impliedProbability - a.price.impliedProbability ||
          a.player.name.localeCompare(b.player.name),
      );
  }, [canonicalFieldPlayers, modelPlayersById, activeMarket]);

  const modelEdgeCandidates = useMemo(
    () =>
      buildModelEdgeCandidates({
        limit: 6,
        marketTypes: [activeMarket],
        players,
      }),
    [players, activeMarket],
  );

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

  const marketLabel = marketOptions.find((m) => m.value === activeMarket)?.label ?? "Outright";

  const copyBoard = (withBook: boolean) => {
    const lines = priced.map(({ player, price }) =>
      withBook
        ? `${player.name}\t${formatOdds(price.americanOdds)}\t${price.book}\t${formatPercent(price.impliedProbability)}`
        : `${player.name}\t${formatOdds(price.americanOdds)}`,
    );
    copy(lines.join("\n"));
  };

  const toolbarItems = useMemo(
    () =>
      CHAPTERS.map((chapter, index) => ({
        id: chapter.id,
        label: chapter.label,
        icon: <chapter.icon size={20} />,
        shortcut: String(index + 1),
        hasDot: false,
      })),
    [],
  );

  if (priced.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-10 text-center shadow-sm">
        <DataLabel>No live odds yet</DataLabel>
        <p className="max-w-sm text-sm text-muted-foreground">{sourceState.marketHelper}</p>
      </div>
    );
  }

  const favorite = priced[0];
  const nextShortest = priced.slice(1, 5);
  const longshots = priced.slice(-6).reverse();

  return (
    <>
      <motion.div animate="visible" initial="hidden" ref={rootRef} variants={container}>
        <div className="grid gap-6 lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:gap-8">
          <motion.aside className="hidden lg:block" variants={item}>
            <div className="sticky top-16">
              <ChapterRail chapters={CHAPTERS} />
            </div>
          </motion.aside>

          <motion.div className="flex min-w-0 flex-col gap-12" variants={item}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-pretty text-[1.6rem] font-medium leading-tight tracking-tight text-foreground">
                  Where the money is
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live {marketLabel.toLowerCase()} prices across the field.
                </p>
              </div>
              <MarketSwitcher
                markets={availableMarkets}
                onSelect={onMarketChange}
                selected={activeMarket}
              />
            </div>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <ModelEdgeContextPanel
                candidates={modelEdgeCandidates}
                emptyCopy={`No positive model edges for ${marketLabel.toLowerCase()}.`}
                onOpenPlayer={openPlayerById}
                quality={modelQuality}
                title={`${marketLabel} model edges`}
              />
              <ModelQualityContextCard quality={modelQuality} />
            </section>

            <section className="scroll-mt-6" id="shortest">
              <ChapterHeading
                hint="The names the market trusts most"
                index="01"
                title="Shortest prices"
              />
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                {favorite ? <FavoriteHero onOpen={openPlayer} row={favorite} /> : null}
                <div className="grid divide-y divide-border/55 overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
                  {nextShortest.map((row) => (
                    <PriceCard key={row.player.id} onOpen={openPlayer} row={row} />
                  ))}
                </div>
              </div>
            </section>

            <section className="scroll-mt-6" id="board">
              <ChapterHeading
                hint={`Every priced player, sorted by ${marketLabel.toLowerCase()} chance`}
                index="02"
                title="The full board"
              />
              <div className="mt-5 overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border/55 bg-background px-4 py-3">
                  <div>
                    <DataLabel>{marketLabel}</DataLabel>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {priced.length} priced players
                    </div>
                  </div>
                  <DualButton>
                    <DualButtonAction onClick={() => copyBoard(true)}>
                      {copied ? <CheckmarkFilled /> : <Copy />}
                      Copy board
                    </DualButtonAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<DualButtonTriggerButton aria-label="More export options" />}
                      />
                      <DropdownMenuContent align="end" className="bg-background rounded-lg">
                        <DropdownMenuItem
                          className="cursor-pointer text-[13px] text-muted-foreground/80 hover:text-primary!"
                          onClick={() => copyBoard(false)}
                        >
                          Names and prices
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-[13px] text-muted-foreground/80 hover:text-primary!"
                          onClick={() => copyBoard(true)}
                        >
                          With book and chance
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DualButton>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/55 text-[0.66rem] font-medium uppercase tracking-wide text-muted-foreground/70">
                        <th className="px-4 py-2.5 font-medium">Player</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 text-right font-medium">Best</th>
                        <th className="px-3 py-2.5 font-medium">Book</th>
                        <th className="px-3 py-2.5 font-medium">Chance</th>
                        <th className="px-3 py-2.5 text-right font-medium">Model</th>
                        <th className="px-3 py-2.5 text-right font-medium">EV</th>
                        <th className="px-4 py-2.5 font-medium">Tees off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priced.map(({ edge, player, price }) => (
                        <tr
                          className="cursor-pointer border-b border-border/40 transition-colors duration-150 last:border-0 hover:bg-background"
                          key={player.id}
                          onClick={() => openPlayer(player)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <PlayerPortrait
                                className="size-8 rounded-lg after:rounded-lg"
                                fallbackClassName="rounded-lg text-[0.65rem]"
                                imageClassName="rounded-lg"
                                name={player.name}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">
                                  {player.name}
                                </div>
                                <div className="truncate text-[0.7rem] text-muted-foreground">
                                  {player.country ?? "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 capitalize text-muted-foreground">
                            {player.status}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                            {formatOdds(price.americanOdds)}
                          </td>
                          <td className="px-3 py-2.5 uppercase text-muted-foreground">
                            {price.book}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-20">
                                <ImpliedBar value={price.impliedProbability} />
                              </span>
                              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                                {formatPercent(price.impliedProbability)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {edge ? formatPercent(edge.modelProbability) : "N/A"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right font-medium tabular-nums",
                              edge && edge.edge > 0
                                ? "text-[var(--positive)]"
                                : "text-muted-foreground",
                            )}
                          >
                            {edge ? formatEdgePercent(edge.edge) : "N/A"}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                            {teeLabel(player)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="scroll-mt-6" id="longshots">
              <ChapterHeading hint="The longest prices on the board" index="03" title="Longshots" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {longshots.map((row) => (
                  <div
                    className="overflow-hidden rounded-2xl corner-squircle border border-border/70 bg-primary-foreground shadow-sm"
                    key={row.player.id}
                  >
                    <PriceCard onOpen={openPlayer} row={row} />
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </div>

        <div className="pointer-events-none sticky bottom-5 z-30 mt-10 flex justify-center">
          <div className="pointer-events-auto">
            <FloatingToolbar activeId={active} items={toolbarItems} onSelect={scrollTo} />
          </div>
        </div>
      </motion.div>

      <CanonicalPlayerSheet onOpenChange={setSheetOpen} open={sheetOpen} player={selected} />
    </>
  );
}
