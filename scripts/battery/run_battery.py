#!/usr/bin/env python3
"""
Automated demo-question battery runner for Landscaper.

Default mode is dry-run and makes zero API calls.
"""

from __future__ import annotations

import argparse
import ast
import datetime as dt
import json
import os
import re
import statistics
import sys
import time
import uuid
from pathlib import Path
from typing import Any
from urllib import error, parse, request


SESSION_ID = "LSCMD-QB5-BATTERYRUNNER-0721"
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
QUESTIONS_PATH = SCRIPT_DIR / "questions.yaml"
RESULTS_DIR = SCRIPT_DIR / "results"
AI_HANDLER_PATH = REPO_ROOT / "backend" / "apps" / "landscaper" / "ai_handler.py"

RED_LATENCY_SECONDS = 90.0
YELLOW_LATENCY_SECONDS = 30.0
DEFAULT_TIMEOUT_SECONDS = 130.0
DEFAULT_PAGE_CONTEXT = "home"


class BatteryError(RuntimeError):
    pass


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if value == "true":
        return True
    if value == "false":
        return False
    if value == "null":
        return None
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return bytes(value[1:-1], "utf-8").decode("unicode_escape")
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    try:
        return int(value)
    except ValueError:
        return value


def load_questions(path: Path) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            if current:
                questions.append(current)
            current = {}
            stripped = stripped[2:].strip()
            if stripped:
                key, value = stripped.split(":", 1)
                current[key.strip()] = parse_scalar(value)
            continue
        if current is None:
            raise BatteryError(f"Invalid YAML shape before first list item: {raw_line}")
        if ":" not in stripped:
            raise BatteryError(f"Invalid YAML line: {raw_line}")
        key, value = stripped.split(":", 1)
        current[key.strip()] = parse_scalar(value)
    if current:
        questions.append(current)

    required = {"id", "family", "text", "expects", "critical", "write"}
    seen: set[str] = set()
    for q in questions:
        missing = required - set(q)
        if missing:
            raise BatteryError(f"Question {q.get('id', '<unknown>')} missing keys: {sorted(missing)}")
        qid = str(q["id"])
        if qid in seen:
            raise BatteryError(f"Duplicate question id: {qid}")
        seen.add(qid)
    return questions


def source_refusal_string() -> str:
    tree = ast.parse(AI_HANDLER_PATH.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == "guard_envelope" for t in node.targets):
            continue
        if not isinstance(node.value, ast.Dict):
            continue
        for key, value in zip(node.value.keys, node.value.values):
            if isinstance(key, ast.Constant) and key.value == "suggested_user_question":
                extracted = ast.literal_eval(value)
                if isinstance(extracted, str) and extracted.strip():
                    return extracted
    raise BatteryError(f"Could not source fabrication refusal string from {AI_HANDLER_PATH}")


def env_api_base() -> str:
    base = (
        os.environ.get("LANDSCAPE_API_URL")
        or os.environ.get("DJANGO_API_URL")
        or os.environ.get("NEXT_PUBLIC_DJANGO_API_URL")
    )
    if not base:
        raise BatteryError(
            "Set LANDSCAPE_API_URL, DJANGO_API_URL, or NEXT_PUBLIC_DJANGO_API_URL "
            "to the production Django API base URL."
        )
    base = base.rstrip("/")
    if "localhost" in base or "127.0.0.1" in base:
        raise BatteryError(
            f"Refusing to execute against local API base {base!r}; this runner is for production. "
            "Use --allow-local only if you are intentionally testing the harness."
        )
    return base


