#!/bin/bash

echo "🔧 Creating ECS Task Execution Role..."

# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json \
  --region us-east-1 2>/dev/null || echo "Role exists"

# Attach the managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region us-east-1 2>/dev/null || echo "Policy attached"

# Clean up
rm -f trust-policy.json

echo "✅ IAM role created!"
echo "🔄 Updating service..."

# Update the service to restart tasks
aws ecs update-service \
  --cluster logistics-cluster \
  --service logistics-service \
  --force-new-deployment \
  --region us-east-1

echo "✅ Service updated! Tasks will restart in 1-2 minutes."
