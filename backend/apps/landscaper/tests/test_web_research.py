"""
Web research tools (chat VQ, 2026-10-16). No network, no database: the
search service and the daily counter are replaced with stand-ins.
"""
from types import SimpleNamespace

import pytest

from apps.landscaper.services import web_research as wr
from apps.landscaper.tools import web_research_tools as tools


# ── pure helpers ───────────────────────────────────────────────────────────

def test_build_query_adds_site_once():
    assert wr.build_query("Sierra Reflections", "https://washoecounty.gov/") == \
        "Sierra Reflections site:washoecounty.gov"
    assert wr.build_query("x site:a.gov", "a.gov") == "x site:a.gov"


def test_build_query_rejects_empty():
    with pytest.raises(wr.WebResearchError) as e:
        wr.build_query("  ")
    assert e.value.code == "empty_query"


@pytest.mark.parametrize("url", [
    "file:///etc/passwd", "ftp://example.com/x", "http://127.0.0.1:8000/admin",
    "http://10.0.0.5/", "http://169.254.169.254/latest/meta-data", "http://user:pw@example.com/",
])
def test_private_and_odd_addresses_are_refused(url):
    ok, reason = wr.check_public_url(url)
    assert not ok and reason


def test_window_text_centres_on_focus():
    text = "a" * 5000 + "CONDITIONS OF APPROVAL" + "b" * 5000
    out, truncated = wr.window_text(text, 2000, "conditions of approval")
    assert truncated and "CONDITIONS OF APPROVAL" in out and len(out) == 2000


def test_html_to_text_drops_scripts_and_keeps_title():
    html = "<html><head><title> Staff Report </title><script>x=1</script></head>" \
           "<body><nav>menu</nav><main><h1>WTM24-001</h1><p>Approved 5-2.</p></main></body></html>"
    title, text = wr.html_to_text(html)
    assert title == "Staff Report"
    assert "WTM24-001" in text and "Approved 5-2." in text
    assert "x=1" not in text and "menu" not in text


def test_brave_search_parses_results_and_reports_failures():
    class Sess:
        def __init__(self, status, payload=None):
            self.status, self.payload = status, payload

        def get(self, url, **kw):
            assert kw["headers"]["X-Subscription-Token"] == "k"
            return SimpleNamespace(status_code=self.status, json=lambda: self.payload)

    payload = {"web": {"results": [{"title": "Planning Commission WTM24-001", "url": "https://a.gov/x",
                                    "description": "Sierra Reflections", "age": "January 6, 2026",
                                    "meta_url": {"hostname": "a.gov"}}]}}
    out = wr.brave_search("Sierra Reflections", "k", site="a.gov", session=Sess(200, payload))
    assert out["query_used"].endswith("site:a.gov")
    assert out["results"][0] == {"title": "Planning Commission WTM24-001", "url": "https://a.gov/x",
                                 "site": "a.gov", "age": "January 6, 2026", "snippet": "Sierra Reflections"}
    with pytest.raises(wr.WebResearchError) as e:
        wr.brave_search("q", "k", session=Sess(401))
    assert e.value.code == "search_unauthorized"
    with pytest.raises(wr.WebResearchError) as e:
        wr.brave_search("q", "")
    assert e.value.code == "not_configured"


# ── tool wrappers: caps and relay instructions ─────────────────────────────

@pytest.fixture
def no_db(monkeypatch):
    monkeypatch.setattr(tools, "searches_today", lambda: 0)


def test_turn_cap_stops_the_sixth_search(no_db, settings):
    settings.WEB_RESEARCH_TURN_SEARCH_CAP = 5
    out = tools.web_search_tool({"query": "x"}, prior_tool_calls=["web_search"] * 6)
    assert out["success"] is False and out["error"] == "turn_search_cap"
    assert "Do not search again" in out["instruction"]


def test_daily_cap_refuses_and_says_when_it_resets(monkeypatch, settings):
    settings.WEB_RESEARCH_DAILY_SEARCH_CAP = 60
    monkeypatch.setattr(tools, "searches_today", lambda: 60)
    out = tools.web_search_tool({"query": "x"}, prior_tool_calls=["web_search"])
    assert out["error"] == "daily_search_cap" and "midnight" in out["message"]


def test_search_results_carry_read_and_cite_instruction(no_db, monkeypatch, settings):
    settings.BRAVE_SEARCH_API_KEY = "k"
    monkeypatch.setattr(tools, "brave_search", lambda *a, **k: {
        "query_used": "q", "results": [{"title": "t", "url": "https://a.gov", "site": "a.gov",
                                        "age": None, "snippet": "s"}]})
    out = tools.web_search_tool({"query": "q"}, prior_tool_calls=["web_search"])
    assert out["success"] and "read_web_page" in out["instruction"] and "source" in out["instruction"]


def test_failed_read_forbids_describing_the_page(monkeypatch):
    def boom(*a, **k):
        raise wr.WebResearchError("fetch_blocked", "The site refused the request (HTTP 403).")
    monkeypatch.setattr(tools, "fetch_page", boom)
    out = tools.read_web_page_tool({"url": "https://news.example/x"}, prior_tool_calls=["read_web_page"])
    assert out["success"] is False and out["error"] == "fetch_blocked"
    assert "do NOT" in out["instruction"]


