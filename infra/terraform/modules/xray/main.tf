resource "aws_xray_group" "sessions" {
  group_name        = "${var.project_name}-sessions"
  filter_expression = "service(\"claude-code\") OR service(\"gemini-cli\") OR service(\"codex-cli\")"
  tags              = var.tags
}

# Conservative default: trace 1 request/sec fully, then sample 10% of the
# rest. Cheap to run continuously; tune after seeing real volume.
resource "aws_xray_sampling_rule" "default" {
  rule_name      = "${var.project_name}-default"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
  tags           = var.tags
}
