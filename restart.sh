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

# Start Django in background
cd /Users/5150east/landscape/backend
source venv/bin/activate
python manage.py runserver 8000 > /dev/null 2>&1 &

echo "✅ Django running on http://localhost:8000"
echo ""
echo "🚀 Starting Next.js frontend..."

# Start Next.js in background
cd /Users/5150east/landscape
npm run dev > /dev/null 2>&1 &

echo "✅ Next.js running on http://localhost:3000"
echo ""
echo "🎉 All servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
