#!/usr/bin/env python
"""
Landscape connector for Claude — pilot (decision 2026-11-10, option 1b).

A local MCP server over stdio. It lets the Claude app call a small, read-only
subset of Landscaper's tools against the live Landscape database, so the same
engine can be reached without the Landscape web app.

What it is NOT: it is not Landscaper. Landscaper's system prompt, per-page tool
gating and the reply-assembly fabrication guard do not exist here — Landscape
never sees what Claude writes back. The only levers on this side are which
tools are exposed, what they return, and the short instructions below.

Design notes
- No third-party MCP package. The stdio transport is newline-delimited
  JSON-RPC 2.0 and this pilot needs four methods, so it is hand-rolled to
  avoid installing anything into the shared backend virtualenv (a dry run of
  `pip install mcp` on 2026-11-10 would have upgraded pydantic there).
- stdout is the protocol channel. Django and the tools log and sometimes
  print; file descriptor 1 is therefore pointed at stderr at start-up and the
  protocol is written to a private copy of the original stdout.
- Every tool is checked three times before it runs: it must be on the pilot
  list, the registry must not mark it a mutation, and the project must belong
  to the configured user.
- Every call is appended to a JSONL log with the full text returned, so what
  Claude said can be compared with what Landscape returned.

Environment
  LANDSCAPE_MCP_USER_ID             required  Landscape user the connector acts as
  LANDSCAPE_MCP_DEFAULT_PROJECT_ID  optional  project used when a call names none
  LANDSCAPE_MCP_LOG                 optional  call log path
                                              (default ~/Library/Logs/LandscapeConnector/calls.jsonl)
"""
from __future__ import annotations

import copy
import datetime as _dt
import json
import os
import sys
import threading
import time
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, TextIO

SERVER_NAME = "landscape"
SERVER_VERSION = "0.1.0"
KNOWN_PROTOCOLS = ("2025-06-18", "2025-03-26", "2024-11-05")
DEFAULT_PROTOCOL = "2025-06-18"
MAX_RESULT_CHARS = 80_000
MAX_LOGGED_CHARS = 400_000
BACKEND_WAIT_SECONDS = 180
MANIFEST_PATH = Path(__file__).resolve().parent / "tools_manifest.json"

INSTRUCTIONS = (
    "Landscape is a real-estate underwriting system of record. These tools read "
    "live deal data and run Landscape's own financial engine. This connector is a "
    "read-only pilot.\n"
    "1. Quote every dollar amount, percentage, count and date exactly as a tool "
    "returned it. Do not round past the returned precision without saying so. "
    "Never state a figure that no tool returned; say Landscape did not return it.\n"
    "2. If you work a figure out yourself, show the arithmetic and mark it "
    "'(calculated)'.\n"
    "3. Returns come labelled by basis (unlevered project-level vs levered "
    "equity). Carry the label; never mix the two.\n"
    "4. You cannot change deal data through this connector. If asked to, say so.\n"
    "5. When no project is named, call list_projects_summary first. For a "
    "briefing or 'where does this deal stand', start with get_deal_summary.\n"
    "6. Parcel dispositions in a land deal are bulk sales of finished parcels to "
    "builders or users. Do not call them takedowns.\n"
    "7. An empty result means Landscape holds nothing for that question. Say "
    "that; do not fill the gap."
)

RELAY_NOTE = (
    "Quote figures exactly as returned. A figure not present here was not "
    "returned by Landscape."
)

