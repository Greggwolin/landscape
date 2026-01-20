#!/bin/bash

# Comprehensive Git Push Script
# Purpose: Stage all changes, create/update session notes, commit, and push to git
# Usage: ./scripts/git-push.sh [commit message]
#        If no message provided, will prompt for one

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SESSION_NOTES_DIR="$PROJECT_ROOT/docs/session-notes"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Git Push - Landscape Project${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current Branch:${NC} ${GREEN}$CURRENT_BRANCH${NC}\n"

# Check for changes
if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# Show what will be committed
echo -e "${BLUE}Changes to be committed:${NC}\n"

# Show staged changes
STAGED=$(git diff --cached --name-only)
if [ -n "$STAGED" ]; then
    echo -e "${GREEN}Staged files:${NC}"
    echo "$STAGED" | while read file; do echo "  + $file"; done
    echo ""
fi

# Show unstaged changes
UNSTAGED=$(git diff --name-only)
if [ -n "$UNSTAGED" ]; then
    echo -e "${YELLOW}Modified files (unstaged):${NC}"
    echo "$UNSTAGED" | while read file; do echo "  ~ $file"; done
    echo ""
fi

# Show untracked files
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
    echo -e "${CYAN}Untracked files:${NC}"
    echo "$UNTRACKED" | while read file; do echo "  ? $file"; done
    echo ""
fi

# Get commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    echo -e "${BLUE}Enter commit message (or press Enter for auto-generated):${NC}"
    read -r COMMIT_MSG
fi

# Auto-generate commit message if empty
if [ -z "$COMMIT_MSG" ]; then
    # Count changes by type
    BACKEND_CHANGES=$(git diff --name-only HEAD; git ls-files --others --exclude-standard)
    BACKEND_COUNT=$(echo "$BACKEND_CHANGES" | grep -c "^backend/" || true)
    FRONTEND_COUNT=$(echo "$BACKEND_CHANGES" | grep -c "^src/" || true)
    DOCS_COUNT=$(echo "$BACKEND_CHANGES" | grep -c "^docs/\|README" || true)

    # Build commit message based on what changed
    if [ "$BACKEND_COUNT" -gt 0 ] && [ "$FRONTEND_COUNT" -gt 0 ]; then
        COMMIT_MSG="WIP $(date '+%Y-%m-%d %H:%M:%S')"
    elif [ "$BACKEND_COUNT" -gt 0 ]; then
        COMMIT_MSG="backend: WIP $(date '+%Y-%m-%d %H:%M:%S')"
    elif [ "$FRONTEND_COUNT" -gt 0 ]; then
        COMMIT_MSG="frontend: WIP $(date '+%Y-%m-%d %H:%M:%S')"
    elif [ "$DOCS_COUNT" -gt 0 ]; then
        COMMIT_MSG="docs: WIP $(date '+%Y-%m-%d %H:%M:%S')"
    else
        COMMIT_MSG="WIP $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    echo -e "${YELLOW}Using auto-generated message: ${NC}$COMMIT_MSG"
fi

# Create/update session notes
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Find existing session note for today
EXISTING_NOTE=$(ls "$SESSION_NOTES_DIR"/$TODAY-*.md 2>/dev/null | head -1 || true)

# Collect file change information
ALL_CHANGES=$(git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard)
BACKEND_FILES=$(echo "$ALL_CHANGES" | grep "^backend/" || true)
FRONTEND_FILES=$(echo "$ALL_CHANGES" | grep "^src/" || true)
DOCS_FILES=$(echo "$ALL_CHANGES" | grep "^docs/\|README" || true)
OTHER_FILES=$(echo "$ALL_CHANGES" | grep -v "^backend/\|^src/\|^docs/\|README" || true)

# Create session note content
create_session_entry() {
    local entry=""
    entry+="## Git Push: $TIMESTAMP\n\n"
    entry+="**Commit Message:** $COMMIT_MSG\n"
    entry+="**Branch:** $CURRENT_BRANCH\n\n"

    if [ -n "$BACKEND_FILES" ]; then
        entry+="### Backend Files\n"
        echo "$BACKEND_FILES" | while read f; do echo "- \`$f\`"; done
        entry+="\n"
    fi

    if [ -n "$FRONTEND_FILES" ]; then
        entry+="### Frontend Files\n"
        echo "$FRONTEND_FILES" | while read f; do echo "- \`$f\`"; done
        entry+="\n"
    fi

    if [ -n "$DOCS_FILES" ]; then
        entry+="### Documentation Files\n"
        echo "$DOCS_FILES" | while read f; do echo "- \`$f\`"; done
        entry+="\n"
    fi

    if [ -n "$OTHER_FILES" ]; then
        entry+="### Other Files\n"
        echo "$OTHER_FILES" | while read f; do echo "- \`$f\`"; done
        entry+="\n"
    fi

    entry+="---\n\n"
    echo -e "$entry"
}

if [ -n "$EXISTING_NOTE" ]; then
    echo -e "${BLUE}Updating existing session note:${NC} $EXISTING_NOTE"

    # Append to existing session note
    {
        echo ""
        echo "## Git Push: $TIMESTAMP"
        echo ""
        echo "**Commit Message:** $COMMIT_MSG"
        echo "**Branch:** $CURRENT_BRANCH"
        echo ""

        if [ -n "$BACKEND_FILES" ]; then
            echo "### Backend Files Changed"
            echo "$BACKEND_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$FRONTEND_FILES" ]; then
            echo "### Frontend Files Changed"
            echo "$FRONTEND_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$DOCS_FILES" ]; then
            echo "### Documentation Files Changed"
            echo "$DOCS_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$OTHER_FILES" ]; then
            echo "### Other Files Changed"
            echo "$OTHER_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        echo "---"
    } >> "$EXISTING_NOTE"
