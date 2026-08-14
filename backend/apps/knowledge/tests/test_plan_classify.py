"""
Tests for plan-document recognition and stage reading.

Every fixture below is text taken from, or modelled directly on, the Red Valley
Ranch drawings — the 2025 Phase 1 final plat (Rick Engineering, 21 Jan 2025),
the 2021 preliminary plat, and the construction-plan set filed alongside them.
The behaviours pinned here are the ones that were wrong at least once while
this was being written.
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.plan_classify import (  # noqa: E402
    PLAN_DOC_TYPE,
    PlanVerdict,
    classify_plan,
    is_plan_document,
)
from apps.knowledge.services.plan_geometry.stages import PlanStage  # noqa: E402


# ── fixtures modelled on the real sheets ────────────────────────────────────

FINAL_PLAT = """
FINAL PLAT
RED VALLEY RANCH PHASE 1
MARICOPA, ARIZONA
STATE OF ARIZONA COUNTY OF PINAL SS
I hereby certify that the within instrument is filed in the official records of
this County in Fee No: Date: Request of: Witness my hand and official seal.
Dana Lewis Pinal County Recorder
SCALE 1"=50' SHEET 4 OF 7 MATCHLINE - SHEET 5
BASIS OF BEARINGS N89°49'34"W 2616.04'
LOT AREA TABLE  CURVE TABLE
TRACT A-1  TRACT B-2   8' PUE   25' R/W
ZONING: CR-3/PAD (PER PAD-10-01)
"""

PRELIM_PLAT = """
PRELIMINARY PLAT
RED VALLEY RANCH
CASE NO. SUB17-07
SCALE: 1" = 100'   SHEET 2 OF 4
BASIS OF BEARINGS S89°59'06"E 2638.61'
TRACT C-2   PUBLIC UTILITY EASEMENT   RIGHT-OF-WAY
POINT OF BEGINNING
"""

PAVING_PLAN = """
PAVING PLAN
RED VALLEY RANCH PHASE 1 - 2ND SUBMITTAL
CASE NO. SUB21-20
SCALE: 1" = 40'  SHEET 3 OF 12
MATCHLINE   R/W   8' PUE
"""

DRAINAGE_REPORT = """
DRAINAGE REPORT
Red Valley Ranch Phase 1
Prepared for Crescent Bay Land Fund 1 LLC
1. INTRODUCTION
This report presents the drainage analysis for the proposed subdivision.
The 100-year peak discharge was computed using the rational method.
"""

ZONING_EXHIBIT = """
PAD AMENDMENT EXHIBIT
RED VALLEY RANCH
LAND USE PLAN
SCALE 1" = 200'   SHEET 1 OF 3
RIGHT-OF-WAY   TRACT A-1
BASIS OF BEARINGS
"""


def _title(text: str, lines: int = 3) -> str:
    """Stand-in for the title block: the drawing's opening lines."""
    return "\n".join(l for l in text.strip().splitlines()[:lines])


# ── is this a drawing at all ────────────────────────────────────────────────


def test_a_report_about_the_land_is_not_a_plan():
    assert is_plan_document(DRAINAGE_REPORT, "Drainage Report.pdf") is False
    v = classify_plan(DRAINAGE_REPORT, "Drainage Report.pdf")
    assert v.is_plan is False
    assert v.doc_type == "general"
    assert v.stage is None


def test_a_drawing_is_recognised_by_its_marks_not_its_name():
    """Bearings, a stated scale, sheet numbering — prose documents lack these."""
    unnamed = FINAL_PLAT.replace("FINAL PLAT", "").replace("RED VALLEY RANCH PHASE 1", "")
    assert is_plan_document(unnamed, filename="scan0417.pdf") is True


def test_three_marks_are_required():
    """One stray bearing in a report must not make it a drawing."""
    almost = "Exhibit A. The parcel lies N89°49'34\"W of the section corner."
    assert is_plan_document(almost, "exhibit.pdf") is False


# ── which drawing is it ─────────────────────────────────────────────────────


def test_recording_language_identifies_a_final_plat():
    """Only a recorded instrument says it is filed in the official records."""
    v = classify_plan(FINAL_PLAT, "P6475 PHASE 1 PLAT_R9 1-21-25.pdf", _title(FINAL_PLAT))
    assert v.stage is PlanStage.FINAL_PLAT
    assert v.confidence >= 0.9
    assert v.trusted_for_money is True
    assert v.needs_confirmation is False
    assert any("official records" in e.lower() for e in v.evidence)


def test_preliminary_plat_is_read_from_its_title_block():
    v = classify_plan(PRELIM_PLAT, "Red Valley Ranch Preliminary Plat FNL 11.2.21.pdf",
                      _title(PRELIM_PLAT))
    assert v.stage is PlanStage.PRELIMINARY_PLAT
    assert v.trusted_for_money is True


