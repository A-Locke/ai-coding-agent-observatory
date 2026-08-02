# Connecting Agents to the Observatory

The Observatory ingests **real** telemetry — there's no bundled data generator. After `docker compose up`, the collector listens on:

- `localhost:4317` — OTLP/gRPC
- `localhost:4318` — OTLP/HTTP

Point one of the three supported agents at those ports using its own native configuration below. Sessions should appear on the dashboard's Overview page within seconds of the agent's next metrics/log export interval.

> **Privacy default:** none of the configurations below enable prompt or tool-content logging. Telemetry is structural (durations, models, token counts, tool names) unless you explicitly opt in to the content-logging flags documented by each vendor.

## Claude Code (CLI, or Agent SDK)

Recommended: a **user-scope settings file** so it applies to every session, including the VS Code extension (which launches the same instrumented CLI under the hood).

`~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`):

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "1",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_METRIC_EXPORT_INTERVAL": "5000",
    "OTEL_LOGS_EXPORT_INTERVAL": "1000",
    "OTEL_TRACES_EXPORT_INTERVAL": "1000"
  }
}
```

Equivalent shell export (terminal-only, this session):

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
export OTEL_TRACES_EXPORTER=otlp OTEL_METRICS_EXPORTER=otlp OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` enables trace spans (used by the dashboard's Timeline page); metrics and log events work without it. If the collector's endpoint is unreachable, the CLI fails silently by default — set `CLAUDE_CODE_OTEL_DIAG_STDERR=1` to surface exporter errors while debugging.

**VS Code extension:** the `~/.claude/settings.json` approach above is expected to cover VS Code extension sessions too (the docs list `claude-vscode` as a recognized `app.entrypoint` value, and user-scope settings apply "to every session"), but this isn't explicitly spelled out in Anthropic's docs for the extension specifically. Verify by checking `docker compose logs otel-collector` for incoming data after an IDE session.

Source: [Claude Code Observability](https://code.claude.com/docs/en/agent-sdk/observability), [Claude Code Monitoring reference](https://code.claude.com/docs/en/monitoring-usage), [Settings](https://code.claude.com/docs/en/settings).

## Gemini CLI

`.gemini/settings.json` (project or user scope):

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "useCollector": true,
    "otlpEndpoint": "http://localhost:4317",
    "otlpProtocol": "grpc",
    "traces": true,
    "logPrompts": false
  }
}
```

Or via environment variables:

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_USE_COLLECTOR=true
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:4317
export GEMINI_TELEMETRY_OTLP_PROTOCOL=grpc
```

Source: [Gemini CLI Observability with OpenTelemetry](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md).

## Codex CLI

`~/.codex/config.toml`:

```toml
[otel]
exporter = "otlp-http"
metrics_exporter = "otlp-http"
trace_exporter = "otlp-http"
log_user_prompt = false

[otel.exporter.otlp]
endpoint = "http://localhost:4318"
protocol = "json"

[otel.metrics_exporter.otlp]
endpoint = "http://localhost:4318"
protocol = "json"

[otel.trace_exporter.otlp]
endpoint = "http://localhost:4318"
protocol = "json"
```

> Codex CLI's OTel support is newer than Claude Code's or Gemini CLI's and its exact log/event schema isn't fully published as of this writing — see [ADR 0001, D6](adr/0001-architecture-and-tech-stack.md#d6-codex-cli-adapter-is-explicitly-best-effort). Metrics (`codex.tool.call`, `codex.turn.token_usage`, etc.) are the most reliably populated signal today.

Source: [OpenAI Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference).

## Verifying the connection

```bash
docker compose -f infra/docker/docker-compose.yml logs -f otel-collector
```

The `debug` exporter prints a summary of every batch the collector receives. If you see nothing after running a prompt through your agent, double-check the endpoint/port and that telemetry is enabled (`enabled`/`ENABLE_TELEMETRY` flags default to *off* for all three agents).
