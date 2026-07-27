# FB-304 deny pattern — SINGLE SOURCE OF TRUTH.
#
# Anything matching this regex is source/code and must never ride along in an
# automated "docs: nightly health check ..." commit. This file is sourced by
# BOTH enforcement points so the pattern can never drift between them:
#   - scripts/nightly/commit-generated-docs.sh  (the scoped nightly committer)
#   - .husky/commit-msg                          (the repo-level commit guard)
#
# History: FB-304 (2026-05-19) and its recurrence (2026-07-27, commit 0e4eb03f,
# session LSCMD-RN2-NIGHTLYSWEEP-0727) both swept in-flight source into a commit
# mislabeled "docs: nightly health check ...". The committer script removes the
# LLM's `git add` discretion only when it is actually called; the commit-msg
# hook closes the gap for every caller (script, manual, or daemon).
#
# shellcheck disable=SC2034  # sourced; consumers read FB304_DENY_REGEX
FB304_DENY_REGEX='(^|/)(src|backend|services|scripts|migrations)/|\.(ts|tsx|js|jsx|mjs|cjs|py|sql|css|scss|sh)$'
