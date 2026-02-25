# TEST: Landscaper Draft Tools — Tool Executor Integration

**Date:** 2026-02-25
**Prereqs:** Migration 0007 applied, Django server running on port 8000

---

## Setup

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))")

echo "Token: ${TOKEN:0:20}..."
```

---

## Test 1: Tool Registration Check

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import TOOL_REGISTRY
draft_tools = ['create_analysis_draft', 'update_analysis_draft', 'run_draft_calculations', 'convert_draft_to_project']
for t in draft_tools:
    registered = t in TOOL_REGISTRY
    print(f'  {t}: {\"REGISTERED\" if registered else \"MISSING\"}')"
```

**Expected:** All 4 tools show REGISTERED.

---

## Test 2: Tool Registry Page Filtering

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_registry import get_tools_for_page
draft_tools = ['create_analysis_draft', 'update_analysis_draft', 'run_draft_calculations', 'convert_draft_to_project']
for page in ['mf_home', 'mf_valuation', 'land_planning', 'documents', 'dms', 'dashboard']:
    tools = get_tools_for_page(page)
    has_all = all(t in tools for t in draft_tools)
    print(f'  {page}: {\"ALL PRESENT\" if has_all else \"MISSING: \" + str([t for t in draft_tools if t not in tools])}')"
```

**Expected:** All pages include all 4 draft tools (they're in UNIVERSAL_TOOLS).

---

## Test 3: create_analysis_draft — Propose Mode

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
result = execute_tool(
    'create_analysis_draft',
    {
        'draft_name': 'Tool Test - Scottsdale MF',
        'property_type': 'MF',
        'perspective': 'INVESTMENT',
        'inputs': {'unit_count': 200, 'avg_monthly_rent': 1800},
        'address': '7500 E Camelback',
        'city': 'Scottsdale',
        'state': 'AZ',
    },
    project_id=0,
    propose_only=True,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  proposal: {result.get(\"proposal\")}')
print(f'  action: {result.get(\"action\")}')
print(f'  summary: {result.get(\"summary\")}')"
```

**Expected:** success=True, proposal=True, action='create_analysis_draft'.

---

