#!/usr/bin/env python
"""
Automated audit of Help Landscaper responses.
Sends test questions with page context and grades responses.

Usage:
    python scripts/audit_help_landscaper.py
    python scripts/audit_help_landscaper.py --verbose
    python scripts/audit_help_landscaper.py --section 3  # Run only section 3
"""

import requests
import json
import sys
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

# ============================================================
# TEST QUESTIONS
# Each tuple: (section, question_id, current_page, question,
#               required_keywords, forbidden_keywords, category)
#
# required_keywords: response MUST contain at least one of these
# forbidden_keywords: response must NOT contain any of these
# category: what capability is being tested
# ============================================================

AUDIT_QUESTIONS = [

    # SECTION 1: Dashboard / Home
    (1, "1b", "home",
     "How do I get to the rent roll from here?",
     ["property", "rent roll", "tab", "tile", "folder"],
     ["hamburger menu", "sidebar", "left nav"],
     "navigation"),

    (1, "1c", "home",
     "What do the colored tiles at the top do?",
     ["folder", "tab", "navigation", "section", "property", "operations", "valuation"],
     ["KPI", "metrics", "green", "yellow", "red"],
     "ui_explanation"),

    (1, "1d", "home",
     "What's the difference between you and the Landscaper panel on the right?",
     ["help", "project", "data", "explain", "app"],
     [],
     "self_awareness"),

    # SECTION 2: Property > Details
    (2, "2a", "property_details",
     "What fields should I fill in here?",
     ["address", "year built", "unit", "square footage", "property"],
     ["I don't know which page", "could you tell me"],
     "page_awareness"),

    (2, "2b", "property_details",
     "What are the two project modes?",
     ["napkin", "standard"],
     ["detail mode", "three", "Napkin/Standard/Detail"],
     "feature_explanation"),

    (2, "2c", "property_details",
     "How do I switch between Napkin and Standard mode?",
     ["toggle", "switch", "mode"],
     ["detail", "three levels", "three modes"],
     "task_guide"),

    (2, "2d", "property_details",
     "In ARGUS, where would I enter this stuff?",
     ["ARGUS", "property", "general", "tenant"],
     [],
     "argus_crosswalk"),

    # SECTION 2.5: Property > Market
    (2, "2e", "property_market",
     "What is the Market tab used for?",
     ["market", "assumption", "rent", "comp"],
     ["I don't have information"],
     "page_awareness"),

    (2, "2f", "property_market",
     "How do market assumptions affect the rest of the analysis?",
     ["rent", "valuation", "operations", "benchmark", "flow"],
     [],
     "data_flow"),

    # SECTION 3: Property > Rent Roll
    (3, "3a", "property_rent-roll",
     "How do I add units to the rent roll?",
     ["add unit", "row", "manual", "upload"],
     [],
     "task_guide"),

    (3, "3b", "property_rent-roll",
     "Can I upload a rent roll from Excel instead of typing it?",
     ["upload", "document", "extract", "excel", "spreadsheet"],
     [],
     "task_guide"),

    (3, "3c", "property_rent-roll",
     "If I change a rent here, does it update the income approach?",
     ["operations", "income", "NOI", "automatic", "flow"],
     [],
     "data_flow"),

    (3, "3d", "property_rent-roll",
     "How is this different from the tenants module in ARGUS?",
     ["ARGUS", "tenant", "auto", "manual", "link", "revenue"],
     [],
     "argus_crosswalk"),

    (3, "3e", "property_rent-roll",
     "I normally build rent rolls in Excel. How does this compare?",
     ["excel", "formula", "reference", "automatic", "worksheet"],
     [],
     "excel_crosswalk"),

    # SECTION 4: Documents
    (4, "4a", "documents",
     "What file types can I upload?",
     ["PDF", "excel", "xlsx", "word", "image"],
     [],
     "feature_knowledge"),

    (4, "4b", "documents",
     "How does the AI extraction work?",
     ["extract", "review", "confidence", "accept", "reject", "stage"],
     [],
     "feature_explanation"),

    (4, "4c", "documents",
     "If I upload an OM, what data will it pull out?",
     ["property", "unit mix", "financial", "rent"],
     [],
     "feature_knowledge"),

    (4, "4d", "documents",
     "What happens if the extraction gets something wrong?",
     ["correct", "edit", "review", "train", "learn", "improve"],
     [],
     "feature_explanation"),

    # SECTION 5: Operations
    (5, "5a", "operations",
     "Where does the revenue on this page come from?",
     ["rent roll", "automatic", "flow"],
     ["enter revenue here", "type in"],
     "data_flow"),

    (5, "5b", "operations",
     "How do I enter operating expenses?",
     ["category", "click", "cell", "per unit", "total"],
     [],
     "task_guide"),

    (5, "5c", "operations",
     "What are the benchmarks on the right side?",
     ["IREM", "benchmark", "market", "comparison", "average"],
     [],
     "feature_explanation"),

    (5, "5d", "operations",
     "Can I enter expenses as per-unit instead of total?",
     ["per unit", "per SF", "auto", "calculate"],
     [],
     "feature_knowledge"),

    (5, "5e", "operations",
     "How does this compare to the revenue and expense module in ARGUS?",
     ["ARGUS", "revenue", "expense", "separate", "combine", "unified"],
     [],
     "argus_crosswalk"),

    # SECTION 6: Valuation > Sales Comparison
    (6, "6a", "valuation_sales-comparison",
     "How do I add a comparable sale?",
     ["add", "comp", "sale", "price", "date", "address"],
     [],
     "task_guide"),

    (6, "6b", "valuation_sales-comparison",
     "How do adjustments work here?",
     ["adjustment", "inferior", "superior", "dollar", "percentage", "net"],
     [],
     "feature_explanation"),

    (6, "6c", "valuation_sales-comparison",
     "ARGUS doesn't have a sales comp module. Where would I normally do this?",
     ["ARGUS", "excel", "separate", "integrated", "Landscape"],
     [],
     "argus_crosswalk"),

    (6, "6d", "valuation_sales-comparison",
     "Can the app pull comps automatically?",
     ["not yet", "not available", "roadmap", "manual", "coming"],
     [],
     "limitation_honesty"),

    # SECTION 7: Valuation > Income Approach
    (7, "7a", "valuation_income",
     "Where do I enter my cap rate?",
     ["assumption", "panel", "right", "income approach"],
     ["I don't know which page"],
     "navigation"),

    (7, "7b", "valuation_income",
     "How does the DCF calculation work?",
     ["discount", "cash flow", "holding period", "terminal", "reversion", "present value"],
     [],
     "calculation_explanation"),

    (7, "7c", "valuation_income",
     "What are the three NOI columns?",
     ["current", "market", "stabilized", "F-12"],
     [],
     "feature_explanation"),

    (7, "7d", "valuation_income",
     "Where does the NOI come from? Do I enter it here?",
     ["operations", "rent roll", "automatic", "flow", "not enter"],
     [],
     "data_flow"),

    (7, "7e", "valuation_income",
     "How is this different from running a DCF in ARGUS Enterprise?",
     ["ARGUS", "lease", "tenant", "simplified", "growth"],
     [],
     "argus_crosswalk"),

    (7, "7f", "valuation_income",
     "What's the formula for direct capitalization?",
     ["NOI", "cap rate", "divide", "value"],
     [],
     "calculation_explanation"),

    # SECTION 8: Valuation > Cost Approach
    (8, "8a", "valuation_cost",
     "What do I need to enter for the cost approach?",
     ["land value", "replacement", "depreciation"],
     [],
     "task_guide"),

    (8, "8b", "valuation_cost",
     "When is the cost approach most useful?",
     ["newer", "special purpose", "limited", "income", "sales"],
     [],
     "methodology_context"),

    # SECTION 9: Capital
    (9, "9a", "capital_equity",
     "What can I set up on this page?",
     ["partner", "equity", "split", "promote", "preferred"],
     ["I don't know which page"],
     "page_awareness"),

    (9, "9b", "capital_equity",
     "How does the waterfall work?",
     ["waterfall", "distribution", "prefer", "promote", "tier", "return"],
     [],
     "feature_explanation"),

    # SECTION 10: Reports
    (10, "10a", "reports_summary",
     "How do I export a report?",
     ["print", "PDF", "browser", "Ctrl", "Cmd", "export"],
     [],
     "limitation_honesty"),

    (10, "10b", "reports_summary",
     "Can I get this into PDF?",
     ["print", "browser", "Ctrl", "Cmd", "PDF", "roadmap"],
     [],
     "workaround_guidance"),

    # SECTION 11: Boundary Tests (from any page)
    (11, "11a", "home",
     "What's the NOI for this property?",
     ["project landscaper", "don't have access", "cannot access", "project data", "can't access"],
     [],
     "boundary_no_data"),

    (11, "11b", "home",
     "Update the cap rate to 5.5%",
     ["project landscaper", "don't have access", "cannot", "can't", "not able"],
     [],
     "boundary_no_write"),

    (11, "11c", "valuation_income",
     "What does the sensitivity analysis show?",
     ["not yet", "not available", "coming", "roadmap", "placeholder", "not implemented"],
     [],
     "limitation_honesty"),

    (11, "11d", "documents",
     "Can I import from Excel?",
     ["upload", "extract", "document"],
     [],
     "feature_guidance"),

    (11, "11e", "home",
     "How do I use the schedule tab?",
     ["not yet", "placeholder", "not available", "coming", "not functional"],
     [],
     "limitation_honesty"),
]


