# Product Requirements Document: AI Coding Agent Observatory

| | |
|---|---|
| **Status** | Complete — all functional requirements and success criteria (§10) delivered and verified against real infrastructure |
| **Owner** | Arthur Locke |
| **Last updated** | 2026-08-02 |
| **Related docs** | [ADR 0001: Architecture & Tech Stack](adr/0001-architecture-and-tech-stack.md) · [Roadmap](ROADMAP.md) · [Connect Agents Guide](CONNECT_AGENTS.md) |

## 1. Executive Summary

The AI Coding Agent Observatory is a self-hosted observability platform, purpose-built as a portfolio demonstration, that ingests **real** OpenTelemetry (OTel) telemetry emitted natively by AI coding agents — Claude Code, OpenAI Codex CLI, and Google Gemini CLI — and turns it into a dashboard showing session activity, cost, token usage, tool behavior, and agent-to-agent comparisons. Everything runs locally via Docker Compose with zero cloud dependency; an optional Terraform-managed AWS path (CloudWatch, X-Ray, and a serverless Lambda/DynamoDB tier) mirrors the same telemetry into the cloud for a `terraform apply` / `terraform destroy` demo.

The project's central credibility claim is that it observes *real* agent behavior, not synthetic data. All three target agents — Claude Code, Codex CLI, and Gemini CLI — ship native, documented OTel exporters; the platform's job is to be a well-designed sink and dashboard for that data, not to fabricate it.

## 2. Problem Statement

AI coding agents (Claude Code, Codex CLI, Gemini CLI, and others) are increasingly used for real engineering work, but developers and teams evaluating or operating them have almost no visibility into:

- What a session actually cost, in dollars and tokens.
- How long model calls and tool invocations took, and where time was spent.
- Which tools were invoked, how often, and with what success/failure rate.
- How one agent's behavior compares to another's on similar work.
- Whether a session succeeded, partially succeeded, or failed outright.

Each of the three agents already emits this information as OpenTelemetry data, but there is no ready-made, self-hostable place to send it, store it, and look at it without adopting a heavyweight commercial observability vendor. This project fills that gap with something that can be cloned and run in under five minutes.

## 3. Goals

1. **Ingest real OTel telemetry** (metrics, log events, and beta trace spans) from Claude Code, Codex CLI, and Gemini CLI via a standard OTel Collector.
2. **Store it locally** with no required external service — SQLite on a Docker volume.
3. **Visualize it** in a Next.js dashboard covering fleet-wide overview, per-session drill-down, a trace-level timeline, aggregate metrics, and a cross-agent leaderboard.
4. **Support an optional, cost-conscious AWS deployment** of the same pipeline (CloudWatch + X-Ray, optionally Lambda + DynamoDB for a cloud-hosted dashboard), deployed and destroyed on demand via Terraform.
5. **Be a credible portfolio artifact**: clean architecture, defensible technology choices (documented in the ADR), CI that actually gates on lint/typecheck/test/build/terraform-validate, and a build history that reads as a coherent, phased engineering effort.
6. **Cost near-zero to run.** Local mode costs nothing. Cloud mode, when deployed, should cost cents per hour and nothing at rest (destroyed after each demo).

## 4. Non-Goals

