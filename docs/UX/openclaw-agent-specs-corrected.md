# OpenClaw Agent Specifications — Corrected

**Date:** 2026-03-05
**Source:** Original specs by Claude (no codebase access), corrected by Claude (with full codebase access)
**Changes marked with:** `# ← CORRECTED` comments inline

---

## Orchestrator

```yaml
name: landscape-orchestrator
description: >
  Master agent for Landscape platform health checks.
  Runs subagents on schedule or on-demand and produces
  a consolidated health report.

model: claude-via-api

schedule:
  frequent:     "*/30 * * * 1-5"
  daily:        "0 8 * * 1-5"
  hourly:       "0 * * * *"

triggers:
  - on-demand

context:
  repo_root: "~/path/to/landscape"
  db_connection: "${NEON_DATABASE_URL}"
  claude_md_path: "CLAUDE.md"

subagents:
  frequent:
    - coreui-compliance-auditor
    - django-api-route-enforcer

  daily:
    - allowed-updates-auditor
    - dead-tool-detector
    - claudemd-sync-checker

  hourly:
    - extraction-queue-monitor

  on-demand:
    - coreui-compliance-auditor
    - allowed-updates-auditor
    - claudemd-sync-checker
    - django-api-route-enforcer
    - dead-tool-detector
    - extraction-queue-monitor

output:
  format: markdown
  destination: "~/.landscape-health/reports/"
  filename: "health-{timestamp}.md"
  summary: true

behavior:
  halt_on_critical: false
  parallel: true
```

---

## Subagent 1: CoreUI Compliance Auditor

```yaml
name: coreui-compliance-auditor
description: >
  Scans all React/TypeScript component files in the Studio interface
  for CoreUI styling violations. Flags hardcoded hex colors, Tailwind
  color utilities, dark: variants, and forbidden class patterns.

schedule: frequent

context:
  scan_paths:
    - "src/components/"
    - "src/app/"
  file_extensions: [".tsx", ".ts", ".css", ".scss"]
  exclude_paths:
    - "node_modules/"
    - ".next/"
    - "src/app/api/"
    - "src/components/**/_archive/"     # ← ADDED: skip archived components

rules:
  forbidden_patterns:
    - pattern: "bg-slate-"
      severity: error
      message: "Tailwind slate bg — use var(--cui-secondary-bg)"
    - pattern: "bg-gray-"
      severity: error
      message: "Tailwind gray bg — use var(--cui-body-bg)"
    - pattern: "bg-zinc-"
      severity: error
      message: "Tailwind zinc bg — use CoreUI CSS variable"
    - pattern: "text-slate-"
      severity: error
      message: "Tailwind slate text — use var(--cui-body-color)"
    - pattern: "text-gray-"
      severity: error
      message: "Tailwind gray text — use var(--cui-secondary-color)"
    - pattern: "dark:"
      severity: error
      message: "Tailwind dark: variant — use [data-coreui-theme=dark] selector"
    - pattern: "background:\\s*#[0-9a-fA-F]"
      severity: error
      message: "Hardcoded hex background — use CoreUI CSS variable"
    - pattern: "color:\\s*#[0-9a-fA-F]"
      severity: error
      message: "Hardcoded hex color — use CoreUI CSS variable"
    - pattern: "border-color:\\s*#[0-9a-fA-F]"
      severity: error
      message: "Hardcoded hex border — use var(--cui-border-color)"
    - pattern: "background:\\s*white|background:\\s*black"
      severity: warning
      message: "Named color — use CoreUI CSS variable"
    # ← ADDED: MUI import detection
    - pattern: "@mui/material"
      severity: error
      message: "MUI import — deprecated; replace with CoreUI equivalent"
    - pattern: "@mui/icons-material"
      severity: error
      message: "MUI icons import — deprecated; replace with CoreUI icons"

  required_patterns:
    - description: "Theme selectors must use [data-coreui-theme] attribute"
      check: "if .dark { found → also check [data-coreui-theme=dark] { exists"
      severity: warning

output:
  per_file: true
  include_line_numbers: true
  group_by: severity
  summary_counts: true
```

---

## Subagent 2: ALLOWED_UPDATES Field Auditor

