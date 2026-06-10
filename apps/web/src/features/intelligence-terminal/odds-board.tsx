import { impliedProbabilityFromAmerican, type MarketType } from "@pgatour-ai/domain";
import { useMemo } from "react";
import { TerminalPanel, ToneBadge } from "@/components/terminal-primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerIntelligence } from "@/lib/intelligence-types";
import {
  confidenceTone,
  formatOdds,
  formatPercent,
  marketEdgeRows,
  marketOptions,
} from "./helpers";
import { PlayerIdentity } from "./player-identity";
import { Sparkline } from "./visuals";

export function OddsBoard({
  players,
  selectedMarket,
  edgeFloor,
}: {
  players: PlayerIntelligence[];
  selectedMarket: MarketType;
  edgeFloor: number;
}) {
  const rows = useMemo(
    () => marketEdgeRows(players, selectedMarket, edgeFloor),
    [players, selectedMarket, edgeFloor],
  );

  return (
    <TerminalPanel
      meta={`${rows.length} players over edge floor`}
      title="Sample Mispricing Board"
      className="overflow-hidden"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <TableHeader className="bg-muted/38 text-[0.68rem] font-medium text-muted-foreground uppercase">
            <TableRow>
              <TableHead className="px-5 py-4">Player</TableHead>
              <TableHead className="px-5 py-4">Market</TableHead>
              <TableHead className="px-5 py-4">Best</TableHead>
              <TableHead className="px-5 py-4">Fair</TableHead>
              <TableHead className="px-5 py-4">Edge</TableHead>
              <TableHead className="px-5 py-4">No-vig</TableHead>
              <TableHead className="px-5 py-4">Confidence</TableHead>
              <TableHead className="px-5 py-4">Line</TableHead>
              <TableHead className="px-5 py-4">Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/55">
            {rows.map(({ player, edge }) => {
              if (!edge) {
                return null;
              }

              return (
                <TableRow className="transition-colors hover:bg-muted/32" key={player.id}>
                  <TableCell className="px-5 py-4">
                    <PlayerIdentity meta={player.archetype} player={player} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-foreground/76">
                    {marketOptions.find((market) => market.value === selectedMarket)?.label}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-medium tabular-nums text-foreground">
                    {formatOdds(edge.marketOdds)}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums text-foreground/76">
                    {formatOdds(edge.fairOdds)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="font-medium tabular-nums text-positive">
                      {edge.edge.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums text-foreground/76">
                    {formatPercent(impliedProbabilityFromAmerican(edge.marketOdds))}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <ToneBadge tone={confidenceTone(player.confidence)}>
                      {player.confidence}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-muted-foreground">
                    <Sparkline values={player.lineMovement} />
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal px-5 py-4 text-xs leading-5 text-muted-foreground">
                    {player.drivers[0]}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TerminalPanel>
  );
}