# name -> plain-language addition to Landscaper's own description. Landscaper's
# descriptions are terse because its system prompt carries the rest; Claude
# gets no such prompt, so the thin ones are filled out here.
PILOT_TOOLS: Dict[str, str] = {
    "list_projects_summary": "Lists the Landscape projects this user owns, with their project numbers. Call this first when the user has not said which deal.",
    "get_deal_summary": "",
    # get_data_completeness is deliberately absent: on main (08406469, 2026-11-03) it fails
    # with 'column "hold_period_years" does not exist'. Add it back when that is fixed.
    "calculate_project_metrics": "Runs Landscape's engine for headline returns (IRR, equity multiple, NPV). The basis of each figure is labelled in the result.",
    "calculate_cash_flow": "Runs Landscape's engine for the cash flow schedule. Use detail_level 'summary' unless the user asks for annual or monthly periods.",
    "get_budget_rollup": "",
    "get_budget_items": "Development budget line items: description, category, quantity, rate, amount and timing. For totals by category use get_budget_rollup.",
    "get_areas": "The areas (top level of the land plan) in the project.",
    "get_phases": "The phases in the project, optionally within one area.",
    "get_parcels": "The parcels in the project with land use, product, acreage and unit counts; optionally within one phase or area.",
    "get_lots": "",
    "get_absorption_schedule": "Absorption schedule rows: how many units are assumed to sell in each period, by phase, parcel or scenario.",
    "get_parcel_sale_assumptions": "",
    "get_parcel_sale_events": "Recorded parcel sale events (bulk sales of finished parcels): buyer, status, dates and price.",
    "get_loans": "The loans on the project and their terms.",
    "get_project_documents": "",
    "get_document_content": "The text of one project document. Find the document with get_project_documents first.",
    "search_my_knowledge": "",
}

# Tools that run without a project.
NO_PROJECT_TOOLS = frozenset({"list_projects_summary", "search_my_knowledge"})


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        # Keep the engine's own digits; a float would re-round them.
        return str(value)
    if isinstance(value, (_dt.datetime, _dt.date, _dt.time)):
        return value.isoformat()
    if isinstance(value, (set, frozenset, tuple)):
        return list(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return str(value)


def _title(name: str) -> str:
    return name.replace("_", " ").capitalize()


class DjangoBackend:
    """The real thing: Landscaper's registry and executor, loaded lazily."""

    def __init__(self, user_id: int):
        self.user_id = user_id
        backend_dir = Path(__file__).resolve().parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
        import django

        django.setup()
        from apps.landscaper import tool_executor
        from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS

        self._executor = tool_executor
        self._schemas = {t["name"]: t for t in LANDSCAPER_TOOLS}

    def schema(self, name: str) -> Optional[Dict[str, Any]]:
        return self._schemas.get(name)

    def is_registered(self, name: str) -> bool:
        return name in self._executor.TOOL_REGISTRY

    def is_mutation(self, name: str) -> bool:
        handler = self._executor.TOOL_REGISTRY.get(name)
        return bool(getattr(handler, "_is_mutation", False))

    def _fresh_connection(self) -> None:
        # This process lives for hours; the database closes idle connections.
        from django.db import close_old_connections, connection

        close_old_connections()
        try:
            connection.ensure_connection()
            if not connection.is_usable():
                connection.close()
        except Exception:
            connection.close()

    def owned_project_ids(self) -> List[int]:
        from django.db import connection

        self._fresh_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT project_id FROM landscape.tbl_project WHERE created_by_id = %s",
                [self.user_id],
            )
            return [row[0] for row in cursor.fetchall()]

    def owns_project(self, project_id: int) -> bool:
        return project_id in set(self.owned_project_ids())

    def execute(self, name: str, tool_input: Dict[str, Any], project_id: Optional[int]) -> Any:
        self._fresh_connection()
        return self._executor.execute_tool(
            tool_name=name,
            tool_input=tool_input,
            project_id=project_id,
            propose_only=True,
            thread_id=None,
            user_id=self.user_id,
            prior_tool_calls=None,
        )


