"use client";

import type { MarketType } from "@pgatour-ai/domain";
import { PlayerPortrait } from "@/components/player-portrait";
import { CardContainer } from "@/components/product/card-container";
import { DataLabel, ToneBadge } from "@/components/terminal-primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PlayerIntelligence } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";
import { confidenceTone, formatOdds, formatPercent, marketOptions } from "./helpers";
import { SkillBar } from "./visuals";

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <DataLabel>{label}</DataLabel>
      <div className="mt-1.5 text-xl font-medium tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function FormTab({ player }: { player: PlayerIntelligence }) {
  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SkillBar label="Recent form" tone="positive" value={player.form} />
        <SkillBar label="Fits this course" tone="citrus" value={player.courseFit} />
      </div>
      <div>
        <DataLabel>What's working</DataLabel>
        <ul className="mt-2.5 space-y-2">
          {player.drivers.map((driver) => (
            <li className="flex items-start gap-2.5 text-sm text-foreground/85" key={driver}>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--positive)]" />
              {driver}
            </li>
          ))}
        </ul>
      </div>
      {player.risks.length > 0 ? (
        <div>
          <DataLabel>Worth watching</DataLabel>
          <ul className="mt-2.5 space-y-2">
            {player.risks.map((risk) => (
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground" key={risk}>
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FitTab({ player }: { player: PlayerIntelligence }) {
  const rows: Array<{ label: string; value: number }> = [
    { label: "Tee to green", value: player.strokesGained.offTee },
    { label: "Approach", value: player.strokesGained.approach },
    { label: "Putting", value: player.strokesGained.putting },
    { label: "All of it", value: player.strokesGained.total },
  ];

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      {rows.map((row, index) => (
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-xl px-3.5 py-3",
            index === rows.length - 1 ? "bg-background" : "hover:bg-background/60",
          )}
          key={row.label}
        >
          <span className="text-sm font-medium text-foreground/85">{row.label}</span>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/70">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(6, (row.value + 2) * 25))}%`,
                  background: row.value >= 0 ? "var(--positive)" : "var(--rose)",
                }}
              />
            </span>
            <span
              className={cn(
                "w-12 text-right text-sm font-medium tabular-nums",
                row.value >= 0 ? "text-[var(--positive)]" : "text-[var(--rose)]",
              )}
            >
              {signed(row.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketsTab({ player }: { player: PlayerIntelligence }) {
  return (
    <div className="flex h-full flex-col p-2">
      {marketOptions.map((market) => {
        const price = player.currentOdds[market.value as MarketType];
        return (
          <div
            className="flex items-center justify-between border-border/45 border-b px-3.5 py-2.5 last:border-0"
            key={market.value}
          >
            <span className="text-sm text-muted-foreground">{market.label}</span>
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                price === null || price === undefined
                  ? "text-muted-foreground/50"
                  : "text-foreground",
              )}
            >
              {formatOdds(price ?? null)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PlayerDetailSheet({
  player,
  open,
  onOpenChange,
}: {
  player: PlayerIntelligence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
                    <span>{player.country}</span>
                    <ToneBadge tone={confidenceTone(player.confidence)}>{player.tier}</ToneBadge>
                  </SheetDescription>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-primary-foreground p-4">
                <QuickStat label="Fits course" value={String(player.courseFit)} />
                <QuickStat label="Form" value={String(player.form)} />
                <QuickStat label="Win" value={formatPercent(player.winProbability)} />
              </div>
            </SheetHeader>

            <div className="px-5 pb-6">
              <CardContainer
                align="start"
                className="mt-0 mb-0"
                title={player.name}
                tabs={[
                  { value: "form", label: "Form", content: <FormTab player={player} /> },
                  { value: "fit", label: "Fit", content: <FitTab player={player} /> },
                  { value: "markets", label: "Markets", content: <MarketsTab player={player} /> },
                ]}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
