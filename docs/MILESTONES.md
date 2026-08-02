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

## Milestone 3 — Terraform (cloud mode)

Pending.

## Milestone 4 — CI/CD

Pending.
