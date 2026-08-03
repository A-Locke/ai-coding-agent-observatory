variable "project_name" {
  type = string
}

variable "log_retention_days" {
  type = number
}

variable "metric_namespace" {
  description = "Namespace the collector's awsemf exporter publishes custom metrics under. Must match infra/docker/otel-collector-cloud.yaml."
  type        = string
  default     = "AIObservatory"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_alarms" {
  description = "Provision CloudWatch alarms + a composite alarm on cost/token metrics, and Logs Insights saved queries. Off by default -- no SNS/notification channel is wired up (that's a bigger scope step); alarms just reach ALARM state, visible in the console/API. See ADR 0001."
  type        = bool
  default     = false
}

variable "cost_alarm_threshold_usd" {
  description = "Hourly cost.usage sum that trips the high-cost alarm."
  type        = number
  default     = 10
}

variable "token_alarm_threshold" {
  description = "Hourly token.usage sum that trips the high-token-usage alarm."
  type        = number
  default     = 1000000
}
