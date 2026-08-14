"""
Roll a plat's lots up into the parcels that actually get sold.

The decision this implements (Gregg, 2026-08-14): a plat creates **parcels**,
with lot counts and frontage rolled up to each — not 286 individual lot
records. The parcel is the thing he sells, and ``$/FF by product per parcel``
is how the disposition model already works. Lot outlines are still stored, but
they hang off the parcel as geometry rather than becoming inventory anyone
manages one at a time.

``tbl_lot`` is deliberately left empty. It exists and is the right home if
lot-level inventory is ever wanted; it is not what was chosen, and nothing here
writes to it.

What this module is not
-----------------------
It does not read a drawing and it does not measure anything. It takes a derive
result — lots that already carry their outline, their area and their frontage —
and is responsible for three things only: grouping them into parcels, checking
that the grouping is safe to believe, and storing the result. **Every figure it
writes is one it was handed.** If the derive step is wrong, this writes the
wrong numbers faithfully, which is the correct division of labour: one place
measures, one place stores, and neither silently corrects the other.

Two safety properties are worth stating outright, because both are the kind of
thing that is easy to lose later:

* **The grouping is verified, not assumed.** A plat numbering its lots
  101-183, 201-287 is telling you which parcel each belongs to, but that is a
  convention rather than a law. Every check is applied per plat, and a failure
  returns the lots ungrouped with a stated reason instead of grouping them
  wrongly. A wrong grouping is worse than no grouping: it produces four
  confident parcels that do not exist.

* **Nothing here prices anything.** The writer names exactly eight columns on
  ``tbl_parcel`` and never mentions a pricing, sales or income-property field.
  Reading a drawing establishes what is there; what it is worth is a separate
  judgement made somewhere else.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from statistics import median
from typing import Iterable, Mapping, Optional, Sequence

logger = logging.getLogger("landscape.plan_geometry")

__all__ = [
    "DerivedLot",
    "ParcelGroup",
    "Grouping",
    "RollupResult",
    "group_into_parcels",
    "write_rollup",
    "PARCEL_ROLLUP_COLUMNS",
    "MIN_LOTS_PER_PARCEL",
    "VALID_SOURCES",
]


#: The only ``tbl_parcel`` columns this writer may populate. A test asserts
#: this tuple has not grown, because the way a drawing-reader starts pricing
#: things is one plausible column at a time.
PARCEL_ROLLUP_COLUMNS = (
    "project_id",
    "parcel_code",
    "parcel_name",
    "acres_gross",
    "units_total",
    "lots_frontfeet",
    "lot_width",
    "lot_depth",
)

SQFT_PER_ACRE = 43_560.0

#: A hundred block holding fewer lots than this is a stray number — a detail
#: callout or a tract label that parsed as a lot — not a parcel.
MIN_LOTS_PER_PARCEL = 5

#: How an outline was obtained. Mirrors the CHECK constraint on the table.
VALID_SOURCES = ("read", "derived")


# ─────────────────────────────────────────────────────── the input contract


@dataclass(frozen=True)
class DerivedLot:
    """One lot exactly as the derive step hands it over.

    None of these figures is computed here. ``area_sqft`` is required because a
    lot with no area cannot contribute to an acreage; everything else is
    optional, because a real plat read yields lots whose outline never closed
    and lots whose frontage could not be determined, and those still count
    toward the parcel's lot total.
    """

    number: int
    area_sqft: float
    #: Closed ring in EPSG:3857, or None when no outline was recovered.
    ring_3857: Optional[Sequence[Sequence[float]]] = None
    frontage_ft: Optional[float] = None
    width_ft: Optional[float] = None
    depth_ft: Optional[float] = None
    #: Sheet the lot is drawn on. Used only to corroborate the grouping.
    page: Optional[int] = None
    source: str = "read"

    @property
    def parcel_number(self) -> int:
        """The hundred block: lot 214 belongs to parcel 2."""
        return self.number // 100

    @property
    def is_placed(self) -> bool:
        return bool(self.ring_3857)


# ────────────────────────────────────────────────────────────── the grouping


@dataclass
class ParcelGroup:
    """One parcel and the lots the plat drew inside it."""

    number: int
    lots: list[DerivedLot]

    @property
    def lot_count(self) -> int:
        """Every lot the plat numbers, whether or not its outline was recovered."""
        return len(self.lots)

    @property
    def outlines_recovered(self) -> int:
        return sum(1 for lot in self.lots if lot.is_placed)

    @property
    def acres(self) -> float:
        return round(sum(lot.area_sqft for lot in self.lots) / SQFT_PER_ACRE, 2)

    @property
    def frontage_ft(self) -> Optional[float]:
        values = [lot.frontage_ft for lot in self.lots if lot.frontage_ft is not None]
        return round(sum(values), 1) if values else None

    @property
    def lot_width(self) -> Optional[float]:
        return self._median("width_ft")

    @property
    def lot_depth(self) -> Optional[float]:
        return self._median("depth_ft")

    def _median(self, attr: str) -> Optional[float]:
        values = [
            getattr(lot, attr) for lot in self.lots if getattr(lot, attr) is not None
        ]
        return round(median(values), 1) if values else None

    @property
    def parcel_code(self) -> str:
        return str(self.number)

    @property
    def parcel_name(self) -> str:
        return f"Parcel {self.number}"


@dataclass
class Grouping:
    """Whether the lots could be split into parcels, and what was checked."""

    grouped: bool
    parcels: list[ParcelGroup] = field(default_factory=list)
    #: Every lot, returned untouched, when the grouping could not be trusted.
    ungrouped: list[DerivedLot] = field(default_factory=list)
    reason: str = ""
    #: Plain-English record of what passed, for showing a person.
    checks: list[str] = field(default_factory=list)

    def summary(self) -> str:
        if not self.grouped:
            return f"Not grouped — {self.reason}"
        parts = ", ".join(f"parcel {p.number}: {p.lot_count} lots" for p in self.parcels)
        return f"{len(self.parcels)} parcels ({parts})"


def group_into_parcels(
    lots: Iterable[DerivedLot],
    expected_counts: Optional[Mapping[int, int]] = None,
) -> Grouping:
    """
    Split lots into parcels by hundred block, having first checked the block.

    ``expected_counts`` is the parcel key sheet's own tally, when the caller
    has read one — the strongest corroboration available, because it is the
    drawing stating the answer rather than the reader inferring it.

    Refuses rather than guesses. Every return with ``grouped=False`` carries a
    reason a person can act on, and the lots come back untouched.
    """
    lots = list(lots)
    checks: list[str] = []

    def refuse(reason: str) -> Grouping:
        logger.info("parcel grouping refused: %s", reason)
        return Grouping(grouped=False, ungrouped=lots, reason=reason, checks=checks)

    if not lots:
        return refuse("there are no lots to group")

    # 1 — every lot must carry a hundred block at all.
    stray = sorted({lot.number for lot in lots if lot.number < 100})
    if stray:
        return refuse(
            f"{len(stray)} lot(s) are not numbered in hundred blocks "
            f"(e.g. {stray[:5]}), so the numbering does not say which parcel "
            "they belong to"
        )
    checks.append(f"All {len(lots)} lots are numbered in hundred blocks.")

    buckets: dict[int, list[DerivedLot]] = {}
    for lot in lots:
        buckets.setdefault(lot.parcel_number, []).append(lot)
    blocks = sorted(buckets)

    # 2 — the blocks must run 1..N. A gap means a parcel is missing from the
    #     read, and numbering the survivors 1,2,3 would silently rename them.
    if blocks != list(range(1, len(blocks) + 1)):
        return refuse(
            f"the hundred blocks present are {blocks}, which do not run from 1 "
            "without gaps — a parcel is missing or the numbering is not by parcel"
        )
    checks.append(f"Hundred blocks run 1 to {len(blocks)} with no gaps.")

    # 3 — a block far too small to be a parcel is a misread number.
    thin = {b: len(buckets[b]) for b in blocks if len(buckets[b]) < MIN_LOTS_PER_PARCEL}
    if thin:
        return refuse(
            f"hundred block(s) {thin} hold too few lots to be a parcel — more "
            "likely a detail callout or a tract label read as a lot number"
        )
    checks.append(
        f"Every block holds at least {MIN_LOTS_PER_PARCEL} lots "
        f"({', '.join(f'{b}: {len(buckets[b])}' for b in blocks)})."
    )

    # 4 — sheet contiguity. A parcel is drawn in one place; lots scattered
    #     across non-adjacent sheets mean the blocks are not parcels.
    if any(lot.page is not None for lot in lots):
        for block in blocks:
            pages = sorted({lot.page for lot in buckets[block] if lot.page is not None})
            if pages and pages != list(range(pages[0], pages[0] + len(pages))):
                return refuse(
                    f"parcel {block} is drawn on sheets {pages}, which are not a "
                    "contiguous run — the hundred blocks are probably not parcels"
                )
        checks.append("Each parcel's lots sit on a contiguous run of sheets.")
    else:
        checks.append("No sheet numbers supplied, so sheet contiguity was not checked.")

    # 5 — the parcel key sheet, if it was read. The drawing's own tally.
    if expected_counts:
        found = {block: len(buckets[block]) for block in blocks}
        wanted = {int(k): int(v) for k, v in expected_counts.items()}
        if found != wanted:
            return refuse(
                f"the hundred blocks give {found}, but the parcel key sheet says "
                f"{wanted} — one of the two is wrong and it is not safe to guess which"
            )
        checks.append(f"Lot counts agree with the parcel key sheet: {found}.")

    parcels = [
        ParcelGroup(number=block, lots=sorted(buckets[block], key=lambda l: l.number))
        for block in blocks
    ]
    logger.info(
        "grouped %d lots into %d parcels: %s",
        len(lots),
        len(parcels),
        {p.number: p.lot_count for p in parcels},
    )
    return Grouping(grouped=True, parcels=parcels, checks=checks)


# ──────────────────────────────────────────────────────────────── the writer


@dataclass
class RollupResult:
    version: int
    parcels_written: int
    lots_written: int
    lots_without_outline: int
    #: Parcel number -> the tbl_parcel row it became.
    parcel_ids: dict[int, int] = field(default_factory=dict)

    def summary(self) -> str:
        return (
            f"{self.parcels_written} parcels, {self.lots_written} lot outlines "
            f"stored at version {self.version}"
            + (
                f"; {self.lots_without_outline} lots counted but not outlined"
                if self.lots_without_outline
                else ""
            )
        )


def write_rollup(
    cursor,
    *,
    project_id: int,
    grouping: Grouping,
    source_doc: str,
    stage: int,
    confidence: Optional[float] = None,
) -> RollupResult:
    """
    Write the parcels and their lot outlines.

    Idempotent by construction. Parcels are matched on ``(project_id,
    parcel_code)`` and updated in place rather than inserted again, and every
    lot outline supersedes the active row for that lot number — ``is_active``
    false, ``valid_to`` stamped — before the new one goes in. Re-reading the
    same drawing therefore produces a new version rather than a duplicate,
    which is the same vintage model ``gis_plan_parcel`` already uses.

    Raises rather than writing when the grouping was refused: a caller that
    ignores a refusal and writes anyway is the failure the refusal exists to
    prevent.
    """
    if not grouping.grouped:
        raise ValueError(f"refusing to write an unverified grouping — {grouping.reason}")

    bad_sources = {
        lot.source
        for parcel in grouping.parcels
        for lot in parcel.lots
        if lot.source not in VALID_SOURCES
    }
    if bad_sources:
        raise ValueError(
            f"lot source must be one of {VALID_SOURCES}, got {sorted(bad_sources)}"
        )

    version = _next_version(cursor, project_id)

    parcel_ids: dict[int, int] = {}
    lots_written = 0
    lots_without_outline = 0

    for parcel in grouping.parcels:
        parcel_id = _upsert_parcel(cursor, project_id, parcel)
        parcel_ids[parcel.number] = parcel_id

        for lot in parcel.lots:
            if not lot.is_placed:
                # Counted toward the parcel, but there is no outline to store.
                lots_without_outline += 1
                continue
            _supersede_lot(cursor, project_id, str(lot.number))
            _insert_lot(
                cursor,
                project_id=project_id,
                parcel_id=parcel_id,
                lot=lot,
                source_doc=source_doc,
                stage=stage,
                version=version,
                confidence=confidence,
            )
            lots_written += 1

    result = RollupResult(
        version=version,
        parcels_written=len(grouping.parcels),
        lots_written=lots_written,
        lots_without_outline=lots_without_outline,
        parcel_ids=parcel_ids,
    )
    logger.info("[project_id=%s] %s", project_id, result.summary())
    return result


def _next_version(cursor, project_id: int) -> int:
    cursor.execute(
        """
        SELECT COALESCE(MAX(version), 0) + 1
          FROM landscape.gis_plan_lot
         WHERE project_id = %s
        """,
        [project_id],
    )
    row = cursor.fetchone()
    return int(row[0]) if row and row[0] else 1


def _upsert_parcel(cursor, project_id: int, parcel: ParcelGroup) -> int:
    """Create or update the parcel row. Names eight columns and no others."""
    cursor.execute(
        """
        SELECT parcel_id
          FROM landscape.tbl_parcel
         WHERE project_id = %s AND parcel_code = %s
        """,
        [project_id, parcel.parcel_code],
    )
    existing = cursor.fetchone()

    rollup = [
        parcel.parcel_name,
        parcel.acres,
        parcel.lot_count,
        parcel.frontage_ft,
        parcel.lot_width,
        parcel.lot_depth,
    ]

    if existing:
        cursor.execute(
            """
            UPDATE landscape.tbl_parcel
               SET parcel_name    = %s,
                   acres_gross    = %s,
                   units_total    = %s,
                   lots_frontfeet = %s,
                   lot_width      = %s,
                   lot_depth      = %s
             WHERE parcel_id = %s
            """,
            rollup + [existing[0]],
        )
        return int(existing[0])

    # parcel_id is GENERATED ALWAYS AS IDENTITY — it must not be supplied.
    cursor.execute(
        """
        INSERT INTO landscape.tbl_parcel
            (project_id, parcel_code, parcel_name, acres_gross, units_total,
             lots_frontfeet, lot_width, lot_depth)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING parcel_id
        """,
        [project_id, parcel.parcel_code] + rollup,
    )
    return int(cursor.fetchone()[0])


def _supersede_lot(cursor, project_id: int, lot_number: str) -> None:
    cursor.execute(
        """
        UPDATE landscape.gis_plan_lot
           SET is_active = false,
               valid_to  = now()
         WHERE project_id = %s
           AND lot_number = %s
           AND is_active
        """,
        [project_id, lot_number],
    )


def _insert_lot(
    cursor,
    *,
    project_id: int,
    parcel_id: int,
    lot: DerivedLot,
    source_doc: str,
    stage: int,
    version: int,
    confidence: Optional[float],
) -> None:
    cursor.execute(
        """
        INSERT INTO landscape.gis_plan_lot
            (project_id, parcel_id, lot_number, geom, area_sqft, frontage_ft,
             source, source_doc, stage, version, confidence)
        VALUES
            (%s, %s, %s, ST_GeomFromText(%s, 3857), %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            project_id,
            parcel_id,
            str(lot.number),
            _wkt_polygon(lot.ring_3857),
            lot.area_sqft,
            lot.frontage_ft,
            lot.source,
            source_doc,
            stage,
            version,
            confidence,
        ],
    )


def _wkt_polygon(ring: Sequence[Sequence[float]]) -> str:
    """Closed WKT polygon. Closes the ring if the caller left it open."""
    points = [(float(x), float(y)) for x, y in ring]
    if len(points) < 3:
        raise ValueError("a lot outline needs at least three points")
    if points[0] != points[-1]:
        points.append(points[0])
    body = ", ".join(f"{x} {y}" for x, y in points)
    return f"POLYGON(({body}))"
