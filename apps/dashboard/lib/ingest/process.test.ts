import { describe, expect, it } from "vitest";
import { processLogs, processMetrics } from "./process";
import { getSession } from "../queries";

describe("processMetrics + processLogs (Claude Code, end to end)", () => {
  it("rolls up cost, tokens, tool calls, and files edited for a session", () => {
    const sessionId = `sess-${Math.random()}`;

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
                      { asInt: "1000", timeUnixNano: "1000000000", attributes: [{ key: "type", value: { stringValue: "input" } }] },
                      { asInt: "250", timeUnixNano: "1000000000", attributes: [{ key: "type", value: { stringValue: "output" } }] },
                    ],
                  },
                },
                {
                  name: "claude_code.cost.usage",
                  sum: {
                    dataPoints: [
                      {
                        asDouble: 0.015,
                        timeUnixNano: "1000000000",
                        attributes: [{ key: "model", value: { stringValue: "claude-sonnet-5" } }],
                      },
                    ],
                  },
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
                    { key: "tool_name", value: { stringValue: "Write" } },
                    { key: "success", value: { boolValue: true } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const session = getSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.agentType).toBe("claude-code");
    expect(session!.inputTokens).toBe(1000);
    expect(session!.outputTokens).toBe(250);
    expect(session!.totalCostUsd).toBeCloseTo(0.015, 6);
    expect(session!.costIsEstimated).toBe(false);
    expect(session!.toolCallCount).toBe(1);
    expect(session!.filesEditedCount).toBe(1);
  });
});
