#!/bin/bash

# Comprehensive Git Pull Script
# Purpose: Safely pull latest code and documentation from git with conflict detection
# Usage: ./scripts/git-pull.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Git Pull - Landscape Project${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current Branch:${NC} ${GREEN}$CURRENT_BRANCH${NC}\n"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}\n"
    echo -e "${YELLOW}Modified files:${NC}"
    git status --short
    echo ""
    read -p "Continue with pull? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Pull cancelled${NC}"
        exit 1
    fi
    echo ""
fi

# Fetch latest changes
echo -e "${BLUE}Fetching latest changes...${NC}"
git fetch origin

# Check if remote branch exists
if ! git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
    echo -e "${YELLOW}⚠️  Warning: Remote branch '$CURRENT_BRANCH' does not exist${NC}"
    echo -e "${YELLOW}Cannot pull from non-existent remote branch${NC}"
    exit 1
fi

# Check if there are changes to pull
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ $LOCAL = $REMOTE ]; then
    echo -e "${GREEN}✓ Already up to date${NC}"
    exit 0
elif [ $LOCAL = $BASE ]; then
    echo -e "${BLUE}Changes available from remote${NC}\n"

    # Show what will be pulled
    echo -e "${BLUE}Commits to be pulled:${NC}"
    git log --oneline --graph --decorate HEAD..@{u} --color=always
    echo ""

    # Show files that will change
    echo -e "${BLUE}Files that will change:${NC}"
    git diff --stat HEAD @{u}
    echo ""

    # Perform the pull
    echo -e "${BLUE}Pulling changes...${NC}"
    if git pull origin "$CURRENT_BRANCH"; then
        echo -e "\n${GREEN}✓ Pull successful!${NC}\n"

        # Show summary
        echo -e "${BLUE}Summary of changes:${NC}"
        git log --oneline --graph --decorate HEAD@{1}..HEAD --color=always
        echo ""

        # Check for documentation changes
        if git diff --name-only HEAD@{1}..HEAD | grep -q "^docs/\|README.md"; then
            echo -e "${GREEN}📚 Documentation was updated${NC}"
        fi

        # Check for backend changes
        if git diff --name-only HEAD@{1}..HEAD | grep -q "^backend/"; then
            echo -e "${YELLOW}⚠️  Backend code was updated - you may need to restart the server${NC}"
        fi

        # Check for frontend changes
        if git diff --name-only HEAD@{1}..HEAD | grep -q "^src/\|package.json"; then
            echo -e "${YELLOW}⚠️  Frontend code was updated - you may need to rebuild${NC}"
        fi

        # Check for migration files
        if git diff --name-only HEAD@{1}..HEAD | grep -q "migration\|\.sql$"; then
            echo -e "${YELLOW}⚠️  Database migrations detected - review before running${NC}"
        fi

        # Check for dependency changes
        if git diff --name-only HEAD@{1}..HEAD | grep -q "package.json\|requirements.txt\|Pipfile"; then
            echo -e "${YELLOW}⚠️  Dependencies changed - run npm install or pip install${NC}"
        fi

    else
        echo -e "\n${RED}✗ Pull failed${NC}"
        exit 1
    fi

elif [ $REMOTE = $BASE ]; then
    echo -e "${YELLOW}⚠️  Your local branch is ahead of remote${NC}"
    echo -e "${YELLOW}Use 'git push' to push your changes${NC}"
else
    echo -e "${RED}✗ Branches have diverged${NC}"
    echo -e "${RED}Local and remote have different commits${NC}\n"

    echo -e "${BLUE}Local commits not on remote:${NC}"
    git log --oneline --graph --decorate @{u}..HEAD --color=always
    echo ""

    echo -e "${BLUE}Remote commits not in local:${NC}"
    git log --oneline --graph --decorate HEAD..@{u} --color=always
    echo ""

    echo -e "${YELLOW}Options:${NC}"
    echo "  1. Pull with rebase: git pull --rebase origin $CURRENT_BRANCH"
    echo "  2. Pull with merge: git pull origin $CURRENT_BRANCH"
    echo "  3. Reset to remote (⚠️  loses local commits): git reset --hard origin/$CURRENT_BRANCH"
    echo ""

    read -p "Choose option (1/2/3) or 'c' to cancel: " -n 1 -r
    echo ""

    case $REPLY in
        1)
            echo -e "${BLUE}Pulling with rebase...${NC}"
            git pull --rebase origin "$CURRENT_BRANCH"
            echo -e "${GREEN}✓ Rebase successful${NC}"
            ;;
        2)
            echo -e "${BLUE}Pulling with merge...${NC}"
            git pull origin "$CURRENT_BRANCH"
            echo -e "${GREEN}✓ Merge successful${NC}"
            ;;
        3)
            echo -e "${RED}⚠️  This will discard your local commits!${NC}"
            read -p "Are you sure? Type 'yes' to confirm: " -r
            echo ""
            if [[ $REPLY == "yes" ]]; then
                git reset --hard origin/"$CURRENT_BRANCH"
                echo -e "${GREEN}✓ Reset to remote${NC}"
            else
                echo -e "${YELLOW}Cancelled${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${YELLOW}Cancelled${NC}"
            exit 1
            ;;
    esac
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Git pull complete${NC}"
echo -e "${BLUE}========================================${NC}\n"
