# Dedicated IAM user for the OTel Collector's AWS exporters (awsemf,
# awsxray). Deliberately no aws_iam_access_key resource here -- that would
# write a long-lived secret into Terraform state, which is a real risk even
# for a demo given local state (ADR 0001, D9). Create the key manually once:
#   aws iam create-access-key --user-name <output.collector_user_name>
#
# force_destroy = true because that access key is created out-of-band (see
# above) -- AWS refuses to delete a user with an active access key still
# attached, and Terraform has no way to know about a key it didn't create.
# Without this, `terraform destroy` fails with DeleteConflict.
resource "aws_iam_user" "collector" {
  name          = "${var.project_name}-collector"
  force_destroy = true
  tags          = var.tags
}

data "aws_iam_policy_document" "collector_exporter" {
  statement {
    sid    = "WriteCollectorLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = [
      var.log_group_arn,
      "${var.log_group_arn}:*",
    ]
  }

  statement {
    sid       = "WriteEmfMetrics"
    effect    = "Allow"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["AIObservatory"]
    }
  }

  dynamic "statement" {
    for_each = var.enable_xray ? [1] : []
    content {
      sid    = "WriteXraySegments"
      effect = "Allow"
      actions = [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "xray:GetSamplingStatisticSummaries",
      ]
      resources = ["*"]
    }
  }
}

resource "aws_iam_policy" "collector_exporter" {
  name   = "${var.project_name}-collector-exporter"
  policy = data.aws_iam_policy_document.collector_exporter.json
  tags   = var.tags
}

resource "aws_iam_user_policy_attachment" "collector_exporter" {
  user       = aws_iam_user.collector.name
  policy_arn = aws_iam_policy.collector_exporter.arn
}

# --- Optional Lambda execution role (only created when enable_lambda) ---

data "aws_iam_policy_document" "lambda_assume" {
  count = var.enable_lambda ? 1 : 0
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  count              = var.enable_lambda ? 1 : 0
  name               = "${var.project_name}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume[0].json
  tags               = var.tags
}

data "aws_iam_policy_document" "lambda_permissions" {
  count = var.enable_lambda ? 1 : 0

  statement {
    sid    = "LambdaOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:log-group:/aws/lambda/${var.project_name}-*"]
  }

  statement {
    sid       = "ReadCollectorLogs"
    effect    = "Allow"
    actions   = ["logs:FilterLogEvents", "logs:GetLogEvents"]
    resources = [var.log_group_arn, "${var.log_group_arn}:*"]
  }

  dynamic "statement" {
    for_each = var.dynamodb_table_arn != null ? [1] : []
    content {
      sid       = "WriteDynamoDb"
      effect    = "Allow"
      actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
      resources = [var.dynamodb_table_arn]
    }
  }
}

resource "aws_iam_role_policy" "lambda_permissions" {
  count  = var.enable_lambda ? 1 : 0
  name   = "${var.project_name}-lambda-permissions"
  role   = aws_iam_role.lambda_exec[0].id
  policy = data.aws_iam_policy_document.lambda_permissions[0].json
}
