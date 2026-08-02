import { describe, expect, it } from "vitest";
import { CLAUDE_CODE_EVENT, CLAUDE_CODE_METRIC } from "@observatory/shared";
import { claudeCodeLogDelta, claudeCodeMetricDelta } from "./claude-code";

describe("claudeCodeMetricDelta", () => {
  it("attributes cost.usage to costDeltaUsd and marks it vendor-reported", () => {
    const delta = claudeCodeMetricDelta(CLAUDE_CODE_METRIC.COST_USAGE, 0.42, { model: "claude-sonnet-5" });
    expect(delta).toEqual({ costDeltaUsd: 0.42, costIsEstimated: false, model: "claude-sonnet-5" });
  });

  it("splits token.usage by the type attribute", () => {
    expect(claudeCodeMetricDelta(CLAUDE_CODE_METRIC.TOKEN_USAGE, 100, { type: "output" })).toEqual({ outputTokensDelta: 100 });
    expect(claudeCodeMetricDelta(CLAUDE_CODE_METRIC.TOKEN_USAGE, 100, { type: "input" })).toEqual({ inputTokensDelta: 100 });
    expect(claudeCodeMetricDelta(CLAUDE_CODE_METRIC.TOKEN_USAGE, 100, { type: "cacheRead" })).toEqual({ inputTokensDelta: 100 });
  });

  it("extracts model from token.usage too, since it usually arrives before cost.usage", () => {
    const delta = claudeCodeMetricDelta(CLAUDE_CODE_METRIC.TOKEN_USAGE, 100, { type: "input", model: "claude-sonnet-5" });
    expect(delta.model).toBe("claude-sonnet-5");
  });
});

describe("claudeCodeLogDelta", () => {
  it("counts a successful Edit tool_result as both a tool call and a file edit", () => {
    const delta = claudeCodeLogDelta(CLAUDE_CODE_EVENT.TOOL_RESULT, { tool_name: "Edit", success: true });
    expect(delta).toEqual({ toolCallDelta: 1, filesEditedDelta: 1 });
  });

  it("does not count a failed Edit as a file edit", () => {
    const delta = claudeCodeLogDelta(CLAUDE_CODE_EVENT.TOOL_RESULT, { tool_name: "Edit", success: false });
    expect(delta).toEqual({ toolCallDelta: 1 });
  });

  it("detects a test runner invocation via Bash full_command", () => {
    const delta = claudeCodeLogDelta(CLAUDE_CODE_EVENT.TOOL_RESULT, {
      tool_name: "Bash",
      success: true,
      full_command: "npm test -- --run",
    });
    expect(delta.testsRunDelta).toBe(1);
  });

  it("counts api_error as a retry", () => {
    expect(claudeCodeLogDelta(CLAUDE_CODE_EVENT.API_ERROR, {})).toEqual({ retryDelta: 1 });
  });
});