else
    # Create new session note
    # Extract topic from commit message (first word after prefix, or first significant word)
    TOPIC=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*: //' | awk '{print $1}' | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')
    [ -z "$TOPIC" ] && TOPIC="session"

    NEW_NOTE="$SESSION_NOTES_DIR/$TODAY-$TOPIC.md"
    echo -e "${BLUE}Creating new session note:${NC} $NEW_NOTE"

    {
        echo "# Session Notes: $(date '+%B %d, %Y')"
        echo ""
        echo "**Date:** $TODAY"
        echo "**Branch:** $CURRENT_BRANCH"
        echo ""
        echo "---"
        echo ""
        echo "## Git Push: $TIMESTAMP"
        echo ""
        echo "**Commit Message:** $COMMIT_MSG"
        echo "**Branch:** $CURRENT_BRANCH"
        echo ""

        if [ -n "$BACKEND_FILES" ]; then
            echo "### Backend Files Changed"
            echo "$BACKEND_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$FRONTEND_FILES" ]; then
            echo "### Frontend Files Changed"
            echo "$FRONTEND_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$DOCS_FILES" ]; then
            echo "### Documentation Files Changed"
            echo "$DOCS_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        if [ -n "$OTHER_FILES" ]; then
            echo "### Other Files Changed"
            echo "$OTHER_FILES" | while read f; do [ -n "$f" ] && echo "- \`$f\`"; done
            echo ""
        fi

        echo "---"
    } > "$NEW_NOTE"

    EXISTING_NOTE="$NEW_NOTE"
fi

echo ""

# Stage all changes
echo -e "${BLUE}Staging all changes...${NC}"
git add -A

# Also stage the session note we just created/updated
git add "$EXISTING_NOTE"

# Commit
echo -e "${BLUE}Committing...${NC}"
git commit -m "$COMMIT_MSG"

# Check if remote branch exists
if git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
    echo -e "${BLUE}Pushing to origin/$CURRENT_BRANCH...${NC}"
    git push origin "$CURRENT_BRANCH"
else
    echo -e "${YELLOW}Remote branch doesn't exist. Creating and pushing...${NC}"
    git push -u origin "$CURRENT_BRANCH"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Git push complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  Branch: $CURRENT_BRANCH"
echo -e "  Commit: $COMMIT_MSG"
echo -e "  Session Note: $EXISTING_NOTE"
echo ""

# Show the commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
echo -e "${GREEN}Commit hash:${NC} $COMMIT_HASH"
echo ""
