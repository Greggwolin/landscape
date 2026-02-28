#!/bin/bash

# Landscape Server Restart Script
# Kills all running servers and restarts Django and Next.js

# Kill processes on ports 3000 and 8000
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Get the script's directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start Django in detached background
cd backend
mkdir -p logs
source venv/bin/activate
nohup python manage.py runserver 8000 >> logs/django.log 2>&1 &
DJANGO_PID=$!

# Start Next.js in detached background
cd "$SCRIPT_DIR"
nohup npm run dev > /dev/null 2>&1 &
NEXT_PID=$!

# Verify processes started
sleep 1
ERRORS=""

if ! kill -0 $DJANGO_PID 2>/dev/null; then
  ERRORS="${ERRORS}❌ Django failed to start. Check backend/logs/django.log\n"
fi

if ! kill -0 $NEXT_PID 2>/dev/null; then
  ERRORS="${ERRORS}❌ Next.js failed to start.\n"
fi

if [ -n "$ERRORS" ]; then
  echo -e "$ERRORS"
  exit 1
fi

echo "🎉 All servers are running!"
