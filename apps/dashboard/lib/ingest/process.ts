import { identifyAgentFromRecordName, type AgentType, type Provider } from "@observatory/shared";
import {
  flattenLogs,
  flattenMetrics,
  flattenTraces,
  nanoToIso,
  type FlatLogRecord,
  type FlatMetricPoint,
  type FlatSpan,
} from "../otlp/decode";
import type { OtlpLogsPayload, OtlpMetricsPayload, OtlpTracesPayload } from "../otlp/types";
import { applySessionDelta, insertEvent, insertMetric, insertSpan, type SessionDelta } from "../db";
import { claudeCodeLogDelta, claudeCodeMetricDelta } from "./adapters/claude-code";
import { geminiCliLogDelta, geminiCliMetricDelta } from "./adapters/gemini-cli";
import { codexCliLogDelta, codexCliMetricDelta } from "./adapters/codex-cli";

// Records whose name doesn't match any known vendor prefix are still
// persisted in full by insertSpan/insertMetric/insertEvent below (this *is*
// the "generic fallback" from the PRD/ADR -- there's no separate adapter
// module for it because raw persistence needs no per-vendor logic). They
// just don't get a session-rollup delta applied, since we can't safely
// attribute the numbers to a specific vendor's counting rules.

const AGENT_PROVIDER: Record<AgentType, Provider> = {
  "claude-code": "anthropic",
  "codex-cli": "openai",
  "gemini-cli": "google",
};

const METRIC_DELTA_FNS: Record<
  AgentType,
  (name: string, value: number, attrs: Record<string, unknown>) => Partial<SessionDelta>
> = {
  "claude-code": claudeCodeMetricDelta,
  "gemini-cli": geminiCliMetricDelta,
  "codex-cli": codexCliMetricDelta,
};

const LOG_DELTA_FNS: Record<AgentType, (name: string, attrs: Record<string, unknown>) => Partial<SessionDelta>> = {
  "claude-code": claudeCodeLogDelta,
  "gemini-cli": geminiCliLogDelta,
  "codex-cli": codexCliLogDelta,
};

function extractSessionId(attributes: Record<string, unknown>): string | null {
  const value = attributes["session.id"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractAgentVersion(agentType: AgentType, attributes: Record<string, unknown>): string | null {
  if (agentType === "claude-code") return (attributes["app.version"] as string | undefined) ?? null;
  return null;
}

function touchSession(
  agentType: AgentType,
  sessionId: string,
  occurredAt: string,
  attributes: Record<string, unknown>,
  delta: Partial<SessionDelta>
) {
  applySessionDelta(sessionId, {
    agentType,
    provider: AGENT_PROVIDER[agentType],
    agentVersion: extractAgentVersion(agentType, attributes),
    occurredAt,
    ...delta,
  });
}

export function processTraces(payload: OtlpTracesPayload): { spanCount: number } {
  const spans: FlatSpan[] = flattenTraces(payload);
  for (const span of spans) {
    const agentType = identifyAgentFromRecordName(span.name);
    const sessionId = extractSessionId(span.attributes);
    insertSpan({
      id: `${span.traceId}:${span.spanId}`,
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      sessionId,
      name: span.name,
      kind: span.kind,
      startTimeUnixNano: span.startTimeUnixNano,
      endTimeUnixNano: span.endTimeUnixNano,
      durationMs: span.durationMs,
      statusCode: span.statusCode,
      attributes: span.attributes,
    });
    if (agentType && sessionId) {
      touchSession(agentType, sessionId, nanoToIso(span.startTimeUnixNano), span.attributes, {});
    }
  }
  return { spanCount: spans.length };
}

export function processMetrics(payload: OtlpMetricsPayload): { metricCount: number } {
  const points: FlatMetricPoint[] = flattenMetrics(payload);
  for (const point of points) {
    const agentType = identifyAgentFromRecordName(point.metricName);
    const sessionId = extractSessionId(point.attributes);
    insertMetric({
      sessionId,
      name: point.metricName,
      value: point.value,
      unit: point.unit,
      recordedAt: nanoToIso(point.timeUnixNano),
      attributes: point.attributes,
    });
    if (agentType && sessionId) {
      const delta = METRIC_DELTA_FNS[agentType](point.metricName, point.value, point.attributes);
      touchSession(agentType, sessionId, nanoToIso(point.timeUnixNano), point.attributes, delta);
    }
  }
  return { metricCount: points.length };
}

export function processLogs(payload: OtlpLogsPayload): { logCount: number } {
  const records: FlatLogRecord[] = flattenLogs(payload);
  for (const record of records) {
    const agentType = record.name ? identifyAgentFromRecordName(record.name) : null;
    const sessionId = extractSessionId(record.attributes);
    insertEvent({
      sessionId,
      agentType: agentType ?? "unknown",
      name: record.name ?? "log",
      occurredAt: record.occurredAt,
      sequence: typeof record.attributes["event.sequence"] === "number" ? (record.attributes["event.sequence"] as number) : null,
      attributes: record.attributes,
    });
    if (agentType && sessionId && record.name) {
      const delta = LOG_DELTA_FNS[agentType](record.name, record.attributes);
      touchSession(agentType, sessionId, record.occurredAt, record.attributes, delta);
    }
  }
  return { logCount: records.length };
}
