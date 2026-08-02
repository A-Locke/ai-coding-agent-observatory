// Gemini CLI native OpenTelemetry schema.
// https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md
export const GEMINI_CLI_METRIC = {
  SESSION_COUNT: "gemini_cli.session.count",
  TOOL_CALL_COUNT: "gemini_cli.tool.call.count",
  TOOL_CALL_LATENCY: "gemini_cli.tool.call.latency",
  API_REQUEST_COUNT: "gemini_cli.api.request.count",
  API_REQUEST_LATENCY: "gemini_cli.api.request.latency",
  TOKEN_USAGE: "gemini_cli.token.usage",
  FILE_OPERATION_COUNT: "gemini_cli.file.operation.count",
  LINES_CHANGED: "gemini_cli.lines.changed",
  AGENT_RUN_COUNT: "gemini_cli.agent.run.count",
  AGENT_DURATION: "gemini_cli.agent.duration",
} as const;

export const GEMINI_CLI_EVENT = {
  CONFIG: "gemini_cli.config",
  USER_PROMPT: "gemini_cli.user_prompt",
  TOOL_CALL: "gemini_cli.tool_call",
  FILE_OPERATION: "gemini_cli.file_operation",
  API_REQUEST: "gemini_cli.api_request",
  API_RESPONSE: "gemini_cli.api_response",
  API_ERROR: "gemini_cli.api_error",
  AGENT_START: "gemini_cli.agent.start",
  AGENT_FINISH: "gemini_cli.agent.finish",
  CONVERSATION_FINISHED: "gemini_cli.conversation_finished",
} as const;

// Standard attributes Gemini CLI attaches to every log/metric.
export const GEMINI_CLI_ATTR = {
  SESSION_ID: "session.id",
  INSTALLATION_ID: "installation.id",
  ACTIVE_APPROVAL_MODE: "active_approval_mode",
  USER_EMAIL: "user.email",
} as const;
