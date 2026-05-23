import {
  type ConfidenceLevel,
  type ContestType,
  edgePercentage,
  fairAmericanLineFromProbability,
  type MarketType,
  type SubscriptionTier,
} from "@pgatour-ai/domain";

export type PlayerIntelligence = {
  id: string;
  name: string;
  country: string;
  archetype: string;
  tier: "elite" | "contender" | "longshot";
  teeWave: "AM/PM" | "PM/AM";
  salary: number;
  ownership: number;
  projectedPoints: number;
  cutProbability: number;
  winProbability: number;
  top20Probability: number;
  currentOdds: Record<MarketType, number | null>;
  strokesGained: {
    total: number;
    approach: number;
    offTee: number;
    putting: number;
  };
  courseFit: number;
  form: number;
  volatility: number;
  confidence: ConfidenceLevel;
  drivers: string[];
  risks: string[];
  lineMovement: number[];
  live: {
    position: string;
    total: number;
    today: number;
    thru: string;
  };
};

export const tournament = {
  id: "trn-2026-memorial",
  name: "The Memorial",
  course: "Muirfield Village",
  startsOn: "2026-06-04",
  status: "pre-tournament",
  modelRunId: "model-run-2026-05-23-1200",
  modelVersion: "edge-v0.1.0",
  dataFreshness: "Seed data",
};

