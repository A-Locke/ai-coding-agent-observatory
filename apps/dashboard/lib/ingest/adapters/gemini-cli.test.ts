import { describe, expect, it } from "vitest";
import { GEMINI_CLI_EVENT, GEMINI_CLI_METRIC } from "@observatory/shared";
import { geminiCliLogDelta, geminiCliMetricDelta } from "./gemini-cli";

describe("geminiCliMetricDelta", () => {
  it("always flags cost as estimated (Gemini CLI reports no native cost)", () => {
    const delta = geminiCliMetricDelta(GEMINI_CLI_METRIC.TOKEN_USAGE, 10, { type: "output" });
    expect(delta.costIsEstimated).toBe(true);
    expect(delta.outputTokensDelta).toBe(10);
  });

  it("rolls cache tokens into the input side", () => {
    const delta = geminiCliMetricDelta(GEMINI_CLI_METRIC.TOKEN_USAGE, 10, { type: "cache" });
    expect(delta.inputTokensDelta).toBe(10);
  });

  it("extracts the model attribute so sessions aren't left unattributed", () => {
    const delta = geminiCliMetricDelta(GEMINI_CLI_METRIC.TOKEN_USAGE, 10, { type: "input", model: "gemini-2.5-pro" });
    expect(delta.model).toBe("gemini-2.5-pro");
  });
});

describe("geminiCliLogDelta", () => {
  it("counts a successful write_file tool_call as a file edit", () => {
    const delta = geminiCliLogDelta(GEMINI_CLI_EVENT.TOOL_CALL, { function_name: "write_file", success: true });
    expect(delta.toolCallDelta).toBe(1);
    expect(delta.filesEditedDelta).toBe(1);
  });

  it("counts api_error as a retry", () => {
    expect(geminiCliLogDelta(GEMINI_CLI_EVENT.API_ERROR, {}).retryDelta).toBe(1);
  });
});
