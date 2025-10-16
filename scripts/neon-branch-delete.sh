#!/bin/bash
# Neon Branch Deletion for PR Cleanup
# Version: v1.0 (2025-10-13)
#
# Deletes ephemeral Neon database branch when PR is closed/merged
# Usage: ./scripts/neon-branch-delete.sh <PR_NUMBER>

set -e

PR_NUMBER=$1
NEON_PROJECT=${NEON_PROJECT_ID}
BRANCH_NAME="pr-${PR_NUMBER}"

if [ -z "$PR_NUMBER" ]; then
  echo "❌ Error: PR number required"
  echo "Usage: $0 <PR_NUMBER>"
  exit 1
fi

if [ -z "$NEON_PROJECT" ]; then
  echo "❌ Error: NEON_PROJECT_ID environment variable not set"
  exit 1
fi

if [ -z "$NEON_API_KEY" ]; then
  echo "❌ Error: NEON_API_KEY environment variable not set"
  exit 1
fi

echo "🗑️  Deleting Neon branch for PR #${PR_NUMBER}..."

# Check if branch exists
BRANCH_ID=$(neonctl branches list \
  --project-id "$NEON_PROJECT" \
  --output json \
  | jq -r ".[] | select(.name == \"$BRANCH_NAME\") | .id" || echo "")

if [ -z "$BRANCH_ID" ]; then
  echo "⚠️  Branch $BRANCH_NAME not found. Already deleted?"
  exit 0
fi

echo "📝 Found branch: $BRANCH_ID"

# Delete branch
neonctl branches delete \
  --project-id "$NEON_PROJECT" \
  --branch "$BRANCH_NAME" \
  --yes

echo "✅ Branch $BRANCH_NAME deleted successfully!"
echo "   Branch ID: $BRANCH_ID"
