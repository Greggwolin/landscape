"""
Decide whether an uploaded document is a plan, and which plan it is.

Why this exists
---------------
Nothing upstream of here knows what a plan is. The document classifier's type
list stops at seven business categories, and the closest thing to a drawing is
`Property Data` — a bucket that also holds appraisals, soil reports and title
work. So a plat arrives, gets filed next to a Phase I ESA, and no part of the
system ever learns that the file it just stored contains the project's lot
inventory.

This module answers two questions about a document, and refuses to answer
either one on weak evidence:

    is_plan   — is this a drawing of the land, as opposed to a report about it?
    stage     — which drawing in the sequence (see `stages.PlanStage`)

Stage is the load-bearing answer. A zoning exhibit and a recorded final plat
look alike to a keyword matcher and mean entirely different things: the first
is an illustration and the second is a legal instrument, and geometry taken
from the first must never reach a calculation that produces a dollar figure
(`stages.TRUST_FOR_MONEY`).

The reading order
-----------------
Evidence is ranked, strongest first, and the first tier that fires wins.
A drawing states what it is — in its title block, in its dedication, in the
approval signatures along its margin — and those statements are far better
evidence than the words scattered across the sheet.

    1. Recording language   "filed in the official records of this County"
                            Only a recorded instrument carries it. FINAL_PLAT.
    2. Title block          The sheet's own name, read from the largest text.
    3. Approval / dedication blocks and case numbers (PAD-10-01, SUB17-07).
    4. Body keywords        Weakest. Used only to break a tie, never alone.

What it deliberately does NOT do
--------------------------------
Guess. A document that reads as a plan but whose stage is unclear comes back
`stage=None` with the evidence attached, so the caller can put the question to
the person who uploaded it. That is the shape Gregg asked for on 2026-08-14:
read the stage, show it, and derive nothing until he confirms. An inferred
stage that silently becomes a trusted one is the failure this module exists to
prevent.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from .stages import PlanStage, STAGE_LABELS, TRUST_FOR_MONEY, describe_trust

__all__ = [
    "PlanVerdict",
    "classify_plan",
    "is_plan_document",
    "PLAN_DOC_TYPE",
    "FILENAME_HINT",
]

#: The document type a plan is filed under. Deliberately outside the seven
#: business categories in `auto_classifier.DOC_TYPE_PATTERNS`: those map to
#: field-extraction rules in `tbl_extraction_mapping`, and a plan has no fields
#: to extract. Its content is geometry.
PLAN_DOC_TYPE = "Plan"

#: Below this, a stage is a guess and must be confirmed before anything is
#: derived from the drawing. Gregg's call, 2026-08-14: read it, show it, wait.
_CONFIDENT = 0.75


# ── evidence ────────────────────────────────────────────────────────────────

#: Language only a recorded instrument carries.
_RECORDED = re.compile(
    r"(filed\s+in\s+the\s+official\s+records"
    r"|county\s+recorder"
    r"|fee\s+no\.?\s*:"
    r"|witness\s+my\s+hand\s+and\s+official\s+seal"
    r"|book\s+\d+\s+of\s+maps)",
    re.I,
)

#: A drawing names itself. Ordered most specific first — "FINAL PLAT" must be
#: tested before "PLAT", and "PRELIMINARY PLAT" before either.
_TITLES: tuple[tuple[re.Pattern, PlanStage], ...] = (
    (re.compile(r"\bfinal\s+plat\b", re.I), PlanStage.FINAL_PLAT),
    (re.compile(r"\b(preliminary|prelim\.?)\s+plat\b|\bpre-?plat\b", re.I), PlanStage.PRELIMINARY_PLAT),
    (re.compile(r"\brecord(ed)?\s+of\s+survey\b|\balta\s*/?\s*nsps\b|\bboundary\s+survey\b", re.I), PlanStage.RECORDED_SURVEY),
    (re.compile(r"\bfinal\s+landscape\s+plan\b", re.I), PlanStage.FINAL_LANDSCAPE),
    (re.compile(r"\b(preliminary|prelim\.?)\s+landscape\s+plan\b", re.I), PlanStage.PRELIMINARY_LANDSCAPE),
    (re.compile(r"\blandscape\s+plan\b|\btheming\b|\bstreetscape\b", re.I), PlanStage.CONCEPT),
    (re.compile(r"\b(pad|pud)\b.{0,20}\b(exhibit|plan|amendment)\b|\bzoning\s+exhibit\b|\brezon", re.I), PlanStage.ZONING_EXHIBIT),
    (re.compile(r"\bsite\s+plan\b|\bland\s*use\s+plan\b|\bmaster\s+plan\b|\bconcept\s+plan\b", re.I), PlanStage.SITE_PLAN),
)

#: Marks of a drawing rather than a report. Deliberately things a prose
#: document about a property would not contain.
_DRAWING_MARKS = (
    re.compile(r"\bscale\b.{0,12}1\s*[\"'=:]\s*\d", re.I),        # 1" = 50'
    re.compile(r"\bsheet\s+\d+\s+of\s+\d+\b", re.I),
    re.compile(r"\bmatchline\b", re.I),
    re.compile(r"\b[NS]\s?\d{1,2}[°\"'’]\s?\d{1,2}['\"’]\s?\d{0,2}[\"”]?\s?[EW]\b"),  # a bearing
    re.compile(r"\bbasis\s+of\s+bearings?\b", re.I),
    re.compile(r"\bcurve\s+table\b|\bline\s+table\b|\blot\s+area\s+table\b", re.I),
    re.compile(r"\bpoint\s+of\s+beginning\b|\bP\.?O\.?B\.?\b"),
    re.compile(r"\btract\s+[A-Z]-?\d\b", re.I),
    re.compile(r"\bR\s?/\s?W\b|\bright[- ]of[- ]way\b", re.I),
    re.compile(r"\bP\.?U\.?E\.?\b|\bpublic\s+utility\s+easement\b", re.I),
)

#: Case numbers a jurisdiction stamps on a submittal, and what they imply.
_CASE = (
    (re.compile(r"\bSUB[-\s]?\d{2}[-\s]?\d{2,4}\b", re.I), PlanStage.PRELIMINARY_PLAT),
    (re.compile(r"\bPAD[-\s]?\d{2}[-\s]?\d{2,4}\b", re.I), PlanStage.ZONING_EXHIBIT),
    (re.compile(r"\bPA[-\s]?\d{2}[-\s]?\d{2,4}\b", re.I), PlanStage.ZONING_EXHIBIT),
)

#: A filename is weak evidence but it is often the only thing that survives a
#: scan with no text layer.
FILENAME_HINT = re.compile(
    r"(plat|preplat|pre-plat|site\s*plan|siteplan|pad\d|zoning|landscape\s*plan|survey|exhibit)",
    re.I,
)


@dataclass
class PlanVerdict:
    """What the document is, and what led to that conclusion."""

    is_plan: bool
    #: `None` means "reads as a plan, but which one is not established".
    #: The caller must ask rather than assume.
    stage: Optional[PlanStage] = None
    confidence: float = 0.0
    #: Plain-English lines, strongest first, for showing the user.
    evidence: list[str] = field(default_factory=list)
    #: Marks that made this look like a drawing at all.
    drawing_marks: list[str] = field(default_factory=list)

    @property
    def doc_type(self) -> str:
        return PLAN_DOC_TYPE if self.is_plan else "general"

    @property
    def trusted_for_money(self) -> bool:
        """
        False whenever the stage is unknown OR only guessed.

        Both halves matter. A stage read off a case number scores 0.5 and can
        easily be wrong — a paving plan carries the subdivision's case number
        and is not a plat at all. Letting a guess at a trusted stage authorise
        a dollar figure is precisely the failure this module exists to stop, so
        a stage that has not been confirmed never counts as survey-accurate.
        """
        if self.stage is None or self.confidence < _CONFIDENT:
            return False
        return self.stage in TRUST_FOR_MONEY

    @property
    def needs_confirmation(self) -> bool:
        """Gregg confirms before anything is derived (his call, 2026-08-14)."""
        return self.is_plan and (self.stage is None or self.confidence < _CONFIDENT)

    def describe(self) -> str:
        if not self.is_plan:
            return "Not a plan drawing."
        if self.stage is None:
            return (
                "This is a plan drawing, but which stage it is has not been "
                "established from the sheet itself."
            )
        return describe_trust(self.stage)

    @property
    def stage_label(self) -> str:
        return STAGE_LABELS[self.stage] if self.stage else "Stage not established"


def _drawing_marks(text: str) -> list[str]:
    found = []
    for pat in _DRAWING_MARKS:
        m = pat.search(text)
        if m:
            found.append(m.group(0).strip())
    return found


def is_plan_document(text: str, filename: str = "") -> bool:
    """
    Whether this reads as a drawing of the land rather than a report about it.

    Three independent marks, or two where the filename also says drawing. A
    single mark is never enough: a report quotes one bearing when it describes
    a boundary, and a file called "exhibit" is as often a spreadsheet as a
    sheet of linework.
    """
    marks = len(_drawing_marks(text or ""))
    if marks >= 3:
        return True
    return marks >= 2 and bool(FILENAME_HINT.search(filename or ""))


def classify_plan(
    text: str,
    filename: str = "",
    title_text: str = "",
) -> PlanVerdict:
    """
    Read a document's own statements about what it is.

    `title_text` — when the caller can supply it — is the largest text on the
    sheet, which is where a drawing names itself. Passing it makes the answer
    markedly better than scanning the body, because the body of a final plat
    quotes the preliminary plat it came from, and vice versa.
    """
    text = text or ""
    filename = filename or ""
    marks = _drawing_marks(text)

    if not is_plan_document(text, filename):
        return PlanVerdict(is_plan=False, evidence=["No drawing marks found."])

    evidence: list[str] = []
    stage: Optional[PlanStage] = None
    confidence = 0.0

    # 1 — recording language. Only a recorded instrument carries it.
    rec = _RECORDED.search(text)
    if rec:
        stage = PlanStage.FINAL_PLAT
        confidence = 0.95
        evidence.append(f"Carries recording language — “{rec.group(0).strip()}”.")

    # 2 — the sheet's own title. Beats body text; overrides a recording guess
    #     only when it names an even later instrument.
    haystack = f"{title_text}\n{filename}" if title_text else filename
    for pat, st in _TITLES:
        m = pat.search(haystack)
        if not m:
            continue
        if stage is None or st.value > stage.value:
            stage = st
            confidence = max(confidence, 0.9 if title_text else 0.6)
            evidence.append(f"Titled “{m.group(0).strip()}”.")
        break

    # 3 — body title, weaker: a plat quotes its own predecessor, so first match wins
    #     only when nothing stronger has spoken.
    if stage is None:
        for pat, st in _TITLES:
            m = pat.search(text[:4000])
            if m:
                stage = st
                confidence = 0.55
                evidence.append(f"The sheet reads “{m.group(0).strip()}”.")
                break

    # 4 — jurisdiction case number.
    for pat, st in _CASE:
        m = pat.search(text)
        if m:
            evidence.append(f"Carries case number {m.group(0).strip()}.")
            if stage is None:
                stage, confidence = st, 0.5
            break

    if stage is not None and confidence < _CONFIDENT:
        evidence.append("Not conclusive — worth confirming before anything is derived from it.")

    return PlanVerdict(
        is_plan=True,
        stage=stage,
        confidence=round(confidence, 2),
        evidence=evidence,
        drawing_marks=marks,
    )
