// Vendor-neutral OpenTelemetry GenAI semantic conventions, used as a
// fallback when an agent's telemetry doesn't match a known vendor schema.
// https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/
export const GEN_AI_ATTR = {
  SYSTEM: "gen_ai.system",
  PROVIDER_NAME: "gen_ai.provider.name",
  OPERATION_NAME: "gen_ai.operation.name",
  REQUEST_MODEL: "gen_ai.request.model",
  RESPONSE_MODEL: "gen_ai.response.model",
  RESPONSE_FINISH_REASONS: "gen_ai.response.finish_reasons",
  USAGE_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  USAGE_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  TOOL_NAME: "gen_ai.tool.name",
  TOOL_CALL_ID: "gen_ai.tool.call.id",
  AGENT_NAME: "gen_ai.agent.name",
  CONVERSATION_ID: "gen_ai.conversation.id",
} as const;

export const GEN_AI_METRIC = {
  CLIENT_TOKEN_USAGE: "gen_ai.client.token.usage",
  CLIENT_OPERATION_DURATION: "gen_ai.client.operation.duration",
} as const;
