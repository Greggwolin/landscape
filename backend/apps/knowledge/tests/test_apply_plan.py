"""
Tests for the step that turns a confirmed drawing into project data.

This is the first thing in the package that writes, so almost every test here
is about it declining to. A gate that fails open is worse than no gate: the
project changes, nobody is told, and the wrong numbers look exactly like the
right ones.
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.apply_plan import (  # noqa: E402
    apply_confirmed_plan,
    why_not_ready,
)
from apps.knowledge.services.plan_geometry.stages import PlanStage  # noqa: E402


def profile(**kw):
    base = {
        "is_plan": True,
        "stage": int(PlanStage.FINAL_PLAT),
        "confirmed_by_user": True,
        "confidence": 0.95,
    }
    base.update(kw)
    return base


class _Cursor:
    """Fails the test if anything reaches the database."""

    def __init__(self):
        self.executed = []

    def execute(self, sql, params=None):  # pragma: no cover - should never run
        self.executed.append(sql)
        raise AssertionError("a blocked apply reached the database")


# ── the gates ───────────────────────────────────────────────────────────────


def test_a_document_that_is_not_a_drawing_is_refused():
    assert why_not_ready({"is_plan": False}) == "This document is not a drawing."


def test_an_unread_document_is_refused():
    assert why_not_ready({}) is not None


def test_an_unconfirmed_drawing_is_refused_however_confident_the_machine():
    """
    Gregg's rule: read the stage, show it, derive nothing until he confirms.
    The classifier reading a recorded final plat at 0.95 is not permission.
    """
    reason = why_not_ready(profile(confirmed_by_user=False, confidence=0.99))
    assert reason is not None
    assert "confirm" in reason.lower()


def test_a_confirmed_illustrative_drawing_is_still_refused():
    """
    The one that matters most. A zoning exhibit confirmed *as* a zoning exhibit
    is correctly confirmed — and must not produce parcels, because its lot
    lines were drawn to look right rather than to be measured.
    """
    reason = why_not_ready(profile(stage=int(PlanStage.ZONING_EXHIBIT)))
    assert reason is not None
    assert "measured" in reason.lower()


@pytest.mark.parametrize("stage", [
    PlanStage.PRELIMINARY_PLAT, PlanStage.FINAL_PLAT, PlanStage.RECORDED_SURVEY,
])
def test_a_confirmed_survey_accurate_drawing_passes_the_gates(stage):
    assert why_not_ready(profile(stage=int(stage))) is None


@pytest.mark.parametrize("stage", [
    PlanStage.ZONING_EXHIBIT, PlanStage.CONCEPT, PlanStage.SITE_PLAN,
])
def test_every_illustrative_stage_is_refused(stage):
    assert why_not_ready(profile(stage=int(stage))) is not None


def test_an_unknown_stage_is_refused():
    assert why_not_ready(profile(stage=None)) is not None
    assert why_not_ready(profile(stage=999)) is not None


# ── nothing is written when a gate fails ────────────────────────────────────


def test_a_blocked_apply_writes_nothing_and_says_why():
    cursor = _Cursor()
    out = apply_confirmed_plan(
        cursor,
        project_id=8,
        doc_id=764,
        doc_name="plat.pdf",
        pdf_bytes=b"%PDF-1.4 not really",
        plan_profile=profile(confirmed_by_user=False),
    )
    assert out.applied is False
    assert out.rollup is None
    assert cursor.executed == []
    assert out.blocked_reason == out.message


def test_an_untrustworthy_reading_is_refused_in_plain_english(monkeypatch):
    """
    An unround scale means the fit found something that is not lots. The
    message has to say that in words the person who pressed Confirm can act
    on — not a number and a shrug.
    """
    from apps.knowledge.services.plan_geometry import apply_plan
    from apps.knowledge.services.plan_geometry.lot_table import LotAreaTable
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot
    from apps.knowledge.services.plan_geometry.plan_reader import PlanReading

    monkeypatch.setattr(apply_plan, "read_plan", lambda path: PlanReading(
        table=LotAreaTable(areas={101: 5000}),
        lots=[DerivedLot(number=101, area_sqft=5000.0)],
        scale_ft_per_inch=175.2,
        scale_is_round=False,
        label_disagreements={"drawn_but_not_tabulated": [], "tabulated_but_not_drawn": []},
    ))
    cursor = _Cursor()
    out = apply_confirmed_plan(cursor, project_id=8, doc_id=764, doc_name="plat.pdf",
                               pdf_bytes=b"%PDF", plan_profile=profile())
    assert out.applied is False
    assert cursor.executed == []
    assert "175" in out.message and "not a scale anyone draws at" in out.message


def test_a_short_table_read_is_refused_by_its_own_name(monkeypatch):
    """Lots drawn but not tabulated means a wrong denominator, not a small plat."""
    from apps.knowledge.services.plan_geometry import apply_plan
    from apps.knowledge.services.plan_geometry.lot_table import LotAreaTable
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot
    from apps.knowledge.services.plan_geometry.plan_reader import PlanReading

    monkeypatch.setattr(apply_plan, "read_plan", lambda path: PlanReading(
        table=LotAreaTable(areas={101: 5000}),
        lots=[DerivedLot(number=101, area_sqft=5000.0)],
        scale_ft_per_inch=50.0,
        scale_is_round=True,
        label_disagreements={"drawn_but_not_tabulated": [182, 183],
                             "tabulated_but_not_drawn": []},
    ))
    out = apply_confirmed_plan(_Cursor(), project_id=8, doc_id=764, doc_name="plat.pdf",
                               pdf_bytes=b"%PDF", plan_profile=profile())
    assert out.applied is False
    assert "2 lot numbers are drawn" in out.message


def test_a_drawing_with_no_lot_schedule_says_so_rather_than_failing(monkeypatch):
    """Most plats outside this jurisdiction carry no lot area table at all."""
    from apps.knowledge.services.plan_geometry import apply_plan
    from apps.knowledge.services.plan_geometry.lot_table import LotAreaTable
    from apps.knowledge.services.plan_geometry.plan_reader import PlanReading

    monkeypatch.setattr(apply_plan, "read_plan",
                        lambda path: PlanReading(table=LotAreaTable(), lots=[]))
    out = apply_confirmed_plan(_Cursor(), project_id=8, doc_id=764, doc_name="plat.pdf",
                               pdf_bytes=b"%PDF", plan_profile=profile())
    assert out.applied is False
    assert "no lot schedule" in out.message.lower()


def test_a_grouping_refusal_stops_the_write(monkeypatch):
    from apps.knowledge.services.plan_geometry import apply_plan
    from apps.knowledge.services.plan_geometry.lot_table import LotAreaTable
    from apps.knowledge.services.plan_geometry.parcel_rollup import DerivedLot, Grouping
    from apps.knowledge.services.plan_geometry.plan_reader import PlanReading

    monkeypatch.setattr(apply_plan, "read_plan", lambda path: PlanReading(
        table=LotAreaTable(areas={101: 5000}),
        lots=[DerivedLot(number=101, area_sqft=5000.0)],
        scale_ft_per_inch=50.0, scale_is_round=True,
        label_disagreements={"drawn_but_not_tabulated": [], "tabulated_but_not_drawn": []},
    ))
    monkeypatch.setattr(apply_plan, "group_into_parcels",
                        lambda lots, expected_counts=None: Grouping(
                            grouped=False, ungrouped=list(lots),
                            reason="the hundred blocks do not run 1..N."))
    cursor = _Cursor()
    out = apply_confirmed_plan(cursor, project_id=8, doc_id=764, doc_name="plat.pdf",
                               pdf_bytes=b"%PDF", plan_profile=profile())
    assert out.applied is False
    assert cursor.executed == []
    assert "hundred blocks" in out.message
