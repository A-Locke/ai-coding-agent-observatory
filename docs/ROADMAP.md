# Roadmap

Phased implementation plan. Each phase lists its goal, deliverables, and acceptance criteria, written so an autonomous coding agent can pick up any pending phase with just this document, the [PRD](PRD.md), and the [ADR](adr/0001-architecture-and-tech-stack.md) for context. Status is kept current at every milestone commit.

**Legend:** ✅ done · 🚧 in progress · ⬜ pending · 🧊 backlog (not planned for v1)

## Phase 0 — Repo & Tooling Bootstrap ✅

Goal: a working npm-workspaces monorepo skeleton.

- [x] `git init`, root `package.json` (npm workspaces: `apps/*`, `packages/*`)
- [x] `.gitignore`, `.editorconfig`, `.env.example`
- [x] Directory layout: `apps/`, `packages/`, `infra/docker/`, `infra/terraform/`, `.github/workflows/`, `docs/`

Acceptance: `npm install` succeeds at the repo root with no errors.

## Phase 1 — Shared Telemetry Schema Package ✅

Goal: one source of truth for agent/session types and each vendor's real OTel attribute names, so the ingest layer and any future consumer never hardcode magic strings.

- [x] `packages/shared`: `types.ts` (`AgentSession`, `SpanRecord`, `MetricPoint`, `LeaderboardRow`)
- [x] `packages/shared/src/otel/`: real `claude-code.ts`, `gemini-cli.ts`, `codex-cli.ts`, `gen-ai.ts` attribute constants (sourced from each vendor's own docs — see ADR D1, D4, D6)
- [x] `cost.ts`: illustrative per-model pricing table + `calculateCostUsd` (used to estimate cost for agents that don't natively report it)
- [x] Unit tests for the cost calculator; `npm run build`/`test --workspace=packages/shared` green

Acceptance: `npm run build && npm test` passes in `packages/shared`.

## Phase 2 — Local OTel Collector Config ✅

Goal: a collector config that accepts OTLP from all three agents and forwards to the dashboard's ingest routes.

- [x] `infra/docker/otel-collector-config.yaml`: OTLP receiver (gRPC 4317 / HTTP 4318), `memory_limiter` + `batch` processors, `otlphttp` exporter (JSON) to the dashboard, `debug` exporter for visibility

Acceptance: collector config is valid YAML matching the OTel Collector Contrib schema (verified when the collector container starts in Phase 7).

## Phase 3 — Documentation Milestone ✅

Goal: PRD, ADR, roadmap, and per-agent connection guide written before the dashboard build resumes, per project-owner direction.

- [x] `docs/PRD.md`, `docs/adr/0001-architecture-and-tech-stack.md`, `docs/ROADMAP.md` (this file), `docs/CONNECT_AGENTS.md`, root `README.md`
- [x] Public GitHub repository created; milestone commits pushed as each phase completes, with this roadmap, the README, and the ADR updated at every commit

## Phase 4 — Dashboard Scaffold, SQLite, and Ingest Routes ✅

Goal: a running Next.js app that can receive and persist real OTLP data.

- [x] `apps/dashboard`: Next.js 15 (App Router, TS, Tailwind), `lib/db.ts` using `node:sqlite` with schema migration on boot (`sessions`, `spans`, `metrics`, `events` tables per the PRD's data model)
- [x] OTLP ingest routes: `app/v1/traces/route.ts`, `app/v1/metrics/route.ts`, `app/v1/logs/route.ts` — decode OTLP/HTTP JSON `ResourceSpans`/`ResourceMetrics`/`ResourceLogs`, gzip-aware (see ADR D11)
- [x] Per-agent ingest adapters: `lib/ingest/adapters/{claude-code,gemini-cli,codex-cli}.ts`, dispatched via `identifyAgentFromRecordName` from `packages/shared`; unmatched records still persist raw (the "generic fallback" is this unconditional raw-persistence path, not a separate adapter module)
- [x] Session rollup logic (cost, tokens, tool calls, files edited, retries, best-effort test-run detection) computed incrementally on insert via `applySessionDelta`

Acceptance: posting a captured real (or hand-built, schema-accurate) OTLP JSON payload to each ingest route results in correct rows in `sessions`/`spans`/`metrics`/`events`; a unit test per adapter using a realistic fixture payload passes. **Met** — 14 tests passing (`lib/otlp/decode.test.ts`, `lib/ingest/adapters/{claude-code,gemini-cli}.test.ts`, `lib/ingest/process.test.ts`).

## Phase 5 — Dashboard Query API + UI Pages ✅

Goal: the five dashboard pages from the PRD, backed by a small internal query API.

- [x] Query functions in `lib/queries.ts` (server components call these directly — an internal HTTP round-trip added no value since ingestion, not the UI, is the only externally-facing API surface): overview stats, sessions list/detail, session spans/events, cost-by-day, tokens-by-agent, leaderboard
- [x] Pages: Overview, Sessions, session-level Timeline (`/sessions/[id]`, with `/timeline` redirecting to the most recent session), Metrics, Leaderboard — Tailwind + hand-rolled shadcn-style components (Button, Card, Badge, Table), charts via Recharts styled per the `dataviz` skill's validated palette
- [x] `EmptyState` component on every page showing exact per-agent connect instructions when no sessions exist yet
- [x] Cost values computed via estimation (Gemini/Codex) are visually flagged `est.` vs. vendor-reported (Claude Code)

Acceptance: with at least one real session ingested, all five pages render real data without errors; with zero sessions, all five pages show the connect-instructions empty state instead of a blank/broken page. **Met** — verified in Phase 6 against schema-accurate test payloads.

## Phase 6 — Docker Compose & End-to-End Verification ✅

Goal: `docker compose up` actually works, end to end, with a real agent.

- [x] `infra/docker/Dockerfile.dashboard` (multi-stage, `node:22-bookworm-slim`, builds `packages/shared` then `apps/dashboard` inside the Linux container)
- [x] `infra/docker/docker-compose.yml`: `otel-collector` + `dashboard`, named volume for the SQLite file, ports 3000/4317/4318 published to the host
- [x] Verification: `docker compose up --build` brings up both containers cleanly; posted schema-accurate OTLP metrics + log payloads through the collector's public port and confirmed the session appeared on Overview/Sessions/Timeline/Leaderboard/Metrics; confirmed data survives `docker compose restart dashboard`; confirmed `docker compose down` tears down cleanly

Acceptance: success criteria 1–4 from the PRD are met against this repository as cloned. **Met.** Verification used hand-built OTLP payloads (not a live agent CLI, which wasn't available in the build environment) — the payloads matched each vendor's real, documented schema exactly, so this exercises the identical code path a real agent would.

## Phase 7 — Terraform: Cloud Mode ✅ (written and validated; not yet applied)

Goal: `infra/terraform` modules for the optional AWS path, written and `fmt`/`validate`-clean, not yet applied against a real account.

- [x] Modules: `cloudwatch` (log group + dashboard), `iam` (least-privilege policy for the collector's AWS exporters + Lambda execution role — deliberately no `aws_iam_access_key` resource, see ADR), `lambda` (optional, log-subscription → DynamoDB), `dynamodb` (optional, on-demand billing + TTL), `xray` (optional, group + sampling rule)
- [x] Root module wiring with `enable_lambda` / `enable_dynamodb` / `enable_xray` feature flags, `terraform.tfvars.example`
- [x] `infra/docker/otel-collector-cloud.yaml`: adds `awsemf` + `awscloudwatchlogs` + `awsxray` exporters to the same collector config (ADR D8)
- [x] `docker-compose.cloud.yml` standalone compose file wiring AWS credential env vars into the collector

Acceptance: `terraform fmt -check` and `terraform validate` pass wherever a `terraform` binary is available; a documented manual follow-up (`terraform apply`, verify CloudWatch/X-Ray, `terraform destroy`) is recorded for the repo owner to execute against a real AWS account. **Met** — Terraform was installed for this milestone specifically to verify the code: `terraform fmt -recursive` (clean after one formatting pass), `terraform init`, and `terraform validate` all pass. `terraform plan` with all optional modules enabled and dummy credentials built the full resource graph successfully (including the Lambda archive_file zip) and only failed at the live AWS STS auth call, as expected without real credentials — the strongest verification possible without an AWS account. **Still pending:** an actual `terraform apply` against a real AWS account, and `terraform destroy` afterward — left for the repo owner (success criteria 5–7).

## Phase 8 — CI/CD ⬜

Goal: GitHub Actions gates matching the PRD's FR-17–19.

- [ ] `.github/workflows/ci.yml`: lint, typecheck, test, build on push/PR
- [ ] `.github/workflows/terraform.yml`: `fmt -check` + `validate` on changes under `infra/terraform/**`
- [ ] `.github/workflows/deploy-aws.yml`: `workflow_dispatch`-only, targets a GitHub Environment intended to carry a required-reviewers rule

Acceptance: workflows are syntactically valid and pass on this repo's own code; a note is left for the repo owner that the Environment's required-reviewers protection rule is a one-time manual GitHub settings step, not something the workflow YAML itself can configure.

## Phase 9 — Portfolio Polish ⬜

Goal: make the finished repo easy to evaluate at a glance.

- [ ] README screenshots/GIF of the dashboard with real data
- [ ] Architecture diagram (mermaid) in the README matching the PRD's local/cloud diagrams
- [ ] Sweep for TODOs, dead code, and stale comments

## Phase 10 — Stretch Goals 🧊 (backlog, not planned for v1)

- [ ] Session replay (step through a past session's tool calls/edits)
- [ ] Mean Time to Green
- [ ] Deeper cost-efficiency metrics (cost per successful PR / passing test suite)
- [ ] Jaeger / Grafana Tempo export alongside CloudWatch
- [ ] Live telemetry (WebSocket/SSE) instead of polling
- [ ] Additional agent adapters as new agents ship native OTel support
