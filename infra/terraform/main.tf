provider "aws" {
  region = var.aws_region
}

module "cloudwatch" {
  source             = "./modules/cloudwatch"
  project_name       = var.project_name
  log_retention_days = var.log_retention_days
  tags               = var.tags
}

module "iam" {
  source             = "./modules/iam"
  project_name       = var.project_name
  log_group_arn      = module.cloudwatch.log_group_arn
  enable_lambda      = var.enable_lambda
  enable_xray        = var.enable_xray
  dynamodb_table_arn = var.enable_dynamodb ? module.dynamodb[0].table_arn : null
  tags               = var.tags
}

module "dynamodb" {
  count        = var.enable_dynamodb ? 1 : 0
  source       = "./modules/dynamodb"
  project_name = var.project_name
  tags         = var.tags
}

module "lambda" {
  count               = var.enable_lambda ? 1 : 0
  source              = "./modules/lambda"
  project_name        = var.project_name
  log_group_name      = module.cloudwatch.log_group_name
  log_group_arn       = module.cloudwatch.log_group_arn
  dynamodb_table_name = var.enable_dynamodb ? module.dynamodb[0].table_name : ""
  lambda_role_arn     = module.iam.lambda_role_arn
  tags                = var.tags
}

module "xray" {
  count        = var.enable_xray ? 1 : 0
  source       = "./modules/xray"
  project_name = var.project_name
  tags         = var.tags
}
