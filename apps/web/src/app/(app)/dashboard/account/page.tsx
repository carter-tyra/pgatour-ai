import { formatCurrency } from "@/features/intelligence-terminal/helpers";
import { requireCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import type {
  EventReadinessResource,
  EventReadinessStatus,
  ModelCalibrationBin,
  ModelQualityGate,
  ModelQualityStatus,
  ModelQualitySummary,
} from "@/lib/intelligence-types";
import { modelQualityThresholds } from "@/lib/model-quality";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusClassName = {
  missing: "border-amber-200 bg-amber-50 text-amber-900",
  partial: "border-amber-200 bg-amber-50 text-amber-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  unavailable: "border-red-200 bg-red-50 text-red-900",
} satisfies Record<EventReadinessStatus, string>;

const modelQualityClassName = {
  limited: "border-amber-200 bg-amber-50 text-amber-900",
  unavailable: "border-red-200 bg-red-50 text-red-900",
  unvalidated: "border-amber-200 bg-amber-50 text-amber-900",
  validated: "border-emerald-200 bg-emerald-50 text-emerald-900",
} satisfies Record<ModelQualityStatus, string>;

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function resourceCount(resource: EventReadinessResource) {
  if (resource.total === null) {
    return countValue(resource.count);
  }

  return `${countValue(resource.count)}/${countValue(resource.total)}`;
}

function ResourceStatus({ resource }: { resource: EventReadinessResource }) {
  return (
    <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-foreground">{resource.label}</div>
          <div className="mt-1 text-sm text-muted-foreground">{resource.helper}</div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-xs font-medium tabular-nums",
            statusClassName[resource.status],
          )}
        >
          {resourceCount(resource)}
        </span>
      </div>
    </div>
  );
}

function metricValue(value: number | null, digits = 3) {
  return value === null ? "N/A" : value.toFixed(digits);
}

function countValue(value: number | null) {
  return value === null ? "N/A" : countFormatter.format(value);
}

