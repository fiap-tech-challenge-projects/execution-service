# IRSA Role for Execution Service
resource "aws_iam_role" "execution_service" {
  name = "fiap-execution-service-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:ftc-app-${var.environment}:${var.service_account_name}"
            "${replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "fiap-execution-service-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Policy for DocumentDB access
resource "aws_iam_role_policy" "documentdb_access" {
  name = "documentdb-access"
  role = aws_iam_role.execution_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances"
        ]
        Resource = [
          "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster:fiap-documentdb-${var.environment}",
          "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:db:fiap-documentdb-${var.environment}-*"
        ]
      }
    ]
  })
}

# Policy for EventBridge access
resource "aws_iam_role_policy" "eventbridge_access" {
  name = "eventbridge-access"
  role = aws_iam_role.execution_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = [
          "arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:event-bus/fiap-tech-challenge-event-bus"
        ]
      }
    ]
  })
}

# Policy for SQS access (for event consumers)
resource "aws_iam_role_policy" "sqs_access" {
  name = "sqs-access"
  role = aws_iam_role.execution_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          "arn:aws:sqs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:fiap-execution-*"
        ]
      }
    ]
  })
}
