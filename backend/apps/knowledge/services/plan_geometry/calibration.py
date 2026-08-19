"""
Checking the drape against the parcel schedule.

A site plan is placed on the map by hand — the user drags four corners until it
looks right.  "Looks right" is reliably good to a few percent and reliably not
better than that, and a few percent of linear error is over ten percent of
area.  Left alone that produces acreages which are individually plausible and
collectively wrong in the same direction.

The project's own parcel schedule is the fix.  It is a recorded list of parcels
and their acreages, independent of the drawing, so comparing extracted areas
against it measures the placement rather than the extraction.  A shortfall that
is *uniform* across parcels is a scale error in the drape; scatter is
extraction noise.  Separating those two is the whole point of this module.

Measured on the Peoria Meadows drape, 2026-08-14: uniform shortfall of 10.9%,
resolved by a single scale factor of 1.1212 (5.9% linear), after which mean
error against the recorded schedule fell to 1.8%.
"""

from __future__ import annotations

import logging
import statistics
from dataclasses import dataclass
from typing import Sequence

logger = logging.getLogger("landscape.plan_geometry")


#: Below this spread, a shortfall is treated as a placement error rather than
#: as extraction noise. Expressed as the coefficient of variation of the
#: per-parcel ratios.
UNIFORMITY_THRESHOLD = 0.06

#: A correction larger than this is not applied automatically — it means the
#: drape is wrong enough that a human should look, not that it needs nudging.
MAX_AUTO_SCALE = 1.35
MIN_AUTO_SCALE = 0.74


@dataclass(frozen=True)
class ScaleCheck:
    """The verdict on a drape's placement."""

    #: Multiply extracted areas by this to agree with the schedule.
    area_scale: float
    #: The equivalent linear correction, which is what the drape is actually off by.
    linear_scale: float
    #: Spread of the per-parcel ratios. Low means a genuine scale error.
    uniformity: float
    #: How many parcels the comparison used.
    sample_size: int
    #: Mean absolute error against the schedule before and after correcting.
    error_before_pct: float
    error_after_pct: float
    #: Whether the correction is safe to apply without asking.
    auto_applicable: bool
    #: One plain-English sentence for the user.
    message: str


def check_scale(
    extracted_acres: Sequence[float],
    schedule_acres: Sequence[float],
    *,
    sample: int = 16,
) -> ScaleCheck | None:
    """
    Compare extracted areas against a recorded parcel schedule.

    Both sequences are compared largest-first rather than by identity, because
    at this point the extracted shapes have not yet been matched to parcel
    records.  Rank comparison is sound for the scale question — a uniform
    scale error preserves ordering — but it is not evidence that any individual
    shape *is* the parcel it lines up with.  Matching is a separate step and a
    stronger claim.

    Returns None when there is too little to compare.
    """
    ex = sorted((a for a in extracted_acres if a > 0), reverse=True)[:sample]
    sch = sorted((float(a) for a in schedule_acres if a and float(a) > 0), reverse=True)[:sample]

    n = min(len(ex), len(sch))
    if n < 5:
        logger.info("scale check skipped: only %d comparable parcels", n)
        return None

    ex, sch = ex[:n], sch[:n]
    ratios = [s / e for e, s in zip(ex, sch)]
    scale = statistics.median(ratios)
    spread = statistics.pstdev(ratios) / scale if scale else 1.0

    before = statistics.mean(abs(e - s) / s * 100 for e, s in zip(ex, sch))
    after = statistics.mean(abs(e * scale - s) / s * 100 for e, s in zip(ex, sch))

    uniform = spread <= UNIFORMITY_THRESHOLD
    in_range = MIN_AUTO_SCALE <= scale <= MAX_AUTO_SCALE
    improves = after < before * 0.5
    auto = uniform and in_range and improves

    linear = scale ** 0.5
    off_pct = (linear - 1.0) * 100

    if not uniform:
        msg = (
            "The parcel areas from this drawing disagree with the recorded "
            "schedule by varying amounts, so this is not a placement problem — "
            "the drawing and the schedule may describe different layouts."
        )
    elif abs(off_pct) < 1.0:
        msg = "The drawing is placed accurately — areas agree with the recorded schedule."
    else:
        direction = "small" if off_pct > 0 else "large"
        msg = (
            f"The drawing is placed about {abs(off_pct):.1f}% too {direction}. "
            f"Correcting it brings parcel areas to within {after:.1f}% of the "
            "recorded schedule, from " f"{before:.1f}% today."
        )

    return ScaleCheck(
        area_scale=round(scale, 4),
        linear_scale=round(linear, 4),
        uniformity=round(spread, 4),
        sample_size=n,
        error_before_pct=round(before, 2),
        error_after_pct=round(after, 2),
        auto_applicable=auto,
        message=msg,
    )


def apply_scale_to_corners(
    corners: Sequence[Sequence[float]], linear_scale: float
) -> list[list[float]]:
    """
    Rescale a drape's corner quad about its own centre.

    This corrects size, not position or rotation.  If the drawing is also
    offset or turned, the areas will agree while the shapes sit in the wrong
    place — which is precisely why area agreement must never be reported as
    proof that a drape is correct.
    """
    cx = sum(c[0] for c in corners) / len(corners)
    cy = sum(c[1] for c in corners) / len(corners)
    return [
        [cx + (c[0] - cx) * linear_scale, cy + (c[1] - cy) * linear_scale]
        for c in corners
    ]
