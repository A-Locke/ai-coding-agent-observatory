import Link from "next/link";
import type { AgentType } from "@observatory/shared";
import {
  getCostEfficiencyStats,
  getCostTrend,
  getLatencyStats,
  getMonthlyCostProjection,
  getOverviewStats,
  getTokensByAgent,
  getToolUsageFrequency,
  type CostTrendGranularity,
} from "../../lib/queries";
import { EmptyState } from "../../components/empty-state";
import { StatTile } from "../../components/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CostOverTimeChart, type CostByDayRow } from "../../components/charts/cost-over-time-chart";
import { TokensByAgentChart, type TokensByAgentRow } from "../../components/charts/tokens-by-agent-chart";
import { ToolUsageChart } from "../../components/charts/tool-usage-chart";
import { AGENT_LABEL } from "../../lib/chart-colors";
import { formatDuration, formatUsd } from "../../lib/utils";

export const dynamic = "force-dynamic";

const GRANULARITIES: { label: string; value: CostTrendGranularity }[] = [
  { label: "Daily", value: "day" },
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
];

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ granularity?: string }> }) {
  const params = await searchParams;
  const granularity: CostTrendGranularity =
    params.granularity === "week" || params.granularity === "month" ? params.granularity : "day";

  const overview = getOverviewStats();
  if (overview.totalSessions === 0) {
    return <EmptyState />;
  }

  const costRows = getCostTrend(granularity);
  const agentsPresent = Array.from(new Set(costRows.map((r) => r.agentType)));
  const pivotedByBucket = new Map<string, CostByDayRow>();
  for (const row of costRows) {
    const entry = pivotedByBucket.get(row.bucket) ?? { day: row.bucket };
    entry[row.agentType] = row.costUsd;
    pivotedByBucket.set(row.bucket, entry);
  }
  const costChartRows = Array.from(pivotedByBucket.values());

  const tokensByAgent = getTokensByAgent();
  const tokenChartRows: TokensByAgentRow[] = tokensByAgent.map((row) => ({
    agentType: row.agentType,
    label: AGENT_LABEL[row.agentType],
    totalTokens: row.inputTokens + row.outputTokens,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  }));

  const projection = getMonthlyCostProjection();
  const efficiency = getCostEfficiencyStats();
  const toolUsage = getToolUsageFrequency();
  const latency = getLatencyStats();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cost and engineering metrics across all connected agents.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Month-to-date cost"
          value={formatUsd(projection.monthToDateUsd)}
          sublabel={`Projected ~${formatUsd(projection.projectedMonthUsd)} this month (day ${projection.daysElapsed}/${projection.daysInMonth})`}
        />
        <StatTile label="Cost per success" value={formatUsd(efficiency.costPerSuccessUsd)} sublabel="Fleet-wide" />
        <StatTile label="Cost per file edited" value={formatUsd(efficiency.costPerFileEditedUsd)} sublabel="Fleet-wide" />
        <StatTile label="Retry rate" value={efficiency.retryRate.toFixed(2)} sublabel="Retries per session" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-foreground">Cost trend</CardTitle>
            <div className="flex gap-1">
              {GRANULARITIES.map((g) => (
                <Link
                  key={g.value}
                  href={g.value === "day" ? "/metrics" : `/metrics?granularity=${g.value}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    granularity === g.value
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {g.label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CostOverTimeChart rows={costChartRows} agents={agentsPresent as AgentType[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Tokens by agent</CardTitle>
        </CardHeader>
        <CardContent>
          <TokensByAgentChart rows={tokenChartRows} />
        </CardContent>
      </Card>

      {toolUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Most-used tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ToolUsageChart rows={toolUsage} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Latency</CardTitle>
        </CardHeader>
        <CardContent>
          {latency.hasTraceData ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-2xl font-semibold">
                  {latency.avgLlmRequestMs !== null ? formatDuration(latency.avgLlmRequestMs) : "—"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Avg. model request latency (from trace spans)</p>
              </div>
              {latency.slowestSession && (
                <div>
                  <div className="text-2xl font-semibold">{formatDuration(latency.slowestSession.traceSpanMs)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Longest trace span —{" "}
                    <Link href={`/sessions/${encodeURIComponent(latency.slowestSession.sessionId)}`} className="underline">
                      view session
                    </Link>{" "}
                    (earliest span start to latest span end, not a weighted critical-path calculation)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trace span data yet — latency metrics need beta tracing enabled (e.g.{" "}
              <code className="rounded bg-muted px-1 py-0.5">CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1</code> for Claude Code).
              See <code className="rounded bg-muted px-1 py-0.5">docs/CONNECT_AGENTS.md</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
