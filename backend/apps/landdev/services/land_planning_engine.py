"""
Land Planning Engine v1 — Early-Stage Yield & Density Calculator.

Core identity: gross_dua = (43560 / lot_sf) * ryf
Where RYF (Residential Yield Factor) = saleable_lot_acres / gross_acres

Three-case output: conservative / base / optimistic yield bands.
These are computed bands, NOT separate Scenario records.

Persistence: returns mutation bundles for tbl_project_assumption
rows under assumption_group = 'land_planning_v1'. Never writes directly.

References:
    - res_lot_product: Global lot product catalog (lot_w_ft, lot_d_ft, lot_area_sf)
    - tbl_project_assumption: KV store grouped by assumption_group
"""

import logging
import math
from dataclasses import dataclass, field, asdict
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger(__name__)

# =============================================================================
# Constants
# =============================================================================

SF_PER_ACRE = 43_560

# Phoenix suburban defaults for RYF yield bands
DEFAULT_RYF_CONSERVATIVE = 0.40
DEFAULT_RYF_BASE = 0.50
DEFAULT_RYF_OPTIMISTIC = 0.60

# Adjustment factors for yield-band resolution
CONSTRAINT_RISK_ADJUSTMENTS = {
    'low': 0.02,
    'medium': 0.00,
    'high': -0.03,
}

ROW_BURDEN_ADJUSTMENTS = {
    'light': 0.01,
    'typical': 0.00,
    'heavy': -0.02,
}

LAYOUT_STYLE_ADJUSTMENTS = {
    'grid': 0.02,
    'curvilinear': 0.00,
    'cul_de_sac': -0.01,
}

# Open space requirement: per-point adjustment per 1% above 10% baseline
OPEN_SPACE_BASELINE_PCT = 10.0
OPEN_SPACE_PER_POINT_ADJUSTMENT = -0.002

# Assumption group key for tbl_project_assumption
ASSUMPTION_GROUP = 'land_planning_v1'


# =============================================================================
# Input Dataclass
# =============================================================================

@dataclass
class LandPlanningInputs:
    """
    Inputs for early-stage land planning computation.

    Accepts EITHER lot_product_id (to resolve from res_lot_product)
    OR explicit lot_w_ft / lot_d_ft dimensions. If both provided,
    explicit dimensions take precedence.
    """

    # Project context
    project_id: int
    gross_acres: float

    # Lot dimensions — provide EITHER product_id OR explicit w/d
    lot_product_id: Optional[int] = None
    lot_w_ft: Optional[float] = None
    lot_d_ft: Optional[float] = None

    # Override lot_area_sf directly (else computed from w * d)
    lot_area_sf: Optional[float] = None

    # Yield-band adjustment inputs
    constraint_risk: str = 'medium'       # low | medium | high
    row_burden: str = 'typical'           # light | typical | heavy
    layout_style: str = 'curvilinear'     # grid | curvilinear | cul_de_sac
    open_space_pct: float = 10.0          # jurisdiction open space requirement

    # Optional RYF overrides (bypass resolver entirely)
    ryf_conservative: Optional[float] = None
    ryf_base: Optional[float] = None
    ryf_optimistic: Optional[float] = None

    def __post_init__(self):
        """Validate inputs."""
        if self.gross_acres <= 0:
            raise ValueError(f"gross_acres must be positive, got {self.gross_acres}")

        if self.lot_product_id is None and self.lot_w_ft is None:
            raise ValueError(
                "Must provide either lot_product_id or lot_w_ft/lot_d_ft"
            )

        if self.constraint_risk not in CONSTRAINT_RISK_ADJUSTMENTS:
            raise ValueError(
                f"constraint_risk must be one of {list(CONSTRAINT_RISK_ADJUSTMENTS.keys())}"
            )
        if self.row_burden not in ROW_BURDEN_ADJUSTMENTS:
            raise ValueError(
                f"row_burden must be one of {list(ROW_BURDEN_ADJUSTMENTS.keys())}"
            )
        if self.layout_style not in LAYOUT_STYLE_ADJUSTMENTS:
            raise ValueError(
                f"layout_style must be one of {list(LAYOUT_STYLE_ADJUSTMENTS.keys())}"
            )


