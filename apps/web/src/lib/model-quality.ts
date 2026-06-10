import type {
  ModelCalibrationBin,
  ModelQualityGate,
  ModelQualityStatus,
  ModelQualitySummary,
} from "./intelligence-types";

export const modelQualityThresholds = {
  maxBrierScore: 0.18,
  maxCalibrationError: 0.08,
  maxLogLoss: 1.1,
  minCoverage: 0.75,
  minKnownOutcomes: 500,
} as const;

type ModelQualityBacktestInput = {
  createdAt: string | null;
  id: string;
  metrics: Record<string, unknown>;
  modelName: string;
  modelVersion: string;
};

type ModelQualityEvaluationInput = {
  averageClosingLineValue: number | null;
  brierScore: number | null;
  calibrationError: number | null;
  coverage: number | null;
  logLoss: number | null;
  marketType: string | null;
  metrics: Record<string, unknown>;
  scope: string;
  tournamentId: string | null;
};

type BuildModelQualitySummaryInput = {
  backtest: ModelQualityBacktestInput | null;
  evaluations: ModelQualityEvaluationInput[];
};

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function countFromUnknown(value: unknown): number | null {
  const parsed = numberFromUnknown(value);

  return parsed === null || parsed < 0 ? null : Math.floor(parsed);
}

