import { describe, expect, it } from "vitest";
import { flattenLogs, flattenMetrics, flattenTraces } from "./decode";

describe("flattenTraces", () => {
  it("merges resource and span attributes and computes duration", () => {
    const payload = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: "session.id", value: { stringValue: "sess-1" } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "trace-1",
                  spanId: "span-1",
                  name: "claude_code.llm_request",
                  startTimeUnixNano: "1000000000",
                  endTimeUnixNano: "1250000000",
                  attributes: [{ key: "model", value: { stringValue: "claude-sonnet-5" } }],
                  status: { code: 1 },
                },
              ],
            },
          ],
        },
      ],
    };
    const [span] = flattenTraces(payload);
    expect(span.durationMs).toBe(250);
    expect(span.statusCode).toBe("OK");
    expect(span.attributes["session.id"]).toBe("sess-1");
    expect(span.attributes.model).toBe("claude-sonnet-5");
  });
});

describe("flattenMetrics", () => {
  it("reads sum data points and merges resource attributes", () => {
    const payload = {
      resourceMetrics: [
        {
          resource: { attributes: [{ key: "session.id", value: { stringValue: "sess-1" } }] },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: "claude_code.token.usage",
                  unit: "tokens",
                  sum: {
                    dataPoints: [
                      {
                        asInt: "42",
                        timeUnixNano: "1000000000",
                        attributes: [{ key: "type", value: { stringValue: "output" } }],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const [point] = flattenMetrics(payload);
    expect(point.value).toBe(42);
    expect(point.attributes.type).toBe("output");
    expect(point.attributes["session.id"]).toBe("sess-1");
  });
});

describe("flattenLogs", () => {
  it("resolves the event name from the event.name attribute", () => {
    const payload = {
      resourceLogs: [
        {
          resource: { attributes: [{ key: "session.id", value: { stringValue: "sess-1" } }] },
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: "1000000000",
                  attributes: [
                    { key: "event.name", value: { stringValue: "claude_code.tool_result" } },
                    { key: "tool_name", value: { stringValue: "Edit" } },
                    { key: "success", value: { boolValue: true } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const [record] = flattenLogs(payload);
    expect(record.name).toBe("claude_code.tool_result");
    expect(record.attributes.tool_name).toBe("Edit");
    expect(record.attributes.success).toBe(true);
  });
});
