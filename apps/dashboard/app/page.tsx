import Link from "next/link";
import { getOverviewStats } from "../lib/queries";
import { StatTile } from "../components/stat-tile";
import { EmptyState } from "../components/empty-state";
import { AgentBadge } from "../components/agent-badge";
import { StatusBadge } from "../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { formatDuration, formatNumber, formatRelativeTime, formatUsd } from "../lib/utils";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const stats = getOverviewStats();

  if (stats.totalSessions === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fleet-wide activity across every connected agent.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total sessions" value={formatNumber(stats.totalSessions)} />
        <StatTile
          label="Total cost"
          value={formatUsd(stats.totalCostUsd)}
          sublabel="Vendor-reported where available, estimated otherwise"
        />
        <StatTile label="Total tokens" value={formatNumber(stats.totalInputTokens + stats.totalOutputTokens)} />
        <StatTile label="Success rate" value={`${Math.round(stats.successRate * 100)}%`} sublabel="Of completed sessions" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {stats.byAgent.map((a) => (
          <Card key={a.agentType}>
            <CardHeader>
              <CardTitle className="text-foreground">
                <AgentBadge agentType={a.agentType} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(a.sessionCount)}</div>
              <p className="mt-1 text-xs text-muted-foreground">sessions observed</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {stats.recentSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${encodeURIComponent(session.id)}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <AgentBadge agentType={session.agentType} />
                <span className="text-muted-foreground">{session.model ?? "unknown model"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{formatDuration(Math.max(0, Date.parse(session.endedAt ?? session.startedAt) - Date.parse(session.startedAt)))}</span>
                <span className="font-medium">{formatUsd(session.totalCostUsd)}</span>
                <StatusBadge status={session.status} />
                <span className="w-20 text-right text-xs text-muted-foreground">{formatRelativeTime(session.startedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
