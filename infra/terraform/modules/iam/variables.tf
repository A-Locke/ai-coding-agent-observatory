variable "project_name" {
  type = string
}

variable "log_group_arn" {
  description = "ARN of the CloudWatch log group the collector writes to."
  type        = string
}

variable "enable_lambda" {
  type = bool
}

variable "enable_xray" {
  type = bool
}

variable "dynamodb_table_arn" {
  description = "ARN of the optional DynamoDB table the Lambda role should get write access to. Null when DynamoDB is disabled."
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
