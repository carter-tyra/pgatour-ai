"use client";

import { Add, ArrowLeft, Search, TrashCan } from "@carbon/icons-react";
import { impliedProbabilityFromAmerican, type MarketType } from "@pgatour-ai/domain";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel, ToneBadge } from "@/components/terminal-primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  trackerSnapshotQueryOptions,
  useCreateTrackerBetMutation,
  useDeleteTrackerBetMutation,
} from "@/features/tracker/queries";
import type { TrackerBet, TrackerSnapshot } from "@/features/tracker/types";
import type { CanonicalFieldPlayer, TournamentIntelligence } from "@/lib/intelligence-types";
import { easeOutQuart } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatCurrency, formatOdds, marketOptions } from "./helpers";

function marketLabel(market: MarketType) {
  return marketOptions.find((m) => m.value === market)?.label ?? market.replaceAll("_", " ");
}

function statusTone(status: TrackerBet["status"]) {
  if (status === "won") {
    return "positive" as const;
  }
  if (status === "lost") {
    return "danger" as const;
  }
  if (status === "open") {
    return "info" as const;
  }
  return "neutral" as const;
}

export function PortfolioView({
  initialSnapshot,
  canonicalFieldPlayers,
  tournament,
}: {
  initialSnapshot: TrackerSnapshot;
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  tournament: TournamentIntelligence;
}) {
  const reduce = useReducedMotion() ?? false;
  const [addOpen, setAddOpen] = useState(false);

  const { data } = useQuery({ ...trackerSnapshotQueryOptions(), initialData: initialSnapshot });
  const snapshot = data ?? initialSnapshot;
  const bets = snapshot.bets;
  const summary = snapshot.summary;

  const deleteBet = useDeleteTrackerBetMutation();

  const fieldById = useMemo(
    () => new Map(canonicalFieldPlayers.map((p) => [p.id, p])),
    [canonicalFieldPlayers],
  );

  return (
    <>
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-pretty text-[1.7rem] font-medium leading-tight tracking-tight text-foreground">
              Your book
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {bets.length > 0
                ? `${formatCurrency(summary.openStake)} live across ${summary.openBetCount} open ${
                    summary.openBetCount === 1 ? "bet" : "bets"
                  }${summary.settledBetCount > 0 ? ` · ${summary.settledBetCount} settled` : ""}`
                : `Track what you're holding on ${tournament.name}.`}
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
            onClick={() => setAddOpen(true)}
            type="button"
          >
            <Add className="size-4" />
            Track a bet
          </button>
        </header>

        {bets.length === 0 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[34vh] flex-col items-center justify-center gap-4 rounded-2xl corner-squircle border border-border/70 border-dashed bg-primary-foreground p-10 text-center shadow-sm"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.4, ease: easeOutQuart }}
          >
            <div>
              <div className="text-base font-medium text-foreground">No bets tracked yet</div>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                Add a position and we'll watch your number against the live board.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground active:scale-[0.97]"
              onClick={() => setAddOpen(true)}
              type="button"
            >
              <Add className="size-4" />
              Track your first bet
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {bets.map((bet) => {
              const current = fieldById.get(bet.playerId)?.odds[bet.marketType];
              const clv = current
                ? impliedProbabilityFromAmerican(bet.americanOdds) -
                  impliedProbabilityFromAmerican(current.americanOdds)
                : null;
              return (
                <div
                  className="flex flex-wrap items-center gap-4 rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-4 shadow-sm"
                  key={bet.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PlayerPortrait
                      className="size-11 rounded-xl after:rounded-xl"
                      fallbackClassName="rounded-xl"
                      imageClassName="rounded-xl"
                      name={bet.playerName}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {bet.playerName}
                        </span>
                        <ToneBadge tone={statusTone(bet.status)}>{bet.status}</ToneBadge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {marketLabel(bet.marketType)} · {bet.book}
                        {bet.thesis ? ` · ${bet.thesis}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <DataLabel>Stake</DataLabel>
                      <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(bet.stake)}
                      </div>
                    </div>
                    <div className="text-right">
                      <DataLabel>Your price</DataLabel>
                      <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatOdds(bet.americanOdds)}
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <DataLabel>Now</DataLabel>
                      <div
                        className={cn(
                          "mt-1 text-sm font-medium tabular-nums",
                          clv === null
                            ? "text-muted-foreground"
                            : clv > 0
                              ? "text-[var(--positive)]"
                              : clv < 0
                                ? "text-[var(--rose)]"
                                : "text-foreground",
                        )}
                      >
                        {current ? formatOdds(current.americanOdds) : "—"}
                      </div>
                    </div>
                    <button
                      aria-label={`Remove ${bet.playerName} bet`}
                      className="grid size-9 place-items-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:text-[var(--danger)] active:scale-[0.95] disabled:opacity-50"
                      disabled={deleteBet.isPending}
                      onClick={() => deleteBet.mutate(bet.id)}
                      type="button"
                    >
                      <TrashCan className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {snapshot.watchlists.length > 0 ? (
          <section>
            <DataLabel className="mb-3">Watchlists</DataLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.watchlists.map((watchlist) => (
                <div
                  className="rounded-2xl corner-squircle border border-border/70 bg-primary-foreground p-4 shadow-sm"
                  key={watchlist.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{watchlist.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {watchlist.players.length}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-xs text-muted-foreground">
                    {watchlist.players.map((player) => player.name).join(", ") || "Empty"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <AddBetSheet
        canonicalFieldPlayers={canonicalFieldPlayers}
        onOpenChange={setAddOpen}
        open={addOpen}
        tournamentId={tournament.id}
      />
    </>
  );
}

function AddBetSheet({
  open,
  onOpenChange,
  canonicalFieldPlayers,
  tournamentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canonicalFieldPlayers: CanonicalFieldPlayer[];
  tournamentId: string;
}) {
  const createBet = useCreateTrackerBetMutation();
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<CanonicalFieldPlayer | null>(null);
  const [market, setMarket] = useState<MarketType>("outright");
  const [odds, setOdds] = useState("");
  const [book, setBook] = useState("DraftKings");
  const [stake, setStake] = useState("");
  const [thesis, setThesis] = useState("");

  const entered = useMemo(
    () => canonicalFieldPlayers.filter((p) => p.status === "entered"),
    [canonicalFieldPlayers],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entered.filter((p) => p.name.toLowerCase().includes(q)) : entered;
  }, [entered, query]);

  function reset() {
    setQuery("");
    setPlayer(null);
    setMarket("outright");
    setOdds("");
    setBook("DraftKings");
    setStake("");
    setThesis("");
    createBet.reset();
  }

  function pickPlayer(next: CanonicalFieldPlayer) {
    setPlayer(next);
    const priced = marketOptions.find((m) => next.odds[m.value]);
    const nextMarket = priced?.value ?? "outright";
    setMarket(nextMarket);
    const price = next.odds[nextMarket];
    setOdds(price ? String(price.americanOdds) : "");
    setBook(price?.book ?? "DraftKings");
  }

  function changeMarket(next: MarketType) {
    setMarket(next);
    if (player) {
      const price = player.odds[next];
      if (price) {
        setOdds(String(price.americanOdds));
        setBook(price.book);
      }
    }
  }

  function close(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  const canSubmit =
    player !== null && Number(stake) > 0 && Number.isFinite(Number(odds)) && Number(odds) !== 0;

  function submit() {
    if (!player) {
      return;
    }
    createBet.mutate(
      {
        americanOdds: Number(odds),
        book: book.trim() || "DraftKings",
        marketType: market,
        playerId: player.id,
        stake: Number(stake),
        thesis: thesis.trim() || undefined,
        tournamentId,
      },
      { onSuccess: () => close(false) },
    );
  }

  return (
    <Sheet onOpenChange={close} open={open}>
      <SheetContent className="w-full gap-0 bg-background sm:max-w-md" showCloseButton side="right">
        <SheetHeader className="gap-1 p-5">
          <SheetTitle className="text-lg">Track a bet</SheetTitle>
          <SheetDescription>Pick from the live field and we'll pull the price.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6">
          {player === null ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-primary-foreground px-3.5 py-2.5">
                <Search className="size-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the field"
                  type="text"
                  value={query}
                />
              </div>
              <ul className="mt-3 flex min-h-0 flex-1 flex-col divide-y divide-border/40 overflow-y-auto">
                {filtered.map((candidate) => {
                  const price = candidate.odds.outright;
                  return (
                    <li key={candidate.id}>
                      <button
                        className="flex w-full items-center gap-3 py-2.5 text-left transition-opacity hover:opacity-80 active:scale-[0.99]"
                        onClick={() => pickPlayer(candidate)}
                        type="button"
                      >
                        <PlayerPortrait
                          className="size-9 rounded-lg after:rounded-lg"
                          fallbackClassName="rounded-lg text-[0.65rem]"
                          imageClassName="rounded-lg"
                          name={candidate.name}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {candidate.name}
                          </div>
                          <div className="truncate text-[0.7rem] text-muted-foreground">
                            {candidate.country ?? "—"}
                          </div>
                        </div>
                        {price ? (
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatOdds(price.americanOdds)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-primary-foreground p-3">
                <PlayerPortrait
                  className="size-10 rounded-lg after:rounded-lg"
                  fallbackClassName="rounded-lg"
                  imageClassName="rounded-lg"
                  name={player.name}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{player.name}</div>
                  <div className="truncate text-[0.7rem] text-muted-foreground">
                    {player.country ?? "—"}
                  </div>
                </div>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setPlayer(null)}
                  type="button"
                >
                  <ArrowLeft className="size-3.5" />
                  Change
                </button>
              </div>

              <Field label="Market">
                <select
                  className="w-full rounded-xl border border-border/60 bg-primary-foreground px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-border"
                  onChange={(event) => changeMarket(event.target.value as MarketType)}
                  value={market}
                >
                  {marketOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {player.odds[option.value] ? " · priced" : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stake (USD)">
                  <input
                    className="w-full rounded-xl border border-border/60 bg-primary-foreground px-3 py-2.5 text-sm text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-border"
                    inputMode="decimal"
                    onChange={(event) => setStake(event.target.value)}
                    placeholder="100"
                    value={stake}
                  />
                </Field>
                <Field label="American odds">
                  <input
                    className="w-full rounded-xl border border-border/60 bg-primary-foreground px-3 py-2.5 text-sm text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-border"
                    inputMode="numeric"
                    onChange={(event) => setOdds(event.target.value)}
                    placeholder="+290"
                    value={odds}
                  />
                </Field>
              </div>

              <Field label="Book">
                <input
                  className="w-full rounded-xl border border-border/60 bg-primary-foreground px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-border"
                  onChange={(event) => setBook(event.target.value)}
                  placeholder="DraftKings"
                  value={book}
                />
              </Field>

              <Field label="Thesis (optional)">
                <textarea
                  className="min-h-16 w-full resize-none rounded-xl border border-border/60 bg-primary-foreground px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-border"
                  onChange={(event) => setThesis(event.target.value)}
                  placeholder="Why you like it"
                  value={thesis}
                />
              </Field>

              {createBet.isError ? (
                <p className="text-sm text-[var(--danger)]">
                  {createBet.error instanceof Error
                    ? createBet.error.message
                    : "Could not save that bet."}
                </p>
              ) : null}

              <button
                className="mt-auto flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit || createBet.isPending}
                onClick={submit}
                type="button"
              >
                {createBet.isPending ? "Saving…" : "Add to book"}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <DataLabel>{label}</DataLabel>
      {children}
    </div>
  );
}
