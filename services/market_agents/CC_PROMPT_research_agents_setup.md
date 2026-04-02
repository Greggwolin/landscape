# CC Prompt: ULI/CREFC Research Harvesting Agents — Setup & Test

**Branch:** `main` (or current working branch)

---

## ⚠️ BEFORE YOU START

Read this entire prompt thoroughly, then ask any clarifying questions before executing.

⚠️ DO NOT modify any existing agent code (fred_agent.py, base_agent.py) beyond what's already been changed.

If anything is unclear about:
- The new file locations and their purposes
- Dependency installation order (playwright needs browser binaries)
- Database migration against Neon
- Environment variable setup
- How to verify each agent independently
- The difference between time-series agents and research agents

...ask first. Do not assume.

---

## OBJECTIVE

Complete the setup and testing of two new research harvesting agents (ULI + CREFC) that Cowork has written. The code is already in the repo — you need to install dependencies, run the migration, configure credentials, and test.

---

## CONTEXT

Cowork wrote the following new files:

| File | Purpose |
|------|---------|
| `migrations/20260402_research_harvest_tables.sql` | Three new DB tables |
| `services/market_agents/market_agents/agents/base_research_agent.py` | Shared base class for research agents |
| `services/market_agents/market_agents/agents/crefc_agent.py` | CREFC sentiment + article catalog agent |
| `services/market_agents/market_agents/agents/uli_agent.py` | ULI Knowledge Finder agent (Playwright auth) |

And modified:

| File | Change |
|------|--------|
| `services/market_agents/market_agents/config.py` | Added ULI credentials, agent toggles, PDF paths, research_hour |
| `services/market_agents/market_agents/orchestrator.py` | Added `build_research_roster()`, `run_research_agents()`, `--research` CLI flag, scheduler registration |

---

## DOWNSTREAM IMPACT

**No existing code is broken.** The FRED agent continues unchanged. All changes are additive:
- New DB tables (no FK to existing tables)
- New agent classes (separate base class from BaseAgent)
- Orchestrator additions are opt-in via config flags
- Config additions have safe defaults

---

## IMPLEMENTATION STEPS

### Step 1: Install Python dependencies

```bash
cd /Users/5150east/landscape/services/market_agents

# Add beautifulsoup4 (HTML parsing) and pdfplumber (table extraction)
poetry add beautifulsoup4 pdfplumber

# Add playwright (async browser automation for ULI auth)
poetry add playwright

# Install Playwright browser binaries
poetry run playwright install chromium
```

### Step 2: Create data directories

```bash
cd /Users/5150east/landscape
mkdir -p data/uli/pdfs/emerging_trends
mkdir -p data/uli/pdfs/research_report
mkdir -p data/uli/pdfs/advisory_panel
mkdir -p data/uli/pdfs/case_study
mkdir -p data/crefc/pdfs
```

### Step 3: Run database migration

```bash
psql $DATABASE_URL -f migrations/20260402_research_harvest_tables.sql
```

Verify tables were created:

```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name LIKE 'tbl_research%' ORDER BY table_name;"
```

Expected output — three tables:
- `tbl_research_financial_data`
- `tbl_research_harvest_log`
- `tbl_research_publication`

### Step 4: Add ULI credentials to .env

```bash
cd /Users/5150east/landscape/services/market_agents

# Add to the market_agents .env (create if needed)
echo 'ULI_EMAIL=<your-uli-member-email>' >> .env
echo 'ULI_PASSWORD=<your-uli-member-password>' >> .env
```

Also add to the main project `.env.local` if running from root:

```bash
cd /Users/5150east/landscape
echo 'ULI_EMAIL=<your-uli-member-email>' >> .env.local
echo 'ULI_PASSWORD=<your-uli-member-password>' >> .env.local
```

**Replace `<your-uli-member-email>` and `<your-uli-member-password>` with actual credentials.** Ask Gregg if you don't have them.

### Step 5: Test CREFC agent (no auth required)

```bash
cd /Users/5150east/landscape/services/market_agents
python -m market_agents.agents.crefc_agent
```

This should:
- Search PR Newswire for BOG Sentiment Index releases
- Crawl CREFC resource center categories
- Download IRP v8.4 PDF
- Upsert records to the database

Verify:

```bash
psql $DATABASE_URL -c "SELECT source, publication_type, COUNT(*) FROM landscape.tbl_research_publication WHERE source = 'crefc' GROUP BY source, publication_type;"
```

```bash
psql $DATABASE_URL -c "SELECT data_category, metric_name, metric_value, metric_unit FROM landscape.tbl_research_financial_data ORDER BY created_at DESC LIMIT 10;"
```

