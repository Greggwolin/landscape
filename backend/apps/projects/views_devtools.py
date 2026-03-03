from collections import deque
from html import escape

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse
from django.utils import timezone


@staff_member_required
def django_log_viewer(request):
    log_path = settings.BASE_DIR / "logs" / "django.log"

    try:
        with log_path.open("r", encoding="utf-8", errors="replace") as log_file:
            raw_lines = list(deque(log_file, maxlen=200))
        # Filter out self-referencing log viewer requests to prevent pollution
        filtered = [ln for ln in raw_lines if "/admin/logs/" not in ln]
        log_lines = "".join(filtered)
    except FileNotFoundError:
        log_lines = f"Log file not found: {log_path}"
    except OSError as exc:
        log_lines = f"Unable to read log file: {exc}"

    updated_at = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M:%S %Z")
    escaped_lines = escape(log_lines)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="2">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Django Log Viewer</title>
  <style>
    body {{
      margin: 0;
      padding: 24px;
      font-family: monospace;
      background: var(--darkened-bg, black);
      color: var(--body-fg, white);
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 24px;
    }}
    p {{
      margin: 0 0 16px;
    }}
    pre {{
      margin: 0;
      padding: 16px;
      min-height: calc(100vh - 140px);
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--body-bg, black);
      color: white;
      border: 1px solid var(--hairline-color, gray);
      border-radius: 6px;
    }}
  </style>
</head>
<body>
  <h1>Django Log Viewer</h1>
  <p>Last updated: {escape(updated_at)}</p>
  <pre id="log-output">{escaped_lines}</pre>
  <script>
    const logOutput = document.getElementById("log-output");
    if (logOutput) {{
      logOutput.scrollTop = logOutput.scrollHeight;
    }}
    window.scrollTo(0, document.body.scrollHeight);
  </script>
</body>
</html>
"""

    response = HttpResponse(html)
    response["Cache-Control"] = "no-store"
    return response
