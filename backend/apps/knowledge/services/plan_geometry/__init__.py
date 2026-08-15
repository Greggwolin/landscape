"""
Plan Geometry — derive real-world parcel geometry from project drawings.

Two document classes, deliberately handled as different things:

  * Engineering plans (plat / preplat / final plat) carry survey-accurate
    geometry as true vector paths and can be read from their own content.
    Handled by `plat_vector` (linework → enclosed faces) and `lot_match`
    (every lot number tied to its own outline, each area verified against the
    drawing's own lot table).

  * Non-engineering plans (site plans, zoning/PAD exhibits, land-planner
    concepts) are illustrative.  They carry no survey basis, so they can only
    be placed by fitting inside a boundary that is already known — which in
    practice means an existing draped overlay in `tbl_project_overlay`.
    Handled by `siteplan_raster`.

Everything produced here is a *proposal*.  Nothing is written to project
geometry without explicit user confirmation, and every shape carries the
document it came from plus a trust stage, so that illustrative geometry can
never silently feed a calculation that produces a dollar figure.

See `PlanStage` for the progression model.
"""

from .stages import PlanStage, TRUST_FOR_MONEY
from .siteplan_raster import SitePlanSegmenter, ParcelCandidate
from .georeference import QuadGeoreferencer
from .plat_vector import (
    PlatVectorReader,
    DrawnShape,
    BoundaryFit,
    fit_to_known_boundary,
)
from .lot_match import MatchedLot, LotMatchResult, match_lots

from .plan_classify import (
    PLAN_DOC_TYPE,
    PlanVerdict,
    classify_plan,
    is_plan_document,
)
from .lot_dimensions import (
    FrontageBasis,
    LotDimensions,
    measure_lot,
    measure_lots,
    total_frontage,
)
from .intake import (
    AWAITING_OCR,
    PlanIntake,
    apply_to_document,
    inspect_upload,
    verdict_to_profile,
)

__all__ = [
    "FrontageBasis", "LotDimensions", "measure_lot", "measure_lots",
    "total_frontage",
    "PLAN_DOC_TYPE", "PlanVerdict", "classify_plan", "is_plan_document",
    "AWAITING_OCR", "PlanIntake", "apply_to_document", "inspect_upload",
    "verdict_to_profile",
    "PlanStage",
    "TRUST_FOR_MONEY",
    "SitePlanSegmenter",
    "ParcelCandidate",
    "QuadGeoreferencer",
    "PlatVectorReader",
    "DrawnShape",
    "BoundaryFit",
    "fit_to_known_boundary",
    "MatchedLot",
    "LotMatchResult",
    "match_lots",
]