class LazyBackend:
    """
    Loads the real backend on a background thread so the handshake is instant.

    Measured 2026-11-11/12: Django plus the tool registry take 17 s to import
    from a shell and 53 s when the Claude app starts the server. The app gives
    a connector far less than that to answer `initialize`, and marked this one
    failed. Nothing in `initialize` or `tools/list` needs Django (the tool list
    is served from tools_manifest.json), so only a tool call waits.
    """

    def __init__(self, factory):
        self._ready = threading.Event()
        self._backend: Any = None
        self._error: Optional[BaseException] = None
        self._thread = threading.Thread(target=self._load, args=(factory,),
                                        name="landscape-backend", daemon=True)
        self._thread.start()

    def _load(self, factory) -> None:
        started = time.time()
        try:
            self._backend = factory()
            print(f"[landscape-connector] backend loaded in {time.time() - started:.1f}s",
                  file=sys.stderr)
        except BaseException as exc:  # surfaced on the first call
            self._error = exc
            print(f"[landscape-connector] backend failed to load: {exc!r}", file=sys.stderr)
        finally:
            self._ready.set()

    def _get(self) -> Any:
        if not self._ready.wait(BACKEND_WAIT_SECONDS):
            raise RuntimeError("Landscape is still starting. Try again in a minute.")
        if self._error is not None:
            raise RuntimeError(f"Landscape could not start: {self._error!r}")
        return self._backend

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get(), name)


def load_manifest(path: Path = MANIFEST_PATH) -> Optional[List[Dict[str, Any]]]:
    try:
        tools = json.loads(path.read_text(encoding="utf-8"))["tools"]
    except (OSError, ValueError, KeyError):
        return None
    # The manifest is a convenience, never an authority: anything off the pilot
    # list is dropped here, and every call is re-checked against the registry.
    return [t for t in tools if t.get("name") in PILOT_TOOLS]


