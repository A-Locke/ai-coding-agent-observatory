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

## Milestone 5 — Cloud mode deployed for real (2026-08-02)

- Repo owner created a `terraform-deploy` IAM user (`AdministratorAccess`, personal sandbox account) via the AWS Console and installed the AWS CLI locally.
- `terraform apply` run against the real account with the exact plan reviewed in Milestone 3: **5 resources created, 0 errors** — `aws_cloudwatch_log_group.otel` (`/ai-observatory/otel`), `aws_cloudwatch_dashboard.main` (`ai-observatory-dashboard`), `aws_iam_policy.collector_exporter`, `aws_iam_user.collector` (`ai-observatory-collector`), `aws_iam_user_policy_attachment.collector_exporter`.
- README updated with a cost table for both the always-on and optional (Lambda/DynamoDB/X-Ray) resources.
- Satisfies PRD success criterion 5 ("Deploy to AWS via Terraform"). Criterion 6 (verify data in CloudWatch/X-Ray) is next, pending a real agent connected through `docker-compose.cloud.yml`. Criterion 7 (`terraform destroy`) is left for the repo owner to run when done experimenting.
- Note on tooling: this milestone required creating real, billable-in-principle AWS resources, which this environment's safety controls correctly refused to execute directly — the repo owner ran `terraform apply` themselves from the exact reviewed plan file.

## Milestone 6 — Cloud mode verified end to end, region moved to Frankfurt (2026-08-02)