function arrayLengthFromUnknown(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function stringArrayFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function calibrationBinFromUnknown(value: unknown): ModelCalibrationBin | null {
  const record = recordFromUnknown(value);
  const averageProbability = numberFromUnknown(record.averageProbability);
  const count = countFromUnknown(record.count);
  const endProbability = numberFromUnknown(record.endProbability);
  const outcomeRate = numberFromUnknown(record.outcomeRate);
  const startProbability = numberFromUnknown(record.startProbability);

  if (
    averageProbability === null ||
    count === null ||
    count <= 0 ||
    endProbability === null ||
    outcomeRate === null ||
    startProbability === null
  ) {
    return null;
  }

  return {
    averageProbability,
    count,
    endProbability,
    outcomeRate,
    startProbability,
  };
}

function calibrationBinsFromUnknown(value: unknown): ModelCalibrationBin[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ModelCalibrationBin[]>((bins, item) => {
    const bin = calibrationBinFromUnknown(item);

    if (bin) {
      bins.push(bin);
    }

    return bins;
  }, []);
}

function ratioOrNull(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function buildMinGate({
  helper,
  id,
  label,
  threshold,
  value,
}: Omit<ModelQualityGate, "passed">): ModelQualityGate {
  return {
    helper,
    id,
    label,
    passed: value !== null && value >= threshold,
    threshold,
    value,
  };
}

function buildMaxGate({
  helper,
  id,
  label,
  threshold,
  value,
}: Omit<ModelQualityGate, "passed">): ModelQualityGate {
  return {
    helper,
    id,
    label,
    passed: value !== null && value <= threshold,
    threshold,
    value,
  };
}

function qualityStatus(gates: ModelQualityGate[], backtest: ModelQualityBacktestInput | null) {
  if (!backtest) {
    return "unvalidated" satisfies ModelQualityStatus;
  }

  return gates.every((gate) => gate.passed)
    ? ("validated" satisfies ModelQualityStatus)
    : ("limited" satisfies ModelQualityStatus);
}

function qualityLabel(status: ModelQualityStatus) {
  if (status === "validated") {
    return "Model validated";
  }

  if (status === "limited") {
    return "Validation limited";
  }

  if (status === "unavailable") {
    return "Quality unavailable";
  }

  return "Not validated";
}

function qualityHelper(status: ModelQualityStatus, failedGate: ModelQualityGate | undefined) {
  if (status === "validated") {
    return "Model-backed actions are on.";
  }

  if (status === "limited" && failedGate) {
    return failedGate.helper;
  }

  if (status === "unavailable") {
    return "Check DATABASE_URL and model evaluation tables.";
  }

  return "Run model backtests before model-backed actions.";
}

export function unvalidatedModelQuality(
  overrides: Partial<ModelQualitySummary> = {},
): ModelQualitySummary {
  const status = overrides.status ?? "unvalidated";

  return {
    averageClosingLineValue: null,
    backtestId: null,
    brierScore: null,
    calibrationBins: [],
    calibrationError: null,
    canAutomate: false,
    closingLineValueCoverage: null,
    closingLineValuePredictionCount: 0,
    createdAt: null,
    coverage: null,
    evaluationCount: 0,
    gates: [],
    helper: qualityHelper(status, undefined),
    knownOutcomeCount: 0,
    label: qualityLabel(status),
    logLoss: null,
    marketCount: 0,
    modelName: null,
    modelVersion: null,
    predictionCount: 0,
    probabilityDrift: null,
    status,
    tournamentCount: 0,
    warnings:
      status === "unavailable"
        ? ["Model quality could not be loaded."]
        : ["No completed model backtest is available."],
    ...overrides,
  };
}

export function buildModelQualitySummary({
  backtest,
  evaluations,
}: BuildModelQualitySummaryInput): ModelQualitySummary {
  if (!backtest) {
    return unvalidatedModelQuality();
  }

  const overall = evaluations.find((row) => row.scope === "overall") ?? null;
  const rowCounts = recordFromUnknown(backtest.metrics.rowCounts);
  const summaryMetrics = recordFromUnknown(backtest.metrics.summary);
  const manifest = recordFromUnknown(backtest.metrics.manifest);
  const manifestConfig = recordFromUnknown(manifest.config);
  const manifestRowCounts = recordFromUnknown(manifest.rowCounts);
  const overallMetrics = recordFromUnknown(overall?.metrics);
  const knownOutcomeCount =
    countFromUnknown(rowCounts.knownOutcomePredictions) ??
    countFromUnknown(manifestRowCounts.knownOutcomePredictions) ??
    countFromUnknown(overallMetrics.knownOutcomeCount) ??
    0;
  const predictionCount =
    countFromUnknown(rowCounts.predictions) ??
    countFromUnknown(manifestRowCounts.predictions) ??
    countFromUnknown(overallMetrics.predictionCount) ??
    0;
  const closingLineValuePredictionCount =
    countFromUnknown(rowCounts.pricedClosingPredictions) ??
    countFromUnknown(rowCounts.closingLineValuePredictions) ??
    countFromUnknown(overallMetrics.closingLineValuePredictionCount) ??
    0;
  const brierScore = overall?.brierScore ?? numberFromUnknown(summaryMetrics.brierScore);
  const logLoss = overall?.logLoss ?? numberFromUnknown(summaryMetrics.logLoss);
  const calibrationError =
    overall?.calibrationError ?? numberFromUnknown(summaryMetrics.calibrationError);
  const calibrationBins = calibrationBinsFromUnknown(overallMetrics.calibrationBins);
  const coverage = overall?.coverage ?? numberFromUnknown(summaryMetrics.coverage);
  const averageClosingLineValue =
    overall?.averageClosingLineValue ?? numberFromUnknown(summaryMetrics.averageClosingLineValue);
  const probabilityDrift = numberFromUnknown(overallMetrics.probabilityDrift);
  const closingLineValueCoverage = ratioOrNull(closingLineValuePredictionCount, predictionCount);
  const marketCount =
    new Set(
      evaluations
        .filter((row) => row.scope === "market" && row.marketType)
        .map((row) => row.marketType),
    ).size || stringArrayFromUnknown(manifestConfig.marketTypes).length;
  const tournamentCount =
    new Set(
      evaluations
        .filter((row) => row.scope === "tournament" && row.tournamentId)
        .map((row) => row.tournamentId),
    ).size ||
    countFromUnknown(manifestRowCounts.targets) ||
    arrayLengthFromUnknown(manifest.targetTournaments);
  const gates: ModelQualityGate[] = [
    buildMinGate({
      helper: `Needs ${modelQualityThresholds.minKnownOutcomes} known outcomes before automation.`,
      id: "known_outcomes",
      label: "Known outcomes",
      threshold: modelQualityThresholds.minKnownOutcomes,
      value: knownOutcomeCount,
    }),
    buildMinGate({
      helper: "Backtest coverage is too low for automation.",
      id: "coverage",
      label: "Coverage",
      threshold: modelQualityThresholds.minCoverage,
      value: coverage,
    }),
    buildMaxGate({
      helper: "Calibration is outside the promotion band.",
      id: "calibration",
      label: "Calibration",
      threshold: modelQualityThresholds.maxCalibrationError,
      value: calibrationError,
    }),
    buildMaxGate({
      helper: "Brier score is outside the promotion band.",
      id: "brier",
      label: "Brier score",
      threshold: modelQualityThresholds.maxBrierScore,
      value: brierScore,
    }),
    buildMaxGate({
      helper: "Log loss is outside the promotion band.",
      id: "log_loss",
      label: "Log loss",
      threshold: modelQualityThresholds.maxLogLoss,
      value: logLoss,
    }),
  ];
  const status = qualityStatus(gates, backtest);
  const failedGates = gates.filter((gate) => !gate.passed);

  return {
    averageClosingLineValue,
    backtestId: backtest.id,
    brierScore,
    calibrationBins,
    calibrationError,
    canAutomate: status === "validated",
    closingLineValueCoverage,
    closingLineValuePredictionCount,
    createdAt: backtest.createdAt,
    coverage,
    evaluationCount: evaluations.length,
    gates,
    helper: qualityHelper(status, failedGates[0]),
    knownOutcomeCount,
    label: qualityLabel(status),
    logLoss,
    marketCount,
    modelName: backtest.modelName,
    modelVersion: backtest.modelVersion,
    predictionCount,
    probabilityDrift,
    status,
    tournamentCount,
    warnings: failedGates.map((gate) => gate.helper),
  };
}