def send_help_question(message, current_page):
    """Send a question to Help Landscaper and return the response.

    The Help endpoint uses AllowAny permissions — no auth token needed.
    """
    try:
        resp = requests.post(
            f"{BASE_URL}/api/landscaper/help/chat/",
            headers={"Content-Type": "application/json"},
            json={
                "message": message,
                "current_page": current_page,
            },
            timeout=90,
        )
    except requests.exceptions.ConnectionError:
        return None, 0, "Connection refused — is Django running on port 8000?"
    except requests.exceptions.Timeout:
        return None, 0, "Request timed out (90s)"

    if resp.status_code not in (200, 201):
        return None, resp.status_code, resp.text[:300]

    data = resp.json()

    # The view returns: { success, content, conversation_id, metadata }
    content = data.get("content", "")
    has_knowledge = data.get("metadata", {}).get("has_platform_knowledge", None)
    return content, resp.status_code, has_knowledge


def grade_response(response_text, required_keywords, forbidden_keywords):
    """
    Grade a response:
    A = Contains required keywords, no forbidden keywords, concise
    B = Contains required keywords but has minor issues
    C = Missing required keywords or generic
    F = Contains forbidden keywords, wrong, or no response
    """
    if not response_text:
        return "F", "No response received"

    response_lower = response_text.lower()

    # Check forbidden keywords
    found_forbidden = [kw for kw in forbidden_keywords if kw.lower() in response_lower]
    if found_forbidden:
        return "F", f"Contains forbidden: {found_forbidden}"

    # Check required keywords
    found_required = [kw for kw in required_keywords if kw.lower() in response_lower]
    missing_required = [kw for kw in required_keywords if kw.lower() not in response_lower]

    if not found_required and required_keywords:
        return "C", f"Missing all required keywords: {required_keywords}"

    # Length check — too long is bad
    word_count = len(response_text.split())

    if len(found_required) >= len(required_keywords) * 0.5:
        if word_count > 300:
            return "B", f"Good content but verbose ({word_count} words)"
        return "A", f"Matched {len(found_required)}/{len(required_keywords)} keywords"
    else:
        return "B", f"Partial match: found {found_required}, missing {missing_required}"