export const players: PlayerIntelligence[] = [
  {
    id: "p-001",
    name: "Scottie Scheffler",
    country: "USA",
    archetype: "Elite tee-to-green",
    tier: "elite",
    teeWave: "AM/PM",
    salary: 12800,
    ownership: 0.286,
    projectedPoints: 104.8,
    cutProbability: 0.93,
    winProbability: 0.166,
    top20Probability: 0.642,
    currentOdds: {
      outright: 450,
      top_5: 110,
      top_10: -145,
      top_20: -260,
      make_cut: -1800,
      miss_cut: 850,
      matchup: -145,
      three_ball: null,
      round_leader: 1800,
    },
    strokesGained: { total: 2.91, approach: 1.22, offTee: 0.78, putting: 0.12 },
    courseFit: 96,
    form: 94,
    volatility: 22,
    confidence: "medium",
    drivers: ["Approach baseline", "Elite bogey avoidance", "Comp-course history"],
    risks: ["Crowded ownership", "Outright price already efficient"],
    lineMovement: [520, 500, 480, 475, 450],
    live: { position: "T3", total: -4, today: -2, thru: "12" },
  },
  {
    id: "p-002",
    name: "Xander Schauffele",
    country: "USA",
    archetype: "Complete scorer",
    tier: "elite",
    teeWave: "PM/AM",
    salary: 11200,
    ownership: 0.214,
    projectedPoints: 94.6,
    cutProbability: 0.89,
    winProbability: 0.089,
    top20Probability: 0.518,
    currentOdds: {
      outright: 1200,
      top_5: 300,
      top_10: 140,
      top_20: -115,
      make_cut: -900,
      miss_cut: 520,
      matchup: -112,
      three_ball: 165,
      round_leader: 2800,
    },
    strokesGained: { total: 2.05, approach: 0.72, offTee: 0.46, putting: 0.31 },
    courseFit: 90,
    form: 88,
    volatility: 29,
    confidence: "medium",
    drivers: ["Balanced scoring", "Low missed-cut profile", "Par-5 scoring"],
    risks: ["Price sensitive to ownership", "Less leverage in DFS"],
    lineMovement: [1400, 1300, 1200, 1200, 1200],
    live: { position: "T9", total: -2, today: -1, thru: "F" },
  },
  {
    id: "p-003",
    name: "Collin Morikawa",
    country: "USA",
    archetype: "Precision irons",
    tier: "contender",
    teeWave: "AM/PM",
    salary: 9800,
    ownership: 0.128,
    projectedPoints: 87.4,
    cutProbability: 0.84,
    winProbability: 0.055,
    top20Probability: 0.431,
    currentOdds: {
      outright: 2500,
      top_5: 550,
      top_10: 250,
      top_20: 120,
      make_cut: -520,
      miss_cut: 360,
      matchup: 104,
      three_ball: 220,
      round_leader: 4500,
    },
    strokesGained: { total: 1.47, approach: 1.04, offTee: 0.22, putting: -0.08 },
    courseFit: 93,
    form: 79,
    volatility: 34,
    confidence: "high",
    drivers: ["Long-iron proximity", "Course fit", "Putting regression upside"],
    risks: ["Win equity depends on neutral putting", "Moderate ownership"],
    lineMovement: [3000, 2800, 2600, 2600, 2500],
    live: { position: "T14", total: -1, today: 0, thru: "10" },
  },
  {
    id: "p-004",
    name: "Viktor Hovland",
    country: "NOR",
    archetype: "Aggressive ball-striker",
    tier: "contender",
    teeWave: "PM/AM",
    salary: 9400,
    ownership: 0.096,
    projectedPoints: 83.2,
    cutProbability: 0.79,
    winProbability: 0.041,
    top20Probability: 0.372,
    currentOdds: {
      outright: 3300,
      top_5: 750,
      top_10: 330,
      top_20: 165,
      make_cut: -340,
      miss_cut: 250,
      matchup: 118,
      three_ball: 255,
      round_leader: 5000,
    },
    strokesGained: { total: 1.18, approach: 0.59, offTee: 0.51, putting: -0.19 },
    courseFit: 87,
    form: 72,
    volatility: 43,
    confidence: "medium",
    drivers: ["Off-tee ceiling", "Ownership discount", "Course memory"],
    risks: ["Short-game variance", "Recent finish noise"],
    lineMovement: [4000, 3800, 3600, 3500, 3300],
    live: { position: "T21", total: 0, today: -1, thru: "14" },
  },
  {
    id: "p-005",
    name: "Tommy Fleetwood",
    country: "ENG",
    archetype: "Wind/control specialist",
    tier: "contender",
    teeWave: "AM/PM",
    salary: 8700,
    ownership: 0.074,
    projectedPoints: 79.1,
    cutProbability: 0.81,
    winProbability: 0.028,
    top20Probability: 0.348,
    currentOdds: {
      outright: 5000,
      top_5: 1000,
      top_10: 450,
      top_20: 200,
      make_cut: -360,
      miss_cut: 260,
      matchup: -105,
      three_ball: 280,
      round_leader: 6500,
    },
    strokesGained: { total: 1.02, approach: 0.44, offTee: 0.39, putting: 0.04 },
    courseFit: 84,
    form: 76,
    volatility: 31,
    confidence: "high",
    drivers: ["Low-variance profile", "AM wave weather edge", "Top-20 price gap"],
    risks: ["Win conversion", "Ceiling trails elite tier"],
    lineMovement: [5500, 5500, 5000, 5000, 5000],
    live: { position: "T8", total: -2, today: -2, thru: "9" },
  },
  {
    id: "p-006",
    name: "Sahith Theegala",
    country: "USA",
    archetype: "Volatile scorer",
    tier: "longshot",
    teeWave: "PM/AM",
    salary: 7900,
    ownership: 0.052,
    projectedPoints: 74.8,
    cutProbability: 0.69,
    winProbability: 0.019,
    top20Probability: 0.286,
    currentOdds: {
      outright: 6600,
      top_5: 1400,
      top_10: 650,
      top_20: 300,
      make_cut: -210,
      miss_cut: 165,
      matchup: 122,
      three_ball: 310,
      round_leader: 8000,
    },
    strokesGained: { total: 0.76, approach: 0.21, offTee: 0.18, putting: 0.34 },
    courseFit: 72,
    form: 78,
    volatility: 58,
    confidence: "low",
    drivers: ["Birdie rate", "DFS ceiling", "Low ownership"],
    risks: ["Cut volatility", "Approach inconsistency"],
    lineMovement: [8000, 7500, 7000, 6600, 6600],
    live: { position: "T36", total: 1, today: 1, thru: "11" },
  },
  {
    id: "p-007",
    name: "Russell Henley",
    country: "USA",
    archetype: "Accuracy and wedges",
    tier: "longshot",
    teeWave: "AM/PM",
    salary: 7600,
    ownership: 0.039,
    projectedPoints: 72.6,
    cutProbability: 0.77,
    winProbability: 0.015,
    top20Probability: 0.271,
    currentOdds: {
      outright: 9000,
      top_5: 1800,
      top_10: 800,
      top_20: 360,
      make_cut: -260,
      miss_cut: 200,
      matchup: -102,
      three_ball: 330,
      round_leader: 9000,
    },
    strokesGained: { total: 0.68, approach: 0.51, offTee: -0.04, putting: 0.12 },
    courseFit: 82,
    form: 70,
    volatility: 35,
    confidence: "medium",
    drivers: ["Accuracy", "Approach stability", "Ownership arbitrage"],
    risks: ["Limited win equity", "Needs field to compress"],
    lineMovement: [10000, 9500, 9000, 9000, 9000],
    live: { position: "T18", total: 0, today: -1, thru: "F" },
  },
];

