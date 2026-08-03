import { describe, expect, it } from "vitest";
import type { AgentSession } from "@observatory/shared";
import { evaluateSessionAlerts } from "./alerts";

function baseSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: "s1",
    agentType: "claude-code",
    agentVersion: null,
    provider: "anthropic",
    model: "claude-sonnet-5",
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "success",
    totalCostUsd: 0.01,
    costIsEstimated: false,
    inputTokens: 100,
    outputTokens: 50,
    toolCallCount: 1,
    filesEditedCount: 1,
    testsRunCount: 0,
    retryCount: 0,
    ...overrides,
  };
}

describe("evaluateSessionAlerts", () => {
  it("returns no alerts for an unremarkable session", () => {
    expect(evaluateSessionAlerts(baseSession())).toEqual([]);
  });

  it("flags excessive retries at the threshold", () => {
    const alerts = evaluateSessionAlerts(baseSession({ retryCount: 3 }));
    expect(alerts.some((a) => a.kind === "excessive_retries")).toBe(true);
  });

  it("flags high token usage", () => {
    const alerts = evaluateSessionAlerts(baseSession({ inputTokens: 90_000, outputTokens: 20_000 }));
    expect(alerts.some((a) => a.kind === "high_token_usage")).toBe(true);
  });

  it("flags an expensive session", () => {
    const alerts = evaluateSessionAlerts(baseSession({ totalCostUsd: 10 }));
    expect(alerts.some((a) => a.kind === "expensive_session")).toBe(true);
  });

  it("only flags long-running for sessions still running", () => {
    const oldStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const running = evaluateSessionAlerts(baseSession({ status: "running", startedAt: oldStart }));
    expect(running.some((a) => a.kind === "long_running")).toBe(true);

    const success = evaluateSessionAlerts(baseSession({ status: "success", startedAt: oldStart }));
    expect(success.some((a) => a.kind === "long_running")).toBe(false);
  });
});