def test_web_tools_reach_every_chat():
    from apps.landscaper.tool_registry import UNASSIGNED_SAFE_TOOLS, UNIVERSAL_TOOLS
    for name in ("web_search", "read_web_page"):
        assert name in UNIVERSAL_TOOLS and name in UNASSIGNED_SAFE_TOOLS


# ── save_web_document + link guard (VQ, 2026-10-17) ─────────────────────────

def test_file_name_comes_from_the_address_or_header():
    assert wr.file_name_for("https://a.gov/Files/8D%20-Sierra%20Staff.pdf", None, "application/pdf") == "8D -Sierra Staff.pdf"
    assert wr.file_name_for("https://a.gov/get?id=1", 'attachment; filename="WTM24-001_sr.pdf"', "application/pdf") == "WTM24-001_sr.pdf"
    assert wr.file_name_for("https://a.gov/", None, "application/pdf") == "web-document.pdf"


def test_streamed_upload_body_is_exactly_its_declared_length(tmp_path):
    f = tmp_path / "x.pdf"
    f.write_bytes(b"%PDF-" + b"z" * 3_000_000)
    body = wr._MultipartFile(str(f), "file", 'a"b.pdf', "application/pdf")
    data = b""
    while True:
        chunk = body.read(8192)
        if not chunk:
            break
        data += chunk
    assert len(data) == len(body) and data.endswith(f"--{body.boundary}--\r\n".encode())
    assert b'filename="a_b.pdf"' in data


def test_too_large_read_tells_the_model_to_save_not_to_send_the_user_away(monkeypatch):
    def big(*a, **k):
        raise wr.WebResearchError("fetch_too_large", "The file is larger than 25 MB and was not read.")
    monkeypatch.setattr(tools, "fetch_page", big)
    out = tools.read_web_page_tool({"url": "https://a.gov/sr.pdf"}, prior_tool_calls=["read_web_page"])
    assert out["error"] == "fetch_too_large" and "save_web_document" in out["instruction"]
    assert "https://a.gov/sr.pdf" in out["instruction"]


def test_save_refuses_private_addresses_and_needs_a_place():
    out = tools.save_web_document_tool({"url": "http://127.0.0.1/x.pdf"})
    assert out["success"] is False and out["error"] == "url_refused"


def test_save_starts_in_background_and_does_not_double_start(monkeypatch):
    monkeypatch.setattr(tools, "check_public_url", lambda u: (True, ""))
    monkeypatch.setattr(tools, "_already_saved", lambda *a: None)
    started = []
    monkeypatch.setattr(tools, "_save_to_documents", lambda *a: started.append(a))

    class T:
        def __init__(self, target, **kw):
            self.target = target

        def start(self):
            pass  # leave it "in flight"
    monkeypatch.setattr(tools.threading, "Thread", T)
    tools._IN_FLIGHT.clear()
    first = tools.save_web_document_tool({"url": "https://a.gov/sr.pdf"}, thread_id="t-1")
    again = tools.save_web_document_tool({"url": "https://a.gov/sr.pdf"}, thread_id="t-1")
    tools._IN_FLIGHT.clear()
    assert first["saving"] and "chat's documents" in first["instruction"]
    assert again.get("already_saving")


def test_save_reports_an_existing_copy(monkeypatch):
    monkeypatch.setattr(tools, "check_public_url", lambda u: (True, ""))
    monkeypatch.setattr(tools, "_already_saved", lambda *a: {"doc_id": 9, "doc_name": "sr.pdf", "processing_status": "ready"})
    out = tools.save_web_document_tool({"url": "https://a.gov/sr.pdf"}, project_id=3)
    assert out["already_saved"] and "get_document_content" in out["instruction"]


def test_link_guard_keeps_links_a_tool_returned_and_drops_invented_ones():
    from apps.landscaper.ai_handler import unverified_links_removed
    tools_out = [{"tool": "web_search", "result": {"results": [
        {"url": "https://www.washoecounty.gov/csd/planning_and_development/applications/apps_commish_district_two.php"}]}}]
    reply = ("See https://www.washoecounty.gov/csd/planning_and_development/applications/apps_commish_district_two.php. "
             "Also [conditions](https://www.washoecounty.gov/made/up.pdf) and https://guess.gov/x.")
    out, n = unverified_links_removed(reply, tools_out, [{"role": "user", "content": "hi"}])
    assert n == 2
    assert "apps_commish_district_two.php." in out
    assert "made/up" not in out and "guess.gov" not in out
    assert "conditions (no verified link)" in out


def test_link_guard_trusts_links_already_in_the_conversation():
    from apps.landscaper.ai_handler import unverified_links_removed
    out, n = unverified_links_removed("Again: https://a.gov/x_y.pdf", [],
                                      [{"role": "assistant", "content": "Source: https://a.gov/x_y.pdf"}])
    assert n == 0 and out.endswith("x_y.pdf")


def test_save_tool_reaches_every_chat():
    from apps.landscaper.tool_registry import UNASSIGNED_SAFE_TOOLS, UNIVERSAL_TOOLS
    assert "save_web_document" in UNIVERSAL_TOOLS and "save_web_document" in UNASSIGNED_SAFE_TOOLS
