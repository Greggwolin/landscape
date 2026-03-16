# OpenClaw Setup & Configuration Handoff

**Date:** 2026-03-11
**Purpose:** Continue OpenClaw setup, Aider/LM Studio integration, and pending tasks from this session.

---

## Current State: OpenClaw

**Status:** Functional but fragile — API key requires manual persistence after reboots.

### Installation
- OpenClaw is installed and running via `launchctl` service: `ai.openclaw.gateway` (PID varies)
- Primary AI provider: **Anthropic** (Claude) via API key
- Fallback provider: **LM Studio** (local, `http://127.0.0.1:1234/v1`)

### Key Config Files

| File | Location | Purpose |
|------|----------|---------|
| Auth profiles | `~/.openclaw/agents/main/agent/auth-profiles.json` | API keys, provider config, usage stats |
| Sessions | `~/.openclaw/agents/main/sessions/sessions.json` | Chat session history |
| Logs | `openclaw logs --follow` | Live service logs |

### API Key Setup (CRITICAL)

The Anthropic API key is set via environment variable, NOT stored in config files:

```bash
# Must run after every reboot (does NOT persist across reboots/OS updates)
launchctl setenv ANTHROPIC_API_KEY "sk-ant-api03-...tu523QAA"
```

**Persistence fix (PENDING — needs confirmation):**
Add this line to `~/.zshrc` so it runs on every new terminal session:

```bash
echo 'launchctl setenv ANTHROPIC_API_KEY "sk-ant-api03-...tu523QAA"' >> ~/.zshrc
```

⚠️ This was provided to the user but NOT confirmed as executed. Check `~/.zshrc` first.

### Known Issues

1. **iMessage channel failing** — Full Disk Access not granted to `/opt/homebrew/bin/imsg` and `/opt/homebrew/bin/node`. Produces constant log spam (`chat.db` permission denied).
   - **Fix:** System Settings → Privacy & Security → Full Disk Access → add both binaries
   - **Workaround:** Disable iMessage channel: `openclaw config set channels.imessage.enabled false`

2. **Billing cache can get stuck** — If Anthropic returns a billing error, OpenClaw caches a `disabledUntil` timestamp in `auth-profiles.json` under `usageStats` that blocks the provider for hours.
   - **Fix:** Edit `~/.openclaw/agents/main/agent/auth-profiles.json`, set `"usageStats": {}`
   - **Verify API works first:** `curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d '{"model":"claude-sonnet-4-20250514","max_tokens":50,"messages":[{"role":"user","content":"ping"}]}'`

3. **Qwen 3.5 9B won't work as fallback** — Context window (4096) is below OpenClaw's 16,000 minimum. Only Qwen 2.5 Coder 14B (32k context) works with LM Studio as a fallback provider.

4. **macOS updates wipe `launchctl setenv`** — Any major OS update clears environment variables. Re-run the `launchctl setenv` command above after updates.

---

## Current State: Aider + LM Studio

**Status:** Installed and connected. No successful audit pass completed yet.

### Setup

- **Aider:** Installed globally via `pip3 install aider-chat --break-system-packages`
- **Launch command** (from Landscape repo root):
  ```bash
  python3 -m aider --openai-api-base http://127.0.0.1:1234/v1 --openai-api-key lm-studio --model openai/qwen2.5-coder-14b-instruct
  ```
  (Use `python3 -m aider` because `aider` isn't in PATH)

- **LM Studio:** Running locally at `http://127.0.0.1:1234/v1` with Qwen 2.5 Coder 14B Instruct (8.57 GB, Parallel 4)

### Context Window Limits

Qwen 2.5 Coder 14B has ~32k token context. The Landscape repo has 4,003 files. Practical limit is 2-3 medium files at a time using aider's `/add` command.

### Pending Task: CoreUI Formatting Audit

A CoreUI migration audit prompt (Tier 4 Part 1) was prepared but not successfully run. The audit should:
- **REPORT ONLY** — list violations with file, line number, current code, and suggested replacement
- **NOT modify files** — this is an audit, not a migration

The full prompt was from a previous Cowork session's CODEX document covering CSS variable mappings, component replacement patterns, and file-by-file instructions. It needs to be re-loaded or re-pasted into aider.

**Workflow in aider:**
1. `/add src/components/path/to/file.tsx` (add 1-2 files at a time)
2. Paste the audit prompt as plain text
3. Review output for violations
4. `/drop` files, `/add` next batch, repeat

---

## Completed This Session

### CBLF1 File Cleanup (All Phases Complete)

| Phase | Description | Result |
|-------|-------------|--------|
| Phase 1 | Delete 101 duplicates to staging | ✅ Complete (previous session) |
| Phase 2 | Reorganize 96 root files into subfolders | ✅ 88 moved, 0 errors |
| Phase 3 | Rename 11 files (device names, trailing spaces, copy artifacts) | ✅ 6 renamed, 2 skipped (already moved) |
| Manual cleanup | 5 remaining misc files (debug.log, .DS_Store, etc.) | ✅ User deleted manually |

Script: `/sessions/quirky-lucid-euler/phase2_reorg.py`
Results: `/sessions/quirky-lucid-euler/phase2_3_results.json`

---

## Remaining Tasks (Priority Order)

1. **Confirm `~/.zshrc` has the `launchctl setenv` line** — check and add if missing
2. **Disable iMessage channel** — `openclaw config set channels.imessage.enabled false` (or fix Full Disk Access)
3. **Remove Qwen 3.5 9B from OpenClaw fallback** — or increase its context window setting if possible
4. **Complete CoreUI audit via Aider** — load files 1-2 at a time, run audit prompt, collect violations
5. **Fix iMessage Full Disk Access** — grant FDA to `/opt/homebrew/bin/imsg` and `/opt/homebrew/bin/node` if iMessage channel is wanted

---

## Quick Reference Commands

```bash
# Check OpenClaw status
launchctl list | grep claw

# View OpenClaw logs
openclaw logs --follow

# Restart OpenClaw
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway

# Test Anthropic API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":50,"messages":[{"role":"user","content":"ping"}]}'

# Clear billing cache
# Edit ~/.openclaw/agents/main/agent/auth-profiles.json
# Set "usageStats": {}

# Launch Aider with LM Studio
cd ~/path/to/landscape
python3 -m aider --openai-api-base http://127.0.0.1:1234/v1 --openai-api-key lm-studio --model openai/qwen2.5-coder-14b-instruct

# Re-set API key after reboot
launchctl setenv ANTHROPIC_API_KEY "sk-ant-api03-...tu523QAA"
```
