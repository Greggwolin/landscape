#!/bin/bash

# Auto-commit script for landscape project
# Saves work every 15 minutes with timestamp

# Get the project directory (where this script is located)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository"
    exit 1
fi

# Check if there are any changes to commit (including untracked files)
if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "No changes to commit at $(date)"
    exit 0
fi

# Add all changes
git add -A

# Create commit message with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="Auto-commit: Save work progress - $TIMESTAMP"

# Commit the changes
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo "Auto-commit successful at $TIMESTAMP"

    # Optionally push to remote (uncomment if you want auto-push)
    # git push origin main
else
    echo "Auto-commit failed at $TIMESTAMP"
    exit 1
fi