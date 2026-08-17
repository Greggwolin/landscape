"""
Read a plat end to end: sheets in, lots out.

This is the join. Every step it calls already existed and was tested on its
own; nothing in the package put them in order, so the four-parcel result that
this arc has been quoting since the beginning could not be reproduced from the
repo — it only ever existed in a scratch script. That gap is what this closes.

The chain
---------
1. **The lot area table** (`lot_table.read_lot_area_table`) — the plat's own
   statement of how many lots it has and how big each one is. Read permissively
   and gated on each row's own arithmetic.
2. **Completeness, checked against a second source** (`compare_to_drawn_labels`)
   — lot numbers drawn on the sheets, against rows in the table. Checking a
   table against itself proves nothing: a row filtered out upstream leaves no
   trace inside the set that remains.
3. **Match** (`lot_match.match_lots`) — every lot number tied to the outline it
   sits inside, each one accepted only if its area agrees with the table. The
   drawing's scale falls out of that fit rather than being read off a scale bar.
4. **Derive** (`lot_table.derive_missing_lots`) — rebuild the lots whose
   outline never closed, where the gap between two proven neighbours is exactly
   wide enough for what is missing.
5. **Measure** (`lot_dimensions.measure_lots`) — width, depth, and which edge is
   the street, decided from the lines a lot shares with its neighbours.
6. **Hand over** — as `parcel_rollup.DerivedLot`, which the writer already
   knows how to group into parcels and store.

Which sheets carry lots
-----------------------
Not the caller's job to know. A plat's lots are drawn on the sheets that carry
lot labels, and the rest are cover sheets, notes and tables — so the sheets are
found by counting labels, not passed in. Every earlier run of this hardcoded
`[3, 4, 5]` for one particular seven-sheet plat, which is exactly the kind of
detail that silently produces a plausible wrong answer on the next drawing.

What this does NOT do
---------------------
Place anything on the earth. Every coordinate here is a point on a sheet, so
`ring_3857` is left null and the lots are counted without being mapped. That is
a separate step, and until it lands a parcel gets its counts, its frontage and
its acreage but no geometry.

It also writes nothing. Reading a drawing and changing a project are different
acts, and the second one waits for a person (see `intake`, and Gregg's rule of
2026-08-14: read the stage, show it, derive nothing until he confirms).
"""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional, Sequence

from .lot_dimensions import measure_lots
from .lot_table import (
    LotAreaTable,
    compare_to_drawn_labels,
    derive_missing_lots,
    read_lot_area_table,
)
from .lot_match import lot_number_tokens, match_lots
from .parcel_rollup import DerivedLot

logger = logging.getLogger(__name__)

__all__ = ["PlanReading", "read_plan", "find_lot_sheets"]

#: A sheet needs at least this many lot labels to be a lot sheet. A cover or
#: notes sheet carries a couple of dozen stray numbers; a lot sheet carries
#: over a hundred. Measured on the Red Valley final plat: cover sheets 24–35,
#: lot sheets 117–153.
_MIN_LABELS_PER_SHEET = 40

#: ...and the labels must be SCATTERED, not stacked in columns. This is what
#: separates a lot sheet from the lot area table, which carries more numbers
#: than any lot sheet and would otherwise win every count-based test. A lot
#: number sits inside its lot, so the numbers spread across the sheet; a table
#: stacks them under a handful of column headings. Same plat: lot sheets run
#: 3.2–6.4 labels per column, the area table 27.5.
_MAX_LABELS_PER_COLUMN = 12

#: How far apart two labels must be, in points, to count as different columns.
_COLUMN_GAP_PT = 25.0

#: Plausible lot numbers. Wide on purpose — plats number in hundred blocks by
#: parcel, so a four-parcel phase runs past 400 with no lot 1 anywhere.
_LOT_NUMBER_RANGE = (1, 9999)


@dataclass
class PlanReading:
    """Everything the drawing said, and how much of it could be established."""

    table: LotAreaTable
    lots: list[DerivedLot] = field(default_factory=list)
    sheets: list[int] = field(default_factory=list)
    #: 1 inch = N feet, fitted from recovered areas against stated ones.
    scale_ft_per_inch: float = 0.0
    #: Whether that scale is one an engineer would have drawn at. False is the
    #: strongest single signal that the read has gone wrong.
    scale_is_round: bool = False
    #: Lot numbers drawn on the sheets but absent from the table, and vice
    #: versa. Non-empty means the table read is incomplete, not that the plat is.
    label_disagreements: dict[str, list[int]] = field(default_factory=dict)
    #: Runs of lots that could not be rebuilt, each with a plain-English reason.
    refusals: list[tuple[list[int], str]] = field(default_factory=list)

    @property
    def lot_count(self) -> int:
        return len(self.lots)

    @property
    def outlined(self) -> int:
        return sum(1 for lot in self.lots if lot.ring_3857 or lot.width_ft is not None)

    @property
    def with_frontage(self) -> int:
        return sum(1 for lot in self.lots if lot.frontage_ft is not None)

    @property
    def total_frontage_ft(self) -> float:
        return sum(lot.frontage_ft or 0.0 for lot in self.lots)

    @property
    def total_acres(self) -> float:
        return self.table.total_acres

    @property
    def trustworthy(self) -> bool:
        """
        Whether this reading should be offered as a result at all.

        A scale that is not a round engineering value means the fit found
        something other than the lots — the single most reliable indicator
        that the whole read is wrong, and worth more than any count.
        """
        return bool(self.lots) and self.scale_is_round and not self.label_disagreements.get(
            "drawn_but_not_tabulated"
        )

    def summary(self) -> str:
        return (
            f"{self.lot_count} lots on {len(self.sheets)} sheets, "
            f"{self.with_frontage} measured, "
            f"{self.total_frontage_ft:,.0f} front feet, "
            f"{self.total_acres:.2f} acres; "
            f"scale 1in = {self.scale_ft_per_inch:.2f} ft "
            f"({'round' if self.scale_is_round else 'NOT round — suspect'})"
        )


