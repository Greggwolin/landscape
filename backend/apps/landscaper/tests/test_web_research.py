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