def test_a_zoning_exhibit_is_never_trusted_for_money():
    v = classify_plan(ZONING_EXHIBIT, "PAD21-05 Exhibit.pdf", _title(ZONING_EXHIBIT))
    assert v.stage in (PlanStage.ZONING_EXHIBIT, PlanStage.SITE_PLAN)
    assert v.trusted_for_money is False


def test_final_plat_beats_the_preliminary_plat_it_quotes():
    """A final plat's body references the preplat it superseded. The title wins."""
    body = FINAL_PLAT + "\nSUPERSEDES THE PRELIMINARY PLAT RECORDED AS SUB17-07\n"
    v = classify_plan(body, "plat.pdf", _title(FINAL_PLAT))
    assert v.stage is PlanStage.FINAL_PLAT


# ── the safety property ─────────────────────────────────────────────────────


def test_a_guessed_stage_is_never_trusted_for_money():
    """
    The defect this pins: a paving plan carries the subdivision's own case
    number, so the case-number rule reads it as a preliminary plat at 0.5
    confidence. It is not a plat and its geometry must not price anything.
    """
    v = classify_plan(PAVING_PLAN, "Paving Plan - 2nd Submittal.pdf", _title(PAVING_PLAN))
    assert v.is_plan is True
    assert v.confidence < 0.75
    assert v.trusted_for_money is False, "a 0.5-confidence guess authorised money use"
    assert v.needs_confirmation is True


def test_an_unreadable_stage_asks_rather_than_assumes():
    plain = """
    SCALE 1" = 40'   SHEET 1 OF 9   MATCHLINE
    BASIS OF BEARINGS   R/W   8' PUE
    """
    v = classify_plan(plain, "sheet01.pdf")
    assert v.is_plan is True
    assert v.stage is None
    assert v.needs_confirmation is True
    assert v.trusted_for_money is False


def test_stage_none_is_not_treated_as_permission():
    assert PlanVerdict(is_plan=True, stage=None, confidence=1.0).trusted_for_money is False


@pytest.mark.parametrize("text,name", [
    (FINAL_PLAT, "plat.pdf"), (PRELIM_PLAT, "preplat.pdf"),
    (PAVING_PLAN, "paving.pdf"), (ZONING_EXHIBIT, "pad.pdf"),
])
def test_every_plan_is_filed_under_the_plan_type(text, name):
    """Plans do not go in the seven business buckets — they carry no fields."""
    assert classify_plan(text, name, _title(text)).doc_type == PLAN_DOC_TYPE


def test_the_verdict_reads_in_plain_english():
    v = classify_plan(FINAL_PLAT, "plat.pdf", _title(FINAL_PLAT))
    said = v.describe().lower()
    assert "final plat" in said
    for jargon in ("planstage", "trust_for_money", "none", "0.9"):
        assert jargon not in said


# ── intake: what the pipeline is told to do ─────────────────────────────────

from apps.knowledge.services.plan_geometry.intake import (  # noqa: E402
    AWAITING_OCR,
    inspect_upload,
    verdict_to_profile,
)


def test_a_readable_plat_is_filed_as_a_plan():
    r = inspect_upload("P6475 PHASE 1 PLAT_R9 1-21-25.pdf",
                       extracted_text=FINAL_PLAT, title_text=_title(FINAL_PLAT))
    assert r.is_plan and r.doc_type == PLAN_DOC_TYPE
    assert r.status is None          # nothing wrong with it
    assert r.should_ask is False


def test_a_scanned_plat_is_parked_for_ocr_not_failed():
    """
    Today every scanned plat dies as 'failed' at text extraction. It is not a
    bad document — the reader cannot read it yet, and that difference decides
    whether anyone ever looks at it again.
    """
    r = inspect_upload("Phase1-Plat_R9_2025-01-21_NO-TEXT-LAYER.pdf", extraction_failed=True)
    assert r.is_plan is True
    assert r.status == AWAITING_OCR
    assert r.should_ask is True
    assert "text layer" in r.message


def test_a_scanned_document_that_is_not_a_drawing_is_left_alone():
    r = inspect_upload("invoice_4471.pdf", extraction_failed=True)
    assert r.is_plan is False
    assert r.doc_type is None and r.status is None


def test_a_report_is_never_refiled_as_a_plan():
    r = inspect_upload("Drainage Report.pdf", extracted_text=DRAINAGE_REPORT)
    assert r.is_plan is False
    assert r.doc_type is None


def test_the_stored_profile_never_claims_money_safety_it_has_not_earned():
    r = inspect_upload("Paving Plan - 2nd Submittal.pdf",
                       extracted_text=PAVING_PLAN, title_text=_title(PAVING_PLAN))
    p = verdict_to_profile(r.verdict)
    assert p["trusted_for_money"] is False
    assert p["needs_confirmation"] is True
    assert p["confirmed_by_user"] is False


