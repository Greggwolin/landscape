"""
Protocol and guard tests for the Claude connector. No Django, no database:
the backend is a fake, so these run anywhere.

    python -m pytest backend/claude_connector/tests -q -p no:django -c /dev/null
"""
import io
import json
from decimal import Decimal

from claude_connector.server import (
    Connector, PILOT_TOOLS, NO_PROJECT_TOOLS, MAX_RESULT_CHARS, DEFAULT_PROTOCOL,
)


class FakeBackend:
    def __init__(self, owned=(9,), mutations=(), missing=()):
        self.owned = list(owned)
        self.mutations = set(mutations)
        self.missing = set(missing)
        self.calls = []
        self.next_result = {"success": True, "total_budget": Decimal("40212345.67")}

    def schema(self, name):
        if name in self.missing:
            return None
        props = {"project_id": {"type": "integer"}} if name == "declares_project" else {}
        return {"name": name, "description": f"desc {name}",
                "input_schema": {"type": "object", "properties": props}}

    def is_registered(self, name):
        return name not in self.missing

    def is_mutation(self, name):
        return name in self.mutations

    def owned_project_ids(self):
        return list(self.owned)

    def owns_project(self, project_id):
        return project_id in self.owned

    def execute(self, name, tool_input, project_id):
        self.calls.append((name, dict(tool_input), project_id))
        if isinstance(self.next_result, Exception):
            raise self.next_result
        return self.next_result


def rpc(connector, method, params=None, msg_id=1):
    return connector.handle({"jsonrpc": "2.0", "id": msg_id, "method": method,
                             "params": params or {}})


def call(connector, name, arguments=None):
    reply = rpc(connector, "tools/call", {"name": name, "arguments": arguments})
    result = reply["result"]
    return json.loads(result["content"][0]["text"]), result["isError"]


def test_initialize_echoes_known_version_and_falls_back():
    c = Connector(FakeBackend())
    assert rpc(c, "initialize", {"protocolVersion": "2024-11-05"})["result"]["protocolVersion"] == "2024-11-05"
    reply = rpc(c, "initialize", {"protocolVersion": "2099-01-01"})["result"]
    assert reply["protocolVersion"] == DEFAULT_PROTOCOL
    assert "tools" in reply["capabilities"] and reply["instructions"]


def test_notifications_get_no_reply_and_unknown_method_errors():
    c = Connector(FakeBackend())
    assert c.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None
    assert rpc(c, "no/such")["error"]["code"] == -32601
    assert rpc(c, "ping")["result"] == {}


def test_tool_list_is_read_only_and_adds_project_id():
    c = Connector(FakeBackend(), default_project_id=9)
    tools = {t["name"]: t for t in rpc(c, "tools/list")["result"]["tools"]}
    assert set(tools) == set(PILOT_TOOLS)
    for name, tool in tools.items():
        assert tool["annotations"]["readOnlyHint"] is True
        has_pid = "project_id" in tool["inputSchema"]["properties"]
        assert has_pid == (name not in NO_PROJECT_TOOLS)


def test_a_tool_the_registry_marks_as_mutation_is_never_listed_or_run():
    backend = FakeBackend(mutations={"get_parcels"})
    c = Connector(backend, default_project_id=9)
    assert "get_parcels" not in [t["name"] for t in c.tools()]
    payload, is_error = call(c, "get_parcels")
    assert is_error and payload["error"] == "tool_not_available"
    assert backend.calls == []


def test_tool_outside_the_pilot_list_is_refused():
    backend = FakeBackend()
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "update_parcel", {"parcel_id": 1})
    assert is_error and payload["error"] == "tool_not_available"
    assert backend.calls == []


def test_project_the_user_does_not_own_is_refused():
    backend = FakeBackend(owned=(9,))
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "get_deal_summary", {"project_id": 17})
    assert is_error and payload["error"] == "project_not_found"
    assert backend.calls == []


def test_default_project_is_used_and_project_id_is_not_leaked_into_tool_input():
    backend = FakeBackend()
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "get_deal_summary")
    assert not is_error
    assert backend.calls == [("get_deal_summary", {}, 9)]
    call(c, "get_deal_summary", {"project_id": "9"})
    assert backend.calls[-1] == ("get_deal_summary", {}, 9)


def test_no_default_and_no_project_asks_for_one():
    c = Connector(FakeBackend())
    payload, is_error = call(c, "get_deal_summary")
    assert is_error and payload["error"] == "project_required"


