# Single-table design: PK groups records by session, SK distinguishes the
# session summary row from individual event rows within it. On-demand
# billing (no capacity planning) and a TTL attribute so demo data doesn't
# accumulate cost indefinitely if the stack is left running.
resource "aws_dynamodb_table" "telemetry" {
  name         = "${var.project_name}-telemetry"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sessionId"
  range_key    = "recordKey"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "recordKey"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = var.tags
}
