#!/bin/bash

# Create ECS Service
AWS_REGION="us-east-1"
CLUSTER_NAME="logistics-cluster"
SERVICE_NAME="logistics-service"

echo "🎯 Creating ECS Service..."

# Get default VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION | tr '\t' ',')

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNET_IDS"

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name logistics-sg \
  --description "Security group for Logistics Platform" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $AWS_REGION 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=logistics-sg" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION)

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || echo "HTTP rule exists"

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5001 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || echo "Backend rule exists"

# Create ECS service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition logistics-platform \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION

echo "✅ Service created!"
echo "🌐 Check ECS Console: https://console.aws.amazon.com/ecs/"