def run_audit(section_filter=None, verbose=False):
    """Run the full audit."""
    results = []

    questions = AUDIT_QUESTIONS
    if section_filter:
        questions = [q for q in questions if q[0] == section_filter]

    total = len(questions)

    for i, (section, qid, page, question, req_kw, forb_kw, category) in enumerate(questions):
        print(f"\n[{i+1}/{total}] Section {section} | {qid} | Page: {page}")
        print(f"  Q: {question}")

        response_text, status_code, has_knowledge = send_help_question(question, page)

        if response_text is None:
            grade = "F"
            reason = f"HTTP {status_code}: {has_knowledge}"
            print(f"  \u274c FAILED: {reason}")
        else:
            grade, reason = grade_response(response_text, req_kw, forb_kw)
            icon = {"A": "\u2705", "B": "\U0001f7e1", "C": "\U0001f7e0", "F": "\u274c"}[grade]
            print(f"  {icon} Grade: {grade} \u2014 {reason}")
            print(f"  Knowledge: {has_knowledge}")

            if verbose:
                preview = response_text[:200].replace('\n', ' ')
                print(f"  Response: {preview}...")

        results.append({
            "section": section,
            "qid": qid,
            "page": page,
            "question": question,
            "category": category,
            "grade": grade,
            "reason": reason,
            "response": response_text[:500] if response_text else None,
            "has_knowledge": has_knowledge,
        })

        # Rate limiting — 5s delay to prevent Django OOM under sustained Claude API calls
        time.sleep(5)

    return results


