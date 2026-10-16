# VQ — Landscaper Web Research Tool — Technical Design

**Date:** 2026-10-16 (chat VQ) · **Status:** scoped, not built · **Decision owner:** Gregg (1a chosen 2026-10-16: build it, scope first)
**Plain-English companion:** `docs/assessments/VQ-Web-Research-Tool-Design-2026-10-16.html`

---

## 1. Problem

Landscaper has no tool that reaches the open web. Audited 2026-10-16: all 184 registered executors in `backend/apps/landscaper/tool_executor.py` + `tools/*.py` and every schema in `tool_schemas.py` — nothing reaches past Nominatim (geocoding), FRED and Census. The permit tool and entitlement-watching tools Gregg demos are Cowork/Claudine skills and scheduled tasks on the Mac, not Landscaper tools.

Consequence, observed 2026-10-16 (thread `c17114c4`, Sierra Reflections): "research it directly at the county" → *"I don't have tools to access external government websites"* → a how-to list for Gregg. The user is paying for an analyst and getting a librarian.

What a single web search would have found that afternoon (run from this session, 2026-10-16 4:35pm MST):

| Fact | Source |
|---|---|
| New tentative map **WTM24-001** and special use permits **WSUP25-0019** — the project was re-entitled in 2025–26, not riding the 2006 approval the 2020 article describes | Washoe County planning commission packet, 2026 |
| 759.69 ± gross acres, 940 SF lots proposed (1.24 DU/ac) vs 1,083 allowed under existing zoning; five phases; TMWA water via two 375,000-gal tanks; Pleasant Valley Interceptor lift station; 3.3M CY cut / 3.7M CY fill; mercury remediation cap; owner "World Properties, Inc." | County "Quick Summary" document, 09-19-2025 |
| Washoe BCC action 2026-03-10 (staff + applicant presentations on the county's application page) | washoecounty.gov/csd/…/applications/sierra-reflections/ |
| TMRPA Planning Commission approved 5–2 on 2026-06-15 after ~6 hours of public comment; traffic, water, schools, environment opposition | This Is Reno 2026-06-16; KOLO 2026-06-16 |

Everything the user asked for existed on public pages. The 2020 article Landscaper *did* read is stale on the one fact that matters (entitlement status).

## 2. Design

### 2.1 Two client-side tools, executed in Django

Landscaper's loop is a custom client-side tool loop (`@register_tool` registry, `execute_tool`, six `client.messages.create()` call sites in `ai_handler.py`, SDK pinned `anthropic==0.39.0`). Anthropic's server-side web search would require handling `server_tool_use` / `web_search_tool_result` blocks and an SDK upgrade across all six call sites — a high-risk change for no functional gain. **Rejected for slice 1.** Client-side tools fit the existing registry, gates, guard and logging unchanged.

| Tool | Input | Output | Notes |
|---|---|---|---|
| `web_search` | `query` (str), `site` (optional domain restriction, e.g. `washoecounty.gov`), `count` (≤10, default 6), `freshness` (optional `pd/pw/pm/py`) | `[{title, url, snippet, age}]`, `query_used`, `cost_usd`, `instruction` | Brave Search API (`api.search.brave.com/res/v1/web/search`). `site` becomes `site:` in the query. |
| `read_web_page` | `url`, `max_chars` (≤40,000, default 20,000), `focus` (optional substring to centre on) | `{url, final_url, title, content_type, text, truncated, fetched_at, instruction}` | `requests` GET, 20 s timeout, UA string naming Landscape. HTML → `trafilatura.extract()` (new dep) with `bs4` fallback; PDF → `PyMuPDF` text (already a dep; cap 60 pages, say so when capped). Hard-refuses non-http(s), private IP ranges, >25 MB. |

Both: `UNIVERSAL_TOOLS` + `UNASSIGNED_SAFE_TOOLS` (pre-project is the main use), page context `general`. Neither is a mutation.

### 2.2 Spend and rate gate (Gregg's $1/day rule, 2026-10-14)

- Brave: ~$5 per 1,000 searches, $5/month credit (costbench, verified 2026-08-17, "as of Oct 2026" — confirm on the Brave console at sign-up). A search is $0.005. Page reads are free.
- Settings: `WEB_RESEARCH_DAILY_SEARCH_CAP` (default **100** → $0.50/day ceiling, under the $1 gate without a per-use yes), `WEB_RESEARCH_TURN_SEARCH_CAP` (default **5**), `WEB_RESEARCH_PAGE_CAP_PER_TURN` (default **8**).
- Counter is persistent and shared across Railway workers: new table `landscape.tbl_web_research_log (id, created_at, user_id, thread_id, project_id, kind ('search'|'fetch'), query_or_url, result_count, cost_usd, blocked_reason)`. Daily count = rows with `kind='search'` and `created_at::date = today (America/Phoenix)`. Migration `20261016_create_tbl_web_research_log.up.sql` + `.down.sql`.
- Over cap → tool returns `success=False, error='daily_search_cap'` with an `instruction` to tell the user the day's research budget is spent and when it resets. Never silently degrade.

### 2.3 Fabrication and citation rules

- The reply-assembly guard (`_NUMBERS_PRODUCING_PREFIXES`, figure-level provenance) treats numbers that a tool returned as sourced. Add `web_search` and `read_web_page` to the prefixes so figures quoted from a fetched page pass — **and** add a citation rule to `BASE_INSTRUCTIONS`: every fact taken from the web is followed by its source (site name + date, URL once per source per reply). A fact without a `read_web_page` behind it is a snippet, and is labelled as one.
- `read_web_page` results carry an `instruction` field: *"Quote and cite this page; do not merge it with the project's own data without saying which is which."* Empty/blocked results carry: *"Nothing was retrieved — say so; do not describe what the page probably contains."* (2026-07-21 battery, 2026-10-16 Zonda invention: the empty path is where the model improvises.)
- Snippets are not pages. The prompt says a `web_search` result alone supports "a page titled X exists at Y, dated Z", nothing more.

### 2.4 Explicit-trigger discipline

Follow the `generate_location_brief` precedent (CLAUDE.md, "Location brief firing discipline"): the tools fire on explicit research asks — *research / look up / find / search / what does the county say / check the news / is this still approved* — and on a project-data question the project's own tables cannot answer **after** those tables were tried. Not on casual mentions. Schema descriptions say so; a battery run (`scripts/battery/`, spend-gated) proves it before merge.

### 2.5 Jurisdiction recipe (prompt, not code)

A workflow recipe added to the ten in `ai_handler.py`: for an entitlement/zoning/approval question on a known site — (1) search `site:<county>.gov <project name>` and `<project name> tentative map OR planned development OR special use permit`; (2) read the most official hit first (county application page, staff report, agenda) before news; (3) report case numbers, dates, decision body, vote, conditions, next hearing, and the owner of record as named on the county page; (4) flag any conflict with documents already attached (the 2020 article vs 2026 approvals is the canonical case); (5) offer to save the key documents to the chat/project (slice 3).

## 3. Slices

| Slice | Content | Risk tier (§4.9) | Proof |
|---|---|---|---|
| **1** | `web_search` + `read_web_page` tools, registry, settings, log table + migration, caps, guard prefixes, citation rule, `requests`/`trafilatura` deps, `BRAVE_SEARCH_API_KEY` on Railway + local | High (new deps, migration, prompt) | pytest for cap arithmetic and URL refusal (pure); live: the Sierra Reflections question in a pre-project chat returns WTM24-001 / WSUP25-0019 / 2026-06-15 with URLs; a no-key environment says so plainly |
| **2** | Jurisdiction recipe + trigger discipline + battery questions (6–8, ≈$1 at $0.15/turn — needs Gregg's yes under the 2026-10-14 rule) | Medium | Battery pass ≥ 90% on fire/offer/silent, matching the S7 v2 bar |
| **3** | `save_web_document(url, doc_type)` — fetch a PDF/page and file it as a `core_doc` on the chat or project through the existing upload + background extraction path (2026-10-16) | Medium | Saved county staff report appears in CHAT DOCUMENTS and reads back |
| **4 (later)** | Scheduled watch: re-run a saved query weekly and append changes to the project's activity feed — the in-app version of the entitlement-watching tasks | Medium | Out of scope for now; noted so slice 1's log table has `thread_id/project_id` to hang it on |

## 4. Downstream impact (slice 1)

- **Files:** `backend/apps/landscaper/tools/web_research_tools.py` (new), `tool_schemas.py` (+2), `tool_registry.py` (UNIVERSAL + UNASSIGNED), `ai_handler.py` (prefixes, citation rule, recipe), `config/settings.py` (+4 settings), `requirements.txt` (+trafilatura), `migrations/20261016_create_tbl_web_research_log.*.sql`, Railway env.
- **Consumers:** tool count in CLAUDE.md (286→288 registered); fabrication guard (`reply_states_unsourced_financials`) — adding prefixes widens what counts as sourced, so test that an *unsourced* figure in a web-citing reply is still withheld; `get_tools_for_unassigned()` list grows by 2 — the unassigned prompt's tool budget (15K soft ceiling noted in CLAUDE.md) must be re-measured.
- **Not touched:** project tables, financial engine, artifacts.
- **Known hazard:** Railway egress IPs are datacenter IPs; Akamai-fronted sites block them (LoopNet, 2026-04-25). County sites were not blocked from this session's container; the tool reports an HTTP block as a block, never as "no content".

## 5. The case against

- **Scope creep risk:** a general web tool invites "just Google it" answers that bypass the project's own data. The explicit-trigger rule and the tables-first rule are the mitigation; the battery is the proof.
- **Fabrication surface:** more sourced-looking text to invent around. The citation rule and the empty-path instructions are the mitigation; the Zonda invention of 2026-10-16 shows the empty path matters most.
- **Alternative — keep research outside the app (1b):** cheaper, already works here. Rejected by Gregg 2026-10-16 (1a): Landscape is sold as the analyst, and "research it at the county" is the first thing a land buyer asks.
- **What would make this wrong:** if county portals turn out to be mostly JS-driven case-search forms that a plain fetch cannot reach, slice 1 degrades to news + PDFs. Washoe is not that (static application pages + PDFs), but Maricopa's Accela portal may be. Check the second jurisdiction before generalising.

## 6. What Gregg owns

1. **Brave Search account + key** (third-party signup, spend): or say so and I open it under the Landscape email, $5/month credit, no card beyond that until told.
2. **Battery spend** for slice 2 (~$1): needs the explicit yes at run time.
3. Nothing else — the rest is engineering under standing authority.
