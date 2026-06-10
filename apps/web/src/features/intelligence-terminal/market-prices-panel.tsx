import type { MarketType } from "@pgatour-ai/domain";
import { useMemo } from "react";
import { TerminalPanel } from "@/components/terminal-primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CanonicalFieldPlayer } from "@/lib/intelligence-types";
import { formatOdds, formatPercent, marketOptions } from "./helpers";

const priceTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

function marketLabel(marketType: MarketType) {
  return marketOptions.find((market) => market.value === marketType)?.label ?? marketType;
}

function formatCapturedAt(value: string) {
  return priceTimeFormatter.format(new Date(value));
}

export function MarketPricesPanel({
  fieldPlayers,
  selectedMarket,
}: {
  fieldPlayers: CanonicalFieldPlayer[];
  selectedMarket: MarketType;
}) {
  const rows = useMemo(
    () =>
      fieldPlayers
        .flatMap((player) => {
          const price = player.odds[selectedMarket];

          return price ? [{ player, price }] : [];
        })
        .sort(
          (left, right) =>
            right.price.impliedProbability - left.price.impliedProbability ||
            left.player.name.localeCompare(right.player.name),
        ),
    [fieldPlayers, selectedMarket],
  );

  return (
    <TerminalPanel
      className="overflow-hidden"
      meta={`${rows.length} priced players`}
      title={`${marketLabel(selectedMarket)} Prices`}
    >
      {rows.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No prices loaded for this market.</div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[780px] w-full border-collapse text-left text-sm">
            <TableHeader className="bg-muted/38 text-[0.68rem] font-medium text-muted-foreground uppercase">
              <TableRow>
                <TableHead className="px-5 py-4">Player</TableHead>
                <TableHead className="px-5 py-4">Status</TableHead>
                <TableHead className="px-5 py-4">Best</TableHead>
                <TableHead className="px-5 py-4">Book</TableHead>
                <TableHead className="px-5 py-4">Implied</TableHead>
                <TableHead className="px-5 py-4">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/55">
              {rows.map(({ player, price }) => (
                <TableRow className="transition-colors hover:bg-muted/32" key={player.id}>
                  <TableCell className="px-5 py-4">
                    <div className="font-medium text-foreground">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.country ?? "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 capitalize text-foreground/76">
                    {player.status}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-medium tabular-nums text-foreground">
                    {formatOdds(price.americanOdds)}
                  </TableCell>
                  <TableCell className="px-5 py-4 uppercase text-foreground/76">
                    {price.book}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums text-foreground/76">
                    {formatPercent(price.impliedProbability)}
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums text-muted-foreground">
                    {formatCapturedAt(price.capturedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TerminalPanel>
  );
}
