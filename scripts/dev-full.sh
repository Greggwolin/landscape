#!/usr/bin/env bash

# Helper script to start both the Django backend and Next.js frontend together.
# Usage: npm run dev:full

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_CMD="python3"
if ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi

if ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
  echo "Error: python interpreter not found (tried python3 and python)." >&2
  exit 1
fi

DJANGO_PID=""

cleanup() {
  if [[ -n "$DJANGO_PID" ]] && ps -p "$DJANGO_PID" >/dev/null 2>&1; then
    echo "Stopping Django backend (PID $DJANGO_PID)..."
    kill "$DJANGO_PID" >/dev/null 2>&1 || true
    wait "$DJANGO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting Django backend on http://localhost:8001 ..."
cd "$ROOT_DIR/backend"
if [[ -f "venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi
"$PYTHON_CMD" manage.py runserver 0.0.0.0:8001 &
DJANGO_PID=$!
cd "$ROOT_DIR"

# Give the backend a moment to boot so first frontend requests succeed.
sleep 2

echo "Starting Next.js frontend (http://localhost:3000)..."
echo "Press Ctrl+C to stop both servers."
env NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8001}" npm run dev
