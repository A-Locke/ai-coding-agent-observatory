import {
  calculateCostUsd,
  CLAUDE_CODE_SPAN,
  type AgentSession,
  type AgentType,
  type LeaderboardRow,
  type SessionStatus,
  type SpanRecord,
} from "@observatory/shared";
import { getDb } from "./db";

const RUNNING_THRESHOLD_MS = 2 * 60 * 1000;

interface SessionRow {
  id: string;
  agent_type: AgentType;
  agent_version: string | null;
  provider: AgentSession["provider"];
  model: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  total_cost_usd: number;
  cost_is_estimated: number;
  input_tokens: number;
  output_tokens: number;
  tool_call_count: number;
  files_edited_count: number;
  tests_run_count: number;
  retry_count: number;
  last_seen_at: string;
}

// There is no native "session ended successfully/failed" signal from any of
// the three agents (see PRD §11 risks), so status is a read-time heuristic:
// recently-active sessions are "running"; otherwise a session that saw at
// least one retry/error is "partial", everything else is "success".
function deriveStatus(row: SessionRow): SessionStatus {
  const isRecent = Date.now() - Date.parse(row.last_seen_at) < RUNNING_THRESHOLD_MS;
  if (isRecent) return "running";
  return row.retry_count > 0 ? "partial" : "success";
}

function mapSessionRow(row: SessionRow): AgentSession {
  const costIsEstimated = Boolean(row.cost_is_estimated);
  const totalCostUsd = costIsEstimated
    ? calculateCostUsd(row.model ?? "", row.input_tokens, row.output_tokens)
    : row.total_cost_usd;
  return {
    id: row.id,
    agentType: row.agent_type,
    agentVersion: row.agent_version,
    provider: row.provider,
    model: row.model,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: deriveStatus(row),
    totalCostUsd,
    costIsEstimated,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    toolCallCount: row.tool_call_count,
    filesEditedCount: row.files_edited_count,
    testsRunCount: row.tests_run_count,
    retryCount: row.retry_count,
  };
}

export interface OverviewStats {
  totalSessions: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  successRate: number;
  byAgent: { agentType: AgentType; sessionCount: number }[];
  recentSessions: AgentSession[];
}

export function getOverviewStats(): OverviewStats {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM sessions ORDER BY last_seen_at DESC").all() as unknown as SessionRow[];
  const sessions = rows.map(mapSessionRow);

  const byAgentMap = new Map<AgentType, number>();
  for (const s of sessions) {
    byAgentMap.set(s.agentType, (byAgentMap.get(s.agentType) ?? 0) + 1);
  }

  const successCount = sessions.filter((s) => s.status === "success").length;
  const decided = sessions.filter((s) => s.status !== "running").length;

  return {
    totalSessions: sessions.length,
    totalCostUsd: sessions.reduce((sum, s) => sum + s.totalCostUsd, 0),
    totalInputTokens: sessions.reduce((sum, s) => sum + s.inputTokens, 0),
    totalOutputTokens: sessions.reduce((sum, s) => sum + s.outputTokens, 0),
    successRate: decided > 0 ? successCount / decided : 0,
    byAgent: Array.from(byAgentMap.entries()).map(([agentType, sessionCount]) => ({ agentType, sessionCount })),
    recentSessions: sessions.slice(0, 10),
  };
}

export interface ListSessionsOptions {
  agentType?: AgentType;
  limit?: number;
}

export function listSessions(options: ListSessionsOptions = {}): AgentSession[] {
  const db = getDb();
  const limit = options.limit ?? 100;
  const rows = options.agentType
    ? (db
        .prepare("SELECT * FROM sessions WHERE agent_type = @agentType ORDER BY last_seen_at DESC LIMIT @limit")
        .all({ agentType: options.agentType, limit }) as unknown as SessionRow[])
    : (db.prepare("SELECT * FROM sessions ORDER BY last_seen_at DESC LIMIT @limit").all({ limit }) as unknown as SessionRow[]);
  return rows.map(mapSessionRow);
}

export function getSession(id: string): AgentSession | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = @id").get({ id }) as unknown as SessionRow | undefined;
  return row ? mapSessionRow(row) : null;
}

export function getMostRecentSessionId(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT id FROM sessions ORDER BY last_seen_at DESC LIMIT 1").get() as { id: string } | undefined;
  return row?.id ?? null;
}

interface SpanDbRow {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  session_id: string | null;
  name: string;
  kind: string;
  start_time_unix_nano: string;
  end_time_unix_nano: string;
  duration_ms: number;
  status_code: string;
  attributes_json: string;
}

export function getSessionSpans(sessionId: string): SpanRecord[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM spans WHERE session_id = @sessionId ORDER BY start_time_unix_nano ASC")
    .all({ sessionId }) as unknown as SpanDbRow[];
  return rows.map((row) => ({
    id: row.id,
    traceId: row.trace_id,
    spanId: row.span_id,
    parentSpanId: row.parent_span_id,
    sessionId: row.session_id,
    name: row.name,
    kind: row.kind,
    startTimeUnixNano: row.start_time_unix_nano,
    endTimeUnixNano: row.end_time_unix_nano,
    durationMs: row.duration_ms,
    statusCode: row.status_code as SpanRecord["statusCode"],
    attributes: JSON.parse(row.attributes_json),
  }));
}