## Test 4: create_analysis_draft — Execute Mode

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
result = execute_tool(
    'create_analysis_draft',
    {
        'draft_name': 'Tool Test - Scottsdale MF',
        'property_type': 'MF',
        'perspective': 'INVESTMENT',
        'purpose': 'UNDERWRITING',
        'inputs': {'unit_count': 200, 'avg_monthly_rent': 1800, 'vacancy_pct': 5.0, 'going_in_cap': 5.25},
        'address': '7500 E Camelback',
        'city': 'Scottsdale',
        'state': 'AZ',
    },
    project_id=0,
    propose_only=False,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  draft_id: {result.get(\"draft_id\")}')
print(f'  status: {result.get(\"status\")}')
print(f'  message: {result.get(\"message\")}')"
```

**Expected:** success=True, draft_id=integer, status='active'.

Save the draft_id: `DRAFT_ID=<from output>`

---

## Test 5: update_analysis_draft — Add Expense + Debt Inputs

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
from apps.projects.models import AnalysisDraft
# Get latest active draft for user 1
draft = AnalysisDraft.objects.filter(user_id=1, status='active').order_by('-created_at').first()
if not draft:
    print('ERROR: No active draft found')
    exit()
print(f'  Using draft_id={draft.draft_id}')
result = execute_tool(
    'update_analysis_draft',
    {
        'draft_id': draft.draft_id,
        'inputs': {
            'opex_per_unit': 6500,
            'ltv': 65,
            'debt_rate': 6.75,
            'amortization_years': 30,
            'exit_cap': 5.75,
            'hold_years': 5,
            'noi_growth_pct': 3,
        },
    },
    project_id=0,
    propose_only=False,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  updated_fields: {result.get(\"updated_fields\")}')
# Verify merge
draft.refresh_from_db()
print(f'  total input keys: {len(draft.inputs)}')
print(f'  has unit_count: {\"unit_count\" in draft.inputs}')
print(f'  has opex_per_unit: {\"opex_per_unit\" in draft.inputs}')"
```

**Expected:** success=True, inputs merged (should have both original and new keys).

---

## Test 6: run_draft_calculations

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
from apps.projects.models import AnalysisDraft
draft = AnalysisDraft.objects.filter(user_id=1, status='active').order_by('-created_at').first()
if not draft:
    print('ERROR: No active draft found')
    exit()
print(f'  Using draft_id={draft.draft_id}')
result = execute_tool(
    'run_draft_calculations',
    {'draft_id': draft.draft_id},
    project_id=0,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
r = result.get('results', {})
for key in ('pgi', 'egi', 'noi', 'value_at_cap', 'loan_amount', 'dscr', 'cash_on_cash', 'exit_value', 'irr'):
    val = r.get(key)
    if val is not None:
        print(f'  {key}: {val:,.2f}')
print()
print(result.get('formatted', '')[:500])"
```

**Expected:** Full calc chain: PGI, EGI, NOI, value_at_cap, loan_amount, DSCR, cash_on_cash, exit_value, IRR.

---

## Test 7: run_draft_calculations — Override Inputs

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
from apps.projects.models import AnalysisDraft
draft = AnalysisDraft.objects.filter(user_id=1, status='active').order_by('-created_at').first()
result = execute_tool(
    'run_draft_calculations',
    {'draft_id': draft.draft_id, 'override_inputs': {'going_in_cap': 4.75}},
    project_id=0,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  value_at_cap (4.75% cap): {result[\"results\"].get(\"value_at_cap\", 0):,.0f}')
# Verify stored inputs unchanged
draft.refresh_from_db()
print(f'  stored going_in_cap still: {draft.inputs.get(\"going_in_cap\")}')"
```

**Expected:** value_at_cap recalculated at 4.75% cap, but stored inputs still show original going_in_cap.

---

## Test 8: convert_draft_to_project — Propose Mode

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
from apps.projects.models import AnalysisDraft
draft = AnalysisDraft.objects.filter(user_id=1, status='active').order_by('-created_at').first()
result = execute_tool(
    'convert_draft_to_project',
    {'draft_id': draft.draft_id},
    project_id=0,
    propose_only=True,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  proposal: {result.get(\"proposal\")}')
print(f'  summary: {result.get(\"summary\")}')"
```

**Expected:** success=True, proposal=True.

---

## Test 9: convert_draft_to_project — Execute Mode

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
from apps.projects.models import AnalysisDraft
draft = AnalysisDraft.objects.filter(user_id=1, status='active').order_by('-created_at').first()
if not draft:
    print('ERROR: No active draft')
    exit()
result = execute_tool(
    'convert_draft_to_project',
    {'draft_id': draft.draft_id},
    project_id=0,
    propose_only=False,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  project_id: {result.get(\"project_id\")}')
print(f'  project_name: {result.get(\"project_name\")}')
# Verify draft status
draft.refresh_from_db()
print(f'  draft status: {draft.status}')
print(f'  converted_project_id: {draft.converted_project_id}')"
```

**Expected:** success=True, new project_id, draft status='converted', converted_project_id set.

---

## Test 10: Error — No user_id

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
result = execute_tool(
    'create_analysis_draft',
    {'draft_name': 'No Auth Test'},
    project_id=0,
    propose_only=False,
    user_id=None,
)
print(f'  success: {result[\"success\"]}')
print(f'  error: {result.get(\"error\")}')"
```

**Expected:** success=False, error about authentication required.

---

## Test 11: Error — Update Non-Existent Draft

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.tool_executor import execute_tool
result = execute_tool(
    'update_analysis_draft',
    {'draft_id': 99999, 'inputs': {'unit_count': 100}},
    project_id=0,
    propose_only=False,
    user_id=1,
)
print(f'  success: {result[\"success\"]}')
print(f'  error: {result.get(\"error\")}')"
```

**Expected:** success=False, error about draft not found.

---

## Test 12: AI Handler — Tool Schemas Present

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.ai_handler import LANDSCAPER_TOOLS
draft_names = ['create_analysis_draft', 'update_analysis_draft', 'run_draft_calculations', 'convert_draft_to_project']
found = [t['name'] for t in LANDSCAPER_TOOLS if t['name'] in draft_names]
print(f'  Found in LANDSCAPER_TOOLS: {found}')
print(f'  All present: {len(found) == 4}')"
```

**Expected:** All 4 draft tool schemas found in LANDSCAPER_TOOLS.

---

## Test 13: System Prompt — Draft Guidance

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from apps.landscaper.ai_handler import get_system_prompt
prompt = get_system_prompt('default')
has_draft = 'create_analysis_draft' in prompt
has_guidance = 'Conversational Deal Analysis' in prompt
print(f'  mentions create_analysis_draft: {has_draft}')
print(f'  has Conversational Deal Analysis section: {has_guidance}')"
```

**Expected:** Both True.

---

## Cleanup

```bash
cd backend && ./venv/bin/python manage.py shell -c "
from django.db import connection
with connection.cursor() as c:
    c.execute(\"DELETE FROM landscape.tbl_analysis_draft WHERE draft_name LIKE 'Tool Test%'\")
    print(f'  Deleted drafts: {c.rowcount}')
    c.execute(\"DELETE FROM landscape.tbl_project WHERE project_name LIKE 'Tool Test%'\")
    print(f'  Deleted projects: {c.rowcount}')
"
```

---

## Summary

| Test | What                                  | Pass? |
|------|---------------------------------------|-------|
| 1    | Tool registration                     | [ ]   |
| 2    | Page filtering (universal)            | [ ]   |
| 3    | create_analysis_draft (propose)       | [ ]   |
| 4    | create_analysis_draft (execute)       | [ ]   |
| 5    | update_analysis_draft (merge inputs)  | [ ]   |
| 6    | run_draft_calculations (full chain)   | [ ]   |
| 7    | run_draft_calculations (override)     | [ ]   |
| 8    | convert_draft_to_project (propose)    | [ ]   |
| 9    | convert_draft_to_project (execute)    | [ ]   |
| 10   | Error: no user_id                     | [ ]   |
| 11   | Error: non-existent draft             | [ ]   |
| 12   | AI handler schemas present            | [ ]   |
| 13   | System prompt guidance                | [ ]   |
