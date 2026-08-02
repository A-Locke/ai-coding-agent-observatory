import type { AgentType } from "../types";
import { CODEX_CLI_PREFIX } from "./codex-cli";

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
