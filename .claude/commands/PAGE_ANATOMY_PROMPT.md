# Page Anatomy Report Prompt

**Usage**: Copy this prompt into Claude Code to generate a component inventory for any page. Replace `[route]` with the actual route path.

---

## PROMPT

```
Analyze the page at route: /projects/[id]/[tab-name]

Generate a PAGE ANATOMY REPORT with the following structure:

---

## PAGE ANATOMY: /projects/[id]/[tab-name]

### 1. COMPONENT INVENTORY

Output as a markdown table. Every visible UI element gets a row.

| ID | Component Name | Type | Parent | Styling | Theme |
|----|----------------|------|--------|---------|-------|
| C1 | [plain English name] | [type] | [parent ID or "root"] | [source] | [✅/⚠️/❌] |
| C2 | ... | ... | ... | ... | ... |

**Type values**: accordion | tile | card | form | grid | table | chart | modal | button-group | tab | section | header | nav

**Styling values**: CoreUI | Global CSS | Tailwind | Custom | Mixed

**Theme values**: ✅ compliant | ⚠️ partial | ❌ hardcoded colors

---

### 2. FIELD INVENTORY

For each component with data fields, output a second table:

| Component ID | Field Label | Field Type | Data Source | Connected To |
|--------------|-------------|------------|-------------|--------------|
| C1 | [label shown] | input/calculated/display/dropdown | [table.column] | [API endpoint or "local"] |

---

### 3. API CALLS

List endpoints called on page load:
- GET /api/...
- POST /api/...

---

### 4. ISSUES FLAG

| Issue Type | Component ID | Description |
|------------|--------------|-------------|
| Disconnected | C3 | Field exists but saves nowhere |
| Theme Violation | C5 | Uses hardcoded #1a1a1a |
| Style Inconsistency | C2, C4 | Siblings use different button patterns |
| Dead Code | C7 | Component rendered but hidden/unused |

---

IMPORTANT: 
- Use the Component ID (C1, C2, etc.) consistently so it can be referenced in follow-up questions
- Every visible element needs a row - don't skip "minor" components
- Be specific about data sources - "database" is not enough, specify table.column
```

---

## EXAMPLE USAGE

**You say to CC**: 
> Run the Page Anatomy prompt on /projects/[id]/planning

**Then in follow-up you can say**:
> "C4 shows Theme violation - fix that component to use CSS variables"
> "What calculation drives the field in C2 row 3?"
> "C1 and C6 should share the same accordion pattern - consolidate"

---

## QUICK REFERENCE COPY

For fast paste, here's the one-liner version:

```
Run Page Anatomy Report on route: /projects/[id]/planning — output component table with IDs (C1, C2...), field inventory, API calls, and issues flag. Use consistent IDs so I can reference specific components.
```
