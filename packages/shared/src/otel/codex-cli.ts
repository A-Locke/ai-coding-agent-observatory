// OpenAI Codex CLI native OpenTelemetry schema. Metric names below are
// publicly confirmed; log/event and span names are not fully documented as
// of this writing -- Codex's OTel support is newer and still stabilizing
// (see github.com/openai/codex issues #10277 and #12913). Records with the
// "codex." prefix that don't match a name below still get ingested through
// the generic OTLP adapter, which preserves raw attributes instead of
// dropping them, so the adapter degrades gracefully as the schema evolves.
export const CODEX_CLI_METRIC = {
  TOOL_CALL: "codex.tool.call",
  API_REQUEST: "codex.api_request",
  TURN_E2E_DURATION_MS: "codex.turn.e2e_duration_ms",
  TURN_TOKEN_USAGE: "codex.turn.token_usage",
  GUARDIAN_REVIEW: "codex.guardian.review",
  STARTUP_PHASE_DURATION_MS: "codex.startup.phase.duration_ms",
  PROCESS_START: "codex.process.start",
} as const;

export const CODEX_CLI_PREFIX = "codex." as const;
