import type {
  CanonicalFieldPlayer,
  EventReadiness,
  EventReadinessResource,
  EventReadinessStatus,
  IntelligenceModelState,
} from "./intelligence-types";

type BuildEventReadinessInput = {
  canonicalStatus: "ready" | "empty" | "unavailable";
  fieldPlayers: CanonicalFieldPlayer[];
  model: IntelligenceModelState;
  now?: Date;
  tournamentName: string | null;
  tournamentStartsOn?: string | null;
};

type ResourceInput = Omit<EventReadinessResource, "required" | "status"> & {
  partialThreshold?: number;
  required?: boolean;
};

const STATUS_SCORE: Record<EventReadinessStatus, number> = {
  ready: 1,
  partial: 0.5,
  pending: 0,
  missing: 0,
  unavailable: 0,
};

function enteredFieldCount(fieldPlayers: CanonicalFieldPlayer[]) {
  const enteredCount = fieldPlayers.filter((player) => player.status === "entered").length;

  return enteredCount > 0 ? enteredCount : fieldPlayers.length;
}

function pricedPlayerCount(fieldPlayers: CanonicalFieldPlayer[]) {
  return fieldPlayers.filter((player) => Object.values(player.odds).some(Boolean)).length;
}

function teeTimePlayerCount(fieldPlayers: CanonicalFieldPlayer[]) {
  return fieldPlayers.filter((player) => player.teeTimes.some((teeTime) => teeTime.startsAt))
    .length;
}

function dateOnlyUtc(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function todayUtc(now: Date) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function teeTimesArePending({
  now,
  tournamentStartsOn,
}: {
  now: Date;
  tournamentStartsOn: string | null | undefined;
}) {
  if (!tournamentStartsOn) {
    return false;
  }

  const startDay = dateOnlyUtc(tournamentStartsOn);

  return startDay !== null && startDay > todayUtc(now);
}

function resourceStatus({
  count,
  partialThreshold = 1,
  total,
}: {
  count: number;
  partialThreshold?: number;
  total: number | null;
}): EventReadinessStatus {
  if (count <= 0) {
    return "missing";
  }

  if (total !== null && total > 0 && count / total < partialThreshold) {
    return "partial";
  }

  return "ready";
}

function resource(input: ResourceInput): EventReadinessResource {
  return {
    ...input,
    required: input.required ?? true,
    status: resourceStatus(
      input.partialThreshold === undefined
        ? {
            count: input.count,
            total: input.total,
          }
        : {
            count: input.count,
            partialThreshold: input.partialThreshold,
            total: input.total,
          },
    ),
  };
}

function overallStatus(resources: EventReadinessResource[]): EventReadinessStatus {
  if (resources.some((item) => item.status === "unavailable")) {
    return "unavailable";
  }

  const required = resources.filter((item) => item.required);
  const tournament = resources.find((item) => item.id === "tournament");
  const field = resources.find((item) => item.id === "field");

  if (tournament?.status === "missing" || field?.status === "missing") {
    return "missing";
  }

  if (required.some((item) => item.status !== "ready")) {
    return "partial";
  }

  return "ready";
}

function readinessScore(resources: EventReadinessResource[]) {
  const required = resources.filter((item) => item.required);

  if (required.length === 0) {
    return 0;
  }

  const total = required.reduce((score, item) => score + STATUS_SCORE[item.status], 0);

  return Math.round((total / required.length) * 100);
}

function firstBlockingResource(resources: EventReadinessResource[]) {
  return resources.find((item) => item.required && item.status !== "ready") ?? null;
}

function readinessLabel(status: EventReadinessStatus) {
  if (status === "ready") {
    return "Event ready";
  }

  if (status === "partial") {
    return "Event partly ready";
  }

  if (status === "unavailable") {
    return "Data unavailable";
  }

  return "Event not ready";
}

export function buildEventReadiness({
  canonicalStatus,
  fieldPlayers,
  model,
  now = new Date(),
  tournamentName,
  tournamentStartsOn,
}: BuildEventReadinessInput): EventReadiness {
  if (canonicalStatus === "unavailable") {
    const resources: EventReadinessResource[] = [
      {
        count: 0,
        helper: "Check the database connection and migrations.",
        id: "tournament",
        label: "Tournament",
        required: true,
        status: "unavailable",
        total: null,
      },
    ];

    return {
      helper: "Check the database connection and migrations.",
      label: readinessLabel("unavailable"),
      resources,
      score: 0,
      status: "unavailable",
    };
  }

  const enteredCount = enteredFieldCount(fieldPlayers);
  const pricedCount = pricedPlayerCount(fieldPlayers);
  const teeCount = teeTimePlayerCount(fieldPlayers);
  const teeTimeResource = resource({
    count: teeCount,
    helper:
      teeCount > 0
        ? `${teeCount} players have posted tee times.`
        : "Sync tee times before using Live.",
    id: "tee_times",
    label: "Tee times",
    partialThreshold: 0.75,
    total: enteredCount || null,
  });
  const resources: EventReadinessResource[] = [
    resource({
      count: tournamentName ? 1 : 0,
      helper: tournamentName ? `${tournamentName} is selected.` : "Run provider sync.",
      id: "tournament",
      label: "Tournament",
      total: 1,
    }),
    resource({
      count: fieldPlayers.length,
      helper:
        fieldPlayers.length > 0 ? `${fieldPlayers.length} players loaded.` : "Load the field.",
      id: "field",
      label: "Field",
      total: null,
    }),
    resource({
      count: pricedCount,
      helper:
        pricedCount > 0
          ? `${pricedCount} players have market prices.`
          : "Sync futures before using betting views.",
      id: "markets",
      label: "Markets",
      partialThreshold: 0.75,
      total: enteredCount || null,
    }),
    teeTimeResource.status === "missing" && teeTimesArePending({ now, tournamentStartsOn })
      ? {
          ...teeTimeResource,
          helper: "Tee times are not posted yet.",
          status: "pending",
        }
      : teeTimeResource,
    resource({
      count: model.status === "ready" ? model.modeledPlayerCount : 0,
      helper:
        model.status === "ready" ? `${model.modeledPlayerCount} players modeled.` : "Run Model v0.",
      id: "model",
      label: "Model",
      partialThreshold: 0.75,
      total: enteredCount || null,
    }),
  ];
  const status = overallStatus(resources);
  const blocker = firstBlockingResource(resources);

  return {
    helper: blocker?.helper ?? "All core event feeds are ready.",
    label: readinessLabel(status),
    resources,
    score: readinessScore(resources),
    status,
  };
}

export function readinessStatusRank(status: EventReadinessStatus) {
  return STATUS_SCORE[status];
}
