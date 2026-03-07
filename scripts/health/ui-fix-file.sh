#!/bin/bash
# UI Fix File — sends a single file to the local Coder model for CoreUI migration
# Usage: ./ui-fix-file.sh <file_path> <instructions>
# Output: fixed file content to stdout

set -euo pipefail

FILE_PATH="$1"
INSTRUCTIONS="${2:-Replace MUI imports with CoreUI equivalents. Replace inline styles with CoreUI utility classes.}"

if [ ! -f "$FILE_PATH" ]; then
  echo "ERROR: File not found: $FILE_PATH" >&2
  exit 1
fi

FILE_CONTENT=$(cat "$FILE_PATH")

# Build the prompt
PROMPT="You are a CoreUI migration specialist. Rewrite this React/TypeScript file following these rules:

${INSTRUCTIONS}

IMPORT RULE: Import CoreUI components as named imports: import { CButton, CTooltip } from '@coreui/react'

MUI → CoreUI: Card→CCard, CardContent→CCardBody, Button/IconButton→CButton, TextField→CFormInput, Select→CFormSelect, Checkbox→CFormCheck, Dialog→CModal, Tooltip→CTooltip (uses 'content' prop not 'title', 'visible' not 'open'), Badge/Chip→CBadge, Avatar→CAvatar, CircularProgress→CSpinner, Typography→semantic HTML, ThemeProvider/CssBaseline→DELETE.

Output ONLY the complete rewritten file. No explanations, no markdown fences.

FILE:
${FILE_CONTENT}"

# Call LM Studio
RESPONSE=$(curl -s --max-time 300 http://127.0.0.1:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, sys
prompt = sys.stdin.read()
print(json.dumps({
    'model': 'qwen2.5-coder-14b-instruct',
    'messages': [{'role': 'user', 'content': prompt}],
    'max_tokens': 8000,
    'temperature': 0.1
}))
" <<< "$PROMPT")")

# Extract content
echo "$RESPONSE" | python3 -c "
import sys, json
try:
    r = json.load(sys.stdin)
    content = r['choices'][0]['message']['content']
    # Strip markdown fences if model wrapped them
    if content.startswith('\`\`\`'):
        lines = content.split('\n')
        # Remove first and last fence lines
        if lines[0].startswith('\`\`\`'):
            lines = lines[1:]
        if lines and lines[-1].strip() == '\`\`\`':
            lines = lines[:-1]
        content = '\n'.join(lines)
    print(content)
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    print(json.dumps(r, indent=2) if 'r' in dir() else 'No response', file=sys.stderr)
    sys.exit(1)
"
