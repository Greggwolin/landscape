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

# Start Django in background
cd backend
source venv/bin/activate
python manage.py runserver 8000 > /dev/null 2>&1 &

echo "✅ Django running on http://localhost:8000"
echo ""
echo "🚀 Starting Next.js frontend..."

# Start Next.js in background (back to project root)
cd "$SCRIPT_DIR"
npm run dev > /dev/null 2>&1 &

echo "✅ Next.js running on http://localhost:3000"
echo ""
echo "🎉 All servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
