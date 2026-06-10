"use client";

import { ListChecked } from "@carbon/icons-react";
import type { Variants } from "framer-motion";

import { PlayerPortrait } from "@/components/player-portrait";
import { DataLabel, TerminalPanel, ToneBadge } from "@/components/terminal-primitives";
import type { CanonicalFieldPlayer, IntelligenceSourceState } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";

function formatTeeTime(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(" ", "");
}

function teeLine(player: CanonicalFieldPlayer) {
  if (player.teeTimes.length > 0) {
    return player.teeTimes
      .slice(0, 2)
      .map((teeTime) => `R${teeTime.roundNumber} ${formatTeeTime(teeTime.startsAt)}`)
      .join("  ·  ");
  }
  return player.teeWave ?? player.country ?? "Field entry";
}

export function CanonicalFieldPanel({
  fieldPlayers,
  sourceState,
  className,
  maxRows = 60,
  variants,
}: {
  fieldPlayers: CanonicalFieldPlayer[];
  sourceState: IntelligenceSourceState;
  className?: string;
  maxRows?: number;
  variants?: Variants;
}) {
  const ready = sourceState.canonicalStatus === "ready";
  const rows = fieldPlayers.slice(0, maxRows);

  return (
    <TerminalPanel
      className={className}
      contentClassName="flex flex-col"
      icon={<ListChecked className="size-4" />}
      meta={ready ? `${fieldPlayers.length} players` : sourceState.canonicalLabel}
      title="Canonical Field"
      {...(variants ? { variants } : {})}
    >
      {rows.length > 0 ? (
        <>
          <div className="flex items-center justify-between border-b border-border/45 px-4 py-2 sm:px-5">
            <DataLabel>Player</DataLabel>
            <DataLabel>Status</DataLabel>
          </div>
          <div className="scroll-fade-y no-scrollbar max-h-[clamp(28rem,52vh,40rem)] overflow-y-auto">
            <ul className="px-2 py-1.5">
              {rows.map((player, index) => (
                <li key={player.id}>
                  <div
                    className={cn(
                      "group/row grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] px-2.5 py-2",
                      "transition-colors duration-150 hover:bg-muted/45",
                    )}
                  >
                    <span className="text-right text-[0.72rem] font-medium tabular-nums text-muted-foreground/55">
                      {index + 1}
                    </span>
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
                      <div className="truncate text-[0.72rem] leading-tight text-muted-foreground tabular-nums">
                        {teeLine(player)}
                      </div>
                    </div>
                    <ToneBadge tone={player.status === "entered" ? "positive" : "warning"}>
                      {player.status}
                    </ToneBadge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="p-5 text-sm text-muted-foreground">{sourceState.canonicalHelper}</div>
      )}
    </TerminalPanel>
  );
}
