"""RPT_14 — the Parcel Inventory, rendered from the parcels SURFACE.

Rewritten 2026-09-14 under D-2026-09-14-SURFACE-ARCH (option 2a), for the same
reason as RPT_16 and with the same result: the parallel builder was reading
columns that are empty or absent, and the surface reads the ones that are not.
The previous file is in git and a copy sits outside the repo at
``landscape-scratch/rpt_14_parcel_table.pre-2a.py``.

WHAT THE OLD GENERATOR GOT WRONG, MEASURED ON PROJECT 9
-------------------------------------------------------
* **Its PDF produced nothing at all.** The query selected ``p.front_footage``,
  ``p.dev_cost_per_lot``, ``p.sale_year`` and ``p.sale_month``; none of the four
  is a column of ``tbl_parcel``. The error was swallowed, the row list came back
  empty, and the document printed "No parcel data available." over a project
  with 43 parcels. The trap of 2026-09-14 applies: the real column is
  ``lots_frontfeet``, and sale timing lives in ``tbl_parcel_sale_assumptions``.

* **Its preview valued the whole project at zero.** It read ``p.saleprice`` and
  ``p.saledate``, which are NULL on every parcel of this project, so it printed
  "Total Value $0" and a $0 line against each of 43 parcels — while the sales
  schedule reports $392,049,013 gross. A land report that says the dirt is worth
  nothing is worse than one that does not mention value at all.

WHAT THIS REPORT SHOWS NOW, AND WHAT IT DELIBERATELY DOES NOT
-------------------------------------------------------------
The parcels surface is the planning inventory: village, phase, parcel, type,
product, acres, units and front feet — and its front-foot figures are real
(6,400 on parcel 1.101) where ``lots_frontfeet`` in the table is 0 or null.

It carries no money, and no money is added here. Parcel value belongs to the
sales schedule (RPT_16), which reads the sale assumptions where the prices
actually are. Printing a price column on the inventory would mean a second place
that answers "what is this parcel worth", which is the duplication 2a exists to
end — and the old column is exactly how that duplication came to disagree.
"""

from .surface_preview import SurfacePreviewGenerator


class ParcelTableGenerator(SurfacePreviewGenerator):
    report_code = 'RPT_14'
    report_name = 'Parcel & Land Use Table'
    surface_tool = 'open_parcels'
