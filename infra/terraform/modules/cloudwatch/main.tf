resource "aws_cloudwatch_log_group" "otel" {
  name              = "/${var.project_name}/otel"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# Widget metric names must match the `metric_declarations` in
# infra/docker/otel-collector-cloud.yaml's awsemf exporter -- this is the
# main coupling point between the collector config and this dashboard.
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Cost (USD)"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            [var.metric_namespace, "claude_code.cost.usage", { stat = "Sum", label = "Claude Code cost" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Token usage"
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          metrics = [
            [var.metric_namespace, "claude_code.token.usage", { stat = "Sum", label = "Claude Code tokens" }],
            [var.metric_namespace, "gemini_cli.token.usage", { stat = "Sum", label = "Gemini CLI tokens" }],
            [var.metric_namespace, "codex.turn.token_usage", { stat = "Sum", label = "Codex CLI tokens" }]
          ]
          period = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          title  = "Recent telemetry volume"
          region = data.aws_region.current.name
          query  = "SOURCE '${aws_cloudwatch_log_group.otel.name}' | stats count(*) as records by bin(5m)"
          view   = "table"
        }
      }
    ]
  })
}

data "aws_region" "current" {}
