#!/bin/bash

AWS_REGION="us-east-1"
CLUSTER_NAME="logistics-cluster"
SERVICE_NAME="logistics-service"

echo "🔍 Checking deployment status..."

# Get service status
SERVICE_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}')
echo "Service Status:"
echo "$SERVICE_STATUS"

# Get running tasks
TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[]' --output text)

if [ -z "$TASK_ARNS" ]; then
    echo "⏳ Tasks are still starting up..."
    echo "📊 Check status: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services/$SERVICE_NAME"
    echo "📋 View logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Flogistics-platform"
else
    echo "🎯 Getting task details..."
    
    for TASK_ARN in $TASK_ARNS; do
        echo "Task: $TASK_ARN"
        
        # Get task details
        TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION)
        
        # Get ENI ID
        ENI_ID=$(echo "$TASK_DETAILS" | jq -r '.tasks[0].attachments[0].details[] | select(.name=="networkInterfaceId") | .value')
        
        if [ "$ENI_ID" != "null" ] && [ -n "$ENI_ID" ]; then
            # Get public IP
            PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
            
            if [ "$PUBLIC_IP" != "None" ] && [ -n "$PUBLIC_IP" ]; then
                echo "🌐 Application URL: http://$PUBLIC_IP"
                echo "🔧 Backend API: http://$PUBLIC_IP:5001"
            else
                echo "⏳ Public IP not yet assigned"
            fi
        else
            echo "⏳ Network interface not yet attached"
        fi
    done
fi

echo ""
echo "📊 Monitor deployment:"
echo "ECS Console: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services/$SERVICE_NAME"
echo "CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Flogistics-platform"
