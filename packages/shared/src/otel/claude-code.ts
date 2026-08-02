// Claude Code CLI / Agent SDK native OpenTelemetry schema (stable metrics
// and log events; trace spans are beta, gated by
// CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1).
// https://code.claude.com/docs/en/monitoring-usage
// https://code.claude.com/docs/en/agent-sdk/observability
export const CLAUDE_CODE_METRIC = {
  SESSION_COUNT: "claude_code.session.count",
  LINES_OF_CODE_COUNT: "claude_code.lines_of_code.count",
  PULL_REQUEST_COUNT: "claude_code.pull_request.count",
  COMMIT_COUNT: "claude_code.commit.count",
  COST_USAGE: "claude_code.cost.usage",
  TOKEN_USAGE: "claude_code.token.usage",
  CODE_EDIT_TOOL_DECISION: "claude_code.code_edit_tool.decision",
  ACTIVE_TIME_TOTAL: "claude_code.active_time.total",
} as const;

export const CLAUDE_CODE_EVENT = {
  USER_PROMPT: "claude_code.user_prompt",
  ASSISTANT_RESPONSE: "claude_code.assistant_response",
  TOOL_RESULT: "claude_code.tool_result",
  TOOL_DECISION: "claude_code.tool_decision",
  API_REQUEST: "claude_code.api_request",
  API_ERROR: "claude_code.api_error",
  API_REFUSAL: "claude_code.api_refusal",
  PERMISSION_MODE_CHANGED: "claude_code.permission_mode_changed",
  AUTH: "claude_code.auth",
  MCP_SERVER_CONNECTION: "claude_code.mcp_server_connection",
  INTERNAL_ERROR: "claude_code.internal_error",
} as const;

// Beta trace spans (CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1).
export const CLAUDE_CODE_SPAN = {
  INTERACTION: "claude_code.interaction",
  LLM_REQUEST: "claude_code.llm_request",
  TOOL: "claude_code.tool",
  TOOL_BLOCKED_ON_USER: "claude_code.tool.blocked_on_user",
  TOOL_EXECUTION: "claude_code.tool.execution",
  HOOK: "claude_code.hook",
} as const;

// Standard resource/attribute keys Claude Code attaches to every signal.
export const CLAUDE_CODE_ATTR = {
  SESSION_ID: "session.id",
  APP_VERSION: "app.version",
  // "cli" | "sdk-cli" | "sdk-ts" | "sdk-py" | "claude-vscode"
  APP_ENTRYPOINT: "app.entrypoint",
  ORGANIZATION_ID: "organization.id",
  USER_ACCOUNT_UUID: "user.account_uuid",
  USER_ID: "user.id",
  USER_EMAIL: "user.email",
  TERMINAL_TYPE: "terminal.type",
} as const;