export interface EventRowOut {
  id: number;
  sessionId: string | null;
  agentType: string;
  name: string;
  occurredAt: string;
  attributes: Record<string, unknown>;
}

export function getSessionEvents(sessionId: string): EventRowOut[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM events WHERE session_id = @sessionId ORDER BY occurred_at ASC")
    .all({ sessionId }) as unknown as {
    id: number;
    session_id: string | null;
    agent_type: string;
    name: string;
    occurred_at: string;
    attributes_json: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    agentType: row.agent_type,
    name: row.name,
    occurredAt: row.occurred_at,
    attributes: JSON.parse(row.attributes_json),
  }));
}

export interface SessionMetricPoint {
  id: number;
  name: string;
  value: number;
  unit: string;
  recordedAt: string;
}

// unit === "USD" / "tokens" identifies cost/token metrics generically across
// agents, without hardcoding each vendor's specific metric name.
export function getSessionMetrics(sessionId: string): SessionMetricPoint[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, value, unit, recorded_at FROM metrics WHERE session_id = @sessionId ORDER BY recorded_at ASC")
    .all({ sessionId }) as unknown as { id: number; name: string; value: number; unit: string; recorded_at: string }[];
  return rows.map((row) => ({ id: row.id, name: row.name, value: row.value, unit: row.unit, recordedAt: row.recorded_at }));
}

export interface CostByDayPoint {
  day: string;
  agentType: AgentType;
  costUsd: number;
}

export type CostTrendGranularity = "day" | "week" | "month";

export interface CostTrendPoint {
  bucket: string;
  agentType: AgentType;
  costUsd: number;
}

const BUCKET_EXPR: Record<CostTrendGranularity, string> = {
  day: "substr(started_at, 1, 10)",
  week: "strftime('%Y-W%W', started_at)",
  month: "substr(started_at, 1, 7)",
};

export function getCostTrend(granularity: CostTrendGranularity = "day"): CostTrendPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${BUCKET_EXPR[granularity]} as bucket, agent_type, model, total_cost_usd, cost_is_estimated, input_tokens, output_tokens
       FROM sessions`
    )
    .all() as unknown as {
    bucket: string;
    agent_type: AgentType;
    model: string | null;
    total_cost_usd: number;
    cost_is_estimated: number;
    input_tokens: number;
    output_tokens: number;
  }[];

  const byKey = new Map<string, CostTrendPoint>();
  for (const row of rows) {
    const cost = row.cost_is_estimated
      ? calculateCostUsd(row.model ?? "", row.input_tokens, row.output_tokens)
      : row.total_cost_usd;
    const key = `${row.bucket}:${row.agent_type}`;
    const existing = byKey.get(key);
    if (existing) existing.costUsd += cost;
    else byKey.set(key, { bucket: row.bucket, agentType: row.agent_type, costUsd: cost });
  }
  return Array.from(byKey.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function getCostByDay(): CostByDayPoint[] {
  return getCostTrend("day").map((p) => ({ day: p.bucket, agentType: p.agentType, costUsd: p.costUsd }));
}

export interface MonthlyCostProjection {
  monthToDateUsd: number;
  daysElapsed: number;
  daysInMonth: number;
  projectedMonthUsd: number;
}

// Naive linear extrapolation (month-to-date / days elapsed * days in month) --
// deliberately simple, not a forecasting model. Good enough to answer "am I
// on track to blow the budget this month," not for precise prediction.
export function getMonthlyCostProjection(): MonthlyCostProjection {
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const daysElapsed = now.getUTCDate();

  const trend = getCostTrend("month").filter((p) => p.bucket === monthPrefix);
  const monthToDateUsd = trend.reduce((sum, p) => sum + p.costUsd, 0);
  const projectedMonthUsd = daysElapsed > 0 ? (monthToDateUsd / daysElapsed) * daysInMonth : 0;

  return { monthToDateUsd, daysElapsed, daysInMonth, projectedMonthUsd };
}

export interface CostEfficiencyStats {
  costPerSuccessUsd: number;
  costPerFileEditedUsd: number;
  retryRate: number;
}

export function getCostEfficiencyStats(): CostEfficiencyStats {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM sessions").all() as unknown as SessionRow[];
  const sessions = rows.map(mapSessionRow);

  const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
  const successCount = sessions.filter((s) => s.status === "success").length;
  const totalFilesEdited = sessions.reduce((sum, s) => sum + s.filesEditedCount, 0);
  const totalRetries = sessions.reduce((sum, s) => sum + s.retryCount, 0);

  return {
    costPerSuccessUsd: successCount > 0 ? totalCost / successCount : 0,
    costPerFileEditedUsd: totalFilesEdited > 0 ? totalCost / totalFilesEdited : 0,
    retryRate: sessions.length > 0 ? totalRetries / sessions.length : 0,
  };
}

export interface ToolUsagePoint {
  toolName: string;
  count: number;
  successCount: number;
}

// Claude Code uses "tool_name", Gemini CLI uses "function_name" for the same
// concept on their respective tool-call events; Codex CLI's log schema isn't
// published yet (ADR D6) so it simply won't contribute rows here.
export function getToolUsageFrequency(limit = 10): ToolUsagePoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         COALESCE(json_extract(attributes_json, '$.tool_name'), json_extract(attributes_json, '$.function_name')) as tool_name,
         COUNT(*) as count,
         SUM(CASE WHEN json_extract(attributes_json, '$.success') = 1 THEN 1 ELSE 0 END) as success_count
       FROM events
       WHERE COALESCE(json_extract(attributes_json, '$.tool_name'), json_extract(attributes_json, '$.function_name')) IS NOT NULL
       GROUP BY tool_name
       ORDER BY count DESC
       LIMIT @limit`
    )
    .all({ limit }) as unknown as { tool_name: string; count: number; success_count: number }[];
  return rows.map((r) => ({ toolName: r.tool_name, count: r.count, successCount: r.success_count }));
}

