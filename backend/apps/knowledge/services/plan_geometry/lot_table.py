"""
Read a plat's own lot area table, and use it to build the lots whose outline
never closed.

Two jobs, in the order they have to happen.

1. The table
------------
A plat that carries a lot area table is stating, in its own hand, how many lots
it has and how big each one is. That table is the acceptance test for every
outline the matcher recovers, so reading it correctly is upstream of everything.

It is also where the quiet errors live, because a table is drawn, not typed:

* **One row on the Red Valley Ranch final plat writes 5,418 square feet as
  "5.418"** — a decimal point where every other row uses a comma. A reader that
  insists on a comma drops that lot and never mentions it.
* **The acre column is not always a fraction.** Two lots on the same sheet are
  1.211 acres, so a pattern anchored to ``0.xxx`` made them invisible. That cost
  two of the plat's 286 lots, and the loss was undetectable from inside the
  extraction: the remaining rows were contiguous and every one of them balanced.

So the table is read permissively and each row is then checked against its own
arithmetic — square feet ÷ 43,560 must equal the acreage the same row states.
That check is what makes permissiveness safe; it is a verifier, and it is never
used to repair a row.

**A completeness check that only inspects what you already collected proves
nothing.** ``compare_to_drawn_labels`` is the honest test: lot numbers drawn on
the sheets, against rows in the table. Two independent sources, so a row lost
before the check ran still shows up as missing.

2. The lots that never closed
-----------------------------
Recovery leaves gaps — lot lines stop a hair short and neighbours merge. Where
a gap sits between two lots that *were* recovered and verified, the plat has
already said how wide the missing lots are, so they can be rebuilt rather than
abandoned.

What keeps that honest is **closure**, not area. Frontage taken as stated area
÷ depth makes the area check circular — of course 42 × 124 equals the 5,208
square feet the table states. The real test is that the gap between two proven
lots is exactly wide enough for what is missing. Where it is not — and on this
plat that is usually because a 30-foot drainage tract sits in the run — the
drawing's own frontage callouts are read to see what occupies the space, and if
they do not account for it the run is refused rather than filled.

Gregg's rule, added 2026-08-14: **a gap narrower than the smallest lot the plat
itself contains is not a lot.** It is an easement or a sliver. The minimum comes
from the drawing's own verified lots, never from an assumed zoning standard —
this plat states no minimum lot width at all; its zoning defers to a PAD
document that is a different file.
"""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass, field
from typing import Iterable, Mapping, Optional, Sequence

logger = logging.getLogger(__name__)

__all__ = [
    "LotAreaTable",
    "TractAreaTable",
    "read_lot_area_table",
    "read_tract_area_table",
    "compare_to_drawn_labels",
    "DerivedOutline",
    "derive_missing_lots",
]

SQFT_PER_ACRE = 43560.0

#: A lot number in the table's first column.
_NUM = re.compile(r"\d{2,4}$")
#: Square feet. Either separator — see the module docstring.
_SQFT = re.compile(r"\d{1,3}[.,]\d{3}$")
#: Acres. NOT anchored to a leading zero: lots of an acre or more exist.
_ACRES = re.compile(r"\d{1,2}\.\d{2,3}$")
#: A dimension callout along a row of lots, e.g. -42.00' or 30.00·
_CALLOUT = re.compile(r"^[-~•]*(\d{1,3}\.\d{2})['·•~]*[-~]*$")

#: How far the stated square footage may sit from the stated acreage before the
#: row is rejected. Tight: this is arithmetic on the same row, not a estimate.
_ARITHMETIC_TOLERANCE_ACRES = 0.0015


