# Clear stale git index lock + commit accumulated nightly sync notes

## Context

The nightly Cowork sync task has been blocked by a stale `.git/index.lock` since Jul 14 20:36. The sandbox mount can't delete it (filesystem permission restriction on deletes). Two daily-sync notes (Jul 14 + Jul 15) are sitting untracked because of this.

## Steps

1. Verify no git process is running: `ps aux | grep git | grep -v grep`
2. Remove the stale lock: `rm -f .git/index.lock`
3. Verify removal: `ls -la .git/index.lock` (should be "No such file")
4. Run the scoped committer: `bash scripts/nightly/commit-generated-docs.sh`
5. Confirm exit code 0 and list the committed files

Do NOT run `git add -A` or `git add .` — use only the scoped committer script, which stages only generated doc artifacts and refuses source code (FB-304 guardrail).

## Expected outcome

The committer should pick up:
- `docs/09_session_notes/2026-07-14-daily-sync.md`
- `docs/09_session_notes/2026-07-15-daily-sync.md`

And produce a commit like `docs: nightly health check 2026-07-15`.
