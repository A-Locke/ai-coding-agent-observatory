import { notFound } from "next/navigation";
import { getSession, getSessionEvents, getSessionSpans } from "../../../lib/queries";
import { AgentBadge } from "../../../components/agent-badge";
import { StatusBadge } from "../../../components/status-badge";
import { StatTile } from "../../../components/stat-tile";
import { SpanWaterfall } from "../../../components/span-waterfall";
import { EventList } from "../../../components/event-list";
import { formatNumber, formatUsd } from "../../../lib/utils";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();

  const spans = getSessionSpans(id);
  const events = getSessionEvents(id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AgentBadge agentType={session.agentType} />
            <StatusBadge status={session.status} />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{session.model ?? "Unknown model"}</h1>
          <p className="text-xs text-muted-foreground">Session {session.id}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Cost"
          value={formatUsd(session.totalCostUsd)}
          sublabel={session.costIsEstimated ? "Estimated from tokens" : "Vendor-reported"}
        />
        <StatTile label="Tokens" value={formatNumber(session.inputTokens + session.outputTokens)} sublabel={`${formatNumber(session.inputTokens)} in / ${formatNumber(session.outputTokens)} out`} />
        <StatTile label="Tool calls" value={formatNumber(session.toolCallCount)} sublabel={`${session.filesEditedCount} files edited`} />
        <StatTile label="Tests / retries" value={`${session.testsRunCount} / ${session.retryCount}`} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
        {spans.length > 0 ? (
          <SpanWaterfall spans={spans} />
        ) : events.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              No trace spans for this session (tracing is beta / optional for this agent) — showing the raw event
              sequence instead.
            </p>
            <EventList events={events} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No spans or events recorded for this session yet.</p>
        )}
      </div>
    </div>
  );
}