function percentValue(value: number | null) {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function pointValue(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const points = value * 100;
  const sign = points > 0 ? "+" : "";

  return `${sign}${points.toFixed(1)} pts`;
}

function driftHelper(value: number | null) {
  if (value === null) {
    return "No drift data";
  }

  if (Math.abs(value) < 0.005) {
    return "Actual near model";
  }

  return value > 0 ? "Actual higher" : "Model higher";
}

function probabilityWidth(value: number) {
  return `${Math.min(Math.max(value, 0), 1) * 100}%`;
}

function calibrationBandKey(bin: ModelCalibrationBin) {
  return `${bin.startProbability}:${bin.endProbability}:${bin.count}`;
}

function calibrationSampleCount(bins: ModelCalibrationBin[]) {
  return bins.reduce((total, bin) => total + bin.count, 0);
}

function shortDateValue(value: string | null) {
  if (value === null) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : shortDateFormatter.format(date);
}

function backtestMeta(quality: ModelQualitySummary) {
  if (!quality.backtestId) {
    return "No completed run";
  }

  const date = shortDateValue(quality.createdAt);
  const run = `Run ${quality.backtestId.slice(0, 8)}`;

  return date ? `${run} / ${date}` : run;
}

function gateValue(gate: ModelQualityGate) {
  if (gate.id === "known_outcomes") {
    return countValue(gate.value);
  }

  if (gate.id === "coverage" || gate.id === "calibration") {
    return percentValue(gate.value);
  }

  return metricValue(gate.value);
}

function DiagnosticCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

function CalibrationBands({ bins }: { bins: ModelCalibrationBin[] }) {
  if (bins.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Calibration bands</h4>
          <p className="mt-1 text-xs text-muted-foreground">Model vs actual by probability band</p>
        </div>
        <span className="rounded-full border border-border/70 px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {countValue(calibrationSampleCount(bins))} rows
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-[minmax(9rem,1fr)_minmax(8rem,1fr)_5rem_5rem_4rem] gap-3 border-b border-border/70 pb-2 text-xs font-medium uppercase text-muted-foreground">
            <div>Band</div>
            <div>Fit</div>
            <div className="text-right">Model</div>
            <div className="text-right">Actual</div>
            <div className="text-right">Rows</div>
          </div>
          <div className="divide-y divide-border/70">
            {bins.map((bin) => (
              <div
                className="grid grid-cols-[minmax(9rem,1fr)_minmax(8rem,1fr)_5rem_5rem_4rem] items-center gap-3 py-2 text-sm"
                key={calibrationBandKey(bin)}
              >
                <div className="tabular-nums text-muted-foreground">
                  {percentValue(bin.startProbability)}-{percentValue(bin.endProbability)}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-foreground/70"
                      style={{ width: probabilityWidth(bin.averageProbability) }}
                    />
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-emerald-600/70"
                      style={{ width: probabilityWidth(bin.outcomeRate) }}
                    />
                  </div>
                </div>
                <div className="text-right tabular-nums text-foreground">
                  {percentValue(bin.averageProbability)}
                </div>
                <div className="text-right tabular-nums text-foreground">
                  {percentValue(bin.outcomeRate)}
                </div>
                <div className="text-right tabular-nums text-muted-foreground">
                  {countValue(bin.count)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QualityGateStatus({ gate }: { gate: ModelQualityGate }) {
  return (
    <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-foreground">{gate.label}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {gate.passed ? "Passes promotion gate." : gate.helper}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-xs font-medium tabular-nums",
            gate.passed
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          {gateValue(gate)}
        </span>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const session = await requireCurrentSession();
  const { data, shell, trackerSnapshot } = await getDashboardData(session.user.id);
  const userLabel = session.user.name || session.user.email || "Signed in";
  const readiness = data.sourceState.readiness;
  const quality = data.model.quality;
  const summary = trackerSnapshot.summary;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-pretty text-[1.7rem] font-medium leading-tight tracking-tight text-foreground">
            Account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {userLabel} / {data.tournament.name}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium",
            statusClassName[readiness.status],
          )}
        >
          {readiness.score}% ready
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Event</div>
          <div className="mt-2 truncate text-sm font-medium text-foreground">
            {data.tournament.course}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{readiness.label}</div>
        </div>
        <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Model</div>
          <div className="mt-2 text-sm font-medium text-foreground">{shell.modelVersion}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {shell.modeledPlayerCount} modeled / {shell.predictionCount} predictions
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Portfolio</div>
          <div className="mt-2 text-sm font-medium text-foreground">
            {formatCurrency(summary.openStake)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary.openBetCount} open / {summary.settledBetCount} settled
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Watchlists</div>
          <div className="mt-2 text-sm font-medium text-foreground">{summary.watchlistCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Saved player groups</div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-foreground">Model quality</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {quality.label}. {quality.helper}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              modelQualityClassName[quality.status],
            )}
          >
            {quality.canAutomate ? "Automation on" : "Automation off"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Backtest</div>
            <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
              {countValue(quality.tournamentCount)} events
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {backtestMeta(quality)}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Outcomes</div>
            <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
              {countValue(quality.knownOutcomeCount)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {countValue(quality.predictionCount)} predictions
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Closing prices
            </div>
            <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
              {countValue(quality.closingLineValuePredictionCount)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {percentValue(quality.closingLineValueCoverage)} priced
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-primary-foreground p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Avg CLV</div>
            <div className="mt-2 text-sm font-medium tabular-nums text-foreground">
              {pointValue(quality.averageClosingLineValue)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Model vs close</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DiagnosticCard
            helper={`Target <= ${percentValue(modelQualityThresholds.maxCalibrationError)}`}
            label="Calibration"
            value={percentValue(quality.calibrationError)}
          />
          <DiagnosticCard
            helper={driftHelper(quality.probabilityDrift)}
            label="Drift"
            value={pointValue(quality.probabilityDrift)}
          />
          <DiagnosticCard
            helper={`Target <= ${metricValue(modelQualityThresholds.maxBrierScore)}`}
            label="Brier"
            value={metricValue(quality.brierScore)}
          />
          <DiagnosticCard
            helper={`Target <= ${metricValue(modelQualityThresholds.maxLogLoss)}`}
            label="Log loss"
            value={metricValue(quality.logLoss)}
          />
        </div>

        <CalibrationBands bins={quality.calibrationBins} />

        {quality.gates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {quality.gates.map((gate) => (
              <QualityGateStatus gate={gate} key={gate.id} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">Event readiness</h3>
          <p className="mt-1 text-sm text-muted-foreground">{readiness.helper}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {readiness.resources.map((resource) => (
            <ResourceStatus key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      {data.sourceState.warnings.length > 0 ? (
        <section className="rounded-lg border border-border/70 bg-primary-foreground p-4">
          <h3 className="text-base font-medium text-foreground">Data notes</h3>
          <div className="mt-3 flex flex-col gap-2">
            {data.sourceState.warnings.map((warning) => (
              <div className="text-sm text-muted-foreground" key={warning}>
                {warning}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
