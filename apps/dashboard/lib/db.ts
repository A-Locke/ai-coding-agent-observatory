import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// Imported via createRequire (not a static ESM import) so bundlers/test
// runners that don't yet recognize "node:sqlite" as a builtin (it's a
// recent addition, Node 22.5+) don't try to resolve it as an npm package.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: typeof DatabaseSyncType };
type DatabaseSync = DatabaseSyncType;
import type { AgentType, Provider, SessionStatus, SpanStatusCode } from "@observatory/shared";
import { SCHEMA_SQL } from "./schema";

const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/observatory.sqlite";

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (DATABASE_PATH !== ":memory:") {
    mkdirSync(dirname(DATABASE_PATH), { recursive: true });
  }
  db = new DatabaseSync(DATABASE_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  return db;
}

export interface SessionDelta {
  agentType: AgentType;
  provider: Provider;
  agentVersion?: string | null;
  model?: string | null;
  status?: SessionStatus;
  endedAt?: string | null;
  costDeltaUsd?: number;
  costIsEstimated?: boolean;
  inputTokensDelta?: number;
  outputTokensDelta?: number;
  toolCallDelta?: number;
  filesEditedDelta?: number;
  testsRunDelta?: number;
  retryDelta?: number;
  occurredAt: string;
}

/**
 * Incrementally applies a delta to a session row, creating it if this is the
 * first record seen for that session.id. Numeric fields accumulate; nullable
 * descriptive fields (model, agentVersion) only overwrite when a non-null
 * value is supplied, since not every record carries every field.
 */
export function applySessionDelta(sessionId: string, delta: SessionDelta): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO sessions (
      id, agent_type, agent_version, provider, model, started_at, ended_at, status,
      total_cost_usd, cost_is_estimated, input_tokens, output_tokens,
      tool_call_count, files_edited_count, tests_run_count, retry_count, last_seen_at
    ) VALUES (
      @id, @agentType, @agentVersion, @provider, @model, @occurredAt, @endedAt, @status,
      @costDeltaUsd, @costIsEstimated, @inputTokensDelta, @outputTokensDelta,
      @toolCallDelta, @filesEditedDelta, @testsRunDelta, @retryDelta, @occurredAt
    )
    ON CONFLICT(id) DO UPDATE SET
      agent_version = COALESCE(excluded.agent_version, sessions.agent_version),
      model = COALESCE(excluded.model, sessions.model),
      started_at = MIN(sessions.started_at, excluded.started_at),
      ended_at = COALESCE(excluded.ended_at, sessions.ended_at),
      status = COALESCE(excluded.status, sessions.status),
      total_cost_usd = sessions.total_cost_usd + excluded.total_cost_usd,
      cost_is_estimated = excluded.cost_is_estimated,
      input_tokens = sessions.input_tokens + excluded.input_tokens,
      output_tokens = sessions.output_tokens + excluded.output_tokens,
      tool_call_count = sessions.tool_call_count + excluded.tool_call_count,
      files_edited_count = sessions.files_edited_count + excluded.files_edited_count,
      tests_run_count = sessions.tests_run_count + excluded.tests_run_count,
      retry_count = sessions.retry_count + excluded.retry_count,
      last_seen_at = excluded.last_seen_at
  `);
  stmt.run({
    id: sessionId,
    agentType: delta.agentType,
    agentVersion: delta.agentVersion ?? null,
    provider: delta.provider,
    model: delta.model ?? null,
    endedAt: delta.endedAt ?? null,
    status: delta.status ?? "running",
    costDeltaUsd: delta.costDeltaUsd ?? 0,
    costIsEstimated: delta.costIsEstimated ? 1 : 0,
    inputTokensDelta: delta.inputTokensDelta ?? 0,
    outputTokensDelta: delta.outputTokensDelta ?? 0,
    toolCallDelta: delta.toolCallDelta ?? 0,
    filesEditedDelta: delta.filesEditedDelta ?? 0,
    testsRunDelta: delta.testsRunDelta ?? 0,
    retryDelta: delta.retryDelta ?? 0,
    occurredAt: delta.occurredAt,
  });
}

export interface SpanRow {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  sessionId: string | null;
  name: string;
  kind: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  durationMs: number;
  statusCode: SpanStatusCode;
  attributes: Record<string, unknown>;
}

export function insertSpan(row: SpanRow): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO spans (
        id, trace_id, span_id, parent_span_id, session_id, name, kind,
        start_time_unix_nano, end_time_unix_nano, duration_ms, status_code, attributes_json
      ) VALUES (@id, @traceId, @spanId, @parentSpanId, @sessionId, @name, @kind,
        @startTimeUnixNano, @endTimeUnixNano, @durationMs, @statusCode, @attributesJson)
      ON CONFLICT(id) DO UPDATE SET
        end_time_unix_nano = excluded.end_time_unix_nano,
        duration_ms = excluded.duration_ms,
        status_code = excluded.status_code,
        attributes_json = excluded.attributes_json`
    )
    .run({
      id: row.id,
      traceId: row.traceId,
      spanId: row.spanId,
      parentSpanId: row.parentSpanId,
      sessionId: row.sessionId,
      name: row.name,
      kind: row.kind,
      startTimeUnixNano: row.startTimeUnixNano,
      endTimeUnixNano: row.endTimeUnixNano,
      durationMs: row.durationMs,
      statusCode: row.statusCode,
      attributesJson: JSON.stringify(row.attributes),
    });
}

export interface MetricRow {
  sessionId: string | null;
  name: string;
  value: number;
  unit: string;
  recordedAt: string;
  attributes: Record<string, unknown>;
}

export function insertMetric(row: MetricRow): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO metrics (session_id, name, value, unit, recorded_at, attributes_json)
       VALUES (@sessionId, @name, @value, @unit, @recordedAt, @attributesJson)`
    )
    .run({
      sessionId: row.sessionId,
      name: row.name,
      value: row.value,
      unit: row.unit,
      recordedAt: row.recordedAt,
      attributesJson: JSON.stringify(row.attributes),
    });
}

export interface EventRow {
  sessionId: string | null;
  // Loosely typed (not AgentType): records that don't match any known
  // vendor's name prefix are still persisted, tagged "unknown", rather than
  // dropped -- see lib/ingest/process.ts.
  agentType: AgentType | "unknown";
  name: string;
  occurredAt: string;
  sequence: number | null;
  attributes: Record<string, unknown>;
}

export function insertEvent(row: EventRow): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO events (session_id, agent_type, name, occurred_at, sequence, attributes_json)
       VALUES (@sessionId, @agentType, @name, @occurredAt, @sequence, @attributesJson)`
    )
    .run({
      sessionId: row.sessionId,
      agentType: row.agentType,
      name: row.name,
      occurredAt: row.occurredAt,
      sequence: row.sequence,
      attributesJson: JSON.stringify(row.attributes),
    });
}
