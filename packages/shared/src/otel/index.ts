import type { AgentType } from "../types";
import { CLAUDE_CODE_EVENT, CLAUDE_CODE_METRIC, CLAUDE_CODE_SPAN } from "./claude-code";
import { CODEX_CLI_PREFIX } from "./codex-cli";
import { GEMINI_CLI_EVENT, GEMINI_CLI_METRIC } from "./gemini-cli";

export * from "./gen-ai";
export * from "./claude-code";
export * from "./gemini-cli";
export * from "./codex-cli";

const CLAUDE_CODE_PREFIX = "claude_code.";
const GEMINI_CLI_PREFIX = "gemini_cli.";

/**
 * Identifies which agent emitted an OTLP metric/log/span record purely from
 * its name prefix (vendor `service.name` values aren't consistently
 * documented across all three agents, but their record-name prefixes are).
 */
export function identifyAgentFromRecordName(name: string): AgentType | null {
  if (name.startsWith(CLAUDE_CODE_PREFIX)) return "claude-code";
  if (name.startsWith(GEMINI_CLI_PREFIX)) return "gemini-cli";
  if (name.startsWith(CODEX_CLI_PREFIX)) return "codex-cli";
  return null;
}

export const KNOWN_CLAUDE_CODE_METRIC_NAMES: string[] = Object.values(CLAUDE_CODE_METRIC);
export const KNOWN_CLAUDE_CODE_EVENT_NAMES: string[] = Object.values(CLAUDE_CODE_EVENT);
export const KNOWN_CLAUDE_CODE_SPAN_NAMES: string[] = Object.values(CLAUDE_CODE_SPAN);
export const KNOWN_GEMINI_CLI_METRIC_NAMES: string[] = Object.values(GEMINI_CLI_METRIC);
export const KNOWN_GEMINI_CLI_EVENT_NAMES: string[] = Object.values(GEMINI_CLI_EVENT);
