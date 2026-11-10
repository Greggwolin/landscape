# Landscape connector for Claude (pilot)

Decision 2026-11-10, option 1b: keep the web app as it is and add a second door,
so the Claude app can reach Landscape's engine directly. This folder is that door.

It is a local MCP server (stdio). Claude Desktop starts it; it loads Django from
this checkout and calls Landscaper's own tool executor for a short, read-only list
of tools. Nothing here changes the web app, and nothing here can change deal data.

## What Claude gets

17 read-only tools (`PILOT_TOOLS` in `server.py`): the project list, the deal
briefing, headline returns, cash flow, budget rollup and lines, the land plan
(areas, phases, parcels, lots), absorption, parcel sale assumptions and events,
loans, the project's documents and their text, and a search across the user's own
documents.

## What does not come across

- The reply-assembly fabrication guard. Landscape never sees Claude's reply.
- Landscaper's system prompt. Claude gets the tool descriptions and the short
  `INSTRUCTIONS` block in `server.py`, nothing else.
- Any write, any artifact, any screen, any what-if. What-if needs a Landscape chat
  thread to hold its scratch scenario (`tbl_scenario_log.thread_id` is a foreign
  key), so it is the next step, not part of this one.

## Guards

1. A tool runs only if it is on the pilot list AND the registry does not mark it a
   mutation.
2. A project is readable only if `tbl_project.created_by_id` is the configured user.
   The project list is filtered the same way whatever the tool returns.
3. Every call is appended to `~/Library/Logs/LandscapeConnector/calls.jsonl` with
   the full text returned, so Claude's wording can be checked against it.

## Run

    LANDSCAPE_MCP_USER_ID=4 LANDSCAPE_MCP_DEFAULT_PROJECT_ID=9 \
      /Users/5150east/landscape/backend/venv/bin/python backend/claude_connector/server.py

`backend/.env` must exist beside `manage.py` (python-decouple reads it). The server
uses whatever database that file names — on the Mac, the live one.

Claude Desktop entry (`claude_desktop_config.json` → `mcpServers`):

    "landscape": {
      "command": "/Users/5150east/landscape/backend/venv/bin/python",
      "args": ["/Users/5150east/Documents/landscape-wt-mcp/backend/claude_connector/server.py"],
      "env": {"LANDSCAPE_MCP_USER_ID": "4", "LANDSCAPE_MCP_DEFAULT_PROJECT_ID": "9"}
    }

## Test

    cd backend && python -m pytest claude_connector/tests -q --noconftest -p no:django -c /dev/null --rootdir .

The tests use a fake backend: no Django, no database. `--noconftest` is needed
because `backend/conftest.py` refuses to run against a non-local database.

## Why no MCP package

`pip install mcp --dry-run` in the shared backend virtualenv (2026-11-10) would
have upgraded pydantic and typing_extensions under the running app. The stdio
transport is newline-delimited JSON-RPC and the pilot needs four methods, so it is
written by hand. If this becomes a remote connector, use the official SDK in its
own environment.