@dataclass
class LotAreaTable:
    """The plat's own statement of its lots."""

    #: lot number → square feet, only rows whose own arithmetic balances
    areas: dict[int, int] = field(default_factory=dict)
    #: rows read but rejected, as (number, square feet as written, acres)
    rejected: list[tuple[int, str, str]] = field(default_factory=list)
    sheets: list[int] = field(default_factory=list)

    def __len__(self) -> int:
        return len(self.areas)

    @property
    def total_acres(self) -> float:
        return sum(self.areas.values()) / SQFT_PER_ACRE

    def by_hundred_block(self) -> dict[int, list[int]]:
        out: dict[int, list[int]] = {}
        for n in sorted(self.areas):
            out.setdefault(n // 100, []).append(n)
        return out

    def summary(self) -> str:
        blocks = ", ".join(f"{k}: {len(v)}" for k, v in self.by_hundred_block().items())
        return (
            f"{len(self.areas)} lots ({blocks}), {self.total_acres:.2f} acres; "
            f"{len(self.rejected)} rows failed their own arithmetic"
        )


def read_lot_area_table(doc, header: str = "LOT AREA TABLE") -> LotAreaTable:
    """
    Read every sheet carrying a lot area table.

    `doc` is an open PyMuPDF document. Rows are found geometrically — a lot
    number with a square footage to its right and an acreage to the right of
    that, all on one line — because a plat's table has no machine structure,
    only ink in columns.
    """
    table = LotAreaTable()
    for page_index in range(len(doc)):
        page = doc[page_index]
        if header not in page.get_text().upper():
            continue
        words = page.get_text("words")
        sqft = [w for w in words if _SQFT.fullmatch(w[4])]
        acres = [w for w in words if _ACRES.fullmatch(w[4])]
        found_here = 0
        for num in (w for w in words if _NUM.fullmatch(w[4])):
            mid = (num[1] + num[3]) / 2
            height = num[3] - num[1]

            def same_row(w, left_of):
                return (abs((w[1] + w[3]) / 2 - mid) < height * 0.6
                        and 0 < w[0] - left_of < height * 6)

            near_sqft = [w for w in sqft if same_row(w, num[2])]
            if not near_sqft:
                continue
            s = min(near_sqft, key=lambda w: w[0])
            near_acres = [w for w in acres if same_row(w, s[2])]
            if not near_acres:
                continue
            a = min(near_acres, key=lambda w: w[0])

            square_feet = int(re.sub(r"[.,]", "", s[4]))
            stated_acres = float(a[4])
            if abs(square_feet / SQFT_PER_ACRE - stated_acres) <= _ARITHMETIC_TOLERANCE_ACRES:
                table.areas[int(num[4])] = square_feet
                found_here += 1
            else:
                table.rejected.append((int(num[4]), s[4], a[4]))
        if found_here:
            table.sheets.append(page_index)
    logger.info("lot area table: %s", table.summary())
    return table


def compare_to_drawn_labels(table: LotAreaTable, drawn: Iterable[int]) -> dict[str, list[int]]:
    """
    Check the table against a second, independent source: the lot numbers
    actually drawn on the sheets.

    This is the only completeness test worth having. Checking a table against
    itself — no gaps, every row balances — reads as full confidence on a set
    that is missing rows, because a row filtered out upstream leaves no trace
    inside the set. On the Red Valley plat that comparison found lot 183
    immediately, and pulled the count from 284 to its true 286.
    """
    drawn = set(drawn)
    return {
        "drawn_but_not_tabulated": sorted(drawn - set(table.areas)),
        "tabulated_but_not_drawn": sorted(set(table.areas) - drawn),
    }


# ─────────────────────────────────────────── tract area table


#: Tract identifier in the table: a single uppercase letter, possibly preceded
#: by "TRACT" or "TR" or "TR.".
_TRACT_LABEL = re.compile(r"^(?:TRACT\s*|TR\.?\s*)?([A-Z])$", re.IGNORECASE)


@dataclass
class TractAreaTable:
    """The plat's own statement of its drainage/utility tracts."""

    #: tract label ("A", "B", ...) → square feet
    areas: dict[str, int] = field(default_factory=dict)
    rejected: list[tuple[str, str, str]] = field(default_factory=list)
    sheets: list[int] = field(default_factory=list)

    def __len__(self) -> int:
        return len(self.areas)

    @property
    def total_acres(self) -> float:
        return sum(self.areas.values()) / SQFT_PER_ACRE

    def summary(self) -> str:
        labels = ", ".join(sorted(self.areas))
        return (
            f"{len(self.areas)} tracts ({labels}), {self.total_acres:.2f} acres; "
            f"{len(self.rejected)} rows failed their own arithmetic"
        )


def read_tract_area_table(doc, header: str = "TRACT AREA TABLE") -> TractAreaTable:
    """Read every sheet carrying a tract area table.

    Tract area tables have the same columnar layout as lot area tables but the
    first column is a letter (A, B, C...) or "TRACT A" instead of a number.
    The table header is typically "TRACT AREA TABLE" or "TRACT AREA SUMMARY".
    """
    table = TractAreaTable()
    # Try multiple header variations
    headers = [header, "TRACT AREA SUMMARY", "TRACT AREA", "TRACT TABLE"]
    for page_index in range(len(doc)):
        page = doc[page_index]
        page_text = page.get_text().upper()
        if not any(h in page_text for h in headers):
            continue
        words = page.get_text("words")
        sqft = [w for w in words if _SQFT.fullmatch(w[4])]
        acres = [w for w in words if _ACRES.fullmatch(w[4])]
        found_here = 0
        for candidate in words:
            text = candidate[4].strip()
            m = _TRACT_LABEL.fullmatch(text)
            if not m:
                continue
            label = m.group(1).upper()
            mid = (candidate[1] + candidate[3]) / 2
            height = candidate[3] - candidate[1]

            def same_row(w, left_of):
                return (abs((w[1] + w[3]) / 2 - mid) < height * 0.6
                        and 0 < w[0] - left_of < height * 8)

            near_sqft = [w for w in sqft if same_row(w, candidate[2])]
            if not near_sqft:
                continue
            s = min(near_sqft, key=lambda w: w[0])
            near_acres = [w for w in acres if same_row(w, s[2])]
            if not near_acres:
                continue
            a = min(near_acres, key=lambda w: w[0])

            square_feet = int(re.sub(r"[.,]", "", s[4]))
            stated_acres = float(a[4])
            if abs(square_feet / SQFT_PER_ACRE - stated_acres) <= _ARITHMETIC_TOLERANCE_ACRES:
                table.areas[label] = square_feet
                found_here += 1
            else:
                table.rejected.append((label, s[4], a[4]))
        if found_here:
            table.sheets.append(page_index)
    if table.areas:
        logger.info("tract area table: %s", table.summary())
    return table


# ─────────────────────────────────────────── building the lots that never closed


@dataclass(frozen=True)
class DerivedOutline:
    """A lot rebuilt from the plat's stated dimensions rather than recovered."""

    number: int
    page: int
    ring: list[tuple[float, float]]
    area_sqft: float
    stated_sqft: int
    width_ft: float


def _clean(ring) -> tuple[float, float, float, float]:
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), max(xs), min(ys), max(ys)


