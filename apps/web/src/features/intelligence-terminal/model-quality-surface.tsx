"use client";

import type { MarketType } from "@pgatour-ai/domain";
import { DataLabel, SignalDot, ToneBadge } from "@/components/terminal-primitives";
import { modelEdgeFor } from "@/lib/intelligence-math";
import type { ModelQualitySummary, PlayerIntelligence } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";
import { formatOdds, formatPercent, marketOptions } from "./helpers";

type Tone = "danger" | "info" | "neutral" | "positive" | "warning";

export type ModelEdgeCandidate = {
  edge: NonNullable<ReturnType<typeof modelEdgeFor>>;
  marketType: MarketType;
  player: PlayerIntelligence;
};

export type BuildModelEdgeCandidatesInput = {
  limit?: number;
  marketTypes: readonly MarketType[];
  minEdgePercent?: number;
  players: PlayerIntelligence[];
};

export function modelQualityTone(quality: ModelQualitySummary): Tone {
  if (quality.status === "validated") {
    return "positive";
  }

  if (quality.status === "limited" || quality.status === "unvalidated") {
    return "warning";
  }

  return "danger";
}

export function modelQualityActionLabel(quality: ModelQualitySummary) {
  if (quality.canAutomate) {
    return "Validated";
  }

  if (quality.status === "unavailable") {
    return "Unavailable";
  }

  return "Limited";
}

export function formatSignedPoints(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const points = value * 100;
  const sign = points > 0 ? "+" : "";

  return `${sign}${points.toFixed(1)} pts`;
}

export function formatEdgePercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}% EV`;
}

export function marketLabel(marketType: MarketType) {
  return marketOptions.find((market) => market.value === marketType)?.label ?? marketType;
}

function candidateRank(first: ModelEdgeCandidate, second: ModelEdgeCandidate) {
  if (first.edge.edge !== second.edge.edge) {
    return second.edge.edge - first.edge.edge;
  }

  if (first.edge.modelProbability !== second.edge.modelProbability) {
    return second.edge.modelProbability - first.edge.modelProbability;
  }

  return first.player.name.localeCompare(second.player.name);
}

export function buildModelEdgeCandidates({
  limit = 6,
  marketTypes,
  minEdgePercent = 0,
  players,
}: BuildModelEdgeCandidatesInput) {
  return players
    .flatMap((player) =>
      marketTypes.flatMap((marketType) => {
        const edge = modelEdgeFor(player, marketType);

        return edge && edge.edge >= minEdgePercent ? [{ edge, marketType, player }] : [];
      }),
    )
    .sort(candidateRank)
    .slice(0, limit);
}

function MetricMini({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/55 bg-background px-3 py-2">
      <div className="truncate text-[0.65rem] font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">{helper}</div>
    </div>
  );
}

export function ModelQualityContextCard({
  className,
  quality,
}: {
  className?: string;
  quality: ModelQualitySummary;
}) {
  const tone = modelQualityTone(quality);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-primary-foreground p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <DataLabel>Model quality</DataLabel>
          <div className="mt-1 text-sm font-medium text-foreground">{quality.label}</div>
          <div className="mt-1 max-w-md text-xs text-muted-foreground">{quality.helper}</div>
        </div>
        <ToneBadge tone={tone}>{modelQualityActionLabel(quality)}</ToneBadge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricMini
          helper={`${quality.predictionCount.toLocaleString("en-US")} predictions`}
          label="Outcomes"
          value={quality.knownOutcomeCount.toLocaleString("en-US")}
        />
        <MetricMini
          helper="Calibration"
          label="Error"
          value={
            quality.calibrationError === null ? "N/A" : formatPercent(quality.calibrationError)
          }
        />
        <MetricMini
          helper="Actual vs model"
          label="Drift"
          value={formatSignedPoints(quality.probabilityDrift)}
        />
        <MetricMini
          helper="Model vs close"
          label="Avg CLV"
          value={formatSignedPoints(quality.averageClosingLineValue)}
        />
      </div>
    </div>
  );
}

function ModelEdgeCard({
  candidate,
  onOpenPlayer,
  quality,
}: {
  candidate: ModelEdgeCandidate;
  onOpenPlayer: ((playerId: string) => void) | undefined;
  quality: ModelQualitySummary;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {candidate.player.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{marketLabel(candidate.marketType)}</span>
            <span aria-hidden="true">/</span>
            <span>{formatOdds(candidate.edge.marketOdds)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-medium tabular-nums text-foreground">
            {formatEdgePercent(candidate.edge.edge)}
          </div>
          <div className="mt-1 text-[0.68rem] uppercase text-muted-foreground">model edge</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricMini
          helper="Model"
          label="Chance"
          value={formatPercent(candidate.edge.modelProbability)}
        />
        <MetricMini helper="Fair" label="Price" value={formatOdds(candidate.edge.fairOdds)} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <SignalDot tone={modelQualityTone(quality)} />
        <span className="truncate">
          {modelQualityActionLabel(quality)} /{" "}
          {quality.calibrationError === null ? "N/A" : formatPercent(quality.calibrationError)}{" "}
          calibration
        </span>
      </div>
    </>
  );

  const className =
    "rounded-2xl border border-border/70 bg-primary-foreground p-4 text-left shadow-sm transition-colors";

  if (!onOpenPlayer) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      className={cn(className, "hover:bg-background active:scale-[0.99]")}
      onClick={() => onOpenPlayer(candidate.player.id)}
      type="button"
    >
      {content}
    </button>
  );
}

export function ModelEdgeContextPanel({
  candidates,
  className,
  emptyCopy = "No positive model edges for this market.",
  onOpenPlayer,
  quality,
  title = "Model edges",
}: {
  candidates: ModelEdgeCandidate[];
  className?: string;
  emptyCopy?: string;
  onOpenPlayer?: (playerId: string) => void;
  quality: ModelQualitySummary;
  title?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <DataLabel>{title}</DataLabel>
          <div className="mt-1 text-sm text-muted-foreground">
            Ranked by current model edge with quality attached.
          </div>
        </div>
        <ToneBadge tone={modelQualityTone(quality)}>{modelQualityActionLabel(quality)}</ToneBadge>
      </div>

      {candidates.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
            <ModelEdgeCard
              candidate={candidate}
              key={`${candidate.player.id}:${candidate.marketType}`}
              onOpenPlayer={onOpenPlayer}
              quality={quality}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-primary-foreground p-5 text-sm text-muted-foreground">
          {emptyCopy}
        </div>
      )}
    </div>
  );
}
