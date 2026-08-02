# Tech Task: AI Coding Agent Observatory

## Goal

Build an observability platform for AI coding agents (Claude Code, Codex
CLI, Gemini CLI, etc.) that collects OpenTelemetry traces and metrics,
visualizes them in a local dashboard, and optionally deploys the
telemetry pipeline to AWS using Terraform.

The project should be designed as a **portfolio demonstration**,
prioritizing developer experience and low cloud costs over production
scalability.

## Objectives

-   Collect OpenTelemetry traces from AI coding agents.
-   Process telemetry locally via an OpenTelemetry Collector.
-   Store traces locally.
-   Display useful metrics in a dashboard.
-   Support an optional AWS deployment.
-   Keep AWS resources disabled unless explicitly deployed.

## Architecture

### Local Mode

``` text
Coding Agent
      |
      v
OpenTelemetry Collector
      |
+-----+------+
|            |
v            v
Local Storage Dashboard API
                 |
                 v
          Next.js Dashboard
```

Everything runs via Docker Compose.

### Cloud Mode

``` text
Coding Agent
      |
      v
OpenTelemetry Collector
      |
      v
 CloudWatch
      |
      v
 CloudWatch Dashboards

(Optional)

Lambda -> DynamoDB -> Next.js Dashboard
```

Deploy with Terraform and destroy after testing.

## Dashboard

Built with: - Next.js - React - TypeScript - Tailwind CSS - shadcn/ui

Pages: - Overview - Sessions - Timeline - Metrics - Leaderboard

## Local Storage

SQLite.

## OpenTelemetry

Collect traces, spans and metrics.

Track: - model - provider - latency - token usage - estimated cost -
tool invocations - files edited - tests executed - retries

Provide a telemetry simulator for agents lacking native telemetry.

## AWS

Terraform modules: - CloudWatch - IAM - Lambda (optional) - DynamoDB
(optional) - X-Ray (optional)

Requirements: - Local-first - No EC2/EKS/ECS - Serverless where
practical - terraform apply / destroy workflow

## Docker

Services: - Dashboard - OTel Collector - Telemetry Generator

Run with:

``` bash
docker compose up
```

## CI/CD

GitHub Actions: - lint - typecheck - test - build - validate Terraform

AWS deployment must require manual approval.

## Stretch Goals

-   Compare AI coding agents
-   Session replay
-   Mean Time to Green
-   Cost efficiency metrics
-   Jaeger / Grafana Tempo export
-   Live telemetry

## Success Criteria

1.  Clone repository.
2.  Run docker compose up.
3.  Open dashboard.
4.  View realistic telemetry locally.
5.  Deploy to AWS via Terraform.
6.  Verify CloudWatch/X-Ray.
7.  Destroy infrastructure.
