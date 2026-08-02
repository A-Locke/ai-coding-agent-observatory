export type AgentType = "claude-code" | "codex-cli" | "gemini-cli";

export type Provider = "anthropic" | "openai" | "google";

export type SessionStatus = "running" | "success" | "failed" | "partial";

export type SpanStatusCode = "OK" | "ERROR" | "UNSET";

export interface AgentSession {
  id: string;
  agentType: AgentType;
  agentVersion: string | null;
  provider: Provider;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  totalCostUsd: number;
  costIsEstimated: boolean;
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
  filesEditedCount: number;
  testsRunCount: number;
  retryCount: number;
}

export interface SpanRecord {
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

export interface MetricPoint {
  id?: number;
  sessionId: string | null;
  name: string;
  value: number;
  unit: string;
  recordedAt: string;
  attributes: Record<string, unknown>;
}

export interface LeaderboardRow {
  agentType: AgentType;
  model: string;
  sessionCount: number;
  successRate: number;
  avgCostUsd: number;
  avgDurationMs: number;
  avgTokensPerSession: number;
  costPerSuccessUsd: number;
}
