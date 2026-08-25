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

# HOW LONG A PREVIEW DATABASE LIVES
# ---------------------------------
# Every preview branch is a ROOT branch, because --schema-only branches are
# roots — that is the June 2026 privacy fix (previews must carry no real tester
# data) and it is not negotiable. Neon caps ROOT branches by plan, and this
# account is on Launch: five. So each concurrently-open pull request holds one
# of five slots, and on 2026-08-25 creation for PR #263 was rejected outright
# with "root branches limit exceeded".
#
# The sweep in .github/workflows/neon-branch-sweep.yml reclaims slots from
# CLOSED requests. It can do nothing about requests that are legitimately open,
# which is where the pressure actually comes from.
#
# So the branch expires on its own. Three days: long enough for a request opened
# and reviewed in a normal turnaround to keep its preview, short enough that one
# parked for a week stops holding a slot. Deliberately NOT the Console's 1-day
# default — several of these sit two or three days waiting to be run.
#
# When it fires, Neon deletes the branch. The next push recreates it, because
# the existence check below treats an absent branch as "create one" — an expired
# preview costs a rebuild, not a red check.
TTL_DAYS=3
# GNU date (ubuntu-latest, where this actually runs) and BSD date (a developer's
# Mac) spell relative dates differently and neither accepts the other's form.
EXPIRES_AT=$(date -u -d "+${TTL_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v+${TTL_DAYS}d +%Y-%m-%dT%H:%M:%SZ)

echo "🚀 Creating Neon branch for PR #${PR_NUMBER}..."

# Check if branch already exists
BRANCHES_JSON=$(neonctl branches list --project-id "$NEON_PROJECT" --output json)
EXISTING_BRANCH=$(echo "$BRANCHES_JSON" \
  | jq -r ".[] | select(.name == \"$BRANCH_NAME\") | .id" || echo "")

if [ -n "$EXISTING_BRANCH" ]; then
  echo "⚠️  Branch $BRANCH_NAME already exists (ID: $EXISTING_BRANCH)"
  echo "Using existing branch..."
  BRANCH_ID=$EXISTING_BRANCH
  # Print the expiry it is already carrying, so a preview that later vanishes is
  # explained by its own log rather than investigated from scratch.
  EXISTING_EXPIRY=$(echo "$BRANCHES_JSON" \
    | jq -r ".[] | select(.name == \"$BRANCH_NAME\") | .expires_at // \"none\"")
  echo "   Expires at: $EXISTING_EXPIRY (not extended by this run)"
else
  # Create new branch from production's SCHEMA ONLY (no data copied).
  # Privacy: preview environments must never carry real tester data (FB privacy
  # follow-up). --schema-only replicates production's structure without rows;
  # run-migrations.sh then applies the PR's migrations on top. Requires the
  # project's legacy web-access roles to be cleared (done 2026-06-19).
  echo "📝 Creating schema-only branch $BRANCH_NAME from production (no data)..."
  echo "   Expires at: $EXPIRES_AT (${TTL_DAYS} days) — a later push recreates it"
  BRANCH_RESPONSE=$(neonctl branches create \
    --project-id "$NEON_PROJECT" \
    --name "$BRANCH_NAME" \
    --parent production \
    --schema-only \
    --role-name neondb_owner \
    --expires-at "$EXPIRES_AT" \
    --output json)

  BRANCH_ID=$(echo "$BRANCH_RESPONSE" | jq -r '.id // .branch.id // empty')
  if [ -z "$BRANCH_ID" ]; then
    echo "⚠️  WARNING: Could not extract branch ID from Neon response. Cleanup may fail."
    echo "Raw response: $BRANCH_RESPONSE"
  fi
  echo "✅ Branch created: $BRANCH_ID"
fi

# Get connection string
echo "🔗 Retrieving connection string..."
CONNECTION_STRING=$(neonctl connection-string \
  --project-id "$NEON_PROJECT" \
  --branch "$BRANCH_NAME" \
  --role-name neondb_owner \
  --database-name land_v2 \
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
echo "   Expires: $(neonctl branches get "$BRANCH_ID" --project-id "$NEON_PROJECT" --output json 2>/dev/null | jq -r '.expires_at // "none"')"
echo "   Connection: ${CONNECTION_STRING:0:50}..." # Show partial for security
echo ""
echo "Next steps:"
echo "1. Run migrations: ./scripts/run-migrations.sh $BRANCH_NAME"
echo "2. Seed fixtures: ./scripts/seed-fixtures.sh $BRANCH_NAME"
echo "3. Deploy to Vercel preview"
