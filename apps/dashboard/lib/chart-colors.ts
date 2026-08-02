import type { AgentType, SessionStatus } from "@observatory/shared";

// CSS custom properties defined in app/globals.css, per the dataviz skill's
// validated categorical/status palette (light + dark both handled there).
export const AGENT_SERIES_COLOR: Record<AgentType, string> = {
  "claude-code": "var(--series-claude-code)",
  "codex-cli": "var(--series-codex-cli)",
  "gemini-cli": "var(--series-gemini-cli)",
};

export const AGENT_LABEL: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  "codex-cli": "Codex CLI",
  "gemini-cli": "Gemini CLI",
};

export const STATUS_COLOR: Record<SessionStatus, string> = {
  running: "var(--chart-muted)",
  success: "var(--status-good)",
  partial: "var(--status-warning)",
  failed: "var(--status-critical)",
};
