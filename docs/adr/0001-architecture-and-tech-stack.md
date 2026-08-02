# ADR 0001: Architecture and Technology Stack

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-02 |
| **Related** | [PRD](../PRD.md) · [Roadmap](../ROADMAP.md) |

## Context

The AI Coding Agent Observatory ingests OpenTelemetry (OTel) telemetry from AI coding agents (Claude Code, Codex CLI, Gemini CLI), stores it, and visualizes it locally with an optional AWS deployment. It is explicitly a **portfolio demonstration**: the brief prioritizes developer experience and low cost over production scalability. This ADR records the significant, otherwise-non-obvious technology and architecture decisions and why they were made, so a future contributor (human or agent) doesn't have to reverse-engineer the reasoning from the code.

## Decision Drivers

1. Clone-and-run in minutes, with no required signup, API key, or cloud account for local mode.
2. Real data over synthetic data wherever a real source exists — credibility as a portfolio piece depends on this.
3. Near-zero cost, both to build (this environment has no AWS credentials or Terraform binary) and to run.
4. Small, defensible surface area — every extra moving part is something to explain and something that can break during a demo.

## Decisions

### D1: Ingest real agent telemetry; no synthetic simulator

**Decision:** The platform ingests OTLP directly from real Claude Code, Codex CLI, and Gemini CLI processes. It does not include a telemetry simulator or synthetic data generator.

