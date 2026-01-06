#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs/09_session_notes/ai-chats
# macOS + Windows default Code paths; Linux users can add their path similarly
for D in "$HOME/Library/Application Support"/Code/User/globalStorage/*/exports \
         "$HOME"/AppData/Roaming/Code/User/globalStorage/*/exports 2>/dev/null; do
  [ -d "$D" ] && cp -n "$D"/*.md docs/09_session_notes/ai-chats/ 2>/dev/null || true
done
# Stage any new/updated logs
if git ls-files --others --modified docs/09_session_notes/ai-chats | grep -q ".md$"; then
  git add docs/09_session_notes/ai-chats/*.md
fi