- **Production-grade multi-tenant SaaS observability.** This is a single-operator, single-machine (or single-AWS-account) tool, not a hosted product for other people's data.
- **Instrumenting agents that lack native OTel support.** If a future agent has no OTel exporter, adding a simulator or a custom shim for it is out of scope for v1 (see [§12](#12-out-of-scope--stretch-goals)).
- **Replacing a real observability vendor** (Honeycomb, Datadog, Grafana Cloud) for production fleets of agents. This is a demonstration and a personal/small-team tool.
- **Long-term multi-year data retention or high-cardinality analytics at scale.** SQLite and a single CloudWatch log group are deliberately modest.

## 5. Target Users / Personas

1. **The builder evaluating this project as a portfolio piece** (hiring managers, technical reviewers) — cares about architecture quality, code cleanliness, and whether the thing actually runs.
2. **A developer who uses Claude Code / Codex CLI / Gemini CLI day-to-day** and wants a quick, local, no-signup way to see what their sessions actually cost and how their tools are behaving.
3. **A team lead comparing agents** — wants a leaderboard view answering "which agent/model combination is fastest and cheapest for our kind of work?"

## 6. Product Scope

### 6.1 Local Mode (primary, always available)

```
Claude Code / Codex CLI / Gemini CLI
              |  OTLP (gRPC :4317 / HTTP :4318)
              v
      OpenTelemetry Collector
              |  OTLP/HTTP (JSON)
              v
   Next.js Dashboard (ingest routes)
              |
              v
     SQLite (Docker volume)
              |
              v
   Next.js Dashboard (UI + query API)
```

Two Docker services: `otel-collector` and `dashboard`. `docker compose up` starts both; there is no bundled data generator. The user points a real agent CLI at the collector (see [Connect Agents Guide](CONNECT_AGENTS.md)) and watches sessions populate the dashboard within seconds.

### 6.2 Cloud Mode (optional, explicit opt-in)

```
Claude Code / Codex CLI / Gemini CLI
              |  OTLP
              v
   OpenTelemetry Collector (same collector, alternate config)
              |  awsemf / awsxray exporters
              v
    CloudWatch Logs/Metrics + X-Ray  --->  CloudWatch Dashboard
              |  (optional)
              v
   Lambda (log subscription) -> DynamoDB -> cloud-hosted dashboard
```

Provisioned and torn down via `terraform apply` / `terraform destroy`. No EC2, ECS, or EKS — the collector itself still runs locally (or anywhere Docker runs); only the destination is AWS. Lambda, DynamoDB, and X-Ray are feature-flagged and off by default to minimize cost; CloudWatch Logs + a CloudWatch Dashboard are the only always-on pieces of cloud mode, and both are low/no-cost at demo volumes.

## 7. Functional Requirements

### 7.1 Ingestion

- FR-1: The OTel Collector MUST accept OTLP over both gRPC (4317) and HTTP (4318) from any of the three target agents, unmodified, using each agent's documented native configuration.
- FR-2: The dashboard MUST expose OTLP/HTTP JSON receiver routes at `/v1/traces`, `/v1/metrics`, and `/v1/logs` matching the OTLP HTTP spec's default paths.
- FR-3: Ingested records MUST be attributed to the correct agent (Claude Code, Codex CLI, or Gemini CLI) using each vendor's documented metric/event/span name prefix (`claude_code.*`, `gemini_cli.*`, `codex.*`), not a hand-wavy guess.
- FR-4: Records that don't match a known vendor schema MUST still be persisted (raw attributes preserved as JSON) via a generic OTel GenAI semantic-convention fallback adapter, rather than being silently dropped.
- FR-5: Session rollups (token totals, cost, tool-call count, files-edited count, retry count) MUST be computed incrementally as records arrive, not recomputed from scratch on every ingest.

### 7.2 Storage

- FR-6: All telemetry MUST persist to a SQLite database file on a named Docker volume, surviving container restarts.
- FR-7: The schema MUST support querying by session, by agent type, by time range, and by trace ID.

### 7.3 Dashboard

- FR-8: **Overview** page: fleet-wide KPIs (total sessions, total cost, total tokens, success rate) across all connected agents, with a recency-based activity feed.
- FR-9: **Sessions** page: filterable/sortable list of sessions (by agent, model, status, time range) with per-session summary stats.
- FR-10: **Timeline** page: a per-session waterfall/sequence view built from trace spans when available (Claude Code beta tracing), falling back to a sequential view built from ordered log events when trace spans are absent.
- FR-11: **Metrics** page: time-series and distribution charts for latency, cost, and token usage, filterable by agent/model.
- FR-12: **Leaderboard** page: agents/models ranked by cost-efficiency, speed, and success rate.
- FR-13: When no telemetry has been received yet, every page MUST show an empty state with the exact, copy-pasteable configuration needed to connect each of the three supported agents (see [Connect Agents Guide](CONNECT_AGENTS.md)), not a bare "no data" message.

### 7.4 Cloud Deployment

- FR-14: `terraform apply` in `infra/terraform` MUST provision CloudWatch (log group + dashboard) and IAM at minimum, with Lambda, DynamoDB, and X-Ray behind boolean feature flags defaulting to `false`.
- FR-15: `terraform destroy` MUST cleanly remove everything provisioned, leaving no orphaned billable resources.
- FR-16: No EC2, ECS, or EKS resources may be created by any Terraform module.

### 7.5 CI/CD

- FR-17: GitHub Actions MUST run lint, typecheck, test, and build on every push/PR.
- FR-18: A separate workflow MUST run `terraform fmt -check` and `terraform validate` on any change under `infra/terraform/**`.
- FR-19: AWS deployment MUST be a manually-triggered workflow (`workflow_dispatch`) gated behind a GitHub Environment protection rule requiring manual approval — it must never run automatically on push.

## 8. Non-Functional Requirements

- **NFR-1 (Cost):** Local mode: $0. Cloud mode: low-cost while deployed (CloudWatch ingestion/storage at demo volumes, no idle compute), fully destroyable.
- **NFR-2 (Developer Experience):** `git clone` → `docker compose up` → dashboard reachable at `localhost:3000` in under five minutes on a machine with Docker already installed.
- **NFR-3 (Portability):** No cloud account, API key, or credential is required to run local mode.
- **NFR-4 (Privacy):** Telemetry content-logging flags (`OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_RAW_API_BODIES`, and Gemini's `logPrompts`) default to **off** in every documented setup, so prompt/response bodies are never captured unless the user explicitly opts in.
- **NFR-5 (Honesty):** The dashboard must never present synthetic or estimated data as if it were vendor-reported. Estimated figures (e.g., cost computed from a local pricing table when an agent doesn't natively report cost) must be visually flagged as estimated.

## 9. Data Model & Telemetry Sources

The platform normalizes three different real vendor schemas into one internal representation:

| Agent | Native metrics | Native log events | Native traces | Enable via |
|---|---|---|---|---|
| **Claude Code** | `claude_code.session.count`, `.cost.usage`, `.token.usage`, `.lines_of_code.count`, `.commit.count`, `.pull_request.count`, `.active_time.total`, `.code_edit_tool.decision` | `claude_code.user_prompt`, `.tool_result`, `.tool_decision`, `.api_request`, `.api_error` | `claude_code.interaction` → `.llm_request` / `.tool` (beta) | `CLAUDE_CODE_ENABLE_TELEMETRY=1` + `OTEL_*` env vars, or `~/.claude/settings.json` |
| **Gemini CLI** | `gemini_cli.session.count`, `.tool.call.count`, `.token.usage`, `.api.request.latency`, `.lines.changed`, plus standard `gen_ai.client.*` | `gemini_cli.user_prompt`, `.tool_call`, `.api_request`, `.api_response` | `gen_ai.operation.name`-tagged spans (`telemetry.traces=true`) | `.gemini/settings.json` `telemetry` block |
| **Codex CLI** | `codex.tool.call`, `.api_request`, `.turn.token_usage`, `.turn.e2e_duration_ms` | Not fully publicly documented at time of writing; ingested via generic fallback | Not fully publicly documented | `~/.codex/config.toml` `[otel]` |

Internal normalized tables (SQLite): `sessions`, `spans`, `metrics` — see [ADR 0001](adr/0001-architecture-and-tech-stack.md#data-model) for the schema and rationale.

Cost is read directly from `claude_code.cost.usage` for Claude Code sessions (vendor-reported, exact). Gemini CLI and Codex CLI do not natively report cost, so it is estimated from token counts using a local pricing table and flagged `costIsEstimated: true` in the API and UI.

## 10. Success Criteria — All Met

Adopted directly from the originating tech task; every criterion has been verified against real infrastructure, not just planned (see [MILESTONES.md](MILESTONES.md) for evidence of each):

1. ✅ Clone the repository.
2. ✅ Run `docker compose up`.
3. ✅ Open the dashboard.
4. ✅ Point a real agent at the collector and view its telemetry live, locally — verified with a genuine connected Claude Code session (Milestone 7).
5. ✅ Deploy to AWS via Terraform — verified both via local CLI and through the fully gated CI/CD path (Milestones 6 and 10).
6. ✅ Verify data in CloudWatch — confirmed live, both from a manual deploy and from the CI/CD-triggered deploy (X-Ray was not separately exercised since `enable_xray` stayed off; the module itself is written and `validate`-clean).
7. ✅ Destroy the infrastructure — verified via local CLI and via the gated CI/CD workflow, both confirmed clean against live AWS afterward.

## 11. Risks & Open Questions

| Risk | Status |
|---|---|
| Codex CLI's OTel schema is young and not fully publicly documented; its adapter may miss fields or need updates as the schema stabilizes. | Open. Generic fallback adapter preserves raw attributes so nothing is silently dropped; documented explicitly in code and in the ADR. Not exercised against a real Codex CLI session (only Claude Code is in active use). |
| Whether `~/.claude/settings.json` env vars reliably reach the VS Code extension (not just the CLI) is not explicitly confirmed in Anthropic's docs. | **Resolved.** Confirmed empirically — a real Claude Code session connected through the VS Code-integrated environment and its telemetry was correctly ingested (Milestone 7). |
| SQLite is single-writer; concurrent high-throughput ingestion from multiple simultaneous agent sessions could contend on writes. | Open, accepted. Fine at demo/personal scale (the target use case); noted as a scaling limitation, not fixed in v1. |
| AWS credentials/Terraform were not available in the original build environment, so `terraform apply` had not been executed against a real account. | **Resolved.** Real `terraform apply`/`destroy` cycles completed successfully, both via local CLI (`eu-central-1`) and via the gated GitHub Actions workflow (`us-east-1`), each verified live against AWS (Milestones 6, 10). |

## 12. Out of Scope / Stretch Goals

Phase 10's Tier 1 backlog (Phases 11–15) is now built — see the [Roadmap](ROADMAP.md) and [Milestones](MILESTONES.md) for what shipped and how it was verified:

- ✅ Deeper cost & engineering metrics from existing data (Phase 11): cost trends, cost-per-success/per-file, retry rate, tool usage frequency, prompt latency from trace spans.
- ✅ Local alerting on session thresholds (Phase 12).
- ✅ Export to CSV/JSON/Markdown (Phase 13).
- ✅ Session replay (step through a past session's tool calls/edits as a narrative) (Phase 14).
- ✅ CloudWatch enhancements and AWS alarms, strictly within the optional cloud path (Phase 15).

Remaining out of scope, still just backlog (Tier 2+, not planned):

- Jaeger / Grafana Tempo export alongside CloudWatch.
- Live telemetry (WebSocket/SSE push instead of polling) on the dashboard.
- Formal adapters for additional agents beyond the initial three, if/when they ship native OTel support.
- **Considered and explicitly declined as beyond portfolio scope:** git commit/branch enrichment, GitHub Actions telemetry, cross-system trace correlation, a unified agent+git+CI timeline, a plugin architecture for enrichers, deeper Lambda/DynamoDB/X-Ray analytics, and the long-term "Engineering Lifecycle Observability" vision (correlating agent sessions, git, CI/CD, deployments, and Kubernetes into one end-to-end trace). Each is real and buildable, just materially larger than this project's remit.
- **Explicitly rejected, not just deprioritized:** synthetic/seeded demo data of any kind, for any reason — conflicts directly with the project's core real-data-only principle.

## 13. Glossary

- **OTLP** — OpenTelemetry Protocol, the wire format for traces/metrics/logs.
- **Collector** — the standalone `otel-collector-contrib` process that receives OTLP from agents and forwards it onward.
- **Session** — one run of an agent CLI (or one Agent SDK `query()` conversation), identified by `session.id`.
- **EMF** — CloudWatch Embedded Metric Format, the JSON-in-log-line format the `awsemf` exporter uses to write custom metrics into CloudWatch without the PutMetricData API.