def generate_report(results):
    """Generate the audit report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Grade summary
    grades = {"A": 0, "B": 0, "C": 0, "F": 0}
    for r in results:
        grades[r["grade"]] += 1

    total = len(results)
    ab_pct = ((grades["A"] + grades["B"]) / total * 100) if total else 0

    # Category breakdown
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"A": 0, "B": 0, "C": 0, "F": 0}
        categories[cat][r["grade"]] += 1

    # Section breakdown
    sections = {}
    for r in results:
        sec = r["section"]
        if sec not in sections:
            sections[sec] = {"A": 0, "B": 0, "C": 0, "F": 0}
        sections[sec][r["grade"]] += 1

    report = f"""# Help Landscaper Automated Audit Report

**Date:** {timestamp}
**Total Questions:** {total}
**Target:** 80%+ A/B grades

---

## Overall Score: {ab_pct:.0f}% A/B

| Grade | Count | Pct |
|-------|-------|-----|
| A (Accurate & Concise) | {grades['A']} | {grades['A']/total*100:.0f}% |
| B (Mostly Right) | {grades['B']} | {grades['B']/total*100:.0f}% |
| C (Generic/Unhelpful) | {grades['C']} | {grades['C']/total*100:.0f}% |
| F (Wrong/Forbidden) | {grades['F']} | {grades['F']/total*100:.0f}% |

---

## By Section

| Section | A | B | C | F |
|---------|---|---|---|---|
"""
    section_names = {
        1: "Dashboard/Home", 2: "Property", 3: "Rent Roll",
        4: "Documents", 5: "Operations", 6: "Sales Comparison",
        7: "Income Approach", 8: "Cost Approach", 9: "Capital",
        10: "Reports", 11: "Boundary Tests"
    }
    for sec in sorted(sections.keys()):
        s = sections[sec]
        name = section_names.get(sec, f"Section {sec}")
        report += f"| {name} | {s['A']} | {s['B']} | {s['C']} | {s['F']} |\n"

    report += f"""
---

## By Category

| Category | A | B | C | F |
|----------|---|---|---|---|
"""
    for cat in sorted(categories.keys()):
        c = categories[cat]
        report += f"| {cat} | {c['A']} | {c['B']} | {c['C']} | {c['F']} |\n"

    report += f"""
---

## Failures and Issues (C/F Grades)

"""
    for r in results:
        if r["grade"] in ("C", "F"):
            report += f"""### {r['qid']} — Grade {r['grade']}
**Page:** {r['page']} | **Category:** {r['category']}
**Question:** {r['question']}
**Issue:** {r['reason']}
**Response preview:** {r['response'][:300] if r['response'] else 'No response'}

---

"""

    report += f"""
## All Results Detail

| # | Page | Question | Grade | Category | Knowledge | Reason |
|---|------|----------|-------|----------|-----------|--------|
"""
    for r in results:
        q_short = r["question"][:50] + "..." if len(r["question"]) > 50 else r["question"]
        reason_short = r["reason"][:60] if r["reason"] else ""
        report += f"| {r['qid']} | {r['page']} | {q_short} | {r['grade']} | {r['category']} | {r['has_knowledge']} | {reason_short} |\n"

    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Audit Help Landscaper")
    parser.add_argument("--verbose", action="store_true", help="Show response previews")
    parser.add_argument("--section", type=int, help="Run only this section number")
    args = parser.parse_args()

    print("=" * 60)
    print("HELP LANDSCAPER AUTOMATED AUDIT")
    print("=" * 60)

    # Quick connectivity check (no auth needed — endpoint is AllowAny)
    try:
        probe = requests.get(f"{BASE_URL}/api/docs/", timeout=5)
        print(f"Django server reachable (HTTP {probe.status_code})")
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to Django at http://localhost:8000")
        print("Run: bash restart.sh")
        sys.exit(1)

    results = run_audit(section_filter=args.section, verbose=args.verbose)

    report = generate_report(results)

    # Write report
    report_path = "docs/HELP_LANDSCAPER_AUDIT_REPORT.md"
    with open(report_path, "w") as f:
        f.write(report)

    # Also write raw results as JSON for further analysis
    json_path = "docs/help_landscaper_audit_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n{'=' * 60}")
    print(f"AUDIT COMPLETE")
    print(f"Report: {report_path}")
    print(f"Raw data: {json_path}")
    print(f"{'=' * 60}")

    # Print summary
    grades = {"A": 0, "B": 0, "C": 0, "F": 0}
    for r in results:
        grades[r["grade"]] += 1
    total = len(results)
    ab_pct = ((grades["A"] + grades["B"]) / total * 100) if total else 0

    print(f"\nA: {grades['A']} | B: {grades['B']} | C: {grades['C']} | F: {grades['F']}")
    print(f"A/B Rate: {ab_pct:.0f}% (target: 80%)")
