output "log_group_name" {
  value = aws_cloudwatch_log_group.otel.name
}

output "log_group_arn" {
  value = aws_cloudwatch_log_group.otel.arn
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.main.dashboard_name
}