export interface LatencyStats {
  hasTraceData: boolean;
  avgLlmRequestMs: number | null;
  slowestSession: { sessionId: string; traceSpanMs: number } | null;
}

// "Critical path" here means the simplest honest thing derivable from spans:
// a session's full trace wall-clock span (latest span end minus earliest
// span start). Not a weighted longest-path-through-the-DAG algorithm -- with
// only Claude Code's beta tracing populated in practice, that precision
// wouldn't be worth the complexity. Only ever computed from real trace data;
// returns hasTraceData: false when none exists, never a fabricated number.
export function getLatencyStats(): LatencyStats {
  const db = getDb();

  const totalSpans = db.prepare("SELECT COUNT(*) as c FROM spans").get() as { c: number };
  const hasTraceData = totalSpans.c > 0;

  const llmRows = db
    .prepare("SELECT duration_ms FROM spans WHERE name = @name")
    .all({ name: CLAUDE_CODE_SPAN.LLM_REQUEST }) as unknown as { duration_ms: number }[];
  const avgLlmRequestMs = llmRows.length > 0 ? llmRows.reduce((sum, r) => sum + r.duration_ms, 0) / llmRows.length : null;

  const spanRows = db
    .prepare("SELECT session_id, start_time_unix_nano, end_time_unix_nano FROM spans WHERE session_id IS NOT NULL")
    .all() as unknown as { session_id: string; start_time_unix_nano: string; end_time_unix_nano: string }[];

  const bounds = new Map<string, { min: bigint; max: bigint }>();
  for (const row of spanRows) {
    const start = BigInt(row.start_time_unix_nano);
    const end = BigInt(row.end_time_unix_nano);
    const existing = bounds.get(row.session_id);
    if (!existing) {
      bounds.set(row.session_id, { min: start, max: end });
    } else {
      if (start < existing.min) existing.min = start;
      if (end > existing.max) existing.max = end;
    }
  }

  let slowestSession: LatencyStats["slowestSession"] = null;
  for (const [sessionId, { min, max }] of bounds) {
    const traceSpanMs = Number(max - min) / 1_000_000;
    if (!slowestSession || traceSpanMs > slowestSession.traceSpanMs) {
      slowestSession = { sessionId, traceSpanMs };
    }
  }

  return { hasTraceData, avgLlmRequestMs, slowestSession };
}

export function getTokensByAgent(): { agentType: AgentType; inputTokens: number; outputTokens: number }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT agent_type, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens
       FROM sessions GROUP BY agent_type`
    )
    .all() as unknown as { agent_type: AgentType; input_tokens: number; output_tokens: number }[];
  return rows.map((r) => ({ agentType: r.agent_type, inputTokens: r.input_tokens, outputTokens: r.output_tokens }));
}

export function getLeaderboard(): LeaderboardRow[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM sessions").all() as unknown as SessionRow[];
  const sessions = rows.map(mapSessionRow);

  const groups = new Map<string, AgentSession[]>();
  for (const s of sessions) {
    const key = `${s.agentType}::${s.model ?? "unknown"}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const leaderboard: LeaderboardRow[] = [];
  for (const [key, group] of groups) {
    const [agentType, model] = key.split("::") as [AgentType, string];
    const decided = group.filter((s) => s.status !== "running");
    const successCount = group.filter((s) => s.status === "success").length;
    const totalCost = group.reduce((sum, s) => sum + s.totalCostUsd, 0);
    const totalTokens = group.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);
    const totalDurationMs = group.reduce(
      (sum, s) => sum + Math.max(0, Date.parse(s.endedAt ?? s.startedAt) - Date.parse(s.startedAt)),
      0
    );
    leaderboard.push({
      agentType,
      model,
      sessionCount: group.length,
      successRate: decided.length > 0 ? successCount / decided.length : 0,
      avgCostUsd: totalCost / group.length,
      avgDurationMs: totalDurationMs / group.length,
      avgTokensPerSession: totalTokens / group.length,
      costPerSuccessUsd: successCount > 0 ? totalCost / successCount : 0,
    });
  }

  return leaderboard.sort((a, b) => b.sessionCount - a.sessionCount);
}
