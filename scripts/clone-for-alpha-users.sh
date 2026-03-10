#!/bin/bash
# Clone Project 17 (Chadron Terrace) for alpha test users
# Run from project root: ./scripts/clone-for-alpha-users.sh

set -e

DJANGO_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

echo "=== Cloning Project 17 for alpha users ==="
echo ""

# Clone for ballclub
echo "--- ballclub ---"
cd "$DJANGO_DIR"
./venv/bin/python manage.py clone_demo_projects ballclub --project chadron --force
echo ""

# Clone for gernblanston
echo "--- gernblanston ---"
./venv/bin/python manage.py clone_demo_projects gernblanston --project chadron --force
echo ""

echo "=== Done ==="
