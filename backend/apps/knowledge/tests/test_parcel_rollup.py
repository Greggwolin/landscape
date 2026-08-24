"""
Tests for rolling a plat's lots up into the parcels that get sold.

Two things are pinned here, and they are the two that would hurt:

  * **The grouping refuses rather than guesses.** Hundred-block numbering is a
    convention, not a law. Every way it can fail to hold has a test, because a
    wrong grouping produces four confident parcels that do not exist — worse
    than no parcels at all.

  * **The writer reproduces what it was handed, and prices nothing.** It names
    eight columns on tbl_parcel and no others, and never touches tbl_lot.

The fixture is shaped like the Red Valley Ranch Phase 1 final plat — 286 lots
in four hundred blocks, 83/87/51/65, parcel 1 running 101-183. The figures
attached to those lots are synthetic: this module does not measure anything, so
the test's job is to prove it carries numbers through faithfully, not that any
particular number is right. The real figures get verified once the derive step
is landed and the plat is uploaded.

Session: LSCMD-PLATPARCELS-0814-MK12
"""

from __future__ import annotations

import pytest

from apps.knowledge.services.plan_geometry.parcel_rollup import (
    MIN_LOTS_PER_PARCEL,
    PARCEL_ROLLUP_COLUMNS,
    DerivedLot,
    DerivedTract,
    Grouping,
    _wkt_polygon,
    group_into_parcels,
    write_rollup,
)

# The pricing, sales and income-property columns on tbl_parcel. None of these
# may appear in any statement the writer issues.
PRICING_COLUMNS = (
    "saleprice",
    "saledate",
    "sale_period",
    "sale_phase_code",
    "custom_sale_date",
    "has_sale_overrides",
    "is_income_property",
)

#: Red Valley Ranch Phase 1: first lot number and count, per parcel.
RED_VALLEY = {1: (101, 83), 2: (201, 87), 3: (301, 51), 4: (401, 65)}

#: Which sheets each parcel is drawn on — the lots sit on three of the
#: document's seven sheets.
SHEETS = {1: [4], 2: [4, 5], 3: [5], 4: [5, 6]}


def _square(x: float, y: float, side: float = 10.0):
    return [(x, y), (x + side, y), (x + side, y + side), (x, y + side)]


def _red_valley_lots(placed: bool = True) -> list[DerivedLot]:
    lots: list[DerivedLot] = []
    for parcel, (first, count) in RED_VALLEY.items():
        pages = SHEETS[parcel]
        for i in range(count):
            number = first + i
            lots.append(
                DerivedLot(
                    number=number,
                    area_sqft=5000.0,
                    ring_3857=_square(number * 20.0, parcel * 100.0) if placed else None,
                    frontage_ft=42.0,
                    width_ft=42.0,
                    depth_ft=120.0,
                    page=pages[i % len(pages)],
                )
            )
    return lots


# ── the fake database ───────────────────────────────────────────────────────


class _FakeCursor:
    """Records every statement and answers the three queries the writer runs."""

    def __init__(self, existing_parcels=None, max_version: int = 0):
        self.executed: list[tuple[str, list]] = []
        self.existing: dict[str, int] = dict(existing_parcels or {})
        self.max_version = max_version
        self._answer = None
        self._seq = 500

    def execute(self, sql, params=None):
        flat = " ".join(sql.split())
        self.executed.append((flat, list(params or [])))

        if "COALESCE(MAX(version)" in flat:
            self._answer = (self.max_version + 1,)
        elif flat.startswith("SELECT parcel_id FROM landscape.tbl_parcel"):
            code = params[1]
            self._answer = (self.existing[code],) if code in self.existing else None
        elif "INSERT INTO landscape.tbl_parcel" in flat:
            self._seq += 1
            self.existing[params[1]] = self._seq
            self._answer = (self._seq,)
        else:
            self._answer = None

    def fetchone(self):
        return self._answer

    @property
    def sql(self) -> str:
        return " ".join(flat for flat, _ in self.executed)

    def count(self, needle: str) -> int:
        return sum(1 for flat, _ in self.executed if needle in flat)


# ── grouping: what it accepts ───────────────────────────────────────────────


