import type { SpanRecord } from "@observatory/shared";
import { formatDuration } from "../lib/utils";
import { STATUS_COLOR } from "../lib/chart-colors";

function depthOf(span: SpanRecord, byId: Map<string, SpanRecord>, seen = new Set<string>()): number {
  if (!span.parentSpanId || seen.has(span.spanId)) return 0;
  seen.add(span.spanId);
  const parent = byId.get(span.parentSpanId);
  return parent ? 1 + depthOf(parent, byId, seen) : 0;
}

export function SpanWaterfall({ spans }: { spans: SpanRecord[] }) {
  if (spans.length === 0) return null;

  const starts = spans.map((s) => BigInt(s.startTimeUnixNano));
  const ends = spans.map((s) => BigInt(s.endTimeUnixNano));
  const rangeStart = starts.reduce((a, b) => (a < b ? a : b));
  const rangeEnd = ends.reduce((a, b) => (a > b ? a : b));
  const totalNs = Number(rangeEnd - rangeStart) || 1;

  const byId = new Map(spans.map((s) => [s.spanId, s]));

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      {spans.map((span) => {
        const offsetNs = Number(BigInt(span.startTimeUnixNano) - rangeStart);
        const leftPct = Math.max(0, (offsetNs / totalNs) * 100);
        const widthPct = Math.max(0.5, (span.durationMs * 1_000_000 / totalNs) * 100);
        const depth = depthOf(span, byId);
        const barColor = span.statusCode === "ERROR" ? STATUS_COLOR.failed : "var(--primary)";
        return (
          <div key={span.id} className="flex items-center gap-3 py-1 text-xs">
            <span
              className="w-56 shrink-0 truncate text-muted-foreground"
              style={{ paddingLeft: `${depth * 14}px` }}
              title={span.name}
            >
              {span.name}
            </span>
            <div className="relative h-4 flex-1 rounded bg-muted">
              <div
                className="absolute top-0 h-4 rounded-sm"
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: barColor }}
                title={`${span.name} — ${formatDuration(span.durationMs)}`}
              />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">{formatDuration(span.durationMs)}</span>
          </div>
        );
      })}
    </div>
  );
}
