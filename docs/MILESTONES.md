# Milestones

A running log of what shipped in each published commit. See [ROADMAP.md](ROADMAP.md) for the forward-looking plan this log is checking off.

## Milestone 1 — Bootstrap, shared schema, docs (2026-08-02)

- Monorepo scaffold (npm workspaces): `apps/`, `packages/`, `infra/`, `docs/`.
- `packages/shared`: real per-agent OpenTelemetry attribute constants for Claude Code, Codex CLI, and Gemini CLI (sourced from each vendor's own docs), shared types, and a cost calculator with tests.
- `infra/docker/otel-collector-config.yaml`: local OTLP receiver/forwarder config.
- PRD, ADR 0001, roadmap, and agent-connection guide written.
- Public repository created; Milestone 1 pushed.

## Milestone 2 — Working local dashboard (2026-08-02)

- `apps/dashboard`: Next.js 15 app with `node:sqlite` storage, OTLP/HTTP JSON ingest routes (`/v1/traces`, `/v1/metrics`, `/v1/logs`), and per-agent ingest adapters (Claude Code, Gemini CLI, Codex CLI) that normalize each vendor's real schema into `sessions`/`spans`/`metrics`/`events` tables.
- Five dashboard pages (Overview, Sessions, session-level Timeline, Metrics, Leaderboard) with an empty-state connect-instructions screen per the PRD, built with hand-rolled shadcn-style components and a dataviz-skill-validated color palette.
- `infra/docker/Dockerfile.dashboard` + `docker-compose.yml`; `docker compose up` verified end to end against schema-accurate test OTLP payloads: dashboard reachable, session data visible across Overview/Sessions/Timeline/Leaderboard/Metrics, data survives a restart, `docker compose down` tears down cleanly. Satisfies PRD success criteria 1–4.
- Bug found and fixed during verification: the collector's `otlphttp` exporter gzip-compresses its export body by default; the ingest routes now decompress `Content-Encoding: gzip` bodies instead of assuming plain JSON (ADR 0001, D11).

## Milestone 3 — Terraform (cloud mode) (2026-08-02)

- Five Terraform modules: `cloudwatch` (log group + dashboard), `iam` (least-privilege policy for the collector's exporters + optional Lambda execution role), `dynamodb` (optional, on-demand + TTL), `lambda` (optional, CloudWatch Logs → DynamoDB fan-out), `xray` (optional, group + sampling rule). Root module wires them behind `enable_lambda`/`enable_dynamodb`/`enable_xray` flags, all defaulting to `false`.
- `infra/docker/otel-collector-cloud.yaml` + `docker-compose.cloud.yml`: same collector image as local mode, alternate config exporting to `awsemf`/`awscloudwatchlogs`/`awsxray` instead of the local dashboard.
- Installed Terraform specifically to verify this milestone (with explicit sign-off, since it modifies the build machine): `terraform fmt` (one formatting pass, now clean), `terraform init`, `terraform validate` all pass. A `terraform plan` with every optional module enabled and dummy AWS credentials built the entire resource graph successfully (including the Lambda zip via `archive_file`) and only failed at the live AWS authentication call — the strongest verification available without a real AWS account.
- Deliberately did not create an `aws_iam_access_key` resource (would write a secret into local Terraform state) — access key creation is a documented one-time manual step instead (ADR 0001, D12).
- **Not done:** an actual `terraform apply`/`destroy` against a real AWS account (success criteria 5–7) — left for the repo owner to run deliberately, since it costs real money and this build environment has no AWS credentials.

## Milestone 4 — CI/CD (2026-08-02)

- `.github/workflows/ci.yml`: lint, typecheck, test, build against every push/PR.
- `.github/workflows/terraform.yml`: `fmt -check`, `init -backend=false`, `validate` on any change under `infra/terraform/**`; `plan` runs opportunistically if AWS secrets happen to be configured.
- `.github/workflows/deploy-aws.yml`: manual-dispatch only (apply/destroy + feature-flag inputs), gated behind a GitHub Environment (`aws-deploy`) meant to carry a required-reviewers rule. Bridges Terraform state between separate runs via a best-effort `actions/cache` (documented limitation — see ADR 0001, D13) since this project intentionally uses local state (D9).
- Pushing this milestone triggered `ci.yml` for real; it finished fully green on the first run ([30743029646](https://github.com/A-Locke/ai-coding-agent-observatory/actions/runs/30743029646)) — checkout, install, build shared, lint, typecheck, test, and build all passed with no fixes needed.
- **Not done (repo owner action required):** create the `aws-deploy` GitHub Environment with a required-reviewers rule and add `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` repository secrets before `deploy-aws.yml` can actually be dispatched — not possible from this build environment (no AWS account).

## What's left

Phase 9 (portfolio polish: screenshots, mermaid diagram already in the README) and Phase 10/stretch goals are backlog — see [ROADMAP.md](ROADMAP.md). The core deliverable (real local telemetry pipeline + optional, cost-conscious AWS path) is complete and verified as far as this environment allows.