export const trackedBets = [
  {
    id: "bet-001",
    playerId: "p-003",
    marketType: "top_20" as MarketType,
    book: "DraftKings",
    stake: 120,
    odds: 120,
    closingOdds: 100,
    status: "open",
    thesis: "Course fit plus low ownership versus top-20 probability.",
  },
  {
    id: "bet-002",
    playerId: "p-005",
    marketType: "top_20" as MarketType,
    book: "FanDuel",
    stake: 80,
    odds: 200,
    closingOdds: 170,
    status: "open",
    thesis: "AM wave weather edge and low-volatility profile.",
  },
  {
    id: "bet-003",
    playerId: "p-007",
    marketType: "make_cut" as MarketType,
    book: "BetMGM",
    stake: 100,
    odds: -260,
    closingOdds: -300,
    status: "open",
    thesis: "Accuracy profile lowers missed-cut risk.",
  },
];

export const alertFeed = [
  {
    id: "alert-001",
    title: "Fleetwood top-20 still above fair",
    reason: "Model fair line is +187. Best market is +200.",
    severity: "positive",
    time: "8m ago",
  },
  {
    id: "alert-002",
    title: "PM/AM wave lost 0.22 expected strokes",
    reason: "Friday wind window moved from 12 mph to 18 mph.",
    severity: "warning",
    time: "21m ago",
  },
  {
    id: "alert-003",
    title: "Morikawa ownership below market strength",
    reason: "Win rank 5, projected DFS ownership rank 9.",
    severity: "positive",
    time: "38m ago",
  },
];

export const subscriptionPlans: Array<{
  tier: SubscriptionTier;
  price: string;
  focus: string;
  features: string[];
}> = [
  {
    tier: "free",
    price: "$0",
    focus: "Research preview",
    features: ["Delayed board", "Limited research", "3 tracked bets"],
  },
  {
    tier: "pro",
    price: "$39",
    focus: "Weekly edge work",
    features: ["Full odds board", "Fantasy suite", "Bet tracker", "AI analyst"],
  },
  {
    tier: "elite",
    price: "$99",
    focus: "Live tournament desk",
    features: ["Stale odds alerts", "Advanced sims", "Exports", "Watchlists"],
  },
];

export function modelEdgeFor(player: PlayerIntelligence, marketType: MarketType) {
  const marketOdds = player.currentOdds[marketType];

  if (marketOdds === null) {
    return null;
  }

  const modelProbability =
    marketType === "top_20" ? player.top20Probability : player.winProbability;

  return {
    marketOdds,
    fairOdds: fairAmericanLineFromProbability(modelProbability),
    edge: edgePercentage(modelProbability, marketOdds),
  };
}

export const defaultContest: { type: ContestType; salaryCap: number; rosterSize: number } = {
  type: "small_field_gpp",
  salaryCap: 50000,
  rosterSize: 6,
};