**Why:** All three target agents ship native, documented OTel exporters (confirmed from each vendor's own docs — see [Connect Agents Guide](../CONNECT_AGENTS.md) for sources). Fabricating data for agents that already emit real data would undermine the project's central credibility claim and add a service whose only job is to lie plausibly. An earlier draft of this project included a simulator (per the original tech-task brief's suggestion of "a telemetry simulator for agents lacking native telemetry"); once research confirmed none of the three target agents actually lacks native telemetry, the simulator was removed before being built out, per explicit direction from the project owner.

**Consequences:** There is no data immediately after `docker compose up` — a real agent must be pointed at the collector first. The dashboard's empty state exists specifically to make that connection step obvious rather than leaving a bare "no data" screen. Codex CLI's schema is the least mature of the three (see D6), so its adapter is best-effort.

### D2: Exactly two Docker services (`otel-collector`, `dashboard`)

**Decision:** Local mode runs two containers. The "Dashboard API" box in the original architecture sketch is implemented as Next.js Route Handlers inside the `dashboard` service (both the OTLP ingest endpoints and the read API), not a separate container.

**Why:** Fewer moving parts is directly in service of "developer experience" and "clone and run in minutes." A dedicated API service would add a network hop, a second Dockerfile, and a second thing that can fail to start, for no capability the Next.js server can't provide natively via Route Handlers.

**Alternatives considered:** A three-service split (collector, API, dashboard) more literally mirrors the original architecture diagram, but was rejected once real telemetry replaced the simulator — a third "telemetry generator" service no longer existed to make three services the natural count.

### D3: SQLite via Node's built-in `node:sqlite`, not `better-sqlite3`

**Decision:** Local storage uses Node.js's built-in `node:sqlite` module (`DatabaseSync`), not the `better-sqlite3` npm package.

**Why:** `better-sqlite3` is a native addon; a `node_modules` install on the host (Windows, in this build environment) produces a binary that will not run inside the Linux container the Dockerfile builds, and vice versa — a well-known monorepo/Docker pitfall. `node:sqlite` ships inside Node.js itself (stable enough for this use case as of the Node 22 LTS / Node 24 versions this project targets), eliminating an entire class of native-module ABI/cross-compilation problems with an equivalent synchronous API.

**Consequences:** Slightly less battle-tested than `better-sqlite3` in production contexts, and ties the project to a reasonably recent Node version. Acceptable for a portfolio/demo scope.

### D4: OTel GenAI semantic conventions as a fallback, vendor-specific names as primary

**Decision:** Ingestion is adapter-based. A record is routed to a vendor-specific adapter (`claude-code`, `gemini-cli`, `codex-cli`) by matching its OTLP record-name prefix (`claude_code.*`, `gemini_cli.*`, `codex.*`). Anything unmatched falls through to a generic adapter that reads the vendor-neutral `gen_ai.*` semantic-convention attributes where present and otherwise preserves raw attributes as JSON rather than dropping the record.

**Why:** Each vendor's proprietary metric/event names carry more specific, richer information (e.g., Claude Code's `claude_code.cost.usage` is an exact vendor-reported dollar figure) than the generic `gen_ai.*` conventions alone would provide. But relying solely on vendor-specific names would mean any future agent, or any evolution in an existing agent's schema, silently loses data. The two-tier design gets the best of both.

**Consequences:** Three adapters to maintain instead of one generic parser. Justified because the three vendor schemas are meaningfully different in shape (see the PRD's data-model table), not just cosmetically different attribute names.

### D5: npm workspaces, not pnpm or Turborepo

**Decision:** The monorepo (`apps/`, `packages/`) uses plain npm workspaces.

**Why:** npm ships with Node — zero additional install in a fresh clone or CI runner. Neither pnpm nor a build-orchestration tool like Turborepo was installed in the build environment, and the project's scale (one app, one shared package) doesn't need Turborepo's caching/task-graph features to stay fast.

### D6: Codex CLI adapter is explicitly best-effort

**Decision:** The Codex CLI ingest adapter implements the publicly-confirmed metric names (`codex.tool.call`, `codex.api_request`, `codex.turn.token_usage`, `codex.turn.e2e_duration_ms`, etc.) but does not claim full coverage of Codex's log/event or trace schema, which is not fully published as of this writing (see open issues on the `openai/codex` GitHub repository tracking OTel metrics support still stabilizing).

**Why:** Better to ship an honestly-partial adapter with a fallback than to guess at undocumented field names and silently misinterpret data.

**Consequences:** Codex CLI sessions may show richer data than Gemini/Claude sessions in some areas and thinner data in others, until Codex's OTel support matures and this adapter is revisited.

### D7: Docker base image `node:22-bookworm-slim`, not Alpine

**Decision:** All Dockerfiles use `node:22-bookworm-slim` (Debian, glibc, Active LTS) regardless of the Node version installed on the build machine (24.x).

**Why:** Debian/glibc avoids the class of native-module prebuilt-binary gaps that musl-based Alpine images periodically hit, at the cost of a larger image — an acceptable trade for a demo project where image size isn't a constraint. Node 22 LTS (rather than matching the host's Node 24) is chosen for reproducibility: LTS versions have a longer, more predictable support window than whatever happens to be newest on a given developer's machine.

### D8: Same collector, alternate config, for cloud mode — no compute in AWS

**Decision:** Cloud mode reuses the identical `otel-collector-contrib` binary/image, just with an alternate config (`otel-collector-cloud.yaml`) that adds `awsemf` and `awsxray` exporters authenticated via AWS credentials. The collector itself is never deployed *into* AWS compute.

**Why:** The brief explicitly forbids EC2/ECS/EKS and asks for "serverless where practical." Running the same collector process locally (or wherever Docker runs) and pointing its exporters at AWS satisfies "no EC2/ECS/EKS" by construction — there's no AWS compute resource for the collector at all, serverless or otherwise. It also means local and cloud mode share one config surface with one delta, instead of two divergent deployment models.

### D9: Terraform local state, feature-flagged optional modules

**Decision:** Terraform state is local (no remote backend). Lambda, DynamoDB, and X-Ray are separate modules gated behind boolean variables, defaulting to `false`; CloudWatch (log group + dashboard) and IAM are the only always-on modules.

**Why:** Local state is a known production anti-pattern (no locking, no team collaboration, easy to lose) but is explicitly acceptable here: this is a single-operator `apply`/`destroy` demo cycle, not a long-lived team-shared stack, and adding a remote backend (S3 + DynamoDB lock table) would itself be more AWS surface area to explain and pay for. Feature-flagging the optional modules keeps the default `terraform apply` cheap and fast while still letting the Lambda→DynamoDB→cloud-dashboard path be demoed on request.

### D10: GitHub Actions with a manual-approval deploy gate

**Decision:** CI (`ci.yml`) and Terraform validation (`terraform.yml`) run automatically on push/PR. The actual AWS deploy workflow (`deploy-aws.yml`) is `workflow_dispatch`-only and targets a GitHub Environment intended to have a required-reviewers protection rule.

**Why:** Directly required by the brief ("AWS deployment must require manual approval"). Note: the workflow YAML can *reference* an environment, but the required-reviewers rule itself is a one-time GitHub repository-settings step, not something expressible in the workflow file — this is called out explicitly in the [Roadmap](../ROADMAP.md) as a manual setup step for the repo owner.

### D11: Ingest routes decompress gzip explicitly, not just `request.json()`

**Decision:** The OTLP ingest routes read the raw request body and gunzip it when `Content-Encoding: gzip` is present, rather than calling `request.json()` directly.

**Why:** Found during Phase 6 end-to-end verification: the OTel Collector's `otlphttp` exporter gzip-compresses its export body by default. `request.json()` on a still-compressed body fails with an opaque JSON parse error on garbled bytes, which is exactly what happened on the first real `docker compose up` test. A real agent talking to these routes directly (bypassing the bundled collector) could plausibly do the same, so the fix is general, not a workaround specific to our own collector config.

**Consequences:** One extra dependency on Node's `node:zlib`, otherwise none — this is a strictly-more-correct version of body parsing with no downside.

### D12: No `aws_iam_access_key` resource — credentials are a manual step

**Decision:** The `iam` module creates a dedicated IAM user and least-privilege policy for the collector's cloud exporters, but does not create an `aws_iam_access_key` resource. The repo owner runs `aws iam create-access-key --user-name <output>` once, manually, after `apply`.

**Why:** An `aws_iam_access_key` resource writes the secret access key into Terraform state in plaintext. That's a real risk even for a demo, and it's compounded here by D9's choice of local (unencrypted, easy-to-accidentally-commit) state. A manual `create-access-key` call costs one extra command and keeps the secret out of any file this project manages.

**Consequences:** `terraform apply` alone doesn't produce working cloud-mode credentials — the README and Connect Agents guide call out the one manual command needed afterward.

## Consequences (Overall)

**Positive:** Minimal moving parts for local mode; real, credible data; no native-module Docker cross-compilation risk; cloud mode is genuinely optional and genuinely cheap; every non-obvious choice above is traceable to a stated constraint (cost, DX, or the "real data" credibility goal).

**Negative / accepted trade-offs:** SQLite is single-writer and not horizontally scalable (fine at demo scale). Local Terraform state doesn't support team collaboration (fine for a single-operator demo). The Codex CLI adapter is incomplete pending upstream schema stabilization. `node:sqlite` is newer and less battle-tested than `better-sqlite3` in production Node services.
