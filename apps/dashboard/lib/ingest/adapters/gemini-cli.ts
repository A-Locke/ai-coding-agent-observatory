import { GEMINI_CLI_EVENT, GEMINI_CLI_METRIC } from "@observatory/shared";
import type { SessionDelta } from "../../db";

type Delta = Partial<SessionDelta>;

// Gemini CLI doesn't natively report a dollar cost, so every touch is
// flagged estimated -- the dashboard computes an estimate from accumulated
// tokens at read time (see packages/shared/src/cost.ts).
export function geminiCliMetricDelta(
  metricName: string,
  value: number,
  attributes: Record<string, unknown>
): Delta {
  switch (metricName) {
    case GEMINI_CLI_METRIC.TOKEN_USAGE: {
      const type = attributes.type as string | undefined; // input | output | thought | cache | tool
      const model = attributes.model as string | undefined;
      const delta: Delta = { costIsEstimated: true, model };
      if (type === "output") delta.outputTokensDelta = value;
      else if (type === "input" || type === "cache") delta.inputTokensDelta = value;
      return delta;
    }
    default:
      return { costIsEstimated: true };
  }
}

export function geminiCliLogDelta(logName: string, attributes: Record<string, unknown>): Delta {
  switch (logName) {
    case GEMINI_CLI_EVENT.TOOL_CALL: {
      const success = attributes.success === true;
      const functionName = attributes.function_name as string | undefined;
      const delta: Delta = { toolCallDelta: 1, costIsEstimated: true };
      if (success && (functionName === "write_file" || functionName === "replace" || functionName === "edit")) {
        delta.filesEditedDelta = 1;
      }
      return delta;
    }
    case GEMINI_CLI_EVENT.API_ERROR:
      return { retryDelta: 1, costIsEstimated: true };
    default:
      return { costIsEstimated: true };
  }
}
