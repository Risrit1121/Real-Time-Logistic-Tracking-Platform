#!/bin/bash

# AWS Deployment for Account: 685057748064
set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="685057748064"
CLUSTER_NAME="logistics-cluster"

echo "🚀 Deploying to AWS Account: $AWS_ACCOUNT_ID"
echo "📍 Region: $AWS_REGION"

# Check credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS credentials not configured"
    echo "Run: aws configure"
    echo "Or: aws login"
    exit 1
fi

# Create ECR repositories
echo "📦 Creating ECR repositories..."
aws ecr create-repository --repository-name logistics-backend --region $AWS_REGION 2>/dev/null || echo "Backend repo exists"
aws ecr create-repository --repository-name logistics-frontend --region $AWS_REGION 2>/dev/null || echo "Frontend repo exists"

# Build Docker images
echo "🔨 Building Docker images..."
docker build -f Dockerfile.backend -t logistics-backend .
docker build -f Dockerfile.frontend -t logistics-frontend .

# Tag images
echo "🏷️ Tagging images..."
docker tag logistics-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-backend:latest
docker tag logistics-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-frontend:latest

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Push images
echo "⬆️ Pushing images..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-frontend:latest

# Create ECS cluster
echo "🏗️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || echo "Cluster exists"

# Create CloudWatch log group
echo "📊 Creating logs..."
aws logs create-log-group --log-group-name /ecs/logistics-platform --region $AWS_REGION 2>/dev/null || echo "Log group exists"

# Update task definition
echo "📝 Creating task definition..."
cat > ecs-task-685057748064.json << EOF
{
  "family": "logistics-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::685057748064:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "redis",
      "image": "redis:7-alpine",
      "memory": 512,
      "essential": true,
      "portMappings": [{"containerPort": 6379, "protocol": "tcp"}],
      "command": ["redis-server", "--appendonly", "yes"],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/logistics-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "redis"
        }
      }
    },
    {
      "name": "backend",
      "image": "685057748064.dkr.ecr.us-east-1.amazonaws.com/logistics-backend:latest",
      "memory": 1024,
      "essential": true,
      "portMappings": [{"containerPort": 5001, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "REDIS_URL", "value": "redis://localhost:6379"}
      ],
      "dependsOn": [{"containerName": "redis", "condition": "START"}],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/logistics-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    },
    {
      "name": "frontend",
      "image": "685057748064.dkr.ecr.us-east-1.amazonaws.com/logistics-frontend:latest",
      "memory": 512,
      "essential": true,
      "portMappings": [{"containerPort": 80, "protocol": "tcp"}],
      "dependsOn": [{"containerName": "backend", "condition": "START"}],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/logistics-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    }
  ]
}
EOF

# Register task definition
echo "📋 Registering task definition..."
aws ecs register-task-definition --cli-input-json file://ecs-task-685057748064.json --region $AWS_REGION

echo "✅ Deployment ready!"
echo ""
echo "🎯 Next: Create ECS Service"
echo "1. Go to: https://console.aws.amazon.com/ecs/"
echo "2. Click 'logistics-cluster'"
echo "3. Create Service with 'logistics-platform' task"
echo ""
echo "🚀 Your logistics platform is ready to run!"

# Cleanup
rm -f ecs-task-685057748064.json