```yaml
name: allowed-updates-auditor
description: >
  Cross-checks every Landscaper tool's ALLOWED_UPDATES field list
  against actual column names in the target database table.
  Detects silent write failures before they reach production.

schedule: daily

context:
  repo_root: "~/path/to/landscape"
  db_connection: "${NEON_DATABASE_URL}"
  db_schema: "landscape"
  tools_paths:
    - "backend/apps/landscaper/tools/"   # ← CORRECTED: was also listing backend/services/landscaper/ which doesn't exist
  tools_pattern: "*.py"
  # ← NOTE: ALLOWED_UPDATES dict lives in backend/apps/landscaper/tool_executor.py
  # Tool files: ic_tools.py, kpi_tools.py, landdev_tools.py, scenario_ops_tools.py,
  #             scenario_tools.py, whatif_commit_tools.py, whatif_tools.py

detection:
  extract_pattern: "ALLOWED_UPDATES\\s*=\\s*\\{[^}]+\\}"
  table_reference_pattern: "table_name\\s*=\\s*['\"]([^'\"]+)['\"]"

validation:
  for_each_tool:
    - extract: tool name, target table, ALLOWED_UPDATES keys
    - query: >
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = '{target_table}'
    - compare: ALLOWED_UPDATES keys vs actual column_names
    - flag_missing: keys in ALLOWED_UPDATES not found in DB columns
    - flag_extra: DB columns that appear related but aren't in ALLOWED_UPDATES

severity:
  key_not_in_db: critical
  db_col_not_in_allowed: warning

output:
  per_tool: true
  include_tool_file_path: true
  include_table_name: true
  list_mismatches: true
  summary: "X tools checked. Y critical mismatches. Z warnings."
```

---

## Subagent 3: CLAUDE.md Sync Checker

```yaml
name: claudemd-sync-checker
description: >
  Detects when tracked source files have been modified more recently
  than CLAUDE.md, indicating the documentation may be out of date.

schedule: daily

context:
  repo_root: "~/path/to/landscape"
  claudemd_path: "CLAUDE.md"

tracked_files:
  schema_files:
    - path: "backend/*/migrations/*.py"
      category: "Schema Migration"
      severity: critical
  tool_files:
    - path: "backend/apps/landscaper/tools/*.py"
      category: "Landscaper Tool"
      severity: critical
  api_files:
    - path: "backend/apps/*/views.py"
      category: "Django API Endpoint"
      severity: high
    - path: "backend/apps/*/urls.py"
      category: "URL Routing"
      severity: high
  engine_files:
    - path: "services/financial_engine_py/**/*.py"   # ← CORRECTED: was backend/services/financial/*.py
      category: "Financial Engine"
      severity: critical
  container_files:
    - path: "backend/apps/containers/*.py"
      category: "Container System"
      severity: critical
  frontend_api:
    - path: "src/app/api/**/*.ts"
      category: "Next.js API Route"
      severity: high
  # ← ADDED: extraction services
  extraction_files:
    - path: "backend/services/extraction/*.py"
      category: "Extraction Pipeline"
      severity: critical

logic:
  get_claudemd_mtime: "stat CLAUDE.md → modified timestamp"
  for_each_tracked_file:
    - get_file_mtime
    - if file_mtime > claudemd_mtime → flag as stale
    - include: file path, category, how many minutes/hours newer than CLAUDE.md

output:
  claudemd_last_modified: true
  stale_files_by_category: true
  staleness_duration: true
  actionable_message: >
    "CLAUDE.md may need updating. These files were modified after it:
    [list]. Review and update the relevant sections before pushing."
```

---

## Subagent 4: Django API Route Enforcer

```yaml
name: django-api-route-enforcer
description: >
  Flags new API routes added to Next.js (src/app/api/) instead of Django.
  All new API development must go through Django per platform architecture.

schedule: frequent

context:
  repo_root: "~/path/to/landscape"
  nextjs_api_path: "src/app/api/"
  django_api_path: "backend/apps/"
  git_baseline_branch: "main"

detection:
  method: git_diff
  command: "git diff main --name-only -- src/app/api/"

  exemptions:                                      # ← CORRECTED: entire list replaced
    - "src/app/api/oauth/"                         # OAuth callbacks — must stay in Next.js
    - "src/app/api/uploadthing/"                   # File upload callbacks
    - "src/app/api/copilotkit/"                    # CopilotKit integration hooks
    # NOTE: auth/, webhooks/, revalidate/ were listed originally but don't exist in the repo

validation:
  for_each_new_file:
    - check if path is in exemptions list
    - if not exempt → flag as violation
    - extract: route path, file name, line count
    - suggest: equivalent Django endpoint location

severity:
  new_non_exempt_route: error
  modified_existing_route: warning

output:
  new_violations: true
  file_path: true
  suggested_django_location: true
  exemptions_applied: true
  message: >
    "New Next.js API routes detected that should be Django endpoints.
    Move to backend/apps/ before pushing."
```

---

## Subagent 5: Dead Tool Detector

