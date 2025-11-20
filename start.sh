#!/bin/bash

echo "🚀 Starting Ultimate Real-Time Logistics Platform..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔄 Killing process on port $port (PID: $pid)"
        kill -9 $pid
        sleep 1
    fi
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
kill_port 3000
kill_port 3001
kill_port 5001

# Start ultimate backend server
echo "📡 Starting Fixed Backend Server with All Examples..."
cd logistics-backend && node fixed-server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server on port 3001
echo "🌐 Starting Ultimate Frontend Server..."
cd ../logistics-frontend && PORT=3001 npm start &
FRONTEND_PID=$!

echo "✅ Ultimate Platform started successfully!"
echo "📡 Backend API: http://localhost:5001"
echo "🌐 Frontend: http://localhost:3001"
echo ""
echo "🌟 Features:"
echo "   • 70+ World Cities Available"
echo "   • Real-time Package Tracking"
echo "   • Advanced Analytics Dashboard"
echo "   • Live WebSocket Updates"
echo "   • Persistent Data Storage"
echo "   • Beautiful Interactive Map"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Stopping Ultimate Platform..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill_port 3001
    kill_port 5001
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