- Repo owner decided to run in `eu-central-1` instead of `us-east-1`; moved via full destroy-then-recreate rather than trying to migrate only the region-bound resources (log group + dashboard — IAM is global and never actually needed to move).
- First destroy attempt hit a real bug: `aws_iam_user.collector` couldn't be deleted because it still had an active access key (created out-of-band per D12) attached. Fixed by adding `force_destroy = true` to that resource (ADR D14) and manually deleting the stuck key to unblock the in-progress destroy.
- Verified with live AWS calls (not just `terraform state list`) that nothing was left behind in either region before redeploying.
- Redeployed cleanly to `eu-central-1` via a local `terraform.tfvars` (gitignored, keeps the repo's own default neutral).
- Found and documented a second bug getting the cloud-mode collector running: `docker-compose.cloud.yml` silently failed to pick up `.env` because Compose resolves it relative to the compose file's directory (`infra/docker/`), not the repo root. Fixed by documenting `--env-file .env` in the README (ADR D15).
- Sent a schema-accurate OTLP payload through the running cloud-mode collector and **confirmed the data in CloudWatch**: `claude_code.token.usage` and `claude_code.cost.usage` registered in the `AIObservatory` metrics namespace, and the raw `claude_code.tool_result` log events read back correctly from `/ai-observatory/otel` with all attributes intact. **Satisfies PRD success criterion 6.**
- Only criterion 7 (`terraform destroy`) remains, to be run once the repo owner is done experimenting with the live deployment.
- **Addendum, same day:** `terraform destroy` was re-run for real after the AWS console walkthrough (screenshots confirmed the dashboard, log streams, custom metrics, and IAM policy all looked correct) — clean single-pass destroy this time, confirming the D14 fix works. Verified live against AWS again afterward: nothing left in either region.
- **Bug found while preparing local-mode demo data:** the Gemini CLI and Codex CLI ingest adapters extracted token counts but never extracted `model` from attributes (only Claude Code's adapter did) — every Gemini/Codex session would have shown "unknown model" and grouped incorrectly on the Leaderboard. Fixed in both adapters; caught before it ever mattered in practice, since only Claude Code is in real use right now.

## Milestone 7 — First real agent actually connected (2026-08-02)

- Nav bug found by visually clicking through the dashboard: `/timeline` redirects server-side to `/sessions/[id]`, so the nav's plain prefix match always highlighted "Sessions" instead of "Timeline" once there. Fixed by treating session-detail URLs as the Timeline tab.
- At the repo owner's explicit direction, confirmed there is nothing in the actual repository that generates or sends synthetic telemetry — searched for demo/fake/seed/simulate/mock-named files and scripts, found none. (The demo-data script and test payloads used earlier in this session lived only in the session's scratch directory, never committed.) The fixture-based unit/integration tests were kept deliberately, by the repo owner's choice, since they're isolated to `vitest` against an in-memory database and never touch the real dashboard.
- `terraform destroy` confirmed complete for the AWS side (success criterion 7 — the last one).
- **`~/.claude/settings.json` was configured for real and a genuine Claude Code session connected to the local collector for the first time** — the first data point in this project that isn't fabricated for testing. Initially showed "unknown model" and $0.00, which led to finding the same class of bug just fixed for Gemini/Codex, missed on Claude Code's own adapter: `claude_code.token.usage` (which arrives before `claude_code.cost.usage` on the first export interval) never had its `model` attribute extracted. Fixed; the live session now shows correctly (`claude-sonnet-5`, real accumulating cost, `Success` status).

## Milestone 8 — README screenshots, for real this time (2026-08-02)

- The Milestone 6 attempt at AWS console screenshots failed because pasted chat images aren't real files. This time the repo owner saved 5 screenshots as actual files in `docs/screenshots/`, so they could be renamed and committed properly: `overview.png`, `sessions.png`, `timeline.png`, `metrics.png`, `leaderboard.png`.
- All five show the genuine connected Claude Code session from Milestone 7 — real session ID, real model names (`claude-sonnet-5`, `claude-haiku-4-5-20251001` on a subagent call), real event sequence (`mcp_server_connection`, `user_prompt`, `api_request`, `assistant_response`, `tool_decision`, `tool_result`). No prompt or tool content is visible, confirming the privacy-by-default posture (`OTEL_LOG_USER_PROMPTS`/`OTEL_LOG_TOOL_DETAILS` unset) works as designed.
- Wired into the README's Dashboard section with a caption noting explicitly that this is real, not fabricated, data.

## Milestone 9 — Dead-code and stale-docs sweep, Phase 9 complete (2026-08-02)

- No TODO/FIXME/HACK markers existed anywhere in the repo.
- Removed genuinely dead code, verified by grepping actual usage rather than guessing: 5 unused `KNOWN_CLAUDE_CODE_*`/`KNOWN_GEMINI_CLI_*` exports, the entire `GEN_AI_ATTR`/`GEN_AI_METRIC` module (never wired up), and the unused `Button`/`Badge` shadcn-style components — which also made `class-variance-authority` an unused dependency, so that came out of `package.json` too.
- Fixed a stale ADR: D4 claimed the generic ingest fallback "reads the vendor-neutral `gen_ai.*` semantic-convention attributes where present," but that was never implemented — the real behavior (unconditional raw-JSON persistence, no special parsing) is now documented accurately, with an honest note about the gap between the original intent and what actually shipped.
- Fixed two magic-string call sites in `lib/ingest/process.ts` that should have used the shared attribute constants they were written to replace (`extractAgentVersion` now imports `CLAUDE_CODE_ATTR.APP_VERSION` instead of hardcoding `"app.version"`); `extractSessionId` keeps its literal deliberately, with a comment explaining why (it's the one key genuinely shared across all three vendor schemas, so importing it from any single agent's module would be misleading).
- Fixed an IDE-flagged `tsconfig.json` deprecation in `packages/shared`: `moduleResolution: "node"` is being phased out entirely (not just renamed) by TypeScript 7.0. Moved to `"NodeNext"`, verified the build still produces plain CommonJS output (the package has no `"type": "module"`), so this didn't require any of the ESM `.js`-extension changes that were specifically avoided earlier.
- Re-verified everything after the cleanup: `npm install`, shared package build, full lint/typecheck/test/build across the monorepo, and a live rebuild of the running dashboard container — confirmed the connected real Claude Code session's data survived the rebuild untouched.

## Milestone 10 — Gated CI/CD deploy path verified for real (2026-08-02)

- Local dashboard destructively torn down (`docker compose down -v`) for a clean-slate manual re-verification.
- Repo owner created the `aws-deploy` GitHub Environment and added `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (from the `terraform-deploy` admin user) as environment secrets — but the environment initially had **no protection rules** (`"protection_rules": []`), meaning `deploy-aws.yml` would have run immediately with no approval gate, defeating the tech task's explicit "AWS deployment must require manual approval" requirement.
- Fixed via the GitHub REST API directly (public repos get environment protection rules for free; this doesn't require GitHub Enterprise): added a `required_reviewers` rule naming the repo owner, `prevent_self_review: false` so they can approve their own dispatches.
- Dispatching the workflow itself was blocked by this environment's safety controls (same as the direct `terraform apply` calls earlier) since it ultimately provisions real cloud infrastructure — the repo owner ran `gh workflow run deploy-aws.yml` themselves.
- **The full gated pipeline worked end to end for the first time:** dispatch → paused for review → repo owner approved → `terraform apply` ran inside the Action → 5 resources created. Verified live against AWS directly (not just the job's own log): `/ai-observatory/otel` log group, `ai-observatory-dashboard`, and the `ai-observatory-collector` IAM user all genuinely exist.
- Deployed to **us-east-1**, not the `eu-central-1` used for the manual local deploys — the CI runner has no access to the local, gitignored `terraform.tfvars`, so it correctly fell back to the repo's committed default region. Worth knowing, not a bug.
- Torn down through the same gated pipeline (`action=destroy`), closing the loop: dispatch → approval → real destroy. Verified live against AWS afterward — nothing left in either region, no orphaned IAM policies. The full apply→verify→destroy cycle now works end to end through CI/CD, not just via local Terraform CLI.

## Project status: complete

All 7 PRD success criteria are met, verified against real infrastructure rather than just planned:
- Real local telemetry (a genuine connected Claude Code session, not synthetic data)
- Real AWS deployment, twice over — once via local Terraform CLI, once via the fully gated CI/CD workflow with a real manual-approval pause
- Real teardown, verified live against AWS both times
- CI confirmed green on GitHub Actions across multiple pushes
- The README shows real screenshots, not mockups

Phase 10 (stretch goals: session replay, Mean Time to Green, deeper cost-efficiency metrics, Jaeger/Tempo export, live telemetry, additional agent adapters) remains explicitly out of scope for v1 — backlog, not a gap. See [ROADMAP.md](ROADMAP.md).
