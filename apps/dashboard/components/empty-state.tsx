import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const SNIPPETS: { name: string; file: string; code: string }[] = [
  {
    name: "Claude Code",
    file: "~/.claude/settings.json",
    code: `{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318"
  }
}`,
  },
  {
    name: "Gemini CLI",
    file: ".gemini/settings.json",
    code: `{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "useCollector": true,
    "otlpEndpoint": "http://localhost:4317",
    "otlpProtocol": "grpc"
  }
}`,
  },
  {
    name: "Codex CLI",
    file: "~/.codex/config.toml",
    code: `[otel]
exporter = "otlp-http"
metrics_exporter = "otlp-http"

[otel.exporter.otlp]
endpoint = "http://localhost:4318"
protocol = "json"`,
  },
];

export function EmptyState({ title }: { title?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{title ?? "No telemetry yet"}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          This dashboard doesn&apos;t generate synthetic data — point a real Claude Code, Codex CLI, or Gemini CLI
          session at the collector and sessions will appear here within seconds. Full details in{" "}
          <code className="rounded bg-muted px-1 py-0.5">docs/CONNECT_AGENTS.md</code>.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {SNIPPETS.map((snippet) => (
          <Card key={snippet.name}>
            <CardHeader>
              <CardTitle className="text-foreground">{snippet.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{snippet.file}</p>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                <code>{snippet.code}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