def test_decimals_keep_their_digits_and_relay_note_is_attached():
    c = Connector(FakeBackend(), default_project_id=9)
    payload, _ = call(c, "get_deal_summary")
    assert payload["total_budget"] == "40212345.67"
    assert "_relay" in payload


def test_failed_tool_result_is_flagged_as_error():
    backend = FakeBackend()
    backend.next_result = {"success": False, "error": "nope"}
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "get_deal_summary")
    assert is_error and payload["error"] == "nope" and "_relay" not in payload


def test_exception_in_the_tool_becomes_a_refusal_not_a_crash():
    backend = FakeBackend()
    backend.next_result = RuntimeError("boom")
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "get_deal_summary")
    assert is_error and payload["error"] == "tool_failed"


def test_oversize_result_is_truncated_and_says_so():
    backend = FakeBackend()
    backend.next_result = {"success": True, "rows": ["x" * 100] * 2000}
    c = Connector(backend, default_project_id=9)
    payload, is_error = call(c, "get_budget_items")
    assert payload["truncated"] is True and payload["full_chars"] > MAX_RESULT_CHARS


def test_project_list_drops_projects_the_user_does_not_own():
    backend = FakeBackend(owned=(8, 9))
    backend.next_result = {"success": True, "count": 3, "projects": [
        {"project_id": 8}, {"project_id": 9}, {"project_id": 1002}]}
    c = Connector(backend)
    payload, _ = call(c, "list_projects_summary")
    assert [p["project_id"] for p in payload["projects"]] == [8, 9]
    assert payload["count"] == 2


def test_calls_are_logged_with_the_returned_text(tmp_path):
    log = tmp_path / "calls.jsonl"
    c = Connector(FakeBackend(), default_project_id=9, log_path=log)
    call(c, "get_deal_summary")
    record = json.loads(log.read_text().splitlines()[0])
    assert record["tool"] == "get_deal_summary" and record["project_id"] == 9
    assert "40212345.67" in record["result"]


def test_serve_reads_lines_and_survives_garbage():
    c = Connector(FakeBackend(), default_project_id=9)
    reader = io.StringIO("not json\n\n" + json.dumps({"jsonrpc": "2.0", "id": 7, "method": "ping"}) + "\n")
    writer = io.StringIO()
    c.serve(reader, writer)
    lines = [json.loads(l) for l in writer.getvalue().splitlines()]
    assert lines[0]["error"]["code"] == -32700 and lines[1] == {"jsonrpc": "2.0", "id": 7, "result": {}}


def test_handshake_and_tool_list_do_not_wait_for_a_slow_backend():
    import threading, time
    from claude_connector.server import LazyBackend

    release = threading.Event()

    def slow_factory():
        release.wait(5)
        return FakeBackend()

    manifest = [{"name": "get_deal_summary", "description": "d",
                 "inputSchema": {"type": "object", "properties": {}}}]
    c = Connector(LazyBackend(slow_factory), default_project_id=9, manifest=manifest)
    started = time.time()
    assert rpc(c, "initialize", {"protocolVersion": "2025-06-18"})["result"]["serverInfo"]
    assert [t["name"] for t in rpc(c, "tools/list")["result"]["tools"]] == ["get_deal_summary"]
    assert time.time() - started < 1.0          # answered while the backend is still loading
    release.set()
    payload, is_error = call(c, "get_deal_summary")   # a call waits, then runs
    assert not is_error and payload["total_budget"] == "40212345.67"


def test_backend_that_fails_to_start_is_reported_not_raised():
    from claude_connector.server import LazyBackend

    def broken():
        raise RuntimeError("no database")

    c = Connector(LazyBackend(broken), default_project_id=9, manifest=[])
    payload, is_error = call(c, "get_deal_summary")
    assert is_error and payload["error"] == "landscape_unavailable"
    assert "no database" in payload["message"]


def test_manifest_cannot_smuggle_in_a_tool_outside_the_pilot_list(tmp_path):
    from claude_connector.server import load_manifest

    path = tmp_path / "m.json"
    path.write_text(json.dumps({"tools": [{"name": "get_deal_summary"}, {"name": "update_parcel"}]}))
    assert [t["name"] for t in load_manifest(path)] == ["get_deal_summary"]
    assert load_manifest(tmp_path / "missing.json") is None


def test_shipped_manifest_matches_the_pilot_list():
    from claude_connector.server import load_manifest, MANIFEST_PATH

    tools = load_manifest()
    assert tools is not None, f"{MANIFEST_PATH} is missing — run server.py --write-manifest"
    assert {t["name"] for t in tools} == set(PILOT_TOOLS)
    assert all(t["annotations"]["readOnlyHint"] is True for t in tools)
