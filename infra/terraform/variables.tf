variable "aws_region" {
  description = "AWS region to deploy the cloud-mode telemetry pipeline into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used as a prefix for every resource this project creates."
  type        = string
  default     = "ai-observatory"
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for the collector's log group. Kept short by default to control cost."
  type        = number
  default     = 14
}

variable "enable_lambda" {
  description = "Provision the optional Lambda function that fans out CloudWatch Logs into DynamoDB for a cloud-hosted dashboard. Off by default -- CloudWatch alone already satisfies the core success criteria. Only useful paired with enable_dynamodb = true; the function is created either way but has nothing to write to otherwise."
  type        = bool
  default     = false
}

variable "enable_dynamodb" {
  description = "Provision the optional DynamoDB table the Lambda writes into. Only meaningful when enable_lambda is also true."
  type        = bool
  default     = false
}

variable "enable_xray" {
  description = "Provision an X-Ray group + sampling rule for the collector's awsxray exporter."
  type        = bool
  default     = false
}

variable "enable_alarms" {
  description = "Provision CloudWatch alarms (cost, token usage, a composite alarm) and Logs Insights saved queries. Off by default. No SNS/notification channel -- see ADR 0001."
  type        = bool
  default     = false
}

variable "cost_alarm_threshold_usd" {
  description = "Hourly cost.usage sum that trips the high-cost alarm (only used when enable_alarms = true)."
  type        = number
  default     = 10
}

variable "token_alarm_threshold" {
  description = "Hourly token.usage sum that trips the high-token-usage alarm (only used when enable_alarms = true)."
  type        = number
  default     = 1000000
}

variable "tags" {
  description = "Tags applied to every resource this project creates."
  type        = map(string)
  default = {
    Project   = "ai-coding-agent-observatory"
    ManagedBy = "terraform"
  }
}
