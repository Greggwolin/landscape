"""
The one place document intake learns that a file is a drawing.

Where this sits
---------------
Every upload — whichever route it came in by — reaches
`DocumentProcessor.process_document`. That is the only step that fires for all
of them, so it is where this hook belongs. Two things about the surrounding
code shape what happens here:

* **The type classifier never runs on project uploads.** `auto_classify_document`
  is reachable only from the knowledge-library endpoint. On the project route
  the type is whatever the user picked in the upload tray, and the modal's
  "auto-detected" label is showing that same user-supplied value back to them.
  So a plat is typed by hand or not at all.

* **A document with no text layer is marked failed and stops.** Most plats are
  scanned, so most plats die at that step — before anything can look at them.

Both are handled below: the drawing is recognised from whatever is available
(text when there is text, filename when there is not), and a plan that failed
text extraction is parked as *awaiting OCR* rather than failed, because the
file is fine and the pipeline simply cannot read it yet.

What it writes
--------------
`core_doc.doc_type` becomes "Plan", and the verdict goes into the existing
`profile_json` under a `plan` key. Deliberately no new columns: `profile_json`
is already there for exactly this, and adding columns to `core_doc` would
touch a table 88 live Property Data rows depend on for no gain.

Nothing here derives geometry. Recognising the drawing and reading its stage
is the whole job; the lots are only read once a person has confirmed what the
drawing is.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

from .plan_classify import FILENAME_HINT, PLAN_DOC_TYPE, PlanVerdict, classify_plan

logger = logging.getLogger(__name__)

__all__ = ["PlanIntake", "inspect_upload", "verdict_to_profile", "AWAITING_OCR"]

#: Status for a drawing whose pages carry no text layer. Distinct from
#: "failed", which says the document is bad. This one says the document is
#: fine and the reader is not ready — the difference decides whether anyone
#: ever looks at it again.
AWAITING_OCR = "awaiting_ocr"


@dataclass
class PlanIntake:
    """What intake decided, and what it wants the pipeline to do next."""

    verdict: PlanVerdict
    #: None leaves the existing type alone.
    doc_type: Optional[str] = None
    #: None leaves the pipeline's own status handling alone.
    status: Optional[str] = None
    #: One line, plain English, safe to show the person who uploaded it.
    message: str = ""

    @property
    def is_plan(self) -> bool:
        return self.verdict.is_plan

    @property
    def should_ask(self) -> bool:
        return self.verdict.needs_confirmation


def verdict_to_profile(verdict: PlanVerdict) -> dict[str, Any]:
    """The verdict as it is stored on the document, and read back by the UI."""
    return {
        "is_plan": verdict.is_plan,
        "stage": int(verdict.stage) if verdict.stage else None,
        "stage_label": verdict.stage_label,
        "confidence": verdict.confidence,
        # What the classifier believes about the drawing...
        "stage_is_measurable": verdict.trusted_for_money,
        # ...and, separately, whether anything may be priced from it. Written
        # false without exception: reading a plat is not the same as a person
        # agreeing it is one, and only the confirm action may set this true.
        # Without the split, a writer reading `trusted_for_money` would
        # authorise money use on a drawing nobody had confirmed.
        "trusted_for_money": False,
        "needs_confirmation": verdict.needs_confirmation,
        "evidence": verdict.evidence,
        "confirmed_by_user": False,
        "summary": verdict.describe(),
    }


def inspect_upload(
    doc_name: str,
    extracted_text: str = "",
    title_text: str = "",
    extraction_failed: bool = False,
) -> PlanIntake:
    """
    Decide whether an upload is a drawing, without touching the database.

    `extraction_failed` is the caller telling us the file yielded no text. For
    anything else that is the end of the road; for a drawing it is expected,
    because a plat is very often a scan.
    """
    verdict = classify_plan(extracted_text or "", filename=doc_name or "",
                            title_text=title_text or "")

    if not verdict.is_plan and extraction_failed and FILENAME_HINT.search(doc_name or ""):
        # No text at all, so no marks to count and no stage to read — the name
        # is the only evidence there is. A scan of a plat is the ordinary case,
        # not an edge case, and filing it as an unconfirmed plan keeps it alive
        # instead of dying as "failed" the way every scanned plat does today.
        verdict = PlanVerdict(
            is_plan=True,
            stage=None,
            confidence=0.0,
            evidence=[f"Named like a drawing (“{doc_name}”); the pages carry no readable text."],
        )

    if not verdict.is_plan:
        return PlanIntake(verdict=verdict)

    if extraction_failed:
        return PlanIntake(
            verdict=verdict,
            doc_type=PLAN_DOC_TYPE,
            status=AWAITING_OCR,
            message=(
                "This looks like a drawing, but its pages have no readable text "
                "layer — it needs to be scanned into text before the lots can be "
                "read off it. Filed as a plan in the meantime."
            ),
        )

    if verdict.needs_confirmation:
        guess = (
            f" Best reading is {verdict.stage_label.lower()}, but that is not certain."
            if verdict.stage else
            " Which drawing it is could not be read from the sheet."
        )
        return PlanIntake(
            verdict=verdict,
            doc_type=PLAN_DOC_TYPE,
            message=f"Filed as a plan.{guess} Confirm it before anything is measured from it.",
        )

    return PlanIntake(
        verdict=verdict,
        doc_type=PLAN_DOC_TYPE,
        message=f"Filed as a plan — {verdict.describe()}",
    )


def apply_to_document(cursor, doc_id: int, intake: PlanIntake) -> None:
    """
    Record the verdict on the document row.

    Merges into `profile_json` rather than replacing it: the upload tray writes
    its own keys there and they must survive.
    """
    if not intake.is_plan:
        return
    payload = json.dumps({"plan": verdict_to_profile(intake.verdict)})
    cursor.execute(
        """
        UPDATE landscape.core_doc
           SET doc_type = COALESCE(%s, doc_type),
               profile_json = COALESCE(profile_json, '{}'::jsonb) || %s::jsonb,
               updated_at = NOW()
         WHERE doc_id = %s
        """,
        [intake.doc_type, payload, doc_id],
    )
    logger.info(
        "[doc_id=%s] filed as a plan: %s (confidence %.2f)",
        doc_id, intake.verdict.stage_label, intake.verdict.confidence,
    )