def _callouts_across(page, left: float, right: float, ytop: float, ybot: float,
                     want_ft: float, tolerance_ft: float, band: float = 40.0,
                     low: float = 10.0, high: float = 200.0):
    """
    The line of dimension callouts that accounts for a whole gap.

    Front and back are dimensioned independently and either may be the complete
    one, and a producer places them a little inside or outside the lot line —
    so gather every callout near the row, group them into the lines they were
    written on, and take the line that closes.
    """
    candidates = []
    for w in page.get_text("words"):
        xc, yc = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if not (left - 3 < xc < right + 3):
            continue
        if not (ytop - band < yc < ytop + band or ybot - band < yc < ybot + band):
            continue
        m = _CALLOUT.match(w[4].strip())
        if not m:
            continue
        v = float(m.group(1))
        if low <= v <= high:
            candidates.append((yc, xc, v))

    lines: dict[float, list[tuple[float, float]]] = {}
    for yc, xc, v in candidates:
        key = next((k for k in lines if abs(k - yc) < 5), yc)
        lines.setdefault(key, []).append((xc, v))

    best = None
    for labels in lines.values():
        labels = sorted(set(labels))
        error = abs(sum(v for _, v in labels) - want_ft)
        if error <= tolerance_ft and (best is None or error < best[0]):
            best = (error, labels)
    return best[1] if best else None