```bash
psql $DATABASE_URL -c "SELECT agent_name, status, publications_discovered, publications_new, pdfs_downloaded, errors FROM landscape.tbl_research_harvest_log ORDER BY run_started_at DESC LIMIT 3;"
```

### Step 6: Test ULI agent (requires auth)

```bash
cd /Users/5150east/landscape/services/market_agents
python -m market_agents.agents.uli_agent
```

This should:
- Launch Playwright, authenticate to ULI
- Browse Knowledge Finder content types
- Catalog publications and download available PDFs
- Extract financial data from PDF tables

If authentication fails, the agent logs the error and aborts gracefully. Check:

```bash
psql $DATABASE_URL -c "SELECT source, publication_type, COUNT(*) FROM landscape.tbl_research_publication WHERE source = 'uli' GROUP BY source, publication_type;"
```

### Step 7: Test research orchestration

```bash
cd /Users/5150east/landscape/services/market_agents
python -m market_agents.orchestrator --research
```

This runs both CREFC and ULI agents sequentially via the orchestrator.

### Step 8: Verify incremental mode

Run the CREFC agent a second time:

```bash
python -m market_agents.agents.crefc_agent
```

Check that `publications_new` is 0 on the second run:

```bash
psql $DATABASE_URL -c "SELECT agent_name, status, publications_new, publications_updated FROM landscape.tbl_research_harvest_log WHERE source = 'crefc' ORDER BY run_started_at DESC LIMIT 2;"
```

### Step 9: Full database verification

```bash
# Overall publication counts
psql $DATABASE_URL -c "SELECT source, publication_type, extraction_status, COUNT(*) FROM landscape.tbl_research_publication GROUP BY source, publication_type, extraction_status ORDER BY source, publication_type;"

# Financial data summary
psql $DATABASE_URL -c "SELECT rp.source, rfd.data_category, COUNT(*) FROM landscape.tbl_research_financial_data rfd JOIN landscape.tbl_research_publication rp ON rp.id = rfd.publication_id GROUP BY rp.source, rfd.data_category ORDER BY rp.source, rfd.data_category;"

# Harvest log
psql $DATABASE_URL -c "SELECT * FROM landscape.tbl_research_harvest_log ORDER BY run_started_at DESC LIMIT 5;"
```

---

## SUCCESS CRITERIA

All must pass:

1. [ ] Three `tbl_research_*` tables exist in `landscape` schema
2. [ ] CREFC agent runs without errors (at least partial success)
3. [ ] At least 1 sentiment index publication cataloged
4. [ ] At least 1 article metadata record from CREFC resource center
5. [ ] IRP v8.4 PDF downloaded to `data/crefc/pdfs/`
6. [ ] ULI agent authenticates via Playwright (if credentials provided)
7. [ ] ULI agent catalogs at least Emerging Trends publications
8. [ ] Harvest log records complete run statistics for both agents
9. [ ] Second run shows incremental mode working (0 new publications)
10. [ ] `python -m market_agents.orchestrator --research` runs both agents
11. [ ] No credentials in committed code — all from env vars
12. [ ] Existing FRED agent still works: `python -m market_agents.orchestrator` (without --research flag)

---

## TROUBLESHOOTING

**Playwright browser not found:**
```bash
poetry run playwright install chromium
```

**psycopg2 connection error:**
- Ensure `NEON_DB_URL` is set in the `.env` file
- Check the connection string includes `sslmode=require` for Neon

**ULI auth fails:**
- ULI's login flow may use SSO redirects. The Playwright selectors try multiple patterns.
- If selectors don't match, inspect the login page manually and update `uli_agent.py` selectors.
- Set `ULI_HARVEST_ENABLED=false` in .env to skip ULI and test CREFC independently.

**CREFC PR Newswire returns no results:**
- PR Newswire may have changed their HTML structure. Check `_extract_pr_newswire_links()` selectors.
- The agent logs discovered link counts — check the output.

**Import errors:**
- Make sure you're running from within the `services/market_agents/` directory with poetry
- Or use: `cd /Users/5150east/landscape/services/market_agents && poetry run python -m market_agents.agents.crefc_agent`

---

## SERVER RESTART

Not required — these agents run as standalone scripts, not as part of the Next.js/Django servers.

After completing this task, commit:

```bash
cd /Users/5150east/landscape
git add -A
git commit -m "feat: add ULI and CREFC research harvesting agents

- BaseResearchAgent with publication/financial data upserts, PDF download, table extraction
- CREFCAgent: BOG sentiment index, article catalog, IRP reference
- ULIAgent: Playwright auth, Knowledge Finder catalog, PDF financial data extraction
- Three new DB tables: tbl_research_publication, tbl_research_financial_data, tbl_research_harvest_log
- Orchestrator updated with --research flag and 5 AM schedule
- Config updated with ULI credentials, agent toggles, PDF paths"
git push origin main
```
