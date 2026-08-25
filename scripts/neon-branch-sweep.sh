#!/bin/bash
# Neon preview-branch sweep — reclaim slots held by pull requests that are gone.
#
# WHY THIS EXISTS ALONGSIDE neon-branch-delete.sh
# ------------------------------------------------
# Teardown is triggered by a pull request CLOSING (cleanup.yml). That fires at
# most once per request, so a single failed run leaks a branch permanently, and
# nothing ever revisits it. Twice now the leak has only surfaced when creation
# started failing outright:
#
#   * June 2026 — `neonctl branches delete --branch NAME` passed zero positional
#     arguments and errored every run. 89 branches accumulated
#     (LSCMD-NEON-PRSWEEP-0618-dc).
#   * 2026-08-25 — PR #263's create job died on "root branches limit exceeded"
#     while PR #262 had passed the same job 27 minutes earlier.
#
# A sweep is idempotent and self-healing: whatever the close trigger missed, the
# next run picks up. The close trigger stays as the fast path — this is the net
# underneath it, not a replacement.
#
# Usage: ./scripts/neon-branch-sweep.sh [--dry-run]
# Requires: NEON_PROJECT_ID, NEON_API_KEY, and an authenticated `gh`.

set -euo pipefail

DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

# A branch whose pull request cannot be found is deletable — but "not found" and
# "the API just failed" look identical at the call site, and one of them must
# never delete anything. Absent-PR deletions additionally require the branch to
# be older than this, so a branch created moments before its request becomes
# queryable can never be swept out from under a live run. Closed and merged
# requests are unambiguous and are not subject to it.
ABSENT_MIN_AGE_HOURS=24

if [ -z "${NEON_PROJECT_ID:-}" ]; then echo "❌ NEON_PROJECT_ID not set"; exit 1; fi
if [ -z "${NEON_API_KEY:-}" ]; then echo "❌ NEON_API_KEY not set"; exit 1; fi

echo "🧹 Neon preview-branch sweep — project ${NEON_PROJECT_ID}"
$DRY_RUN && echo "   DRY RUN — nothing will be deleted"
echo

BRANCHES=$(neonctl branches list --project-id "$NEON_PROJECT_ID" --output json)
TOTAL_BEFORE=$(echo "$BRANCHES" | jq 'length')
echo "Branches before: $TOTAL_BEFORE"
echo

DELETED=0
KEPT=0
FAILED=0
NOW_EPOCH=$(date -u +%s)

while IFS=$'\t' read -r NAME ID IS_DEFAULT PARENT CREATED; do
  [ -z "$NAME" ] && continue

  # RULE 1 — the name must be exactly pr-<number>. Anything else is somebody's
  # deliberate branch and is none of this script's business.
  if ! [[ "$NAME" =~ ^pr-[0-9]+$ ]]; then
    echo "KEEP   $NAME — not a pr-<number> preview branch"
    KEPT=$((KEPT + 1)); continue
  fi

  # RULE 3 — never the default branch, never main/production, never a parent.
  if [ "$IS_DEFAULT" = "true" ] || [ "$NAME" = "main" ] || [ "$NAME" = "production" ]; then
    echo "KEEP   $NAME — default/protected branch"
    KEPT=$((KEPT + 1)); continue
  fi
  CHILDREN=$(echo "$BRANCHES" | jq --arg id "$ID" '[.[] | select(.parent_id == $id)] | length')
  if [ "$CHILDREN" != "0" ]; then
    echo "KEEP   $NAME — has $CHILDREN child branch(es)"
    KEPT=$((KEPT + 1)); continue
  fi

  # RULE 2 — the pull request must be closed, merged, or absent.
  PR_NUMBER="${NAME#pr-}"
  if PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq .state 2>/dev/null); then
    case "$PR_STATE" in
      OPEN)
        echo "KEEP   $NAME — PR #$PR_NUMBER is OPEN"
        KEPT=$((KEPT + 1)); continue
        ;;
      CLOSED|MERGED) : ;;
      *)
        echo "KEEP   $NAME — PR #$PR_NUMBER reported unrecognised state '$PR_STATE'"
        KEPT=$((KEPT + 1)); continue
        ;;
    esac
    REASON="PR #$PR_NUMBER is $PR_STATE"
  else
    # Distinguish a genuinely missing request from a transient API failure. Only
    # the former is safe; anything else keeps the branch and says so, because a
    # rate limit must never read as "this pull request does not exist".
    ERR=$(gh pr view "$PR_NUMBER" --json state 2>&1 || true)
    if ! echo "$ERR" | grep -qiE 'Could not resolve to a PullRequest|no pull requests found|GraphQL: Could not resolve'; then
      echo "KEEP   $NAME — could not determine PR state (not treating as absent): ${ERR%%$'\n'*}"
      KEPT=$((KEPT + 1)); continue
    fi
    CREATED_EPOCH=$(date -u -d "$CREATED" +%s 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$CREATED" +%s 2>/dev/null || echo 0)
    AGE_HOURS=$(( (NOW_EPOCH - CREATED_EPOCH) / 3600 ))
    if [ "$CREATED_EPOCH" = "0" ] || [ "$AGE_HOURS" -lt "$ABSENT_MIN_AGE_HOURS" ]; then
      echo "KEEP   $NAME — PR #$PR_NUMBER absent but branch is only ${AGE_HOURS}h old (< ${ABSENT_MIN_AGE_HOURS}h)"
      KEPT=$((KEPT + 1)); continue
    fi
    REASON="PR #$PR_NUMBER does not exist, branch ${AGE_HOURS}h old"
  fi

  if $DRY_RUN; then
    echo "WOULD DELETE $NAME ($ID) — $REASON"
    DELETED=$((DELETED + 1)); continue
  fi

  echo "DELETE $NAME ($ID) — $REASON"
  if neonctl branches delete "$ID" --project-id "$NEON_PROJECT_ID" --yes >/dev/null 2>&1; then
    DELETED=$((DELETED + 1))
  else
    echo "       ⚠️  delete FAILED for $NAME ($ID)"
    FAILED=$((FAILED + 1))
  fi
done < <(echo "$BRANCHES" | jq -r '.[] | [.name, .id, (.default // false | tostring), (.parent_id // ""), .created_at] | @tsv')

echo
if $DRY_RUN; then
  echo "Summary (dry run): would delete $DELETED, keep $KEPT, of $TOTAL_BEFORE"
else
  TOTAL_AFTER=$(neonctl branches list --project-id "$NEON_PROJECT_ID" --output json | jq 'length')
  echo "Summary: deleted $DELETED, kept $KEPT, failed $FAILED — $TOTAL_BEFORE → $TOTAL_AFTER"
  if [ "$FAILED" -gt 0 ]; then exit 1; fi
fi
