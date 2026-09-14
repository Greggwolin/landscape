"""RPT_16 — the Sales Schedule, rendered from the sales SURFACE.

Rewritten 2026-09-14 under D-2026-09-14-SURFACE-ARCH (option 2a). What was here
before was a parallel builder: its own SQL, its own grouping, its own idea of
what a sales schedule is. It is the first report moved onto the shared
definition, and the move fixed three things the old code could not have been
argued out of. The previous file is in git and a copy sits outside the repo at
``landscape-scratch/rpt_16_sales_schedule.pre-2a.py``.

WHAT THE OLD GENERATOR GOT WRONG, ALL THREE MEASURED ON PROJECT 9
-----------------------------------------------------------------
1. **Its preview and its PDF showed different things.** The preview grouped by
   phase and sale year — eight rows. The PDF listed every parcel across fifteen
   columns. One report code, two grains, nothing reconciling them: the same
   shape of defect as the IRR, one level up.

2. **It reported commercial land as having sold zero units.** Phases 3.1 and 3.2
   showed 0 units against $115.6M and $88.6M of revenue, which read as
   impossible and was carried as an open question. It is not a data fault: those
   five parcels are Commercial, 242 acres, sold by the acre. The old query
   summed ``units_total`` and divided revenue by it, so land that is not priced
   per unit reported zero units and a $0 average price. The sales surface has no
   units column at all — it reports gross, commission, cost of sale and net per
   parcel, which is what a land sale is — so that row cannot be produced here.

3. **It quietly dropped six parcels.** Its inner join to
   ``tbl_parcel_sale_assumptions`` excluded the five Open Space parcels and one
   unnamed 4-unit parcel that carry no sale assumption, which is why its total
   read 3,403 units against the project's 3,407. Silent exclusion by join is
   exactly what a shared definition removes: the surface decides what is in the
   schedule, once, for the screen and the report together.

The parcel-level detail the old PDF carried is what the surface renders. What is
gone is per-parcel frontage, acreage, and a hard-coded zero subdivision-cost
column — none of which the sales surface carries. Development cost lives in the
budget and frontage and acreage live on the parcels surface; a column of zeros
printed to fill a grid was telling the reader something false.
"""

from .surface_preview import SurfacePreviewGenerator


class SalesScheduleGenerator(SurfacePreviewGenerator):
    report_code = 'RPT_16'
    report_name = 'Project Land Sales Schedule'
    surface_tool = 'get_sales_schedule'
