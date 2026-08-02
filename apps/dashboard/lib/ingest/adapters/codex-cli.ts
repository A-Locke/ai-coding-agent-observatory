import { CODEX_CLI_METRIC } from "@observatory/shared";
import type { SessionDelta } from "../../db";

type Delta = Partial<SessionDelta>;

// Codex CLI's OTel schema is the least mature of the three -- see ADR 0001,
// D6. Only the publicly-confirmed metric names are handled specifically;
// everything else (including its log/event schema, which isn't fully
// published) is still persisted as a raw record by the ingest route, just
// without a session-rollup delta applied here.
export function codexCliMetricDelta(
  metricName: string,
  value: number,
  attributes: Record<string, unknown>
): Delta {
  switch (metricName) {
    case CODEX_CLI_METRIC.TURN_TOKEN_USAGE: {
      const type = attributes.type as string | undefined; // unconfirmed attribute name; best effort
      const model = attributes.model as string | undefined; // also unconfirmed; best effort
      const delta: Delta = { costIsEstimated: true, model };
      if (type === "output") delta.outputTokensDelta = value;
      else delta.inputTokensDelta = value;
      return delta;
    }
    case CODEX_CLI_METRIC.TOOL_CALL:
      return { toolCallDelta: value, costIsEstimated: true };
    default:
      return { costIsEstimated: true };
  }
}

export function codexCliLogDelta(): Delta {
  return { costIsEstimated: true };
}