def test_hundred_blocks_become_the_four_parcels():
    result = group_into_parcels(_red_valley_lots())

    assert result.grouped is True
    assert [p.number for p in result.parcels] == [1, 2, 3, 4]
    assert [p.lot_count for p in result.parcels] == [83, 87, 51, 65]
    assert sum(p.lot_count for p in result.parcels) == 286


def test_the_parcel_key_sheet_corroborates_the_numbering():
    """The drawing stating the answer beats the reader inferring it."""
    result = group_into_parcels(
        _red_valley_lots(), expected_counts={1: 83, 2: 87, 3: 51, 4: 65}
    )

    assert result.grouped is True
    assert any("parcel key sheet" in c for c in result.checks)


# ── grouping: every way it refuses ──────────────────────────────────────────


def test_refuses_when_the_key_sheet_disagrees():
    """One of the two readings is wrong and it is not safe to guess which."""
    result = group_into_parcels(
        _red_valley_lots(), expected_counts={1: 81, 2: 87, 3: 51, 4: 65}
    )

    assert result.grouped is False
    assert result.parcels == []
    assert len(result.ungrouped) == 286  # handed back untouched
    assert "parcel key sheet" in result.reason


def test_refuses_lots_with_no_hundred_block():
    lots = _red_valley_lots() + [DerivedLot(number=7, area_sqft=5000.0)]

    result = group_into_parcels(lots)

    assert result.grouped is False
    assert "hundred blocks" in result.reason


def test_refuses_a_gap_in_the_blocks():
    """Blocks 1, 2, 4 must not be renumbered 1, 2, 3 — that renames a parcel."""
    lots = [l for l in _red_valley_lots() if l.parcel_number != 3]

    result = group_into_parcels(lots)

    assert result.grouped is False
    assert "[1, 2, 4]" in result.reason


def test_refuses_a_block_too_thin_to_be_a_parcel():
    """A detail callout read as a lot number must not invent a fifth parcel."""
    lots = _red_valley_lots() + [
        DerivedLot(number=501 + i, area_sqft=100.0, page=6)
        for i in range(MIN_LOTS_PER_PARCEL - 1)
    ]

    result = group_into_parcels(lots)

    assert result.grouped is False
    assert "too few lots" in result.reason


def test_refuses_non_contiguous_sheets():
    """A parcel is drawn in one place; lots scattered across the set are not one."""
    scattered = [
        DerivedLot(
            number=l.number,
            area_sqft=l.area_sqft,
            ring_3857=l.ring_3857,
            page=1 if l.number == 101 else l.page,
        )
        if l.parcel_number == 1
        else l
        for l in _red_valley_lots()
    ]

    result = group_into_parcels(scattered)

    assert result.grouped is False
    assert "contiguous" in result.reason


def test_refuses_an_empty_read():
    assert group_into_parcels([]).grouped is False


# ── the writer: faithful reproduction ───────────────────────────────────────


def _small_parcel() -> Grouping:
    """Five lots with figures chosen so the arithmetic is checkable by hand."""
    lots = [
        DerivedLot(
            number=101 + i,
            area_sqft=5_000.0,
            ring_3857=_square(i * 20.0, 0.0),
            frontage_ft=float(40 + i),  # 40..44 -> sum 210
            width_ft=float(40 + i),  # median 42
            depth_ft=120.0,
            page=4,
        )
        for i in range(5)
    ]
    return group_into_parcels(lots)


def test_the_writer_reproduces_the_figures_it_was_handed():
    """It measures nothing. Sum, median and count must arrive untouched."""
    grouping = _small_parcel()
    assert grouping.grouped is True

    parcel = grouping.parcels[0]
    assert parcel.lot_count == 5
    assert parcel.frontage_ft == 210.0  # 40+41+42+43+44
    assert parcel.lot_width == 42.0  # median of 40..44
    assert parcel.lot_depth == 120.0
    assert parcel.acres == 0.57  # 25,000 sq ft

    cursor = _FakeCursor()
    write_rollup(
        cursor,
        project_id=8,
        grouping=grouping,
        source_doc="P6475 PHASE 1 PLAT_R9 1-21-25.pdf",
        stage=60,
    )

    insert = next(
        p for s, p in cursor.executed if "INSERT INTO landscape.tbl_parcel" in s
    )
    # project_id, parcel_code, parcel_name, acres, units, frontfeet, width, depth
    assert insert == [8, "1", "Parcel 1", 0.57, 5, 210.0, 42.0, 120.0]


