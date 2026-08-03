import type { AgentSession } from "@observatory/shared";

// Defaults are deliberately conservative demo-scale numbers, not tuned for
// any real workload -- override via env vars if they don't fit yours.
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const ALERT_THRESHOLDS = {
  retryCount: envNumber("ALERT_RETRY_THRESHOLD", 3),
  totalTokens: envNumber("ALERT_TOKEN_THRESHOLD", 100_000),
  runningDurationMs: envNumber("ALERT_LONG_RUNNING_MS", 30 * 60 * 1000),
  costUsd: envNumber("ALERT_COST_THRESHOLD_USD", 5),
};

export type AlertKind = "excessive_retries" | "high_token_usage" | "long_running" | "expensive_session";

export interface SessionAlert {
  kind: AlertKind;
  label: string;
}

export function evaluateSessionAlerts(session: AgentSession): SessionAlert[] {
  const alerts: SessionAlert[] = [];

  if (session.retryCount >= ALERT_THRESHOLDS.retryCount) {
    alerts.push({ kind: "excessive_retries", label: `${session.retryCount} retries` });
  }

  const totalTokens = session.inputTokens + session.outputTokens;
  if (totalTokens >= ALERT_THRESHOLDS.totalTokens) {
    alerts.push({ kind: "high_token_usage", label: "High token usage" });
  }

  if (session.status === "running") {
    const runningMs = Date.now() - Date.parse(session.startedAt);
    if (runningMs >= ALERT_THRESHOLDS.runningDurationMs) {
      alerts.push({ kind: "long_running", label: "Long-running" });
    }
  }

  if (session.totalCostUsd >= ALERT_THRESHOLDS.costUsd) {
    alerts.push({ kind: "expensive_session", label: "Expensive session" });
  }

  return alerts;
}