def test_the_stored_stage_is_the_integer_that_must_never_be_renumbered():
    r = inspect_upload("plat.pdf", extracted_text=FINAL_PLAT, title_text=_title(FINAL_PLAT))
    assert verdict_to_profile(r.verdict)["stage"] == int(PlanStage.FINAL_PLAT) == 60


# ── corroboration: two sources agreeing ─────────────────────────────────────


def test_name_and_sheet_agreeing_is_enough_without_a_title_block():
    """
    `document_processor` has the extracted text and the file name, and no way
    to read the title block. Measured cost of that: the 2021 Red Valley
    preliminary plat dropped from 0.90 and trusted to 0.60 and needing
    confirmation — a real document losing its standing to a plumbing detail.
    Two independent sources saying the same thing restores it.
    """
    v = classify_plan(PRELIM_PLAT, "Red Valley Ranch Preliminary Plat FNL 11.2.21.pdf")
    assert v.stage is PlanStage.PRELIMINARY_PLAT
    assert v.confidence >= 0.75
    assert v.trusted_for_money is True
    assert v.needs_confirmation is False


def test_the_file_name_alone_is_not_enough():
    """A name is a claim, not evidence. Without the sheet agreeing, it asks."""
    bare = """
    SCALE 1" = 100'   SHEET 2 OF 4   MATCHLINE
    BASIS OF BEARINGS   R/W   8' PUE
    """
    v = classify_plan(bare, "Red Valley Ranch Preliminary Plat.pdf")
    assert v.stage is PlanStage.PRELIMINARY_PLAT
    assert v.confidence < 0.75
    assert v.trusted_for_money is False
    assert v.needs_confirmation is True


def test_corroboration_cannot_promote_a_construction_plan():
    """
    The safety property must survive the corroboration rule. A paving plan is
    named "Paving Plan" — which matches no drawing title — so there is nothing
    for the sheet to corroborate, and its case number still only buys 0.5.
    """
    v = classify_plan(PAVING_PLAN, "Paving Plan - Red Valley Ranch Phase 1 - 2nd Submittal.pdf")
    assert v.trusted_for_money is False
    assert v.needs_confirmation is True


def test_a_final_plat_quoting_its_preplat_is_still_a_final_plat():
    """Corroboration must not let the superseded name win on a recorded sheet."""
    body = FINAL_PLAT + "\nSUPERSEDES THE PRELIMINARY PLAT RECORDED AS SUB17-07\n"
    v = classify_plan(body, "Red Valley Ranch Preliminary Plat reference copy.pdf")
    assert v.stage is PlanStage.FINAL_PLAT
    assert v.trusted_for_money is True


# ── the wiring: what the pipeline actually does ─────────────────────────────
#
# The tests above prove intake reaches the right verdict. These two prove the
# pipeline acts on it — a separate claim, and the one that decides whether a
# scanned plat survives its own upload.

from unittest.mock import patch  # noqa: E402

from apps.knowledge.services.document_processor import DocumentProcessor  # noqa: E402


class _FakeCursor:
    """Records the SQL the pipeline runs, and hands back one core_doc row."""

    def __init__(self, row):
        self._row = row
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self._row


class _FakeConnection:
    def __init__(self, row):
        self.cursor_obj = _FakeCursor(row)

    def cursor(self):
        return self.cursor_obj


def _run_pipeline_with_no_text(doc_name: str):
    """Drive process_document for a document whose pages carry no text."""
    # (doc_id, storage_uri, mime_type, doc_name, doc_type, project_id)
    row = (99, "ut://scan.pdf", "application/pdf", doc_name, "Property Data", 7)
    conn = _FakeConnection(row)

    with patch("apps.knowledge.services.document_processor.connection", conn), \
         patch("apps.knowledge.services.document_processor.extract_text_from_url",
               return_value=("", "No text layer found")):
        result = DocumentProcessor().process_document(99)

    statuses = [p[0] for _sql, p in conn.cursor_obj.executed if p]
    sql = " ".join(sql for sql, _p in conn.cursor_obj.executed)
    return result, statuses, sql


def test_pipeline_parks_a_scanned_plan_as_awaiting_ocr():
    """Today this document is marked failed and nobody looks at it again."""
    result, statuses, sql = _run_pipeline_with_no_text("Phase1-Plat_R9_2025-01-21.pdf")

    assert result["status"] == AWAITING_OCR
    assert "failed" not in statuses
    assert AWAITING_OCR in statuses
    assert "text layer" in result["error"]

    # ...and it was refiled as a plan on the way through.
    assert "doc_type = COALESCE" in sql
    assert "profile_json" in sql


def test_pipeline_still_fails_a_scanned_document_that_is_not_a_drawing():
    """A non-plan with no text keeps today's behaviour exactly."""
    result, statuses, sql = _run_pipeline_with_no_text("invoice_4471.pdf")

    assert result["status"] == "failed"
    assert AWAITING_OCR not in statuses
    assert result["error"] == "No text layer found"

    # Nothing was refiled — the document's type is left alone.
    assert "doc_type = COALESCE" not in sql
