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

## Phase 4 — Dashboard Scaffold, SQLite, and Ingest Routes ⬜

Goal: a running Next.js app that can receive and persist real OTLP data.

- [ ] `apps/dashboard`: Next.js 15 (App Router, TS, Tailwind), `lib/db.ts` using `node:sqlite` with schema migration on boot (`sessions`, `spans`, `metrics` tables per the PRD's data model)
- [ ] OTLP ingest routes: `app/v1/traces/route.ts`, `app/v1/metrics/route.ts`, `app/v1/logs/route.ts` — decode OTLP/HTTP JSON `ResourceSpans`/`ResourceMetrics`/`ResourceLogs`
- [ ] Per-agent ingest adapters: `lib/ingest/adapters/{claude-code,gemini-cli,codex-cli,generic}.ts`, dispatched via `identifyAgentFromRecordName` from `packages/shared`
- [ ] Session rollup logic (cost, tokens, tool calls, files edited, retries) computed incrementally on insert

Acceptance: posting a captured real (or hand-built, schema-accurate) OTLP JSON payload to each ingest route results in correct rows in `sessions`/`spans`/`metrics`; a unit test per adapter using a realistic fixture payload passes.

## Phase 5 — Dashboard Query API + UI Pages ⬜

Goal: the five dashboard pages from the PRD, backed by a small internal query API.

- [ ] Query routes: sessions list/detail, timeline (spans or event fallback), metrics aggregates, leaderboard
- [ ] Pages: Overview, Sessions, Timeline, Metrics, Leaderboard — Tailwind + shadcn-style components (Button, Card, Badge, Table, Tabs), charts via Recharts
- [ ] Empty-state component on every page showing exact per-agent connect instructions (links to `docs/CONNECT_AGENTS.md` content) when no sessions exist yet
- [ ] Cost values computed via estimation (Gemini/Codex) are visually flagged as estimated vs. vendor-reported (Claude Code)

Acceptance: with at least one real session ingested, all five pages render real data without errors; with zero sessions, all five pages show the connect-instructions empty state instead of a blank/broken page.

## Phase 6 — Docker Compose & End-to-End Verification ⬜

Goal: `docker compose up` actually works, end to end, with a real agent.

- [ ] `infra/docker/Dockerfile.dashboard` (multi-stage, `node:22-bookworm-slim`, `npm run build` in a Linux container so `node:sqlite` and any transitive natives resolve correctly for that platform)
- [ ] `infra/docker/docker-compose.yml`: `otel-collector` + `dashboard`, named volume for the SQLite file, ports 3000/4317/4318 published to the host
- [ ] Manual verification: point a real agent at the running collector (per `docs/CONNECT_AGENTS.md`), confirm the session appears on the dashboard, confirm data survives `docker compose restart`, confirm `docker compose down` tears down cleanly

Acceptance: success criteria 1–4 from the PRD are met against this repository as cloned.

## Phase 7 — Terraform: Cloud Mode ⬜

Goal: `infra/terraform` modules for the optional AWS path, written and `fmt`/`validate`-clean, not yet applied against a real account.

- [ ] Modules: `cloudwatch` (log group + dashboard), `iam` (least-privilege policy for the collector's AWS exporters + Lambda execution role), `lambda` (optional, log-subscription → DynamoDB), `dynamodb` (optional), `xray` (optional)
- [ ] Root module wiring with `enable_lambda` / `enable_dynamodb` / `enable_xray` feature flags, `terraform.tfvars.example`
- [ ] `infra/docker/otel-collector-cloud.yaml`: adds `awsemf` + `awsxray` exporters to the same collector config
- [ ] `docker-compose.cloud.yml` overlay wiring AWS credential env vars into the collector

Acceptance: `terraform fmt -check` and `terraform validate` pass wherever a `terraform` binary is available; a documented manual follow-up (`terraform apply`, verify CloudWatch/X-Ray, `terraform destroy`) is recorded for the repo owner to execute against a real AWS account.

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
