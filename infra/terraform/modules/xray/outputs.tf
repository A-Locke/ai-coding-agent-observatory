output "group_arn" {
  value = aws_xray_group.sessions.arn
}

output "sampling_rule_arn" {
  value = aws_xray_sampling_rule.default.arn
}