def selected_questions(args: argparse.Namespace, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = questions
    if args.only:
        wanted = {part.strip() for part in args.only.split(",") if part.strip()}
        selected = [q for q in selected if q["id"] in wanted]
        missing = wanted - {q["id"] for q in selected}
        if missing:
            raise BatteryError(f"Unknown question ids in --only: {', '.join(sorted(missing))}")
    if args.family:
        selected = [q for q in selected if q["family"] == args.family]
    if not args.allow_writes:
        selected = [q for q in selected if not q["write"]]
    if not selected:
        raise BatteryError("No questions selected.")
    return selected


def repetitions_for(question: dict[str, Any], args: argparse.Namespace) -> int:
    return int(args.reps_critical if question["critical"] else args.reps)


def planned_turns(questions: list[dict[str, Any]], args: argparse.Namespace) -> int:
    return sum(repetitions_for(q, args) for q in questions)


class ApiClient:
    def __init__(self, base_url: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token: str | None = os.environ.get("LANDSCAPE_ACCESS_TOKEN")
        self.request_count = 0

    def authenticate(self) -> None:
        if self.token:
            return
        username = os.environ.get("BATTERY_USERNAME") or os.environ.get("LANDSCAPE_USERNAME") or os.environ.get("TEST_USERNAME")
        password = os.environ.get("BATTERY_PASSWORD") or os.environ.get("LANDSCAPE_PASSWORD") or os.environ.get("TEST_PASSWORD")
        if not username or not password:
            raise BatteryError(
                "Set LANDSCAPE_ACCESS_TOKEN or username/password env vars "
                "(BATTERY_USERNAME/BATTERY_PASSWORD preferred)."
            )
        last_error: Exception | None = None
        for endpoint in ("/api/auth/login/", "/api/token/"):
            try:
                data = self.post(endpoint, {"username": username, "password": password}, auth=False)
                tokens = data.get("tokens", {}) if isinstance(data, dict) else {}
                token = (
                    tokens.get("access") if isinstance(tokens, dict) else None
                ) or data.get("access") or data.get("token") or data.get("access_token")
                if token:
                    self.token = token
                    return
            except Exception as exc:
                last_error = exc
        raise BatteryError(f"Authentication failed: {last_error}")

    def headers(self, auth: bool = True) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if auth:
            if not self.token:
                raise BatteryError("Missing access token.")
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def request_json(
        self,
        method: str,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        *,
        auth: bool = True,
    ) -> tuple[int, dict[str, Any], str]:
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = request.Request(url, data=body, headers=self.headers(auth=auth), method=method)
        self.request_count += 1
        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8", errors="replace")
                return response.status, parse_response_body(raw), raw
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            parsed = parse_response_body(raw)
            return exc.code, parsed, raw

    def post(self, endpoint: str, payload: dict[str, Any], *, auth: bool = True) -> dict[str, Any]:
        status, data, _raw = self.request_json("POST", endpoint, payload, auth=auth)
        if not (200 <= status < 300):
            raise BatteryError(f"POST {endpoint} failed with HTTP {status}: {data}")
        return data

    def create_thread(self, project_id: int, page_context: str, subtab_context: str) -> tuple[int, dict[str, Any]]:
        payload = {
            "project_id": project_id,
            "page_context": page_context,
            "subtab_context": subtab_context,
        }
        status, data, _raw = self.request_json("POST", "/api/landscaper/threads/", payload)
        return status, data

    def send_message(self, thread_id: str, content: str, page_context: str) -> tuple[int, dict[str, Any], str]:
        payload = {"content": content, "page_context": page_context}
        endpoint = f"/api/landscaper/threads/{thread_id}/messages/"
        return self.request_json("POST", endpoint, payload)

    def archive_thread(self, thread_id: str) -> tuple[int, dict[str, Any]]:
        status, data, _raw = self.request_json("DELETE", f"/api/landscaper/threads/{thread_id}/")
        return status, data


def parse_response_body(raw: str) -> dict[str, Any]:
    body = raw.strip()
    if not body:
        return {"success": False, "error": "Empty response body"}

    # Stage-1 event streaming is NDJSON with a final payload envelope.
    final_payload: dict[str, Any] | None = None
    saw_event = False
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict) and "e" in event:
            saw_event = True
            if event.get("e") == "final" and isinstance(event.get("payload"), dict):
                final_payload = event["payload"]
    if final_payload is not None:
        return final_payload
    if saw_event:
        return {"success": False, "error": "Streaming response ended without final payload"}

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        # Legacy heartbeat mode should be whitespace + JSON. If an edge or proxy
        # prefixes text before the JSON object, recover from the first object.
        first_object = body.find("{")
        if first_object >= 0:
            try:
                parsed = json.loads(body[first_object:])
            except json.JSONDecodeError:
                parsed = None
        else:
            parsed = None
        if parsed is None:
            preview = body[:500]
            return {"success": False, "error": "Non-JSON response body", "raw_preview": preview}
    return parsed if isinstance(parsed, dict) else {"success": False, "response": parsed}


def thread_id_from(data: dict[str, Any]) -> str | None:
    thread = data.get("thread") if isinstance(data, dict) else None
    if not isinstance(thread, dict):
        return None
    return thread.get("threadId") or thread.get("id")


def assistant_from(data: dict[str, Any]) -> dict[str, Any]:
    msg = data.get("assistant_message") if isinstance(data, dict) else None
    return msg if isinstance(msg, dict) else {}


def tool_name(call: Any) -> str:
    if isinstance(call, dict):
        return str(call.get("tool") or call.get("name") or call.get("tool_name") or "<unknown>")
    return str(call)


def first_line(text: str) -> str:
    for line in text.strip().splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def near_top_soft_failure(reply: str) -> bool:
    top = "\n".join(reply.strip().splitlines()[:4]).lower()
    return bool(re.search(r"\b(error|failed|unable to)\b", top))


def evaluate_result(
    *,
    question: dict[str, Any],
    status: int,
    reply: str,
    metadata: dict[str, Any],
    tool_calls: list[Any],
    latency_seconds: float,
    refusal_string: str,
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    if not (200 <= status < 300):
        reasons.append(f"HTTP {status}")
    if refusal_string and refusal_string in reply:
        reasons.append("fabrication guard refusal string")
    if metadata.get("fabrication_guard_blocked") is True:
        reasons.append("fabrication_guard_blocked=true")
    if question["expects"] == "numbers" and not tool_calls:
        reasons.append("numbers question with no tool_calls")
    if near_top_soft_failure(reply):
        reasons.append("soft failure phrase near top")
    if latency_seconds > RED_LATENCY_SECONDS:
        reasons.append(f"latency>{int(RED_LATENCY_SECONDS)}s")
    if reasons:
        return "RED", reasons
    if latency_seconds > YELLOW_LATENCY_SECONDS:
        return "YELLOW", [f"latency>{int(YELLOW_LATENCY_SECONDS)}s"]
    return "GREEN", []


def run_one(
    *,
    client: ApiClient,
    question: dict[str, Any],
    rep: int,
    project_id: int,
    page_context: str,
    run_id: str,
    refusal_string: str,
    created_thread_ids: list[str],
) -> dict[str, Any]:
    subtab_context = f"battery:{run_id}:{question['id']}:rep{rep}"
    create_status, create_data = client.create_thread(project_id, page_context, subtab_context)
    thread_id = thread_id_from(create_data)
    if thread_id:
        created_thread_ids.append(thread_id)
    if not thread_id:
        result = {
            "question_id": question["id"],
            "family": question["family"],
            "rep": rep,
            "thread_id": None,
            "create_http_status": create_status,
            "http_status": create_status,
            "latency_seconds": 0.0,
            "bucket": "RED",
            "reasons": [f"thread create failed: {create_data}"],
            "tool_calls": [],
            "fabrication_guard_blocked": None,
            "fabrication_guard": None,
            "reply": "",
            "response": create_data,
        }
        return result

    started = time.monotonic()
    status, data, raw = client.send_message(thread_id, str(question["text"]), page_context)
    latency_seconds = time.monotonic() - started

    assistant = assistant_from(data)
    reply = str(assistant.get("content") or data.get("error") or "")
    metadata = assistant.get("metadata") if isinstance(assistant.get("metadata"), dict) else {}
    tool_calls = metadata.get("tool_calls") or []
    if not isinstance(tool_calls, list):
        tool_calls = []

    bucket, reasons = evaluate_result(
        question=question,
        status=status,
        reply=reply,
        metadata=metadata,
        tool_calls=tool_calls,
        latency_seconds=latency_seconds,
        refusal_string=refusal_string,
    )
    return {
        "question_id": question["id"],
        "family": question["family"],
        "rep": rep,
        "thread_id": thread_id,
        "create_http_status": create_status,
        "http_status": status,
        "latency_seconds": round(latency_seconds, 3),
        "bucket": bucket,
        "reasons": reasons,
        "tool_calls": tool_calls,
        "tool_names": [tool_name(c) for c in tool_calls],
        "fabrication_guard_blocked": metadata.get("fabrication_guard_blocked"),
        "fabrication_guard": metadata.get("fabrication_guard"),
        "reply": reply,
        "response": data,
        "raw_response": raw,
    }


def signature_for(result: dict[str, Any]) -> tuple[Any, ...]:
    return (
        result.get("bucket"),
        tuple(sorted(set(result.get("tool_names") or []))),
        bool(result.get("fabrication_guard_blocked")),
        first_line(str(result.get("reply") or ""))[:160],
    )


def group_results(results: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for result in results:
        grouped.setdefault(str(result["question_id"]), []).append(result)
    return grouped


def find_disagreements(results: list[dict[str, Any]]) -> dict[str, list[tuple[Any, ...]]]:
    disagreements: dict[str, list[tuple[Any, ...]]] = {}
    for qid, rows in group_results(results).items():
        signatures = sorted(set(signature_for(row) for row in rows))
        if len(signatures) > 1:
            disagreements[qid] = signatures
    return disagreements


def final_bucket(rows: list[dict[str, Any]], disagrees: bool) -> str:
    buckets = {row["bucket"] for row in rows}
    if "RED" in buckets:
        return "RED"
    if "YELLOW" in buckets or disagrees:
        return "YELLOW"
    return "GREEN"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def markdown_summary(
    *,
    questions: list[dict[str, Any]],
    results: list[dict[str, Any]],
    cleanup: list[dict[str, Any]],
    run_meta: dict[str, Any],
) -> str:
    question_by_id = {q["id"]: q for q in questions}
    grouped = group_results(results)
    disagreements = find_disagreements(results)
    lines: list[str] = []
    lines.append(f"# Battery Run {run_meta['run_id']}")
    lines.append("")
    lines.append(f"- Session: `{SESSION_ID}`")
    lines.append(f"- Project: `{run_meta['project_id']}`")
    lines.append(f"- Started: `{run_meta['started_at']}`")
    lines.append(f"- Completed: `{run_meta.get('completed_at', '')}`")
    lines.append(f"- Questions: `{len(questions)}`")
    lines.append(f"- Turns: `{len(results)}`")
    lines.append(f"- Threads created: `{len(run_meta.get('created_thread_ids', []))}`")
    lines.append(f"- Cleanup attempts: `{len(cleanup)}`")
    lines.append("")
    lines.append("## Repetition Disagreements")
    lines.append("")
    if disagreements:
        for qid in sorted(disagreements):
            q = question_by_id.get(qid, {"text": ""})
            lines.append(f"- **{qid}**: {q['text']}")
    else:
        lines.append("None.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| ID | Bucket | Pass Rate | Median Latency | Tools Fired | First Reply Line |")
    lines.append("|---|---:|---:|---:|---|---|")
    for q in questions:
        rows = grouped.get(q["id"], [])
        disagrees = q["id"] in disagreements
        if not rows:
            lines.append(f"| {q['id']} | NOT RUN | 0/0 | - | - | - |")
            continue
        bucket = final_bucket(rows, disagrees)
        pass_count = sum(1 for row in rows if row["bucket"] == "GREEN")
        median_latency = statistics.median(float(row["latency_seconds"]) for row in rows)
        tools = sorted({name for row in rows for name in (row.get("tool_names") or [])})
        first = first_line(str(rows[0].get("reply") or "")).replace("|", "\\|")
        if len(first) > 180:
            first = first[:177] + "..."
        lines.append(
            f"| {q['id']} | {bucket} | {pass_count}/{len(rows)} | "
            f"{median_latency:.1f}s | {', '.join(tools) if tools else '-'} | {first or '-'} |"
        )
    lines.append("")
    lines.append("## RED/YELLOW Reasons")
    lines.append("")
    any_reason = False
    for row in results:
        if row["bucket"] in ("RED", "YELLOW") or row["question_id"] in disagreements:
            any_reason = True
            reasons = list(row.get("reasons") or [])
            if row["question_id"] in disagreements and "cross-rep disagreement" not in reasons:
                reasons.append("cross-rep disagreement")
            lines.append(
                f"- **{row['question_id']} rep {row['rep']} ({row['bucket']})**: "
                f"{'; '.join(reasons) if reasons else 'no reason recorded'}"
            )
    if not any_reason:
        lines.append("None.")
    return "\n".join(lines) + "\n"


def print_plan(args: argparse.Namespace, questions: list[dict[str, Any]]) -> None:
    turns = planned_turns(questions, args)
    excluded_writes = [q["id"] for q in load_questions(QUESTIONS_PATH) if q["write"] and q not in questions]
    print(f"Session: {SESSION_ID}")
    print(f"Mode: {'execute' if args.execute else 'dry-run'}")
    print(f"Project: {args.project}")
    print(f"Page context: {args.page_context}")
    print(f"Questions selected: {len(questions)}")
    print(f"Estimated turns: {turns}")
    print(f"Write-tagged excluded: {', '.join(excluded_writes) if excluded_writes else 'none'}")
    print("")
    for q in questions:
        reps = repetitions_for(q, args)
        marker = " WRITE" if q["write"] else ""
        print(f"{q['id']:>2} x{reps} [{q['family']}/{q['expects']}]{marker}: {q['text']}")
    if not args.execute:
        print("")
        print("Dry run complete. API calls made: 0")


def require_confirmation(args: argparse.Namespace, turns: int) -> None:
    if not args.execute or args.yes or turns <= args.confirm_threshold:
        return
    if not sys.stdin.isatty():
        raise BatteryError(
            f"Run has {turns} turns, above threshold {args.confirm_threshold}; pass --yes to run non-interactively."
        )
    answer = input(f"Run {turns} production turns? Type 'yes' to continue: ")
    if answer.strip().lower() != "yes":
        raise BatteryError("Execution cancelled.")


def cleanup_threads(client: ApiClient, thread_ids: list[str]) -> list[dict[str, Any]]:
    cleanup: list[dict[str, Any]] = []
    for thread_id in list(dict.fromkeys(thread_ids)):
        try:
            status, data = client.archive_thread(thread_id)
            cleanup.append({"thread_id": thread_id, "http_status": status, "response": data})
        except Exception as exc:
            cleanup.append({"thread_id": thread_id, "http_status": None, "error": str(exc)})
    return cleanup


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Landscaper demo question battery.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Print the plan and make zero API calls (default).")
    mode.add_argument("--execute", action="store_true", help="Make production API calls.")
    parser.add_argument("--project", type=int, required=True, help="Target project id, e.g. 9.")
    parser.add_argument("--questions", type=Path, default=QUESTIONS_PATH, help="Question YAML file.")
    parser.add_argument("--only", help="Comma-separated question ids, e.g. A1,C1,C2.")
    parser.add_argument("--family", help="Question family to run, e.g. scenarios.")
    parser.add_argument("--reps", type=int, default=1, help="Repetitions for non-critical questions.")
    parser.add_argument("--reps-critical", type=int, default=5, help="Repetitions for critical questions.")
    parser.add_argument("--allow-writes", action="store_true", help="Include write-tagged questions.")
    parser.add_argument("--yes", action="store_true", help="Skip high-turn confirmation.")
    parser.add_argument("--confirm-threshold", type=int, default=100, help="Require confirmation above this turn count.")
    parser.add_argument("--delay-seconds", type=float, default=2.0, help="Delay between turns.")
    parser.add_argument("--timeout-seconds", type=float, default=DEFAULT_TIMEOUT_SECONDS, help="HTTP timeout per request.")
    parser.add_argument("--page-context", default=DEFAULT_PAGE_CONTEXT, help="Thread/message page_context.")
    parser.add_argument("--env-file", type=Path, default=REPO_ROOT / ".env.local", help="Optional env file to load.")
    parser.add_argument("--allow-local", action="store_true", help="Allow localhost API base for harness testing.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if not args.execute:
        args.dry_run = True
    if args.reps < 1 or args.reps_critical < 1:
        raise BatteryError("Repetition counts must be >= 1.")

    load_dotenv(args.env_file)
    questions = selected_questions(args, load_questions(args.questions))
    print_plan(args, questions)
    if not args.execute:
        return 0

    turns = planned_turns(questions, args)
    require_confirmation(args, turns)

    base = (
        os.environ.get("LANDSCAPE_API_URL")
        or os.environ.get("DJANGO_API_URL")
        or os.environ.get("NEXT_PUBLIC_DJANGO_API_URL")
    )
    if not base:
        raise BatteryError("Set LANDSCAPE_API_URL, DJANGO_API_URL, or NEXT_PUBLIC_DJANGO_API_URL.")
    if not args.allow_local and ("localhost" in base or "127.0.0.1" in base):
        raise BatteryError(f"Refusing local API base {base!r}; pass --allow-local for harness testing.")

    refusal_string = source_refusal_string()
    client = ApiClient(base, timeout=args.timeout_seconds)
    client.authenticate()

    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    created_thread_ids: list[str] = []
    results: list[dict[str, Any]] = []
    cleanup: list[dict[str, Any]] = []
    started_at = dt.datetime.now(dt.timezone.utc).isoformat()
    interrupted = False
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        for q in questions:
            reps = repetitions_for(q, args)
            for rep in range(1, reps + 1):
                print(f"Running {q['id']} rep {rep}/{reps}...")
                result = run_one(
                    client=client,
                    question=q,
                    rep=rep,
                    project_id=args.project,
                    page_context=args.page_context,
                    run_id=run_id,
                    refusal_string=refusal_string,
                    created_thread_ids=created_thread_ids,
                )
                results.append(result)
                print(
                    f"  {result['bucket']} {result['latency_seconds']}s "
                    f"tools={','.join(result.get('tool_names') or []) or '-'}"
                )
                if args.delay_seconds > 0:
                    time.sleep(args.delay_seconds)
    except KeyboardInterrupt:
        interrupted = True
        print("\nInterrupted; archiving created threads before exit.", file=sys.stderr)
    finally:
        cleanup = cleanup_threads(client, created_thread_ids)
        completed_at = dt.datetime.now(dt.timezone.utc).isoformat()
        payload = {
            "session_id": SESSION_ID,
            "run_id": run_id,
            "started_at": started_at,
            "completed_at": completed_at,
            "interrupted": interrupted,
            "project_id": args.project,
            "page_context": args.page_context,
            "api_base": client.base_url,
            "request_count": client.request_count,
            "questions": questions,
            "created_thread_ids": created_thread_ids,
            "results": results,
            "cleanup": cleanup,
        }
        json_path = RESULTS_DIR / f"{run_id}.json"
        md_path = RESULTS_DIR / f"{run_id}.md"
        write_json(json_path, payload)
        md_path.write_text(
            markdown_summary(
                questions=questions,
                results=results,
                cleanup=cleanup,
                run_meta=payload,
            ),
            encoding="utf-8",
        )
        print(f"Results JSON: {json_path}")
        print(f"Summary MD: {md_path}")
        failed_cleanup = [row for row in cleanup if not row.get("http_status") or not (200 <= int(row["http_status"]) < 300)]
        if failed_cleanup:
            print(f"WARNING: {len(failed_cleanup)} cleanup attempts failed.", file=sys.stderr)
        if interrupted:
            return 130
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except BatteryError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
