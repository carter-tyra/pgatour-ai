"use client";

import {
  edgePercentage,
  fairAmericanLineFromProbability,
  fractionalKellyStake,
  impliedProbabilityFromAmerican,
  type MarketType,
} from "@pgatour-ai/domain";
import { Badge, cn, DataPanel } from "@pgatour-ai/ui";
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronRight,
  Clock,
  DollarSign,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  alertFeed,
  defaultContest,
  modelEdgeFor,
  type PlayerIntelligence,
  players,
  subscriptionPlans,
  tournament,
  trackedBets,
} from "../lib/sample-data";

type TabId = "research" | "betting" | "fantasy" | "live" | "portfolio" | "ai";

const tabs: Array<{ id: TabId; label: string; icon: typeof Activity }> = [
  { id: "research", label: "Research", icon: Search },
  { id: "betting", label: "Betting", icon: DollarSign },
  { id: "fantasy", label: "Fantasy", icon: Trophy },
  { id: "live", label: "Live", icon: Radio },
  { id: "portfolio", label: "Portfolio", icon: Wallet },
  { id: "ai", label: "AI Analyst", icon: Bot },
];

const marketOptions: Array<{ value: MarketType; label: string }> = [
  { value: "outright", label: "Outright" },
  { value: "top_5", label: "Top 5" },
  { value: "top_10", label: "Top 10" },
  { value: "top_20", label: "Top 20" },
  { value: "make_cut", label: "Make cut" },
  { value: "matchup", label: "Matchup" },
];

function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatOdds(americanOdds: number | null) {
  if (americanOdds === null) {
    return "N/A";
  }

  return americanOdds > 0 ? `+${americanOdds}` : String(americanOdds);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceTone(confidence: PlayerIntelligence["confidence"]) {
  if (confidence === "high") {
    return "positive";
  }

  if (confidence === "medium") {
    return "warning";
  }

  return "neutral";
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 96;
      const y = 28 - ((value - min) / range) * 24;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="h-8 w-24" viewBox="0 0 96 32">
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-950" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function HeaderMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 border-zinc-200 border-l pl-4 first:border-l-0 first:pl-0">
      <div className="text-[11px] font-semibold text-zinc-500 uppercase leading-4">{label}</div>
      <div className="truncate text-xl font-semibold text-zinc-950">{value}</div>
      <div className="truncate text-xs text-zinc-500">{helper}</div>
    </div>
  );
}