# =============================================================================
# Output Dataclass
# =============================================================================

@dataclass
class LandPlanningCase:
    """Single yield case (conservative, base, or optimistic)."""

    label: str              # 'conservative' | 'base' | 'optimistic'
    ryf: float              # Residential Yield Factor used
    gross_dua: float        # Gross dwelling units per acre
    total_lots: int         # Total lots (rounded down)
    saleable_acres: float   # gross_acres * ryf
    net_density_dua: float  # lots / saleable_acres


@dataclass
class LandPlanningResult:
    """Complete three-case output from the planning engine."""

    # Echo inputs
    project_id: int
    gross_acres: float
    lot_w_ft: float
    lot_d_ft: float
    lot_area_sf: float

    # Resolved yield bands
    conservative: LandPlanningCase
    base: LandPlanningCase
    optimistic: LandPlanningCase

    # Metadata
    lot_product_id: Optional[int] = None
    lot_product_code: Optional[str] = None
    adjustment_detail: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API response."""
        return {
            'project_id': self.project_id,
            'gross_acres': self.gross_acres,
            'lot_w_ft': self.lot_w_ft,
            'lot_d_ft': self.lot_d_ft,
            'lot_area_sf': self.lot_area_sf,
            'lot_product_id': self.lot_product_id,
            'lot_product_code': self.lot_product_code,
            'adjustment_detail': self.adjustment_detail,
            'cases': {
                'conservative': asdict(self.conservative),
                'base': asdict(self.base),
                'optimistic': asdict(self.optimistic),
            },
        }


# =============================================================================
# Yield-Band Resolver
# =============================================================================

def resolve_yield_band(
    constraint_risk: str = 'medium',
    row_burden: str = 'typical',
    layout_style: str = 'curvilinear',
    open_space_pct: float = 10.0,
) -> Tuple[float, float, float, Dict[str, float]]:
    """
    Deterministic yield-band resolver.

    Starts from Phoenix suburban defaults (0.40 / 0.50 / 0.60) and applies
    additive adjustments based on site constraints.

    Returns:
        (ryf_conservative, ryf_base, ryf_optimistic, adjustment_detail)
    """
    adjustments: Dict[str, float] = {}

    # Constraint risk
    adj = CONSTRAINT_RISK_ADJUSTMENTS.get(constraint_risk, 0.0)
    adjustments['constraint_risk'] = adj

    # ROW burden
    row_adj = ROW_BURDEN_ADJUSTMENTS.get(row_burden, 0.0)
    adjustments['row_burden'] = row_adj

    # Layout style
    layout_adj = LAYOUT_STYLE_ADJUSTMENTS.get(layout_style, 0.0)
    adjustments['layout_style'] = layout_adj

    # Open space (per-point penalty above 10% baseline)
    os_delta = max(0.0, open_space_pct - OPEN_SPACE_BASELINE_PCT)
    os_adj = os_delta * OPEN_SPACE_PER_POINT_ADJUSTMENT
    adjustments['open_space'] = round(os_adj, 4)

    total_adj = adj + row_adj + layout_adj + os_adj
    adjustments['total'] = round(total_adj, 4)

    # Apply same additive adjustment to all three bands
    ryf_c = round(DEFAULT_RYF_CONSERVATIVE + total_adj, 4)
    ryf_b = round(DEFAULT_RYF_BASE + total_adj, 4)
    ryf_o = round(DEFAULT_RYF_OPTIMISTIC + total_adj, 4)

    # Clamp to reasonable range [0.15, 0.85]
    ryf_c = max(0.15, min(0.85, ryf_c))
    ryf_b = max(0.15, min(0.85, ryf_b))
    ryf_o = max(0.15, min(0.85, ryf_o))

    return ryf_c, ryf_b, ryf_o, adjustments


# =============================================================================
# Lot Product Resolution
# =============================================================================

def resolve_lot_dimensions(inputs: LandPlanningInputs) -> Tuple[float, float, float, Optional[str]]:
    """
    Resolve lot width, depth, and area from inputs.

    Priority:
    1. Explicit lot_w_ft / lot_d_ft on inputs
    2. Lookup from res_lot_product via lot_product_id

    If lot_area_sf provided explicitly, use it; otherwise w * d.

    Returns:
        (lot_w_ft, lot_d_ft, lot_area_sf, lot_product_code_or_None)
    """
    product_code = None

    if inputs.lot_w_ft is not None:
        # Explicit dimensions provided
        w = inputs.lot_w_ft
        d = inputs.lot_d_ft or 120.0  # sensible default depth
        area = inputs.lot_area_sf or (w * d)
        return w, d, area, product_code

    # Lookup from res_lot_product
    if inputs.lot_product_id is not None:
        from apps.landuse.models import LotProduct
        try:
            product = LotProduct.objects.get(
                product_id=inputs.lot_product_id,
                is_active=True
            )
            w = float(product.lot_w_ft) if product.lot_w_ft else 50.0
            d = float(product.lot_d_ft) if product.lot_d_ft else 120.0
            area = float(product.lot_area_sf) if product.lot_area_sf else (w * d)
            product_code = product.code
            return w, d, area, product_code
        except LotProduct.DoesNotExist:
            raise ValueError(
                f"LotProduct with product_id={inputs.lot_product_id} not found or inactive"
            )

    raise ValueError("Cannot resolve lot dimensions: no product_id or explicit dimensions")


# =============================================================================
# Core Computation
# =============================================================================

def compute_single_case(
    label: str,
    ryf: float,
    lot_area_sf: float,
    gross_acres: float,
) -> LandPlanningCase:
    """
    Compute a single yield case.

    Core identity: gross_dua = (43560 / lot_sf) * ryf
    Total lots = floor(gross_dua * gross_acres)
    Saleable acres = gross_acres * ryf
    Net density = total_lots / saleable_acres
    """
    gross_dua = (SF_PER_ACRE / lot_area_sf) * ryf
    total_lots = math.floor(gross_dua * gross_acres)
    saleable_acres = gross_acres * ryf
    net_density_dua = total_lots / saleable_acres if saleable_acres > 0 else 0.0

    return LandPlanningCase(
        label=label,
        ryf=round(ryf, 4),
        gross_dua=round(gross_dua, 4),
        total_lots=total_lots,
        saleable_acres=round(saleable_acres, 2),
        net_density_dua=round(net_density_dua, 4),
    )


def compute_land_planning_cases(inputs: LandPlanningInputs) -> LandPlanningResult:
    """
    Main computation entry point.

    1. Resolve lot dimensions (from product or explicit)
    2. Resolve yield bands (from overrides or deterministic resolver)
    3. Compute three cases

    Returns LandPlanningResult with all three cases.
    """
    # Step 1: Resolve lot dimensions
    lot_w, lot_d, lot_sf, product_code = resolve_lot_dimensions(inputs)

    # Step 2: Resolve yield bands
    adjustment_detail = {}
    if inputs.ryf_base is not None:
        # User provided explicit RYF overrides
        ryf_c = inputs.ryf_conservative or (inputs.ryf_base - 0.10)
        ryf_b = inputs.ryf_base
        ryf_o = inputs.ryf_optimistic or (inputs.ryf_base + 0.10)
        adjustment_detail = {'source': 'user_override'}
    else:
        # Deterministic resolver
        ryf_c, ryf_b, ryf_o, adjustment_detail = resolve_yield_band(
            constraint_risk=inputs.constraint_risk,
            row_burden=inputs.row_burden,
            layout_style=inputs.layout_style,
            open_space_pct=inputs.open_space_pct,
        )

    # Step 3: Compute three cases
    conservative = compute_single_case('conservative', ryf_c, lot_sf, inputs.gross_acres)
    base = compute_single_case('base', ryf_b, lot_sf, inputs.gross_acres)
    optimistic = compute_single_case('optimistic', ryf_o, lot_sf, inputs.gross_acres)

    return LandPlanningResult(
        project_id=inputs.project_id,
        gross_acres=inputs.gross_acres,
        lot_w_ft=lot_w,
        lot_d_ft=lot_d,
        lot_area_sf=lot_sf,
        conservative=conservative,
        base=base,
        optimistic=optimistic,
        lot_product_id=inputs.lot_product_id,
        lot_product_code=product_code,
        adjustment_detail=adjustment_detail,
    )


# =============================================================================
# Mutation Bundle Builder
# =============================================================================

def build_assumption_mutations(
    result: LandPlanningResult,
    reason: str = 'Land planning engine v1 computation',
) -> List[Dict[str, Any]]:
    """
    Build a list of mutation proposals for tbl_project_assumption.

    Each field becomes one row with assumption_group = 'land_planning_v1'.
    Returns mutation dicts ready for MutationService.create_proposal().

    Fields persisted:
        - gross_acres
        - lot_w_ft, lot_d_ft, lot_area_sf
        - ryf_conservative, ryf_base, ryf_optimistic
        - gross_dua_conservative, gross_dua_base, gross_dua_optimistic
        - total_lots_conservative, total_lots_base, total_lots_optimistic
        - constraint_risk, row_burden, layout_style, open_space_pct
        - lot_product_id (if used)
    """
    mutations = []

    # Helper to create one assumption mutation
    def add(key: str, value: Any, assumption_type: str = 'numeric'):
        mutations.append({
            'table_name': 'tbl_project_assumption',
            'mutation_type': 'upsert',
            'field_name': 'assumption_value',
            'proposed_value': {
                'assumption_key': key,
                'assumption_value': str(value),
                'assumption_type': assumption_type,
                'assumption_group': ASSUMPTION_GROUP,
                'scope': 'project',
                'scope_id': str(result.project_id),
            },
            'reason': reason,
        })

    # Input echo
    add('gross_acres', result.gross_acres)
    add('lot_w_ft', result.lot_w_ft)
    add('lot_d_ft', result.lot_d_ft)
    add('lot_area_sf', result.lot_area_sf)

    if result.lot_product_id:
        add('lot_product_id', result.lot_product_id, 'reference')

    # RYF bands
    add('ryf_conservative', result.conservative.ryf)
    add('ryf_base', result.base.ryf)
    add('ryf_optimistic', result.optimistic.ryf)

    # Gross DUA
    add('gross_dua_conservative', result.conservative.gross_dua)
    add('gross_dua_base', result.base.gross_dua)
    add('gross_dua_optimistic', result.optimistic.gross_dua)

    # Total lots
    add('total_lots_conservative', result.conservative.total_lots)
    add('total_lots_base', result.base.total_lots)
    add('total_lots_optimistic', result.optimistic.total_lots)

    # Saleable acres
    add('saleable_acres_conservative', result.conservative.saleable_acres)
    add('saleable_acres_base', result.base.saleable_acres)
    add('saleable_acres_optimistic', result.optimistic.saleable_acres)

    return mutations


def compute_and_propose(
    inputs: LandPlanningInputs,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compute land planning cases AND return mutation bundle.

    This is the function called by the Landscaper tool
    land_planning_save_assumptions. It does NOT persist directly —
    it returns the mutations for MutationService.create_proposal().

    Returns:
        {
            'success': True,
            'result': { ... three-case output ... },
            'mutations': [ ... mutation dicts ... ],
        }
    """
    try:
        result = compute_land_planning_cases(inputs)
        mutations = build_assumption_mutations(result)

        return {
            'success': True,
            'result': result.to_dict(),
            'mutations': mutations,
            'mutation_count': len(mutations),
        }
    except Exception as e:
        logger.error(f"Land planning computation failed: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
        }
