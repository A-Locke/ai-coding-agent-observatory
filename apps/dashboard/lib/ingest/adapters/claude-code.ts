import { CLAUDE_CODE_EVENT, CLAUDE_CODE_METRIC } from "@observatory/shared";
import type { SessionDelta } from "../../db";

type Delta = Partial<SessionDelta>;

// Best-effort: only fires when OTEL_LOG_TOOL_DETAILS=1 exposes full_command.
const TEST_COMMAND_PATTERN = /\b(pytest|jest|vitest|go test|cargo test|npm test|npm run test|mvn test|gradle test|rspec|phpunit)\b/i;

export function claudeCodeMetricDelta(
  metricName: string,
  value: number,
  attributes: Record<string, unknown>
): Delta {
  switch (metricName) {
    case CLAUDE_CODE_METRIC.COST_USAGE:
      return {
        costDeltaUsd: value,
        costIsEstimated: false,
        model: (attributes.model as string | undefined) ?? null,
      };
    case CLAUDE_CODE_METRIC.TOKEN_USAGE: {
      const type = attributes.type as string | undefined;
      const model = attributes.model as string | undefined;
      // "input" | "output" | "cacheRead" | "cacheCreation" -- cache tokens
      // roll into the input side, they're not generation output. Token
      // usage typically arrives before cost (which lags behind the first
      // export interval), so this is often the first chance to attribute
      // a session to a model.
      const delta: Delta = { model };
      if (type === "output") delta.outputTokensDelta = value;
      else delta.inputTokensDelta = value;
      return delta;
    }
    default:
      return {};
  }
}

export function claudeCodeLogDelta(logName: string, attributes: Record<string, unknown>): Delta {
  switch (logName) {
    case CLAUDE_CODE_EVENT.TOOL_RESULT: {
      const toolName = attributes.tool_name as string | undefined;
      const success = attributes.success === true;
      const delta: Delta = { toolCallDelta: 1 };
      if (success && (toolName === "Edit" || toolName === "Write" || toolName === "NotebookEdit")) {
        delta.filesEditedDelta = 1;
      }
      if (toolName === "Bash" && TEST_COMMAND_PATTERN.test((attributes.full_command as string) ?? "")) {
        delta.testsRunDelta = 1;
      }
      return delta;
    }
    case CLAUDE_CODE_EVENT.API_ERROR:
      return { retryDelta: 1 };
    default:
      return {};
  }
}