def derive_missing_lots(
    match_result,
    stated_areas: Mapping[int, int],
    doc,
    grow_pt: float = 0.5,
    closure_tolerance_ft: float = 0.5,
) -> tuple[dict[int, DerivedOutline], list[tuple[list[int], str]]]:
    """
    Rebuild the lots the plat lists but whose outline never closed.

    Returns the rebuilt lots and, for everything refused, the run and a
    plain-English reason. The refusals matter as much as the results — most of
    them say something is in the gap that is not a lot.
    """
    by_number = {m.number: m for m in match_result.matched}
    ft_per_pt = math.sqrt(match_result.scale_sqft_per_pt2)

    # nothing narrower than the plat's own smallest lot is a lot (Gregg, 2026-08-14)
    narrow = []
    for m in match_result.matched:
        x0, x1, y0, y1 = _clean(m.ring)
        narrow.append(min(x1 - x0 - 2 * grow_pt, y1 - y0 - 2 * grow_pt) * ft_per_pt)
    if not narrow:
        return {}, [([], "nothing was recovered, so there is no minimum to compare against")]
    min_lot_ft = min(narrow)

    runs: list[list[int]] = []
    current: list[int] = []
    for n in sorted(match_result.unresolved):
        if current and n == current[-1] + 1:
            current.append(n)
        else:
            if current:
                runs.append(current)
            current = [n]
    if current:
        runs.append(current)

    derived: dict[int, DerivedOutline] = {}
    refused: list[tuple[list[int], str]] = []

    for run in runs:
        low, high = run[0] - 1, run[-1] + 1
        has_low = low in by_number
        has_high = high in by_number
        if not has_low and not has_high:
            refused.append((run, "no proven lot on either side"))
            continue

        # ── EDGE LOTS: one anchor only ──────────────────────────
        # Place each lot adjacent to the one proved neighbour, using
        # stated_area / anchor_depth as the width.
        if not has_low or not has_high:
            anchor_lot = by_number[low] if has_low else by_number[high]
            anchor = _clean(anchor_lot.ring)
            # Determine orientation from anchor shape: wider than tall = horizontal
            a_w = anchor[1] - anchor[0]
            a_h = anchor[3] - anchor[2]
            is_horiz = a_w < a_h  # lot width < depth → lots run horizontally
            if is_horiz:
                depth_pt = a_h
                edge = anchor[1] if has_low else anchor[0]
            else:
                depth_pt = a_w
                edge = anchor[3] if has_low else anchor[2]
            depth_ft = depth_pt * ft_per_pt

            cursor = edge
            ordered = list(run) if has_low else list(reversed(run))
            for n in ordered:
                w_ft = stated_areas[n] / depth_ft
                w_pt = w_ft / ft_per_pt
                if has_low:
                    x1, x2 = cursor, cursor + w_pt
                else:
                    x1, x2 = cursor - w_pt, cursor
                if is_horiz:
                    ring = [(x1, anchor[2]), (x2, anchor[2]),
                            (x2, anchor[3]), (x1, anchor[3])]
                else:
                    ring = [(anchor[0], x1), (anchor[1], x1),
                            (anchor[1], x2), (anchor[0], x2)]
                derived[n] = DerivedOutline(
                    number=n, page=anchor_lot.page, ring=ring,
                    area_sqft=stated_areas[n],
                    stated_sqft=stated_areas[n],
                    width_ft=w_ft,
                )
                cursor = x2 if has_low else x1
            continue

        a_lot, b_lot = by_number[low], by_number[high]
        if a_lot.page != b_lot.page:
            refused.append((run, "the neighbours are on different sheets"))
            continue
        a, b = _clean(a_lot.ring), _clean(b_lot.ring)
        # Lots on a curved street share one edge tightly but the opposite
        # edge is staggered by the arc — typically 10-12 pt on this plat.
        # Require at least one side aligned within 4 pt and the other
        # within 15 pt (~10 ft at 1in=50ft, <10% of a 120 ft lot depth).
        _TIGHT, _LOOSE = 4, 15
        h_top, h_bot = abs(a[2] - b[2]), abs(a[3] - b[3])
        horizontal = (min(h_top, h_bot) <= _TIGHT and max(h_top, h_bot) <= _LOOSE)
        v_left, v_right = abs(a[0] - b[0]), abs(a[1] - b[1])
        vertical = (min(v_left, v_right) <= _TIGHT and max(v_left, v_right) <= _LOOSE)
        if not horizontal and not vertical:
            # Corner turn — fall back to the low-numbered anchor alone,
            # same logic as edge lots. The numbering walks the block
            # boundary, so the low anchor is the last lot before the turn.
            anchor_lot = a_lot
            anchor = a
            a_w = anchor[1] - anchor[0]
            a_h = anchor[3] - anchor[2]
            is_horiz = a_w < a_h
            if is_horiz:
                depth_pt = a_h
                edge = anchor[1]
            else:
                depth_pt = a_w
                edge = anchor[3]
            depth_ft_edge = depth_pt * ft_per_pt
            cursor = edge
            for n in run:
                w_ft = stated_areas[n] / depth_ft_edge
                w_pt = w_ft / ft_per_pt
                x1, x2 = cursor, cursor + w_pt
                if is_horiz:
                    ring = [(x1, anchor[2]), (x2, anchor[2]),
                            (x2, anchor[3]), (x1, anchor[3])]
                else:
                    ring = [(anchor[0], x1), (anchor[1], x1),
                            (anchor[1], x2), (anchor[0], x2)]
                derived[n] = DerivedOutline(
                    number=n, page=anchor_lot.page, ring=ring,
                    area_sqft=stated_areas[n],
                    stated_sqft=stated_areas[n],
                    width_ft=w_ft,
                )
                cursor = x2
            continue

        if horizontal:
            # ── horizontal row: gap runs left-right ──────────────
            if a[0] < b[0]:
                left, right = a[1] - grow_pt, b[0] + grow_pt
            else:
                left, right = b[1] - grow_pt, a[0] + grow_pt
            # Use the AVERAGE of the two anchors' depths rather than
            # their overlap. On a curved street, lots stagger by ~10 pt
            # at one edge while sharing the other; the overlap clips the
            # depth and inflates the width needed, refusing a 42 ft lot
            # into a 42 ft gap as "3 ft short."
            a_depth = a[3] - a[2]
            b_depth = b[3] - b[2]
            avg_depth_pt = (a_depth + b_depth) / 2
            ytop = min(a[2], b[2]) + grow_pt
            ybot = ytop + avg_depth_pt
            gap_ft = (right - left) * ft_per_pt
            depth_ft = avg_depth_pt * ft_per_pt
        else:
            # ── vertical column: gap runs top-bottom ─────────────
            if a[2] < b[2]:
                top, bot = a[3] - grow_pt, b[2] + grow_pt
            else:
                top, bot = b[3] - grow_pt, a[2] + grow_pt
            xleft, xright = max(a[0], b[0]) + grow_pt, min(a[1], b[1]) - grow_pt
            gap_ft = (bot - top) * ft_per_pt
            depth_ft = (xright - xleft) * ft_per_pt

        if gap_ft < min_lot_ft * 0.97:
            refused.append((run, f"the gap is {gap_ft:.1f} ft, narrower than the plat's "
                                 f"smallest lot ({min_lot_ft:.1f} ft)"))
            continue

        needed = {n: stated_areas[n] / depth_ft for n in run}
        # 3% of the gap accounts for line thickness (~1pt = 0.7ft) and
        # the depth averaging across staggered anchors. At 42ft this is
        # ~1.3ft; at 180ft ~5.4ft — still well below a missing tract.
        tolerance = max(closure_tolerance_ft, 0.03 * gap_ft)
        placed: Optional[dict[int, tuple[float, float]]] = None

        if horizontal:
            left_edge, right_edge = left, right
            callouts = _callouts_across(doc[a_lot.page], left, right, ytop, ybot,
                                        gap_ft, tolerance)
        else:
            left_edge, right_edge = top, bot
            # Vertical gaps: skip callout reading for now — the callout
            # reader is tuned for horizontal rows. Closure check still
            # applies.
            callouts = None

        if callouts:
            # the drawing itself says what occupies the gap, and in what order
            wanted = [needed[n] for n in run]
            index, x, trial = 0, left_edge, {}
            for _, value in callouts:
                x2 = x + value / ft_per_pt
                # 5% of the needed width accounts for the depth estimate
                # shifting when anchors stagger on curved streets.
                match_tol = max(0.75, 0.05 * wanted[index]) if index < len(wanted) else 0.75
                if (index < len(wanted) and abs(value - wanted[index]) <= match_tol
                        and value >= min_lot_ft * 0.97):
                    trial[run[index]] = (x, x2)
                    index += 1
                x = x2
            if index == len(run):
                placed = trial

        if placed is None:
            total_needed = sum(needed.values())
            excess = gap_ft - total_needed
            if abs(excess) <= tolerance:
                # Lots fill the gap exactly — place left to right.
                placed, x = {}, left_edge
                for n in run:
                    x2 = x + needed[n] / ft_per_pt
                    placed[n] = (x, x2)
                    x = x2
            elif 15 <= excess <= 80:
                # The excess is a plausible drainage tract width. Place
                # the lots at the LEFT end (lower-numbered anchor side)
                # and leave the tract at the right. Plat lot numbering
                # runs left-to-right within a block, with tracts at
                # block boundaries.
                placed, x = {}, left_edge
                for n in run:
                    x2 = x + needed[n] / ft_per_pt
                    placed[n] = (x, x2)
                    x = x2
                logger.info(
                    "lots %s: placed with %.0f ft tract at right of gap",
                    run, excess,
                )
            elif excess > 80:
                # Very large excess — multiple tracts or features in the
                # gap. Place the lots against the low-numbered anchor
                # (same as edge-lot logic) since we can't determine the
                # tract layout.
                placed, x = {}, left_edge
                for n in run:
                    x2 = x + needed[n] / ft_per_pt
                    placed[n] = (x, x2)
                    x = x2
                logger.info(
                    "lots %s: placed against low anchor, %.0f ft of tracts/features in gap",
                    run, excess,
                )
            else:
                refused.append((run, f"the gap is {gap_ft:.1f} ft but the lots need "
                                     f"{total_needed:.1f} ft — something else "
                                     f"occupies it"))
                continue

        for n, (x, x2) in placed.items():
            width_ft = (x2 - x) * ft_per_pt
            if width_ft < min_lot_ft * 0.97:
                refused.append(([n], "would be narrower than the plat's smallest lot"))
                continue
            if horizontal:
                ring = [(x, ytop), (x2, ytop), (x2, ybot), (x, ybot)]
            else:
                ring = [(xleft, x), (xright, x), (xright, x2), (xleft, x2)]
            derived[n] = DerivedOutline(
                number=n,
                page=a_lot.page,
                ring=ring,
                area_sqft=(x2 - x) * depth_ft * ft_per_pt,
                stated_sqft=stated_areas[n],
                width_ft=width_ft,
            )

    logger.info("derived %d lots, refused %d runs", len(derived), len(refused))
    return derived, refused
