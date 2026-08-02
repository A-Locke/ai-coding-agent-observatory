output "log_group_name" {
  description = "CloudWatch log group the collector's cloud config should point at."
  value       = module.cloudwatch.log_group_name
}

output "dashboard_url" {
  description = "Console URL for the CloudWatch dashboard created by this stack."
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${module.cloudwatch.dashboard_name}"
}

output "collector_iam_user_name" {
  description = "Run `aws iam create-access-key --user-name <this>` once, then put the resulting keys in .env for cloud-mode collector runs."
  value       = module.iam.collector_user_name
}

output "dynamodb_table_name" {
  value = var.enable_dynamodb ? module.dynamodb[0].table_name : null
}

output "lambda_function_name" {
  value = var.enable_lambda ? module.lambda[0].function_name : null
}

output "xray_group_arn" {
  value = var.enable_xray ? module.xray[0].group_arn : null
}
