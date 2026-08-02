terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state deliberately -- see ADR 0001, D9. This is a single-operator
  # apply/destroy demo cycle, not a long-lived team-shared stack.
}
