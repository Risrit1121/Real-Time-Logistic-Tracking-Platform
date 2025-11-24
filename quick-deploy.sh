#!/bin/bash

# Quick AWS Deployment for Logistics Platform
set -e

echo "🚀 Quick AWS Deployment Starting..."

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first."
    exit 1
fi

# Configuration
AWS_REGION="us-east-1"
echo "📍 Using region: $AWS_REGION"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "🏢 Account ID: $AWS_ACCOUNT_ID"

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
echo "⬆️ Pushing images to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-frontend:latest

# Create ECS cluster
echo "🏗️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name logistics-cluster --region $AWS_REGION 2>/dev/null || echo "Cluster exists"

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /ecs/logistics-platform --region $AWS_REGION 2>/dev/null || echo "Log group exists"

# Update task definition
echo "📝 Updating task definition..."
sed "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" ecs-task-definition.json > ecs-task-definition-updated.json

# Register task definition
echo "📋 Registering task definition..."
aws ecs register-task-definition --cli-input-json file://ecs-task-definition-updated.json --region $AWS_REGION

echo "✅ Deployment completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to AWS ECS Console: https://console.aws.amazon.com/ecs/"
echo "2. Create a service using the 'logistics-platform' task definition"
echo "3. Configure Application Load Balancer for public access"
echo ""
echo "📊 Monitor logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Flogistics-platform"

# Cleanup
rm -f ecs-task-definition-updated.json

echo "🚀 Ready to deploy!"
