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
# Force ANTHROPIC_API_KEY from .env file (override shell environment)
NEW_KEY=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d'=' -f2)
nohup env -u DEBUG ANTHROPIC_API_KEY="$NEW_KEY" python manage.py runserver 8000 >> logs/django.log 2>&1 &
DJANGO_PID=$!

# Start Next.js in detached background
cd "$SCRIPT_DIR"
nohup npm run dev > /tmp/landscape-next.log 2>&1 &
NEXT_PID=$!

wait_for_port() {
  local port=$1
  local max_attempts=$2
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if lsof -i :"$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  return 1
}

# Verify processes started
ERRORS=""

if ! wait_for_port 8000 15; then
  ERRORS="${ERRORS}❌ Django failed to start. Check backend/logs/django.log\n"
fi

if ! wait_for_port 3000 20; then
  ERRORS="${ERRORS}❌ Next.js failed to start. Check /tmp/landscape-next.log\n"
fi

if [ -n "$ERRORS" ]; then
  echo -e "$ERRORS"
  exit 1
fi

echo "🎉 All servers are running!"