function MarketControls({
  selectedMarket,
  edgeFloor,
  onMarketChange,
  onEdgeFloorChange,
}: {
  selectedMarket: MarketType;
  edgeFloor: number;
  onMarketChange: (market: MarketType) => void;
  onEdgeFloorChange: (edgeFloor: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
        {marketOptions.map((market) => (
          <button
            aria-pressed={selectedMarket === market.value}
            className={cn(
              "rounded px-2.5 py-1.5 text-xs font-semibold transition",
              selectedMarket === market.value
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
            )}
            key={market.value}
            onClick={() => onMarketChange(market.value)}
            type="button"
          >
            {market.label}
          </button>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
        <SlidersHorizontal className="size-3.5" />
        Edge
        <input
          className="h-1.5 w-24 accent-zinc-950"
          max={12}
          min={0}
          onChange={(event) => onEdgeFloorChange(Number(event.target.value))}
          step={0.5}
          type="range"
          value={edgeFloor}
        />
        {edgeFloor.toFixed(1)}%
      </label>
    </div>
  );
}

function OddsBoard({
  selectedMarket,
  edgeFloor,
}: {
  selectedMarket: MarketType;
  edgeFloor: number;
}) {
  const rows = useMemo(
    () =>
      players
        .map((player) => ({ player, edge: modelEdgeFor(player, selectedMarket) }))
        .filter((row) => row.edge && row.edge.edge >= edgeFloor)
        .sort((a, b) => (b.edge?.edge ?? 0) - (a.edge?.edge ?? 0)),
    [selectedMarket, edgeFloor],
  );

  return (
    <DataPanel
      meta={`${rows.length} players over edge floor`}
      title="Market Mispricing Board"
      className="overflow-hidden"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Best</th>
              <th className="px-4 py-3">Fair</th>
              <th className="px-4 py-3">Edge</th>
              <th className="px-4 py-3">No-vig</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Driver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(({ player, edge }) => {
              if (!edge) {
                return null;
              }

              return (
                <tr className="hover:bg-zinc-50" key={player.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-950">{player.name}</div>
                    <div className="text-xs text-zinc-500">{player.archetype}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {marketOptions.find((market) => market.value === selectedMarket)?.label}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-950">
                    {formatOdds(edge.marketOdds)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatOdds(edge.fairOdds)}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-emerald-700">{edge.edge.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatPercent(impliedProbabilityFromAmerican(edge.marketOdds))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={confidenceTone(player.confidence)}>{player.confidence}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    <Sparkline values={player.lineMovement} />
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-xs text-zinc-600">
                    {player.drivers[0]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
}

function ResearchView() {
  const courseLeaders = [...players].sort((a, b) => b.courseFit - a.courseFit).slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <DataPanel meta="Skill demand" title="Course Fit Lab">
        <div className="grid gap-5 p-4 md:grid-cols-3">
          <SkillBar label="Approach demand" value={92} />
          <SkillBar label="Driving penalty" value={74} />
          <SkillBar label="Wind exposure" value={62} />
          <SkillBar label="Par-5 pressure" value={81} />
          <SkillBar label="Green difficulty" value={88} />
          <SkillBar label="Scrambling tax" value={69} />
        </div>
        <div className="border-zinc-100 border-t p-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase">Comp courses</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Riviera", "Bay Hill", "Quail Hollow", "Torrey Pines", "Olympia Fields"].map(
              (course) => (
                <Badge key={course}>{course}</Badge>
              ),
            )}
          </div>
        </div>
      </DataPanel>

      <DataPanel meta="Top 5" title="Player-Course Match">
        <div className="divide-y divide-zinc-100">
          {courseLeaders.map((player, index) => (
            <div className="flex items-center justify-between gap-4 px-4 py-3" key={player.id}>
              <div>
                <div className="text-xs font-semibold text-zinc-500">#{index + 1}</div>
                <div className="font-semibold text-zinc-950">{player.name}</div>
                <div className="text-xs text-zinc-500">{player.drivers.join(" | ")}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">{player.courseFit}</div>
                <div className="text-xs text-zinc-500">fit</div>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>

      <DataPanel
        className="xl:col-span-2"
        meta="Explainable model state"
        title="Field Intelligence"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">SG total</th>
                <th className="px-4 py-3">Approach</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Volatility</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-xs text-zinc-500">{player.country}</div>
                  </td>
                  <td className="px-4 py-3">{player.strokesGained.total.toFixed(2)}</td>
                  <td className="px-4 py-3">{player.strokesGained.approach.toFixed(2)}</td>
                  <td className="px-4 py-3">{player.courseFit}</td>
                  <td className="px-4 py-3">{player.form}</td>
                  <td className="px-4 py-3">{player.volatility}</td>
                  <td className="max-w-[260px] px-4 py-3 text-xs text-zinc-600">
                    {player.risks[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </div>
  );
}

function BettingView({
  selectedMarket,
  edgeFloor,
  onMarketChange,
  onEdgeFloorChange,
}: {
  selectedMarket: MarketType;
  edgeFloor: number;
  onMarketChange: (market: MarketType) => void;
  onEdgeFloorChange: (edgeFloor: number) => void;
}) {
  const topEdge = useMemo(() => {
    return players
      .map((player) => ({ player, edge: modelEdgeFor(player, selectedMarket) }))
      .filter((row) => row.edge !== null)
      .sort((a, b) => (b.edge?.edge ?? 0) - (a.edge?.edge ?? 0))[0];
  }, [selectedMarket]);

  const suggestedStake = topEdge?.edge
    ? fractionalKellyStake({
        bankroll: 2500,
        modelProbability:
          selectedMarket === "top_20"
            ? topEdge.player.top20Probability
            : topEdge.player.winProbability,
        americanOdds: topEdge.edge.marketOdds,
      })
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MarketControls
          edgeFloor={edgeFloor}
          onEdgeFloorChange={onEdgeFloorChange}
          onMarketChange={onMarketChange}
          selectedMarket={selectedMarket}
        />
        <div className="text-xs text-zinc-500">
          Book prices are seed data. Provider sync is gated behind API keys.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DataPanel meta="Best current edge" title="Bet Thesis">
          {topEdge?.edge ? (
            <div className="space-y-4 p-4">
              <div>
                <div className="text-xl font-semibold text-zinc-950">{topEdge.player.name}</div>
                <div className="text-sm text-zinc-500">{topEdge.player.archetype}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[11px] text-zinc-500">Market</div>
                  <div className="font-semibold">{formatOdds(topEdge.edge.marketOdds)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Fair</div>
                  <div className="font-semibold">{formatOdds(topEdge.edge.fairOdds)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Edge</div>
                  <div className="font-semibold text-emerald-700">
                    {topEdge.edge.edge.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                {topEdge.player.drivers.join(". ")}.
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                <div>
                  <div className="text-[11px] text-zinc-500">Quarter Kelly</div>
                  <div className="font-semibold">{formatCurrency(suggestedStake)}</div>
                </div>
                <Badge tone={confidenceTone(topEdge.player.confidence)}>
                  {topEdge.player.confidence}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-zinc-500">No priced players for this market.</div>
          )}
        </DataPanel>

        <DataPanel meta="Rules" title="Analysis-Only Guardrails">
          <div className="space-y-3 p-4 text-sm text-zinc-700">
            {[
              "No bet placement.",
              "No sportsbook credentials.",
              "No guaranteed-result language.",
              "All numbers cite model or market snapshots.",
            ].map((rule) => (
              <div className="flex items-center gap-2" key={rule}>
                <ShieldCheck className="size-4 text-emerald-700" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel meta="Commercial v1" title="Tiers">
          <div className="divide-y divide-zinc-100">
            {subscriptionPlans.map((plan) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3" key={plan.tier}>
                <div>
                  <div className="font-semibold capitalize">{plan.tier}</div>
                  <div className="text-xs text-zinc-500">{plan.focus}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{plan.price}</div>
                  <div className="text-xs text-zinc-500">/mo</div>
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      </div>

      <OddsBoard edgeFloor={edgeFloor} selectedMarket={selectedMarket} />
    </div>
  );
}

function FantasyView() {
  const optimized = [...players]
    .sort(
      (a, b) =>
        b.projectedPoints / b.salary +
        (1 - b.ownership) * 0.015 -
        (a.projectedPoints / a.salary + (1 - a.ownership) * 0.015),
    )
    .slice(0, defaultContest.rosterSize);
  const salary = optimized.reduce((total, player) => total + player.salary, 0);
  const points = optimized.reduce((total, player) => total + player.projectedPoints, 0);
  const avgOwnership =
    optimized.reduce((total, player) => total + player.ownership, 0) / optimized.length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <DataPanel meta={defaultContest.type.replaceAll("_", " ")} title="DFS Optimizer">
        <div className="grid grid-cols-3 gap-3 border-zinc-100 border-b p-4">
          <HeaderMetric
            helper={`${formatCurrency(defaultContest.salaryCap - salary)} left`}
            label="Salary"
            value={formatCurrency(salary)}
          />
          <HeaderMetric helper="Median sim" label="Projection" value={points.toFixed(1)} />
          <HeaderMetric helper="Average" label="Ownership" value={formatPercent(avgOwnership)} />
        </div>
        <div className="divide-y divide-zinc-100">
          {optimized.map((player) => (
            <div
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3"
              key={player.id}
            >
              <div>
                <div className="font-semibold text-zinc-950">{player.name}</div>
                <div className="text-xs text-zinc-500">{player.archetype}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{formatCurrency(player.salary)}</div>
                <div className="text-xs text-zinc-500">salary</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{player.projectedPoints.toFixed(1)}</div>
                <div className="text-xs text-zinc-500">pts</div>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>

      <DataPanel meta="Leverage" title="Ownership Arbitrage">
        <div className="divide-y divide-zinc-100">
          {players
            .map((player) => ({
              player,
              leverage: player.top20Probability - player.ownership,
            }))
            .sort((a, b) => b.leverage - a.leverage)
            .slice(0, 6)
            .map(({ player, leverage }) => (
              <div
                className="grid grid-cols-[1fr_120px_80px] items-center gap-3 px-4 py-3"
                key={player.id}
              >
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-xs text-zinc-500">
                    {formatPercent(player.top20Probability)} top-20 /{" "}
                    {formatPercent(player.ownership)} own
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${Math.min(100, Math.max(4, leverage * 180))}%` }}
                  />
                </div>
                <div className="text-right font-semibold text-emerald-700">
                  +{formatPercent(leverage)}
                </div>
              </div>
            ))}
        </div>
      </DataPanel>

      <DataPanel className="xl:col-span-2" meta="Season value" title="One-And-Done Planner">
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {players.slice(2, 5).map((player) => (
            <div className="rounded-md border border-zinc-200 p-4" key={player.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-xs text-zinc-500">{player.archetype}</div>
                </div>
                <Badge tone="positive">viable</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-zinc-500">Win</div>
                  <div className="font-semibold">{formatPercent(player.winProbability)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Own</div>
                  <div className="font-semibold">{formatPercent(player.ownership)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Future</div>
                  <div className="font-semibold">{100 - player.courseFit}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}

function LiveView() {
  const projectedCut = 2;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <DataPanel meta="Seeded live state" title="Live Tournament Center">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Today</th>
                <th className="px-4 py-3">Thru</th>
                <th className="px-4 py-3">Cut path</th>
                <th className="px-4 py-3">Top-20 live</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {players.map((player) => {
                const cutRisk = player.live.total > projectedCut - 1;

                return (
                  <tr key={player.id}>
                    <td className="px-4 py-3 font-semibold">{player.name}</td>
                    <td className="px-4 py-3">{player.live.position}</td>
                    <td className="px-4 py-3">{player.live.total}</td>
                    <td className="px-4 py-3">{player.live.today}</td>
                    <td className="px-4 py-3">{player.live.thru}</td>
                    <td className="px-4 py-3">
                      <Badge tone={cutRisk ? "warning" : "positive"}>
                        {cutRisk ? "watch" : "safe"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatPercent(player.top20Probability)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataPanel>

      <DataPanel meta="Deduped" title="Alert Feed">
        <div className="divide-y divide-zinc-100">
          {alertFeed.map((alert) => (
            <div className="flex gap-3 px-4 py-3" key={alert.id}>
              <div
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
                  alert.severity === "positive"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {alert.severity === "positive" ? (
                  <Zap className="size-4" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-zinc-950">{alert.title}</div>
                <div className="text-sm text-zinc-600">{alert.reason}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="size-3" />
                  {alert.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}

function PortfolioView() {
  const enrichedBets = trackedBets.map((bet) => {
    const player = players.find((candidate) => candidate.id === bet.playerId);
    const modelProbability =
      bet.marketType === "top_20"
        ? (player?.top20Probability ?? 0.1)
        : (player?.cutProbability ?? 0.5);
    const edge = edgePercentage(modelProbability, bet.odds);
    const clv =
      impliedProbabilityFromAmerican(bet.closingOdds) - impliedProbabilityFromAmerican(bet.odds);

    return { ...bet, player, edge, clv };
  });
  const stake = enrichedBets.reduce((total, bet) => total + bet.stake, 0);
  const averageEdge =
    enrichedBets.reduce((total, bet) => total + bet.edge, 0) / enrichedBets.length;
  const positiveClv = enrichedBets.filter((bet) => bet.clv > 0).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <DataPanel meta="Open card" title="Exposure">
        <div className="grid grid-cols-3 gap-3 border-zinc-100 border-b p-4">
          <HeaderMetric helper="Open" label="Stake" value={formatCurrency(stake)} />
          <HeaderMetric helper="Model EV" label="Avg edge" value={`${averageEdge.toFixed(1)}%`} />
          <HeaderMetric
            helper={`${enrichedBets.length} bets`}
            label="CLV wins"
            value={`${positiveClv}`}
          />
        </div>
        <div className="p-4">
          <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
            Biggest swing: Morikawa top-20. Current thesis still supported by course-fit and
            approach profile.
          </div>
        </div>
      </DataPanel>

      <DataPanel meta="Manual tracking" title="Bet Tracker">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Stake</th>
                <th className="px-4 py-3">Bet</th>
                <th className="px-4 py-3">Close</th>
                <th className="px-4 py-3">Edge</th>
                <th className="px-4 py-3">Thesis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {enrichedBets.map((bet) => (
                <tr key={bet.id}>
                  <td className="px-4 py-3 font-semibold">{bet.player?.name}</td>
                  <td className="px-4 py-3">{bet.marketType.replace("_", " ")}</td>
                  <td className="px-4 py-3">{formatCurrency(bet.stake)}</td>
                  <td className="px-4 py-3">{formatOdds(bet.odds)}</td>
                  <td className="px-4 py-3">{formatOdds(bet.closingOdds)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {bet.edge.toFixed(1)}%
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-xs text-zinc-600">{bet.thesis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </div>
  );
}

function AiView() {
  const player = players[2];
  const marketOdds = player?.currentOdds.top_20 ?? 120;
  const modelProbability = player?.top20Probability ?? 0.4;
  const fairOdds = fairAmericanLineFromProbability(modelProbability);
  const edge = edgePercentage(modelProbability, marketOdds);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <DataPanel meta="Structured tools" title="Ask The Analyst">
        <div className="space-y-3 p-4">
          {[
            "Why does the model like Morikawa top-20?",
            "Compare my tracked bets this week.",
            "Find low-owned course-fit plays.",
            "What changed since yesterday?",
          ].map((prompt) => (
            <button
              className="flex w-full items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-left text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
              key={prompt}
              type="button"
            >
              {prompt}
              <ChevronRight className="size-4" />
            </button>
          ))}
        </div>
      </DataPanel>

      <DataPanel meta="Seeded answer" title="Verified Response">
        <div className="space-y-4 p-4">
          <div className="rounded-md bg-zinc-950 p-4 text-white">
            <div className="text-sm font-semibold">Morikawa top-20 is still playable.</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Model probability is {formatPercent(modelProbability)} against a market price of{" "}
              {formatOdds(marketOdds)}. Fair line is {formatOdds(fairOdds)}, leaving a{" "}
              {edge.toFixed(1)}% edge. The main drivers are long-iron proximity, course fit, and
              putting regression upside.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-zinc-200 p-3">
              <div className="text-[11px] text-zinc-500">Model run</div>
              <div className="truncate text-sm font-semibold">{tournament.modelRunId}</div>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <div className="text-[11px] text-zinc-500">Market</div>
              <div className="text-sm font-semibold">top_20 / DraftKings</div>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <div className="text-[11px] text-zinc-500">Freshness</div>
              <div className="text-sm font-semibold">{tournament.dataFreshness}</div>
            </div>
          </div>
        </div>
      </DataPanel>
    </div>
  );
}

export function IntelligenceTerminal() {
  const [activeTab, setActiveTab] = useState<TabId>("betting");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>("top_20");
  const [edgeFloor, setEdgeFloor] = useState(2);

  const bestTop20 = useMemo(() => {
    return players
      .map((player) => ({ player, edge: modelEdgeFor(player, "top_20") }))
      .filter((row) => row.edge !== null)
      .sort((a, b) => (b.edge?.edge ?? 0) - (a.edge?.edge ?? 0))[0];
  }, []);
  const averageCutProbability =
    players.reduce((total, player) => total + player.cutProbability, 0) / players.length;
  const liveExposure = trackedBets.reduce((total, bet) => total + bet.stake, 0);

  return (
    <main className="terminal-grid min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-4 lg:px-6">
        <header className="mb-4 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
                  PGA Tour AI
                </h1>
                <Badge tone="info">paid beta</Badge>
                <Badge tone="neutral">analysis only</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                <span>{tournament.name}</span>
                <span>{tournament.course}</span>
                <span>{tournament.modelVersion}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <HeaderMetric
                helper={bestTop20?.player.name ?? "No edge"}
                label="Best edge"
                value={bestTop20?.edge ? `${bestTop20.edge.edge.toFixed(1)}%` : "N/A"}
              />
              <HeaderMetric
                helper="Field average"
                label="Cut prob"
                value={formatPercent(averageCutProbability)}
              />
              <HeaderMetric
                helper="Open stakes"
                label="Exposure"
                value={formatCurrency(liveExposure)}
              />
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-zinc-200 border-t p-2 scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  aria-pressed={activeTab === tab.id}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    activeTab === tab.id
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </header>

        <section className="mb-4 grid gap-4 lg:grid-cols-4">
          <DataPanel title="Data Freshness">
            <div className="flex items-center gap-3 p-4">
              <Activity className="size-5 text-emerald-700" />
              <div>
                <div className="font-semibold text-zinc-950">{tournament.dataFreshness}</div>
                <div className="text-xs text-zinc-500">Provider sync awaits API keys</div>
              </div>
            </div>
          </DataPanel>
          <DataPanel title="Market Coverage">
            <div className="flex items-center gap-3 p-4">
              <Target className="size-5 text-zinc-950" />
              <div>
                <div className="font-semibold text-zinc-950">6 markets</div>
                <div className="text-xs text-zinc-500">Outrights, placements, cut, matchups</div>
              </div>
            </div>
          </DataPanel>
          <DataPanel title="Fantasy Mode">
            <div className="flex items-center gap-3 p-4">
              <Users className="size-5 text-zinc-950" />
              <div>
                <div className="font-semibold text-zinc-950">DFS + OAD</div>
                <div className="text-xs text-zinc-500">Projection and leverage views</div>
              </div>
            </div>
          </DataPanel>
          <DataPanel title="Guardrails">
            <div className="flex items-center gap-3 p-4">
              <ShieldCheck className="size-5 text-emerald-700" />
              <div>
                <div className="font-semibold text-zinc-950">No wagering</div>
                <div className="text-xs text-zinc-500">Analysis and tracking only</div>
              </div>
            </div>
          </DataPanel>
        </section>

        {activeTab === "research" ? <ResearchView /> : null}
        {activeTab === "betting" ? (
          <BettingView
            edgeFloor={edgeFloor}
            onEdgeFloorChange={setEdgeFloor}
            onMarketChange={setSelectedMarket}
            selectedMarket={selectedMarket}
          />
        ) : null}
        {activeTab === "fantasy" ? <FantasyView /> : null}
        {activeTab === "live" ? <LiveView /> : null}
        {activeTab === "portfolio" ? <PortfolioView /> : null}
        {activeTab === "ai" ? <AiView /> : null}
      </div>
    </main>
  );
}
