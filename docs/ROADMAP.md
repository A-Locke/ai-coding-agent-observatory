# Roadmap

**Project complete.** Phases 0–9 (everything in the original tech task's scope) are done and verified against real infrastructure — see [PRD §10](PRD.md#10-success-criteria--all-met) for the success-criteria checklist and [MILESTONES.md](MILESTONES.md) for the evidence trail. Phase 10 is explicitly out-of-scope stretch work, not a gap.

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

Acceptance: `terraform fmt -check` and `terraform validate` pass wherever a `terraform` binary is available; a documented manual follow-up (`terraform apply`, verify CloudWatch/X-Ray, `terraform destroy`) is recorded for the repo owner to execute against a real AWS account. **Fully met, including the real deploy and verification.** `terraform apply` succeeded against a live AWS account (satisfies criterion 5). The stack was then moved from `us-east-1` to `eu-central-1` (destroy in the old region, apply in the new one via a local `terraform.tfvars`), surfacing and fixing two real bugs: `aws_iam_user.collector` needed `force_destroy = true` (ADR D14) since its access key is created out-of-band, and `docker-compose.cloud.yml` needs an explicit `--env-file .env` (ADR D15). With the cloud-mode collector running against Frankfurt, a schema-accurate OTLP payload was sent through it and **confirmed present in CloudWatch**: both `claude_code.token.usage` and `claude_code.cost.usage` registered under the `AIObservatory` namespace, and the raw `claude_code.tool_result` log events were readable back out of the `/ai-observatory/otel` log group with correct attributes intact. This satisfies criterion 6 (X-Ray wasn't exercised since `enable_xray` stayed off for this deployment). Criterion 7 (`terraform destroy`) is intentionally left for the repo owner to run whenever they're done experimenting.

## Phase 8 — CI/CD ✅

Goal: GitHub Actions gates matching the PRD's FR-17–19.

- [x] `.github/workflows/ci.yml`: lint, typecheck, test, build on push/PR (single job, sequential steps -- builds `packages/shared` once up front since every other step depends on it)
- [x] `.github/workflows/terraform.yml`: `fmt -check` + `init -backend=false` + `validate` on changes under `infra/terraform/**`; `plan` runs opportunistically only if AWS secrets are configured
- [x] `.github/workflows/deploy-aws.yml`: `workflow_dispatch`-only (apply/destroy choice + feature-flag inputs), targets a GitHub Environment (`aws-deploy`) intended to carry a required-reviewers rule; state bridged between runs via a best-effort `actions/cache` (ADR D13)

Acceptance: workflows are syntactically valid and pass on this repo's own code; the Environment's required-reviewers protection rule is configured. **Fully met.** `ci.yml` is confirmed green on multiple real runs. `terraform.yml` is path-filtered to `infra/terraform/**` and correctly only triggers on infra changes. `deploy-aws.yml` was fully verified end to end in Milestone 10: the `aws-deploy` Environment has `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets and a `required_reviewers` protection rule (set via `gh api`, not the web UI — see ADR D10), and a real dispatch correctly paused for approval, then ran `terraform apply` and created real, verified resources once approved.

## Phase 9 — Portfolio Polish ✅

Goal: make the finished repo easy to evaluate at a glance.

- [x] README screenshots of the dashboard with real data — done in Milestone 8, using actual saved files this time (the Milestone 6 AWS console screenshots are still lost; not worth a throwaway `terraform apply`/`destroy` cycle just to retake those). Local dashboard screenshots (Overview, Sessions, Timeline, Metrics, Leaderboard) show a genuine connected Claude Code session, not fabricated data.
- [x] Architecture diagram (mermaid) in the README — one unified diagram covering both local flow and the optional cloud branch, rather than two separate diagrams; covers the same ground as the PRD's local/cloud ASCII diagrams
- [x] Sweep for TODOs, dead code, and stale comments — done in Milestone 9. No TODO/FIXME/HACK markers existed anywhere. Found and removed real dead code: 5 unused `KNOWN_*` exports, the entire unused `GEN_AI_ATTR`/`GEN_AI_METRIC` module, and the unused `Button`/`Badge` UI components (plus their now-unused `class-variance-authority` dependency). Found and fixed a stale ADR (D4 described `gen_ai.*` attribute parsing that was never actually implemented) and two magic-string call sites that should have used the shared constants they were written to replace. Also fixed a `tsconfig.json` deprecation (`moduleResolution: "node"` → `"NodeNext"`, TypeScript 5.9 is phasing out the whole classic-Node-resolution family by 7.0).

## Phase 10 — Stretch Goals 🧊 (Tier 1 done, Tier 2/3 backlog)

Proposed 2026-08-02, evaluated against the project's real-data-only and local-first principles. **Scope decision: Tier 1 only** — everything derivable from telemetry already stored, with zero new integrations or new real-world data sources. Tier 2/3 items (git integration, CI telemetry, cross-system correlation, plugin architecture, the "engineering lifecycle" north star) were evaluated and explicitly declined as beyond what a portfolio project needs — noted briefly below so they aren't re-proposed without this context, not carried forward as phases.

- [x] Cost & engineering metrics from existing data (Phase 11)
- [x] Local alerting (Phase 12)
- [x] Export support — CSV/JSON/Markdown (Phase 13)
- [x] Session replay UI (Phase 14)
- [x] CloudWatch enhancements + AWS alarms, optional path only (Phase 15)
- [ ] Jaeger / Grafana Tempo export alongside CloudWatch (not planned — Tier 2+)
- [ ] Live telemetry (WebSocket/SSE) instead of polling (not planned — Tier 2+)
- [ ] Additional agent adapters as new agents ship native OTel support (not planned — Tier 2+)

**Considered and declined (beyond portfolio scope):** git commit/branch enrichment, GitHub Actions telemetry, cross-system trace correlation, a unified agent+git+CI timeline, a plugin architecture for enrichers, deeper Lambda/DynamoDB/X-Ray analytics, and the long-term "Engineering Lifecycle Observability" vision (correlating agent sessions, git, CI/CD, deployments, and Kubernetes into one end-to-end trace). Each is real, buildable, and consistent with the project's principles — they just take this from a portfolio piece into a materially larger platform. Not reflected as phases below.

**Explicitly rejected, not just deprioritized:** sample datasets / demo mode / seeded telemetry / automatic dashboard population. Directly contradicts the project's core "no synthetic data" principle (explicit project-owner directive, 2026-08-02) — a hard no, not a priority call.

### Phase 11 — Cost & Engineering Metrics from Existing Data ✅

Goal: everything derivable from data already ingested, no new telemetry source required.

- [x] Metrics page: weekly/monthly cost rollups (currently daily only), a simple monthly-spend projection from recent trend
- [x] Fleet-wide cost-per-success and cost-per-file-edited views (Leaderboard already computes `costPerSuccessUsd` per model; surface it fleet-wide too)
- [x] Retry rate and tool-usage-frequency aggregate queries + charts (data already in `sessions.retry_count` / `events`)
- [x] Average prompt latency and longest critical path, computed from the `spans` table's parent/child structure — only populated when an agent's beta tracing is on; page should degrade gracefully (and say why) when it isn't

Acceptance: no new ingest code, no new OTLP data required — every number here must be traceable to a column or event already being stored today. **Met** — `getCostTrend`/`getMonthlyCostProjection`/`getCostEfficiencyStats`/`getToolUsageFrequency`/`getLatencyStats` in `lib/queries.ts`, all reading existing tables. "Longest critical path" is documented as the slowest single span by wall-clock duration, not a weighted critical-path graph algorithm — a deliberate scope call, not an oversight.

### Phase 12 — Local Alerting ✅

Goal: threshold-based flags on session data, surfaced in the UI. No new infrastructure.

- [x] Configurable thresholds (excessive retries, high token consumption, long-running session, unusually expensive session)
- [x] Dashboard badge/banner when a session crosses a threshold — reuses the existing `StatusBadge`-style component pattern

Acceptance: rule evaluation happens at query time against existing session rows; no background job, no new storage. **Met** — `lib/alerts.ts` (`ALERT_THRESHOLDS`, env-overridable, `evaluateSessionAlerts`), rendered via `alert-badges.tsx` on Sessions, session detail, and an Overview summary banner.

### Phase 13 — Export Support ✅

Goal: let the data leave the dashboard for offline analysis.

- [x] API routes + UI buttons to export sessions/leaderboard/metrics query results as CSV, JSON, and a Markdown summary report
- [x] Explicitly not doing Parquet or a second OTel-JSON export format unless real demand shows up — no library dependency added speculatively

Acceptance: exports are a serialization of the exact data already shown on-screen — no separate export-specific query logic to maintain. **Met** — `lib/export.ts` (`toCsv`/`toMarkdownTable`) plus `/api/export/{sessions,leaderboard,report}` routes, wired to download links on Sessions and Leaderboard.

### Phase 14 — Session Replay UI ✅

Goal: a richer way to review a past session, built entirely on data the Timeline page already has.

- [x] Interactive scrub/playback over the stored span/event sequence
- [x] Token-usage and cost overlays synced to playback position
- [x] File-modification summary view

Acceptance: pure frontend work — no new backend, no new ingest logic. If it needs new data to be good, that's a sign it's not ready yet. **Met** — `components/session-replay.tsx` (client-side scrub/playback), `getSessionMetrics` reuses existing session-detail data; rendered as a new "Replay" section on the session detail page.

### Phase 15 — CloudWatch Enhancements & AWS Alerting (optional path only) ✅

Goal: richer AWS-side observability, strictly within the existing optional/off-by-default cloud module.

- [x] `aws_cloudwatch_metric_alarm` Terraform resources on metrics already exported via EMF (excessive cost, high token volume) — new optional flag, off by default
- [x] CloudWatch Logs Insights saved queries added to the existing dashboard module
- [x] Composite alarms and metric filters, evaluated for real value vs. added Terraform surface area before building

Acceptance: zero impact on local mode; no new always-on AWS resource; every addition stays behind a feature flag consistent with the existing `enable_lambda`/`enable_dynamodb`/`enable_xray` pattern. **Met** — `enable_alarms` flag (default `false`) in `modules/cloudwatch/alarms.tf`: `high_cost`/`high_token_usage` metric alarms, an `any_alert` composite alarm, and two Logs Insights saved queries. No SNS/notification channel by design (see ADR D16). Verified live: `terraform apply` with `enable_alarms = true` created all 10 resources correctly in `eu-central-1`, each confirmed via direct `aws cloudwatch`/`aws logs` calls, then `terraform destroy` (after an interrupted first attempt correctly left state and live AWS in sync — no drift, verified before regenerating the plan) removed everything cleanly.
