// Inlined (rather than read from a .sql file at runtime) so it survives
// Next.js's standalone output packaging without extra file-tracing config.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  agent_version TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  total_cost_usd REAL NOT NULL DEFAULT 0,
  cost_is_estimated INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  files_edited_count INTEGER NOT NULL DEFAULT 0,
  tests_run_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spans (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  session_id TEXT,
  name TEXT NOT NULL,
  kind TEXT,
  start_time_unix_nano TEXT NOT NULL,
  end_time_unix_nano TEXT NOT NULL,
  duration_ms REAL NOT NULL,
  status_code TEXT NOT NULL DEFAULT 'UNSET',
  attributes_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_spans_session ON spans(session_id);
CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  recorded_at TEXT NOT NULL,
  attributes_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);

-- Raw log records (tool_result, api_request, user_prompt, ...). Used to
-- compute session rollups and as a Timeline fallback when trace spans
-- aren't available (Claude Code tracing is beta; Codex/Gemini traces vary).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  agent_type TEXT NOT NULL,
  name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  sequence INTEGER,
  attributes_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON events(occurred_at);
`;
