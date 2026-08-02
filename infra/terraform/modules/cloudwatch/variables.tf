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
