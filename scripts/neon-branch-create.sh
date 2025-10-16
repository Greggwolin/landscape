#!/bin/bash
# Neon Branch Creation for PR Previews
# Version: v1.0 (2025-10-13)
#
# Creates ephemeral Neon database branch for PR preview environments
# Usage: ./scripts/neon-branch-create.sh <PR_NUMBER>

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

echo "🚀 Creating Neon branch for PR #${PR_NUMBER}..."

# Check if branch already exists
EXISTING_BRANCH=$(neonctl branches list \
  --project-id "$NEON_PROJECT" \
  --output json \
  | jq -r ".[] | select(.name == \"$BRANCH_NAME\") | .id" || echo "")

if [ -n "$EXISTING_BRANCH" ]; then
  echo "⚠️  Branch $BRANCH_NAME already exists (ID: $EXISTING_BRANCH)"
  echo "Using existing branch..."
  BRANCH_ID=$EXISTING_BRANCH
else
  # Create new branch from main
  echo "📝 Creating branch $BRANCH_NAME from main..."
  BRANCH_RESPONSE=$(neonctl branches create \
    --project-id "$NEON_PROJECT" \
    --name "$BRANCH_NAME" \
    --parent main \
    --output json)

  BRANCH_ID=$(echo "$BRANCH_RESPONSE" | jq -r '.id')
  echo "✅ Branch created: $BRANCH_ID"
fi

# Get connection string
echo "🔗 Retrieving connection string..."
CONNECTION_STRING=$(neonctl connection-string \
  --project-id "$NEON_PROJECT" \
  --branch "$BRANCH_NAME" \
  --role landscape_app \
  --database land_v2 \
  --pooled)

# Output for GitHub Actions
echo "PREVIEW_DATABASE_URL=$CONNECTION_STRING" >> "$GITHUB_OUTPUT"
echo "NEON_BRANCH_ID=$BRANCH_ID" >> "$GITHUB_OUTPUT"
echo "NEON_BRANCH_NAME=$BRANCH_NAME" >> "$GITHUB_OUTPUT"

# Tag branch with PR metadata
neonctl branches set-primary \
  --project-id "$NEON_PROJECT" \
  --branch "$BRANCH_NAME" \
  false || true

echo ""
echo "✅ Neon branch ready!"
echo "   Branch Name: $BRANCH_NAME"
echo "   Branch ID: $BRANCH_ID"
echo "   Connection: ${CONNECTION_STRING:0:50}..." # Show partial for security
echo ""
echo "Next steps:"
echo "1. Run migrations: ./scripts/run-migrations.sh $BRANCH_NAME"
echo "2. Seed fixtures: ./scripts/seed-fixtures.sh $BRANCH_NAME"
echo "3. Deploy to Vercel preview"
