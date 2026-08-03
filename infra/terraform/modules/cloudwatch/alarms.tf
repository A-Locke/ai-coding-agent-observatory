# Optional alarms + Logs Insights saved queries (var.enable_alarms). Kept in
# a separate file from main.tf's always-on log group/dashboard so the
# always-on vs. optional resources are easy to tell apart at a glance.
#
# No SNS topic / notification channel is created here on purpose -- that's
# real additional scope (topic, subscription, subscription confirmation)
# for a portfolio project's "local-first, minimal AWS footprint" goal.
# These alarms reach ALARM state and are visible in the console/API/CLI
# (`aws cloudwatch describe-alarms`), which is enough to demonstrate the
# capability without standing up a notification pipeline nobody's watching.

resource "aws_cloudwatch_metric_alarm" "high_cost" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-high-cost"
  alarm_description   = "Hourly claude_code.cost.usage sum exceeded the configured threshold."
  namespace           = var.metric_namespace
  metric_name         = "claude_code.cost.usage"
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cost_alarm_threshold_usd
  treat_missing_data  = "notBreaching"
  tags                = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_token_usage" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-high-token-usage"
  alarm_description   = "Hourly claude_code.token.usage sum exceeded the configured threshold."
  namespace           = var.metric_namespace
  metric_name         = "claude_code.token.usage"
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.token_alarm_threshold
  treat_missing_data  = "notBreaching"
  tags                = var.tags
}

resource "aws_cloudwatch_composite_alarm" "any_alert" {
  count = var.enable_alarms ? 1 : 0

  alarm_name        = "${var.project_name}-any-alert"
  alarm_description = "Fires when either the cost or token-usage alarm is in ALARM state."
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.high_cost[0].alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.high_token_usage[0].alarm_name})",
  ])
  tags = var.tags
}

resource "aws_cloudwatch_query_definition" "recent_errors" {
  count = var.enable_alarms ? 1 : 0

  name            = "${var.project_name}/recent-errors"
  log_group_names = [aws_cloudwatch_log_group.otel.name]
  query_string    = <<-QUERY
    fields @timestamp, @message
    | filter @message like /error/
    | sort @timestamp desc
    | limit 50
  QUERY
}

resource "aws_cloudwatch_query_definition" "tool_usage_by_name" {
  count = var.enable_alarms ? 1 : 0

  name            = "${var.project_name}/tool-usage-by-name"
  log_group_names = [aws_cloudwatch_log_group.otel.name]
  query_string    = <<-QUERY
    fields attributes.tool_name as tool
    | filter ispresent(attributes.tool_name)
    | stats count(*) as calls by tool
    | sort calls desc
  QUERY
}
