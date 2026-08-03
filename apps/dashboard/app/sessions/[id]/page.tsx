import { notFound } from "next/navigation";
import { getSession, getSessionEvents, getSessionMetrics, getSessionSpans } from "../../../lib/queries";
import { evaluateSessionAlerts } from "../../../lib/alerts";
import { AgentBadge } from "../../../components/agent-badge";
import { StatusBadge } from "../../../components/status-badge";
import { AlertBadges } from "../../../components/alert-badges";
import { StatTile } from "../../../components/stat-tile";
import { SpanWaterfall } from "../../../components/span-waterfall";
import { EventList } from "../../../components/event-list";
import { SessionReplay, type ReplayMetricPoint, type ReplayStep } from "../../../components/session-replay";
import { formatNumber, formatUsd, summarizeAttributes } from "../../../lib/utils";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();

  const spans = getSessionSpans(id);
  const events = getSessionEvents(id);
  const metrics = getSessionMetrics(id);

  const replaySteps: ReplayStep[] =
    spans.length > 0
      ? spans.map((s) => ({
          key: s.id,
          kind: "span" as const,
          label: s.name,
          detail: summarizeAttributes(s.attributes),
          timestampMs: Number(BigInt(s.startTimeUnixNano) / 1_000_000n),
        }))
      : events.map((e) => ({
          key: String(e.id),
          kind: "event" as const,
          label: e.name,
          detail: summarizeAttributes(e.attributes),
          timestampMs: Date.parse(e.occurredAt),
        }));

  const replayMetrics: ReplayMetricPoint[] = metrics.map((m) => ({
    name: m.name,
    value: m.value,
    unit: m.unit,
    timestampMs: Date.parse(m.recordedAt),
  }));

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
          <div className="mt-2">
            <AlertBadges alerts={evaluateSessionAlerts(session)} />
          </div>
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

      {replaySteps.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Replay</h2>
          <SessionReplay steps={replaySteps} metrics={replayMetrics} />
        </div>
      )}
    </div>
  );
}
