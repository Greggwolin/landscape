#!/usr/bin/env python3
"""UI Fix File — sends a single file to the local Coder model for CoreUI migration.
Usage: python3 ui-fix-file.py <file_path> [instructions]
Output: fixed file content to stdout
"""

import json, sys, urllib.request

LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
MODEL = "qwen2.5-coder-14b-instruct"

DEFAULT_INSTRUCTIONS = """Replace MUI imports with CoreUI equivalents. Replace inline styles with CoreUI utility classes where possible.

IMPORT RULE: Import CoreUI components as named imports: import { CButton, CTooltip } from '@coreui/react'

MUI to CoreUI map:
- Card/CardContent → CCard/CCardBody
- Button/IconButton → CButton (use variant="ghost" color="secondary" for icon-only)
- TextField → CFormInput
- Select/FormControl → CFormSelect
- Checkbox → CFormCheck
- Dialog/* → CModal/CModalHeader/CModalBody/CModalFooter
- Tooltip → CTooltip (uses "content" prop not "title", "visible" not "open")
- Badge/Chip → CBadge
- Avatar → CAvatar
- CircularProgress → CSpinner
- Typography → semantic HTML with CoreUI classes
- ThemeProvider/CssBaseline → DELETE entirely
- useColorScheme → useColorModes() from @coreui/react
- styled() → CSS vars + className
- useTheme → var(--cui-*) CSS variables

Output ONLY the complete rewritten file. No explanations, no markdown fences."""

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ui-fix-file.py <file_path> [instructions]", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    instructions = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_INSTRUCTIONS

    try:
        with open(file_path, 'r') as f:
            file_content = f.read()
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    prompt = f"""{instructions}

FILE TO REWRITE:
{file_content}"""

    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8000,
        "temperature": 0.1,
    }).encode("utf-8")

    req = urllib.request.Request(
        LM_STUDIO_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"ERROR: LM Studio request failed: {e}", file=sys.stderr)
        sys.exit(1)

    content = result["choices"][0]["message"]["content"]

    # Strip markdown fences if model wrapped them
    lines = content.split("\n")
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    content = "\n".join(lines)

    print(content)

    # Print stats to stderr
    usage = result.get("usage", {})
    print(f"Tokens: {usage.get('prompt_tokens', '?')} in / {usage.get('completion_tokens', '?')} out", file=sys.stderr)

if __name__ == "__main__":
    main()
