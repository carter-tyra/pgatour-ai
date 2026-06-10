import { Commit } from "@carbon/icons-react";
import type { MarketType } from "@pgatour-ai/domain";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { marketOptions } from "./helpers";

export function MarketControls({
  selectedMarket,
  edgeFloor,
  showEdgeFloor = true,
  onMarketChange,
  onEdgeFloorChange,
}: {
  selectedMarket: MarketType;
  edgeFloor: number;
  showEdgeFloor?: boolean;
  onMarketChange: (market: MarketType) => void;
  onEdgeFloorChange: (edgeFloor: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup
        className="max-w-full flex-wrap rounded-[1.15rem] border border-border/70 bg-card/78 p-1.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.78)]"
        onValueChange={(value: string[]) => {
          const nextMarket = value[0];

          if (nextMarket) {
            onMarketChange(nextMarket as MarketType);
          }
        }}
        size="sm"
        spacing={0}
        value={[selectedMarket]}
        variant="default"
      >
        {marketOptions.map((market) => (
          <ToggleGroupItem
            className="h-9 rounded-[0.85rem] px-3 text-sm font-medium text-muted-foreground transition data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_10px_24px_oklch(0.18_0.006_95/0.16)]"
            key={market.value}
            value={market.value}
          >
            {market.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {showEdgeFloor ? (
        <div className="inline-flex h-12 items-center gap-3 rounded-[1.15rem] border border-border/70 bg-card/78 px-4 text-xs font-medium text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.78)]">
          <Commit className="size-3.5" />
          Edge
          <Slider
            aria-label="Edge floor"
            className="w-32"
            max={12}
            min={0}
            onValueChange={(value) =>
              onEdgeFloorChange(Array.isArray(value) ? (value[0] ?? edgeFloor) : value)
            }
            step={0.5}
            value={[edgeFloor]}
          />
          <span className="min-w-10 text-right tabular-nums">{edgeFloor.toFixed(1)}%</span>
        </div>
      ) : null}
    </div>
  );
}