def find_lot_sheets(doc, number_range: tuple[int, int] = _LOT_NUMBER_RANGE) -> list[int]:
    """
    The sheets a plat draws its lots on, found by counting lot labels.

    Returns page indices. A drawing with no lot sheets returns an empty list
    rather than guessing, which is the honest answer for a cover page or a
    detail sheet handed in on its own.
    """
    counts = {}
    for page_index in range(len(doc)):
        labels = lot_number_tokens(doc[page_index], *number_range)
        if len(labels) < _MIN_LABELS_PER_SHEET:
            continue
        xs = sorted(point.x for _, point in labels)
        columns = 1 + sum(1 for a, b in zip(xs, xs[1:]) if b - a > _COLUMN_GAP_PT)
        per_column = len(labels) / columns
        if per_column > _MAX_LABELS_PER_COLUMN:
            logger.info(
                "sheet %d has %d numbers but %.1f per column — a table, not lots",
                page_index + 1, len(labels), per_column,
            )
            continue
        counts[page_index] = len(labels)
    logger.info("lot sheets: %s", {k + 1: v for k, v in counts.items()} or "none found")
    return sorted(counts)


def read_plan(
    pdf_path: str,
    doc=None,
    sheets: Optional[Sequence[int]] = None,
    number_range: tuple[int, int] = _LOT_NUMBER_RANGE,
) -> PlanReading:
    """
    Run the whole chain against one plat and hand back what it established.

    `doc` may be supplied when the caller already has the PDF open; otherwise
    it is opened here. `sheets` overrides the label-count detection, which is
    for tests and for a caller who genuinely knows better.
    """
    import pymupdf

    opened_here = doc is None
    doc = doc or pymupdf.open(pdf_path)
    try:
        table = read_lot_area_table(doc)
        if not table.areas:
            logger.info("no lot area table found — nothing to read")
            return PlanReading(table=table)

        lot_sheets = list(sheets) if sheets is not None else find_lot_sheets(doc, number_range)
        if not lot_sheets:
            logger.info("a lot area table but no sheets drawing lots")
            return PlanReading(table=table)

        # Compare like with like. A lot sheet carries plenty of large text that
        # is not a lot number — sheet numbers, a tract's digits, a fragment of a
        # dimension — and on a plat numbered in hundred blocks those land well
        # outside the table's own range. Comparing the raw set reports two dozen
        # phantom "missing lots" and makes the completeness check useless, which
        # is worse than not having one. So the comparison is bounded by the
        # numbering the table itself uses.
        lo = min(table.areas)
        hi = max(table.areas)
        drawn: set[int] = set()
        for page_index in lot_sheets:
            for value, _ in lot_number_tokens(doc[page_index], lo, hi):
                drawn.add(value)
        disagreements = compare_to_drawn_labels(table, drawn)
        if disagreements["drawn_but_not_tabulated"]:
            # Not fatal, but it means the table read is short — say so loudly
            # rather than quietly reporting a total that is missing rows.
            logger.warning(
                "lots drawn but absent from the table: %s",
                disagreements["drawn_but_not_tabulated"],
            )

        match = match_lots(pdf_path, sheets=lot_sheets, stated_areas=table.areas,
                           number_range=(lo, hi))
        derived, refusals = derive_missing_lots(match, table.areas, doc)

        ft_per_pt = math.sqrt(match.scale_sqft_per_pt2) if match.scale_sqft_per_pt2 else 0.0

        # Measure per sheet — two lots on different sheets cannot share a line,
        # and offering them to each other as neighbours invents adjacency.
        rings_by_sheet: dict[int, dict[int, list]] = defaultdict(dict)
        for m in match.matched:
            rings_by_sheet[m.page][m.number] = m.ring
        for number, outline in derived.items():
            rings_by_sheet[outline.page][number] = outline.ring
        measured = {}
        for rings in rings_by_sheet.values():
            measured.update(measure_lots(rings, ft_per_pt))

        pages = {m.number: m.page for m in match.matched}
        pages.update({n: o.page for n, o in derived.items()})

        lots: list[DerivedLot] = []
        for number in sorted(table.areas):
            dims = measured.get(number)
            lots.append(
                DerivedLot(
                    number=number,
                    area_sqft=float(table.areas[number]),
                    # Sheet coordinates are not world coordinates. Placing the
                    # sheet on the earth is a separate step; until it runs, a
                    # lot is counted and measured but not mapped.
                    ring_3857=None,
                    frontage_ft=dims.frontage_ft if dims else None,
                    width_ft=dims.width_ft if dims else None,
                    depth_ft=dims.depth_ft if dims else None,
                    page=pages.get(number),
                    source="read" if number in {m.number for m in match.matched} else "derived",
                )
            )

        reading = PlanReading(
            table=table,
            lots=lots,
            sheets=lot_sheets,
            scale_ft_per_inch=match.scale_ft_per_inch,
            scale_is_round=match.scale_is_round,
            label_disagreements=disagreements,
            refusals=refusals,
        )
        logger.info("plan read: %s", reading.summary())
        return reading
    finally:
        if opened_here:
            doc.close()