def test_lots_without_an_outline_still_count_toward_the_parcel():
    """The plat numbers 286 lots whether or not every outline closed."""
    lots = [
        DerivedLot(
            number=101 + i,
            area_sqft=5_000.0,
            page=4,
            ring_3857=_square(i * 20.0, 0.0) if i < 3 else None,
        )
        for i in range(5)
    ]
    grouping = group_into_parcels(lots)
    cursor = _FakeCursor()

    result = write_rollup(
        cursor, project_id=8, grouping=grouping, source_doc="plat.pdf", stage=60
    )

    assert grouping.parcels[0].lot_count == 5
    assert grouping.parcels[0].outlines_recovered == 3
    assert result.lots_written == 3
    assert result.lots_without_outline == 2


# ── the writer: what it must never do ───────────────────────────────────────


def test_the_writer_names_only_the_eight_rollup_columns():
    assert PARCEL_ROLLUP_COLUMNS == (
        "project_id",
        "parcel_code",
        "parcel_name",
        "acres_gross",
        "units_total",
        "lots_frontfeet",
        "lot_width",
        "lot_depth",
    )

    cursor = _FakeCursor()
    write_rollup(
        cursor,
        project_id=8,
        grouping=_small_parcel(),
        source_doc="plat.pdf",
        stage=60,
    )

    parcel_sql = " ".join(s for s, _ in cursor.executed if "tbl_parcel" in s)
    for column in PRICING_COLUMNS:
        assert column not in parcel_sql, f"the drawing reader touched {column}"


def test_the_writer_never_creates_lot_records():
    """Gregg chose parcels with rollups, not 286 lot rows. tbl_lot stays empty."""
    cursor = _FakeCursor()
    write_rollup(
        cursor,
        project_id=8,
        grouping=group_into_parcels(_red_valley_lots()),
        source_doc="plat.pdf",
        stage=60,
    )

    assert "tbl_lot" not in cursor.sql


def test_the_writer_refuses_an_unverified_grouping():
    refused = group_into_parcels([DerivedLot(number=7, area_sqft=1.0)])
    cursor = _FakeCursor()

    with pytest.raises(ValueError, match="unverified grouping"):
        write_rollup(
            cursor, project_id=8, grouping=refused, source_doc="plat.pdf", stage=60
        )

    assert cursor.executed == []  # nothing was written


def test_an_unknown_outline_source_is_refused():
    lots = [
        DerivedLot(
            number=101 + i,
            area_sqft=5_000.0,
            ring_3857=_square(i * 20.0, 0.0),
            page=4,
            source="guessed",
        )
        for i in range(5)
    ]
    with pytest.raises(ValueError, match="source must be one of"):
        write_rollup(
            cursor=_FakeCursor(),
            project_id=8,
            grouping=group_into_parcels(lots),
            source_doc="plat.pdf",
            stage=60,
        )


# ── the writer: re-reading the same drawing ─────────────────────────────────


def test_rereading_supersedes_rather_than_duplicating():
    """The vintage model gis_plan_parcel already uses: deactivate, then insert."""
    grouping = _small_parcel()

    first = _FakeCursor()
    write_rollup(
        first, project_id=8, grouping=grouping, source_doc="plat.pdf", stage=60
    )
    assert first.count("INSERT INTO landscape.tbl_parcel") == 1

    # Second run: the parcel already exists and one version is already stored.
    second = _FakeCursor(existing_parcels=dict(first.existing), max_version=1)
    result = write_rollup(
        second, project_id=8, grouping=grouping, source_doc="plat.pdf", stage=60
    )

    assert result.version == 2
    assert second.count("INSERT INTO landscape.tbl_parcel") == 0  # updated, not duplicated
    assert second.count("UPDATE landscape.tbl_parcel") == 1
    # Every lot deactivated its predecessor before the new outline went in.
    assert second.count("SET is_active = false") == 5
    assert second.count("INSERT INTO landscape.gis_plan_lot") == 5


