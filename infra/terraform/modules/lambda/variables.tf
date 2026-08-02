variable "project_name" {
  type = string
}

variable "log_group_name" {
  type = string
}

variable "log_group_arn" {
  type = string
}

variable "dynamodb_table_name" {
  type = string
}

variable "lambda_role_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