class Connector:
    def __init__(self, backend: Any, default_project_id: Optional[int] = None,
                 log_path: Optional[Path] = None,
                 manifest: Optional[List[Dict[str, Any]]] = None):
        self.backend = backend
        self.default_project_id = default_project_id
        self.log_path = log_path
        self._tools_cache: Optional[List[Dict[str, Any]]] = manifest

    # -- tool catalogue ----------------------------------------------------

    def exposed_names(self) -> List[str]:
        names = []
        for name in PILOT_TOOLS:
            if self.backend.schema(name) is None or not self.backend.is_registered(name):
                continue
            if self.backend.is_mutation(name):
                continue
            names.append(name)
        return names

    def tools(self) -> List[Dict[str, Any]]:
        if self._tools_cache is not None:
            return self._tools_cache
        out = []
        for name in self.exposed_names():
            source = self.backend.schema(name)
            schema = copy.deepcopy(source.get("input_schema") or {})
            schema.setdefault("type", "object")
            props = schema.setdefault("properties", {})
            if name not in NO_PROJECT_TOOLS and "project_id" not in props:
                hint = "Landscape project number (from list_projects_summary)."
                if self.default_project_id is not None:
                    hint += f" Defaults to {self.default_project_id} when omitted."
                props["project_id"] = {"type": "integer", "description": hint}
            description = (source.get("description") or "").strip()
            extra = PILOT_TOOLS.get(name, "")
            if extra:
                description = f"{extra} {description}".strip() if description else extra
            out.append({
                "name": name,
                "title": _title(name),
                "description": description,
                "inputSchema": schema,
                "annotations": {
                    "title": _title(name),
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
            })
        self._tools_cache = out
        return out

    # -- tool calls --------------------------------------------------------

    def call(self, name: str, arguments: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        started = time.time()
        args = dict(arguments or {})
        payload, is_error, project_id = self._run(name, args)
        if isinstance(payload, dict) and not is_error:
            payload = {**payload, "_relay": RELAY_NOTE}
        text = json.dumps(payload, default=_json_default, ensure_ascii=False)
        full_chars = len(text)
        if full_chars > MAX_RESULT_CHARS:
            text = json.dumps({
                "truncated": True,
                "returned_chars": MAX_RESULT_CHARS,
                "full_chars": full_chars,
                "note": ("Landscape returned more than fits in one reply. Only the "
                         "first part is shown; narrow the request (one phase, one "
                         "category, a summary level) to see the rest. Do not infer "
                         "the missing part."),
                "partial": text[:MAX_RESULT_CHARS],
            }, ensure_ascii=False)
        self._log(name, arguments or {}, project_id, is_error, started, text, full_chars)
        return {"content": [{"type": "text", "text": text}], "isError": is_error}

    def _refuse(self, code: str, message: str):
        return {"success": False, "error": code, "message": message}

    def _run(self, name: str, args: Dict[str, Any]):
        try:
            return self._run_checked(name, args)
        except Exception as exc:  # backend still starting, or failed to start
            return self._refuse("landscape_unavailable", str(exc)), True, None

    def _run_checked(self, name: str, args: Dict[str, Any]):
        if name not in PILOT_TOOLS:
            return self._refuse("tool_not_available",
                                f"'{name}' is not part of the Landscape pilot connector."), True, None
        if name not in self.exposed_names():
            return self._refuse("tool_not_available",
                                f"'{name}' is not part of the Landscape pilot connector."), True, None
        if self.backend.is_mutation(name):
            return self._refuse("read_only", "This connector cannot change deal data."), True, None

        project_id: Optional[int] = None
        if name not in NO_PROJECT_TOOLS:
            declared = "project_id" in ((self.backend.schema(name).get("input_schema") or {})
                                        .get("properties") or {})
            raw = args.get("project_id") if declared else args.pop("project_id", None)
            if raw is None:
                raw = self.default_project_id
            try:
                project_id = int(raw) if raw is not None else None
            except (TypeError, ValueError):
                return self._refuse("bad_project_id", "project_id must be a whole number."), True, None
            if project_id is None:
                return self._refuse("project_required",
                                    "Name a project. Call list_projects_summary to see them."), True, None
            if not self.backend.owns_project(project_id):
                return self._refuse("project_not_found",
                                    f"No project {project_id} belongs to this Landscape user."), True, project_id
            if declared:
                args["project_id"] = project_id
        try:
            result = self.backend.execute(name, args, project_id)
        except Exception as exc:  # the executor catches most; this is the backstop
            return self._refuse("tool_failed", f"{type(exc).__name__}: {exc}"), True, project_id

        if name == "list_projects_summary":
            result = self._only_owned(result)
        is_error = isinstance(result, dict) and result.get("success") is False
        return result, is_error, project_id

    def _only_owned(self, result: Any) -> Any:
        """Drop any project the configured user does not own, whatever the tool returned."""
        if not isinstance(result, dict):
            return result
        owned = set(self.backend.owned_project_ids())
        out = dict(result)
        for key, value in result.items():
            if isinstance(value, list) and value and all(isinstance(v, dict) for v in value) \
                    and any("project_id" in v for v in value):
                kept = [v for v in value if v.get("project_id") in owned]
                if len(kept) != len(value):
                    out[key] = kept
                    for count_key in ("count", "total", "total_projects", "project_count"):
                        if isinstance(out.get(count_key), int):
                            out[count_key] = len(kept)
        return out

    def _log(self, name, arguments, project_id, is_error, started, text, full_chars) -> None:
        if not self.log_path:
            return
        try:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            record = {
                "ts": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
                "tool": name,
                "arguments": arguments,
                "project_id": project_id,
                "is_error": is_error,
                "ms": int((time.time() - started) * 1000),
                "chars": full_chars,
                "result": text[:MAX_LOGGED_CHARS],
            }
            with self.log_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, default=_json_default, ensure_ascii=False) + "\n")
        except Exception as exc:  # logging must never break a call
            print(f"[landscape-connector] log write failed: {exc}", file=sys.stderr)

    # -- JSON-RPC ----------------------------------------------------------

    def handle(self, message: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(message, dict):
            return _error(None, -32600, "Invalid request")
        method = message.get("method")
        msg_id = message.get("id")
        is_notification = "id" not in message
        params = message.get("params") or {}
        if method is None:
            return None  # a response to something we never asked; ignore
        if is_notification:
            return None
        try:
            if method == "initialize":
                wanted = params.get("protocolVersion")
                version = wanted if wanted in KNOWN_PROTOCOLS else DEFAULT_PROTOCOL
                return _result(msg_id, {
                    "protocolVersion": version,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": SERVER_NAME, "title": "Landscape",
                                   "version": SERVER_VERSION},
                    "instructions": INSTRUCTIONS,
                })
            if method == "ping":
                return _result(msg_id, {})
            if method == "tools/list":
                return _result(msg_id, {"tools": self.tools()})
            if method == "tools/call":
                name = params.get("name")
                if not isinstance(name, str):
                    return _error(msg_id, -32602, "tools/call needs a tool name")
                arguments = params.get("arguments")
                if arguments is not None and not isinstance(arguments, dict):
                    return _error(msg_id, -32602, "arguments must be an object")
                return _result(msg_id, self.call(name, arguments))
            if method == "resources/list":
                return _result(msg_id, {"resources": []})
            if method == "resources/templates/list":
                return _result(msg_id, {"resourceTemplates": []})
            if method == "prompts/list":
                return _result(msg_id, {"prompts": []})
            return _error(msg_id, -32601, f"Method not found: {method}")
        except Exception as exc:
            return _error(msg_id, -32603, f"{type(exc).__name__}: {exc}")

    def serve(self, reader: TextIO, writer: TextIO) -> None:
        for line in reader:
            line = line.strip()
            if not line:
                continue
            try:
                message = json.loads(line)
            except ValueError:
                _write(writer, _error(None, -32700, "Parse error"))
                continue
            if isinstance(message, list):
                replies = [r for r in (self.handle(m) for m in message) if r is not None]
                if replies:
                    _write(writer, replies)
                continue
            reply = self.handle(message)
            if reply is not None:
                _write(writer, reply)


