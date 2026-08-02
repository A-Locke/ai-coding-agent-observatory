output "collector_user_name" {
  description = "Run `aws iam create-access-key --user-name <this>` to mint credentials for the collector's cloud exporters."
  value       = aws_iam_user.collector.name
}

output "collector_user_arn" {
  value = aws_iam_user.collector.arn
}

output "lambda_role_arn" {
  value = var.enable_lambda ? aws_iam_role.lambda_exec[0].arn : null
}