```yaml
name: dead-tool-detector
description: >
  Scans all ~199 Landscaper tools for references to database tables   # ← CORRECTED: was "210+"
  or columns that no longer exist. Detects broken tools before
  they surface as silent failures or runtime errors in production.

schedule: daily

context:
  repo_root: "~/path/to/landscape"
  db_connection: "${NEON_DATABASE_URL}"
  db_schema: "landscape"
  tools_paths:
    - "backend/apps/landscaper/tools/"              # ← CORRECTED: removed backend/services/landscaper/ (doesn't exist)
  # Also check the executor which holds ALLOWED_UPDATES:
  executor_path: "backend/apps/landscaper/tool_executor.py"   # ← ADDED

detection:
  table_reference_patterns:
    - "FROM landscape\\.([a-z_]+)"
    - "table_name\\s*=\\s*['\"]([^'\"]+)['\"]"
    - "tbl_([a-z_]+)"
  column_reference_patterns:
    - "ALLOWED_UPDATES\\s*=\\s*\\{([^}]+)\\}"
    - "\\.([a-z_]+)\\s*="

validation:
  get_live_tables: >
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'landscape'

  for_each_tool:
    - extract all table references
    - check each against live_tables
    - for tables that exist: extract column references
    - check columns against information_schema.columns
    - flag: table not found, column not found

severity:
  table_not_found: critical
  column_not_found: error

output:
  per_tool: true
  dead_table_references: true
  dead_column_references: true
  tool_file_path: true
  summary: "X tools scanned. Y dead table refs. Z dead column refs."
  recommendation: "Remove or update tools referencing dropped schema objects."
```

---

## Subagent 6: Extraction Queue Monitor

```yaml
name: extraction-queue-monitor
description: >
  Monitors the document extraction queue for stuck, failed, or
  accumulating pending extractions. Detects silent pipeline failures
  before they impact user-facing workflows.
  NOTE: Queries Neon DB directly (not Railway endpoint).

schedule: hourly

context:
  db_connection: "${NEON_DATABASE_URL}"
  db_schema: "landscape"
  queue_table: "dms_extract_queue"                  # ← CORRECTED: was ai_extraction_staging

thresholds:
  pending_count_warning: 5
  pending_count_critical: 15
  stuck_age_warning_hours: 2
  stuck_age_critical_hours: 6
  failed_count_warning: 3

queries:
  # ← ALL QUERIES CORRECTED: table name + column names updated
  pending_count: >
    SELECT COUNT(*)
    FROM landscape.dms_extract_queue
    WHERE status = 'pending'

  stuck_extractions: >
    SELECT queue_id, doc_id, created_at,
           EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_pending
    FROM landscape.dms_extract_queue
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '2 hours'
    ORDER BY created_at ASC

  recent_failures: >
    SELECT COUNT(*), error_message
    FROM landscape.dms_extract_queue
    WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY error_message
    ORDER BY COUNT(*) DESC

  auth_errors: >
    SELECT COUNT(*)
    FROM landscape.dms_extract_queue
    WHERE status = 'failed'
    AND (error_message ILIKE '%401%'
         OR error_message ILIKE '%authentication%'
         OR error_message ILIKE '%invalid%key%')
    AND created_at > NOW() - INTERVAL '24 hours'

severity:
  auth_errors_found: critical
  pending_above_critical: critical
  pending_above_warning: warning
  stuck_above_critical_age: critical
  stuck_above_warning_age: warning
  failures_above_warning: warning

output:
  pending_count: true
  stuck_list: true
  failure_summary: true
  auth_error_flag: true
  recommendation:
    auth_errors: "Check ANTHROPIC_API_KEY in Railway environment variables."
    stuck_critical: "Pipeline likely stalled. Check Django extraction worker."
    stuck_warning: "Monitor — may be large document processing."
```

---

## Change Log

| # | Section | What Changed | Why |
|---|---------|--------------|-----|
| 1 | extraction-queue-monitor | `ai_extraction_staging` → `dms_extract_queue` | Table doesn't exist. Actual model is `DMSExtractQueue` in `backend/apps/documents/models.py` |
| 2 | extraction-queue-monitor | All SQL queries updated with correct table + column names | Cascading from #1 |
| 3 | extraction-queue-monitor | Fixed `auth_errors` query OR/AND precedence (added parens) | Original had ambiguous boolean logic |
| 4 | dead-tool-detector | Removed `backend/services/landscaper/` from tools_paths | Directory doesn't exist |
| 5 | dead-tool-detector | Added `executor_path` for `tool_executor.py` | ALLOWED_UPDATES dict lives here, not in tool files |
| 6 | dead-tool-detector | Tool count `210+` → `~199` | Actual grep count of `@register_tool` decorators |
| 7 | django-api-route-enforcer | Exemptions: `auth/`, `webhooks/`, `revalidate/` → `oauth/`, `uploadthing/`, `copilotkit/` | Original routes don't exist; these do |
| 8 | claudemd-sync-checker | `backend/services/financial/*.py` → `services/financial_engine_py/**/*.py` | Wrong path — engine is at repo root, not under backend |
| 9 | claudemd-sync-checker | Added `extraction_files` tracked category | `backend/services/extraction/` has 5 modules worth tracking |
| 10 | allowed-updates-auditor | Removed `backend/services/landscaper/` from tools_paths | Same as #4 |
| 11 | coreui-compliance-auditor | Added `_archive/` to exclude_paths | ~47 archived components would generate noise |
| 12 | coreui-compliance-auditor | Added MUI import detection patterns | MUI deprecated months ago; 25 files still have imports |
