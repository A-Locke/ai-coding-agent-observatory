import type { AgentType } from "@observatory/shared";
import { getCostByDay, getOverviewStats, getTokensByAgent } from "../../lib/queries";
import { EmptyState } from "../../components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CostOverTimeChart, type CostByDayRow } from "../../components/charts/cost-over-time-chart";
import { TokensByAgentChart, type TokensByAgentRow } from "../../components/charts/tokens-by-agent-chart";
import { AGENT_LABEL } from "../../lib/chart-colors";

export const dynamic = "force-dynamic";

export default function MetricsPage() {
  const overview = getOverviewStats();
  if (overview.totalSessions === 0) {
    return <EmptyState />;
  }

  const costRows = getCostByDay();
  const agentsPresent = Array.from(new Set(costRows.map((r) => r.agentType)));
  const pivotedByDay = new Map<string, CostByDayRow>();
  for (const row of costRows) {
    const entry = pivotedByDay.get(row.day) ?? { day: row.day };
    entry[row.agentType] = row.costUsd;
    pivotedByDay.set(row.day, entry);
  }
  const costChartRows = Array.from(pivotedByDay.values());

  const tokensByAgent = getTokensByAgent();
  const tokenChartRows: TokensByAgentRow[] = tokensByAgent.map((row) => ({
    agentType: row.agentType,
    label: AGENT_LABEL[row.agentType],
    totalTokens: row.inputTokens + row.outputTokens,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cost and token usage across all connected agents.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Cost by day</CardTitle>
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
    </div>
  );
}
