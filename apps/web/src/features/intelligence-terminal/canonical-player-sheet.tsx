"use client";

import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel, ToneBadge } from "@/components/terminal-primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CanonicalFieldPlayer } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";
import { formatOdds, formatPercent, marketOptions } from "./helpers";

const teeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  weekday: "short",
});

function teeLabel(startsAt: string | null) {
  return startsAt ? teeFormatter.format(new Date(startsAt)) : "Time TBD";
}

export function CanonicalPlayerSheet({
  player,
  open,
  onOpenChange,
}: {
  player: CanonicalFieldPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pricedMarkets = player ? marketOptions.filter((market) => player.odds[market.value]) : [];

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 bg-background sm:max-w-md" showCloseButton side="right">
        {player ? (
          <>
            <SheetHeader className="gap-0 p-5">
              <div className="flex items-center gap-3.5">
                <PlayerPortrait
                  className="size-14 rounded-2xl after:rounded-2xl"
                  fallbackClassName="rounded-2xl"
                  imageClassName="rounded-2xl"
                  name={player.name}
                />
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg">{player.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <span>{player.country ?? "—"}</span>
                    <ToneBadge tone={player.status === "entered" ? "positive" : "warning"}>
                      {player.status}
                    </ToneBadge>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-5 pb-6">
              <div>
                <DataLabel className="mb-2.5">Prices across the board</DataLabel>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-primary-foreground">
                  {pricedMarkets.length > 0 ? (
                    pricedMarkets.map((market) => {
                      const price = player.odds[market.value];
                      if (!price) {
                        return null;
                      }
                      return (
                        <div
                          className="flex items-center justify-between gap-4 border-border/45 border-b px-4 py-3 last:border-0"
                          key={market.value}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {market.label}
                            </div>
                            <div className="text-xs uppercase text-muted-foreground">
                              {price.book}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                              {formatPercent(price.impliedProbability)}
                            </span>
                            <span className="w-16 text-right text-base font-medium tabular-nums text-foreground">
                              {formatOdds(price.americanOdds)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                      No prices loaded for this player yet.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <DataLabel className="mb-2.5">Tee times</DataLabel>
                <div className="flex flex-col gap-2">
                  {player.teeTimes.length > 0 ? (
                    player.teeTimes.map((tee) => (
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-xl border border-border/55 bg-primary-foreground px-4 py-2.5",
                        )}
                        key={`${tee.roundNumber}-${tee.tee}-${tee.startsAt ?? "tbd"}`}
                      >
                        <span className="text-sm font-medium text-foreground">
                          Round {tee.roundNumber}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {teeLabel(tee.startsAt)}
                          {tee.tee ? ` · ${tee.tee} tee` : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-border/55 bg-primary-foreground px-4 py-2.5 text-sm text-muted-foreground">
                      {player.teeWave ?? "Tee times not posted yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