def _result(msg_id: Any, result: Dict[str, Any]) -> Dict[str, Any]:
    return {"jsonrpc": "2.0", "id": msg_id, "result": result}


def _error(msg_id: Any, code: int, message: str) -> Dict[str, Any]:
    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": code, "message": message}}


def _write(writer: TextIO, payload: Any) -> None:
    writer.write(json.dumps(payload, default=_json_default, ensure_ascii=False) + "\n")
    writer.flush()


def _int_env(name: str) -> Optional[int]:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return None
    return int(raw)


def main() -> int:
    # Take the protocol channel private before anything else can print to it.
    protocol_out = os.fdopen(os.dup(1), "w", encoding="utf-8", newline="\n")
    os.dup2(2, 1)
    sys.stdout = sys.stderr

    user_id = _int_env("LANDSCAPE_MCP_USER_ID")
    if user_id is None:
        print("[landscape-connector] LANDSCAPE_MCP_USER_ID is not set; refusing to start.",
              file=sys.stderr)
        return 2
    log_path = Path(os.environ.get("LANDSCAPE_MCP_LOG")
                    or Path.home() / "Library" / "Logs" / "LandscapeConnector" / "calls.jsonl")
    default_project_id = _int_env("LANDSCAPE_MCP_DEFAULT_PROJECT_ID")

    if "--write-manifest" in sys.argv:
        # Regenerate tools_manifest.json from the live registry. Run after any
        # change to PILOT_TOOLS or to the schemas of the tools on it.
        connector = Connector(DjangoBackend(user_id), default_project_id=None)
        MANIFEST_PATH.write_text(
            json.dumps({"tools": connector.tools()}, indent=1, ensure_ascii=False) + "\n",
            encoding="utf-8")
        print(f"[landscape-connector] wrote {len(connector.tools())} tools to {MANIFEST_PATH}",
              file=sys.stderr)
        return 0

    manifest = load_manifest()
    if manifest is None:
        # No manifest: fall back to loading Django before answering anything.
        backend: Any = DjangoBackend(user_id)
    else:
        backend = LazyBackend(lambda: DjangoBackend(user_id))
    connector = Connector(backend, default_project_id=default_project_id,
                          log_path=log_path, manifest=manifest)
    print(f"[landscape-connector] listening: user {user_id}, "
          f"{'manifest' if manifest is not None else 'live'} tool list, log {log_path}",
          file=sys.stderr)
    reader = open(0, "r", encoding="utf-8", closefd=False)
    connector.serve(reader, protocol_out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
