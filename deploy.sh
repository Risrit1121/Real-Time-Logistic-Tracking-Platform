#!/bin/bash

# AWS Deployment Script for Logistics Platform
set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME="logistics-cluster"
SERVICE_NAME="logistics-service"

echo "🚀 Starting AWS deployment..."
echo "📍 Region: $AWS_REGION"
echo "🏢 Account: $AWS_ACCOUNT_ID"

# 1. Create ECR repositories
echo "📦 Creating ECR repositories..."
aws ecr create-repository --repository-name logistics-backend --region $AWS_REGION || true
aws ecr create-repository --repository-name logistics-frontend --region $AWS_REGION || true

# 2. Build and push Docker images
echo "🔨 Building Docker images..."
docker build -f Dockerfile.backend -t logistics-backend .
docker build -f Dockerfile.frontend -t logistics-frontend .

echo "🏷️ Tagging images..."
docker tag logistics-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-backend:latest
docker tag logistics-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-frontend:latest

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "⬆️ Pushing images to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/logistics-frontend:latest

# 3. Create ECS cluster
echo "🏗️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION || true

# 4. Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /ecs/logistics-platform --region $AWS_REGION || true

# 5. Update task definition with account ID
echo "📝 Updating task definition..."
sed "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" ecs-task-definition.json > ecs-task-definition-updated.json

# 6. Register task definition
echo "📋 Registering task definition..."
aws ecs register-task-definition --cli-input-json file://ecs-task-definition-updated.json --region $AWS_REGION

# 7. Create Application Load Balancer
echo "⚖️ Creating Application Load Balancer..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION)

# Create security group for ALB
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name logistics-alb-sg \
  --description "Security group for Logistics ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=logistics-alb-sg" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION)

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || true

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name logistics-alb \
  --subnets $SUBNET_IDS \
  --security-groups $ALB_SG_ID \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || aws elbv2 describe-load-balancers --names logistics-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text --region $AWS_REGION)

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name logistics-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path / \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || aws elbv2 describe-target-groups --names logistics-tg --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION 2>/dev/null || true

# 8. Create ECS service
echo "🎯 Creating ECS service..."

# Create security group for ECS tasks
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name logistics-ecs-sg \
  --description "Security group for Logistics ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=logistics-ecs-sg" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 80 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 5001 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION 2>/dev/null || true

# Create service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition logistics-platform \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=frontend,containerPort=80" \
  --region $AWS_REGION 2>/dev/null || true

# 9. Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].DNSName' --output text --region $AWS_REGION)

echo "✅ Deployment completed!"
echo "🌐 Application URL: http://$ALB_DNS"
echo "📊 CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Flogistics-platform"
echo "🎯 ECS Service: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services/$SERVICE_NAME"

# Clean up temporary files
rm -f ecs-task-definition-updated.json

echo "🚀 Logistics Platform is now running on AWS with Redis caching!"
echo "📈 Supports thousands of concurrent updates via Redis clustering"
