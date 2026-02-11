#!/bin/bash

# Landscape Server Restart Script
# Kills all running servers and restarts Django and Next.js

echo "🛑 Stopping all servers..."

# Kill processes on ports 3000 and 8000
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

echo "✅ Servers stopped"
echo ""
echo "🚀 Starting Django backend..."

# Get the script's directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start Django in detached background (logs to backend/logs/django.log)
cd backend
mkdir -p logs
source venv/bin/activate
nohup python manage.py runserver 8000 >> logs/django.log 2>&1 &

echo "✅ Django running on http://localhost:8000"
echo ""
echo "🚀 Starting Next.js frontend..."

# Start Next.js in detached background (back to project root)
cd "$SCRIPT_DIR"
nohup npm run dev > /dev/null 2>&1 &

echo "✅ Next.js running on http://localhost:3000"
echo ""
echo "🎉 All servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"

# Quick readiness check (best effort)
sleep 2
if curl -s "http://127.0.0.1:8000/" > /dev/null 2>&1; then
  echo "✅ Backend health check passed"
else
  echo "⚠️  Backend not reachable yet (may still be starting)"
fi

if curl -s "http://127.0.0.1:3000/" > /dev/null 2>&1; then
  echo "✅ Frontend health check passed"
else
  echo "⚠️  Frontend not reachable yet (may still be starting)"
fi