def test_the_stage_integer_is_stored_as_given():
    cursor = _FakeCursor()
    write_rollup(
        cursor, project_id=8, grouping=_small_parcel(), source_doc="plat.pdf", stage=60
    )

    lot_insert = next(
        p for s, p in cursor.executed if "INSERT INTO landscape.gis_plan_lot" in s
    )
    assert 60 in lot_insert  # PlanStage.FINAL_PLAT, never renumbered


# ── geometry ────────────────────────────────────────────────────────────────


def test_wkt_closes_an_open_ring():
    wkt = _wkt_polygon([(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)])

    assert wkt.startswith("POLYGON((")
    assert wkt.count(",") == 4  # five points: the first repeated last
    assert wkt.endswith("0.0 0.0))")


def test_wkt_leaves_an_already_closed_ring_alone():
    closed = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0), (0.0, 0.0)]
    assert _wkt_polygon(closed).count(",") == 4


def test_wkt_refuses_a_degenerate_ring():
    with pytest.raises(ValueError, match="at least three points"):
        _wkt_polygon([(0.0, 0.0), (1.0, 1.0)])


# ─────────────────────────────────────────────────────────────────── tracts


def _tracts(placed: bool = True) -> list[DerivedTract]:
    return [
        DerivedTract(
            label=label,
            area_sqft=area,
            ring_3857=_square(500.0 + i * 20, 500.0) if placed else None,
            page=4,
        )
        for i, (label, area) in enumerate((("A", 24_000.0), ("B", 61_500.0)))
    ]


def test_a_tract_is_written_with_no_parcel_and_its_own_lot_type():
    """A drainage tract sits between parcels, so its parcel_id is null.

    It is stored on the same vintage and supersede rule as a lot, but it is
    not one: the discriminator column says so, and nothing rolls its area into
    a parcel (PF1).
    """
    cursor = _FakeCursor()
    grouping = group_into_parcels(_red_valley_lots())

    result = write_rollup(
        cursor,
        project_id=7,
        grouping=grouping,
        source_doc="plat.pdf",
        stage=3,
        tracts=_tracts(),
    )

    assert result.tracts_written == 2
    inserts = [
        params for sql, params in cursor.executed
        if "INSERT INTO landscape.gis_plan_lot" in sql
    ]
    tract_rows = [p for p in inserts if p[2] in ("A", "B")]
    assert len(tract_rows) == 2
    for row in tract_rows:
        assert row[1] is None            # parcel_id
        assert row[6] == "tract"         # source
        assert row[-1] == "tract"        # lot_type
    # Every lot row still says it is a lot.
    assert all(p[-1] == "lot" for p in inserts if p[2] not in ("A", "B"))


def test_a_tract_area_is_rolled_into_no_parcel():
    """The parcels must be identical whether or not tracts came with them."""
    without = group_into_parcels(_red_valley_lots())
    acres_without = [p.acres for p in without.parcels]

    cursor = _FakeCursor()
    result = write_rollup(
        cursor,
        project_id=7,
        grouping=group_into_parcels(_red_valley_lots()),
        source_doc="plat.pdf",
        stage=3,
        tracts=_tracts(),
    )

    parcel_updates = [
        params for sql, params in cursor.executed
        if "INSERT INTO landscape.tbl_parcel" in sql
    ]
    assert len(parcel_updates) == len(acres_without)
    assert result.parcels_written == len(acres_without)


def test_a_tract_with_no_outline_is_not_written():
    """Same rule as a lot: counted, but there is no geometry to store."""
    cursor = _FakeCursor()
    result = write_rollup(
        cursor,
        project_id=7,
        grouping=group_into_parcels(_red_valley_lots()),
        source_doc="plat.pdf",
        stage=3,
        tracts=_tracts(placed=False),
    )
    assert result.tracts_written == 0
    assert not [
        p for _, p in cursor.executed if len(p) > 2 and p[2] in ("A", "B")
    ]


def test_a_tract_with_an_invalid_source_is_refused():
    cursor = _FakeCursor()
    with pytest.raises(ValueError, match="lot source must be one of"):
        write_rollup(
            cursor,
            project_id=7,
            grouping=group_into_parcels(_red_valley_lots()),
            source_doc="plat.pdf",
            stage=3,
            tracts=[DerivedTract(label="A", area_sqft=1.0,
                                 ring_3857=_square(0, 0), source="invented")],
        )
