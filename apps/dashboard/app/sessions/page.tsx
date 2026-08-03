import Link from "next/link";
import type { AgentType } from "@observatory/shared";
import { listSessions } from "../../lib/queries";
import { evaluateSessionAlerts } from "../../lib/alerts";
import { EmptyState } from "../../components/empty-state";
import { AgentBadge } from "../../components/agent-badge";
import { StatusBadge } from "../../components/status-badge";
import { AlertBadges } from "../../components/alert-badges";
import { ExportLinks } from "../../components/export-links";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { formatNumber, formatRelativeTime, formatUsd } from "../../lib/utils";

export const dynamic = "force-dynamic";

const AGENT_FILTERS: { label: string; value: AgentType | undefined }[] = [
  { label: "All agents", value: undefined },
  { label: "Claude Code", value: "claude-code" },
  { label: "Codex CLI", value: "codex-cli" },
  { label: "Gemini CLI", value: "gemini-cli" },
];

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const params = await searchParams;
  const agentType = (params.agent as AgentType | undefined) ?? undefined;
  const sessions = listSessions({ agentType });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every agent session observed by the collector.</p>
        </div>
        <ExportLinks basePath="/api/export/sessions" />
      </div>

      <div className="flex flex-wrap gap-2">
        {AGENT_FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/sessions?agent=${filter.value}` : "/sessions"}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              agentType === filter.value ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No sessions match this filter" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alerts</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Tools</TableHead>
              <TableHead className="text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <Link href={`/sessions/${encodeURIComponent(session.id)}`} className="hover:underline">
                    <AgentBadge agentType={session.agentType} />
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{session.model ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={session.status} />
                </TableCell>
                <TableCell>
                  <AlertBadges alerts={evaluateSessionAlerts(session)} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(session.totalCostUsd)}
                  {session.costIsEstimated ? <span className="ml-1 text-[10px] text-muted-foreground">est.</span> : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(session.inputTokens + session.outputTokens)}</TableCell>
                <TableCell className="text-right tabular-nums">{session.toolCallCount}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatRelativeTime(session.startedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
