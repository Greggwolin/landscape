"""
The step between a person confirming a drawing and the project changing.

Everything before this reads. This is the first thing in the package that
writes to a project, so the whole module is about the conditions under which it
declines to.

Four gates, and each one has cost something
-------------------------------------------
1. **The document must be a plan, and its stage must be confirmed by a person.**
   Gregg's rule of 2026-08-14: read the stage, show it, derive nothing until he
   confirms. The classifier's own confidence does not substitute — `intake`
   writes `trusted_for_money` false without exception and only the confirm
   action sets it, precisely so that a reader downstream cannot mistake the
   machine's opinion for a person's permission.

2. **The confirmed stage must be one whose geometry is survey-accurate.**
   A zoning exhibit confirmed *as a zoning exhibit* is correctly confirmed and
   still must not produce parcels: `stages.TRUST_FOR_MONEY` is the barrier, and
   an illustrative lot line that quietly becomes frontage in a budget is the
   error nobody catches until it is expensive.

3. **The reading must be trustworthy.** `PlanReading.trustworthy` gates on the
   fitted scale being a round engineering value — the scale is derived from
   matching areas rather than read off the sheet, so an unround result means
   the fit found something that is not lots. That check already caught a run
   across all seven sheets at 1 inch = 175 ft with nothing measured.

4. **The grouping must not be a guess.** `group_into_parcels` refuses rather
   than inventing a parcel structure, and a refusal here is returned as a
   reason, not worked around.

Any gate that fails returns a plain-English reason and writes nothing. There is
no partial application: a half-written project is worse than an unchanged one,
because the second is obvious and the first is not.

What it does not do
-------------------
Place anything on the earth. `PlanReading` leaves every ring null because the
coordinates are points on a sheet, so parcels get their lot counts, frontage
and acreage while `gis_plan_lot.geom` stays empty until georeferencing lands.
Storing a sheet-coordinate ring in a column that expects EPSG:3857 would be
silently, confidently wrong — and silence is the whole problem with it.
"""

from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass, field
from typing import Optional

from .parcel_rollup import RollupResult, group_into_parcels, write_rollup
from .plan_reader import PlanReading, read_plan
from .stages import STAGE_LABELS, TRUST_FOR_MONEY, PlanStage

logger = logging.getLogger(__name__)

__all__ = ["ApplyOutcome", "apply_confirmed_plan", "why_not_ready"]


@dataclass
class ApplyOutcome:
    """What happened, in terms a person can act on."""

    applied: bool
    #: One line, plain English, safe to show whoever pressed Confirm.
    message: str
    reading: Optional[PlanReading] = None
    rollup: Optional[RollupResult] = None
    #: Runs of lots the reader declined to rebuild, each with its reason.
    refusals: list[tuple[list[int], str]] = field(default_factory=list)

    @property
    def blocked_reason(self) -> Optional[str]:
        return None if self.applied else self.message


def why_not_ready(plan_profile: dict) -> Optional[str]:
    """
    Whether a document's stored verdict permits reading its geometry.

    Returns None when it does, or the reason it does not. Separated out so a
    caller can grey a button and say why without doing the work first.
    """
    if not plan_profile:
        return "This document has not been read as a drawing."
    if not plan_profile.get("is_plan"):
        return "This document is not a drawing."
    if not plan_profile.get("confirmed_by_user"):
        return "Confirm what this drawing is before anything is measured from it."

    stage = plan_profile.get("stage")
    if stage is None:
        return "The drawing's stage has not been established."
    try:
        stage = PlanStage(int(stage))
    except ValueError:
        return "The drawing's stage was not recognised."
    if stage not in TRUST_FOR_MONEY:
        label = STAGE_LABELS[stage].lower()
        return (
            f"A {label} is drawn to look right rather than to be measured, "
            "so no parcels are read from it."
        )
    return None


def apply_confirmed_plan(
    cursor,
    *,
    project_id: int,
    doc_id: int,
    doc_name: str,
    pdf_bytes: bytes,
    plan_profile: dict,
    expected_counts: Optional[dict[int, int]] = None,
) -> ApplyOutcome:
    """
    Read a confirmed drawing and write what it says into the project.

    `pdf_bytes` rather than a URI: fetching is the caller's business, and
    keeping it out of here means this can be exercised without a network.

    All-or-nothing. The caller should wrap it in a transaction; nothing here
    writes until every gate has passed.
    """
    blocked = why_not_ready(plan_profile)
    if blocked:
        return ApplyOutcome(applied=False, message=blocked)

    # The reader needs a path — PyMuPDF can open a stream, but `match_lots`
    # re-opens by path for the linework pass.
    handle, path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(handle, "wb") as f:
            f.write(pdf_bytes)
        reading = read_plan(path)
    finally:
        os.unlink(path)

    if not reading.lots:
        return ApplyOutcome(
            applied=False,
            reading=reading,
            message=(
                "No lot schedule could be read from this drawing, so there is "
                "nothing to measure. Plats outside the City of Maricopa often "
                "carry no lot area table at all."
            ),
        )

    if not reading.trustworthy:
        missing = reading.label_disagreements.get("drawn_but_not_tabulated") or []
        if missing:
            detail = (
                f"{len(missing)} lot numbers are drawn on the sheets but missing "
                "from the schedule, so the totals would be short."
            )
        else:
            detail = (
                f"the drawing works out to {reading.scale_ft_per_inch:.0f} feet to "
                "the inch, which is not a scale anyone draws at — so the "
                "measurement has found something other than the lots."
            )
        return ApplyOutcome(
            applied=False,
            reading=reading,
            refusals=reading.refusals,
            message=f"The reading did not hold up: {detail} Nothing was changed.",
        )

    grouping = group_into_parcels(reading.lots, expected_counts=expected_counts)
    if not grouping.grouped:
        return ApplyOutcome(
            applied=False,
            reading=reading,
            refusals=reading.refusals,
            message=(
                f"The lots could not be split into parcels — {grouping.reason} "
                "Nothing was changed."
            ),
        )

    stage = int(plan_profile["stage"])
    rollup = write_rollup(
        cursor,
        project_id=project_id,
        grouping=grouping,
        source_doc=doc_name,
        stage=stage,
        confidence=plan_profile.get("confidence"),
        tracts=reading.tracts,
    )

    measured = reading.with_frontage
    parcels = len(grouping.parcels)
    message = (
        f"Read {reading.lot_count} lots across {parcels} "
        f"{'parcel' if parcels == 1 else 'parcels'} — "
        f"{measured} measured, {reading.total_frontage_ft:,.0f} front feet, "
        f"{reading.total_acres:.1f} acres."
    )
    if reading.tracts:
        message += (
            f" {len(reading.tracts)} drainage or utility "
            f"{'tract' if len(reading.tracts) == 1 else 'tracts'} were "
            "identified alongside them; tracts are not saleable, so they are "
            "recorded but counted toward no parcel."
        )
    if measured < reading.lot_count:
        message += (
            f" The other {reading.lot_count - measured} are counted but not "
            "measured — corner and cul-de-sac lots, whose shape a width and a "
            "depth do not describe."
        )

    logger.info("[doc_id=%s] applied to project %s: %s", doc_id, project_id, rollup.summary())
    return ApplyOutcome(
        applied=True,
        message=message,
        reading=reading,
        rollup=rollup,
        refusals=reading.refusals,
    )
