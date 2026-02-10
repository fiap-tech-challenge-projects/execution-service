output "iam_role_arn" {
  description = "IAM role ARN for execution service"
  value       = aws_iam_role.execution_service.arn
}

output "iam_role_name" {
  description = "IAM role name for execution service"
  value       = aws_iam_role.execution_service.name
}
