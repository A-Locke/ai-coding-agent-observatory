import { getLeaderboard } from "../../lib/queries";
import { EmptyState } from "../../components/empty-state";
import { AgentBadge } from "../../components/agent-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { formatDuration, formatNumber, formatUsd } from "../../lib/utils";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const rows = getLeaderboard();

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Agents and models ranked by activity, cost, and success rate.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">Success rate</TableHead>
            <TableHead className="text-right">Avg cost</TableHead>
            <TableHead className="text-right">Cost / success</TableHead>
            <TableHead className="text-right">Avg tokens</TableHead>
            <TableHead className="text-right">Avg duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.agentType}:${row.model}`}>
              <TableCell>
                <AgentBadge agentType={row.agentType} />
              </TableCell>
              <TableCell className="text-muted-foreground">{row.model}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(row.sessionCount)}</TableCell>
              <TableCell className="text-right tabular-nums">{Math.round(row.successRate * 100)}%</TableCell>
              <TableCell className="text-right tabular-nums">{formatUsd(row.avgCostUsd)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatUsd(row.costPerSuccessUsd)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(Math.round(row.avgTokensPerSession))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatDuration(row.avgDurationMs)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
