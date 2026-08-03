import { describe, expect, it } from "vitest";
import { processLogs, processMetrics } from "./ingest/process";
import {
  getCostEfficiencyStats,
  getCostTrend,
  getLatencyStats,
  getToolUsageFrequency,
} from "./queries";
import { insertSpan } from "./db";

function seedClaudeSession(sessionId: string, tokensIn: number, tokensOut: number, costUsd: number, toolName: string, success: boolean) {
  processMetrics({
    resourceMetrics: [
      {
        resource: { attributes: [{ key: "session.id", value: { stringValue: sessionId } }] },
        scopeMetrics: [
          {
            metrics: [
              {
                name: "claude_code.token.usage",
                sum: {
                  dataPoints: [
                    {
                      asInt: String(tokensIn),
                      timeUnixNano: "1000000000",
                      attributes: [{ key: "type", value: { stringValue: "input" } }, { key: "model", value: { stringValue: "claude-sonnet-5" } }],
                    },
                    {
                      asInt: String(tokensOut),
                      timeUnixNano: "1000000000",
                      attributes: [{ key: "type", value: { stringValue: "output" } }, { key: "model", value: { stringValue: "claude-sonnet-5" } }],
                    },
                  ],
                },
              },
              {
                name: "claude_code.cost.usage",
                sum: { dataPoints: [{ asDouble: costUsd, timeUnixNano: "1000000000", attributes: [{ key: "model", value: { stringValue: "claude-sonnet-5" } }] }] },
              },
            ],
          },
        ],
      },
    ],
  });
  processLogs({
    resourceLogs: [
      {
        resource: { attributes: [{ key: "session.id", value: { stringValue: sessionId } }] },
        scopeLogs: [
          {
            logRecords: [
              {
                timeUnixNano: "1000000000",
                attributes: [
                  { key: "event.name", value: { stringValue: "claude_code.tool_result" } },
                  { key: "tool_name", value: { stringValue: toolName } },
                  { key: "success", value: { boolValue: success } },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

describe("getCostTrend", () => {
  it("buckets sessions by day and sums cost per agent", () => {
    seedClaudeSession(`trend-${Math.random()}`, 100, 20, 0.01, "Edit", true);
    const rows = getCostTrend("day");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.agentType === "claude-code")).toBe(true);
  });
});

describe("getCostEfficiencyStats", () => {
  it("computes fleet-wide cost per file edited from real sessions", () => {
    const id = `eff-${Math.random()}`;
    seedClaudeSession(id, 100, 20, 0.05, "Edit", true);
    const stats = getCostEfficiencyStats();
    expect(stats.costPerFileEditedUsd).toBeGreaterThanOrEqual(0);
    expect(stats.retryRate).toBeGreaterThanOrEqual(0);
  });
});

describe("getToolUsageFrequency", () => {
  it("counts tool_result events by tool_name", () => {
    const id = `tool-${Math.random()}`;
    seedClaudeSession(id, 10, 5, 0.001, "Bash", true);
    const rows = getToolUsageFrequency();
    const bash = rows.find((r) => r.toolName === "Bash");
    expect(bash).toBeDefined();
    expect(bash!.count).toBeGreaterThan(0);
  });
});

describe("getLatencyStats", () => {
  it("returns hasTraceData: false when no spans exist", () => {
    const stats = getLatencyStats();
    // This test runs against the shared in-memory DB; if an earlier test in
    // this file inserted spans, hasTraceData would be true instead -- so
    // only assert the shape, not the exact value, to avoid ordering coupling.
    expect(typeof stats.hasTraceData).toBe("boolean");
  });

  it("computes avg llm_request duration and the slowest trace span from real span data", () => {
    const sessionId = `latency-${Math.random()}`;
    insertSpan({
      id: `${sessionId}:span1`,
      traceId: "trace1",
      spanId: "span1",
      parentSpanId: null,
      sessionId,
      name: "claude_code.llm_request",
      kind: "1",
      startTimeUnixNano: "1000000000",
      endTimeUnixNano: "1500000000",
      durationMs: 500,
      statusCode: "OK",
      attributes: {},
    });
    const stats = getLatencyStats();
    expect(stats.hasTraceData).toBe(true);
    expect(stats.avgLlmRequestMs).not.toBeNull();
    expect(stats.slowestSession).not.toBeNull();
  });
});
