"""
Land Development planning tools for Landscaper AI.

Tools:
  1. land_planning_run       - Compute-only: returns three-case yield analysis
  2. land_planning_save      - Compute + propose mutations to tbl_project_assumption

These tools power the early-stage land planning workflow where the AI
helps developers estimate lot yield and density from gross acreage
and lot product dimensions.
"""

import logging
from typing import Dict, Any, Optional

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('land_planning_run')
def handle_land_planning_run(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """
    Compute three-case land planning yield analysis (read-only).

    Returns conservative/base/optimistic lot counts, density, and RYF
    without persisting anything.

    Required inputs:
        gross_acres: float

    Plus ONE of:
        lot_product_id: int (resolves from res_lot_product)
        lot_w_ft + lot_d_ft: floats (explicit dimensions)

    Optional:
        lot_area_sf: float (override computed area)
        constraint_risk: 'low' | 'medium' | 'high'
        row_burden: 'light' | 'typical' | 'heavy'
        layout_style: 'grid' | 'curvilinear' | 'cul_de_sac'
        open_space_pct: float
        ryf_conservative, ryf_base, ryf_optimistic: float (override resolver)
    """
    from apps.landdev.services.land_planning_engine import (
        LandPlanningInputs,
        compute_land_planning_cases,
    )

    try:
        inputs = LandPlanningInputs(
            project_id=project_id,
            gross_acres=float(tool_input.get('gross_acres', 0)),
            lot_product_id=tool_input.get('lot_product_id'),
            lot_w_ft=_float_or_none(tool_input.get('lot_w_ft')),
            lot_d_ft=_float_or_none(tool_input.get('lot_d_ft')),
            lot_area_sf=_float_or_none(tool_input.get('lot_area_sf')),
            constraint_risk=tool_input.get('constraint_risk', 'medium'),
            row_burden=tool_input.get('row_burden', 'typical'),
            layout_style=tool_input.get('layout_style', 'curvilinear'),
            open_space_pct=float(tool_input.get('open_space_pct', 10.0)),
            ryf_conservative=_float_or_none(tool_input.get('ryf_conservative')),
            ryf_base=_float_or_none(tool_input.get('ryf_base')),
            ryf_optimistic=_float_or_none(tool_input.get('ryf_optimistic')),
        )

        result = compute_land_planning_cases(inputs)

        return {
            'success': True,
            **result.to_dict(),
        }
    except ValueError as e:
        return {'success': False, 'error': str(e)}
    except Exception as e:
        logger.error(f"land_planning_run failed: {e}", exc_info=True)
        return {'success': False, 'error': f"Computation failed: {str(e)}"}


@register_tool('land_planning_save', is_mutation=True)
def handle_land_planning_save(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Compute land planning cases AND propose mutations to persist assumptions.

    Same inputs as land_planning_run, but also creates mutation proposals
    for tbl_project_assumption rows under assumption_group='land_planning_v1'.

    When propose_only=True (default), returns mutation bundle for user review.
    When propose_only=False, executes the mutations directly.
    """
    from apps.landdev.services.land_planning_engine import (
        LandPlanningInputs,
        compute_land_planning_cases,
        build_assumption_mutations,
    )
    from ..services.mutation_service import MutationService

    try:
        inputs = LandPlanningInputs(
            project_id=project_id,
            gross_acres=float(tool_input.get('gross_acres', 0)),
            lot_product_id=tool_input.get('lot_product_id'),
            lot_w_ft=_float_or_none(tool_input.get('lot_w_ft')),
            lot_d_ft=_float_or_none(tool_input.get('lot_d_ft')),
            lot_area_sf=_float_or_none(tool_input.get('lot_area_sf')),
            constraint_risk=tool_input.get('constraint_risk', 'medium'),
            row_burden=tool_input.get('row_burden', 'typical'),
            layout_style=tool_input.get('layout_style', 'curvilinear'),
            open_space_pct=float(tool_input.get('open_space_pct', 10.0)),
            ryf_conservative=_float_or_none(tool_input.get('ryf_conservative')),
            ryf_base=_float_or_none(tool_input.get('ryf_base')),
            ryf_optimistic=_float_or_none(tool_input.get('ryf_optimistic')),
        )

        # Compute
        result = compute_land_planning_cases(inputs)
        mutations = build_assumption_mutations(result)
        reason = tool_input.get('reason', 'Land planning engine v1 computation')

        if propose_only:
            # Create a batch proposal via MutationService
            proposals = []
            for mut in mutations:
                proposal = MutationService.create_proposal(
                    project_id=project_id,
                    mutation_type=mut['mutation_type'],
                    table_name=mut['table_name'],
                    field_name=mut['field_name'],
                    proposed_value=mut['proposed_value'],
                    current_value=None,
                    reason=reason,
                    source_message_id=source_message_id,
                )
                proposals.append(proposal)

            return {
                'success': True,
                'result': result.to_dict(),
                'proposals': proposals,
                'proposal_count': len(proposals),
                'message': (
                    f"Computed land planning for {result.gross_acres} gross acres "
                    f"with {result.lot_w_ft}×{result.lot_d_ft} lots. "
                    f"Base case: {result.base.total_lots} lots at "
                    f"{result.base.gross_dua:.2f} DUA. "
                    f"{len(proposals)} assumption updates proposed for review."
                ),
            }
        else:
            # Direct execution (after user confirmation)
            from django.db import connection as db_conn
            executed = []
            with db_conn.cursor() as cursor:
                for mut in mutations:
                    pv = mut['proposed_value']
                    # Upsert into tbl_project_assumption
                    cursor.execute("""
                        INSERT INTO tbl_project_assumption
                            (project_id, assumption_key, assumption_value,
                             assumption_type, assumption_group, scope, scope_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (project_id, assumption_key, assumption_group)
                        DO UPDATE SET
                            assumption_value = EXCLUDED.assumption_value,
                            assumption_type = EXCLUDED.assumption_type,
                            updated_at = NOW()
                        RETURNING assumption_id
                    """, [
                        project_id,
                        pv['assumption_key'],
                        pv['assumption_value'],
                        pv['assumption_type'],
                        pv.get('assumption_group', 'land_planning_v1'),
                        pv.get('scope', 'project'),
                        pv.get('scope_id', str(project_id)),
                    ])
                    row = cursor.fetchone()
                    executed.append({
                        'assumption_key': pv['assumption_key'],
                        'assumption_id': row[0] if row else None,
                    })

            return {
                'success': True,
                'result': result.to_dict(),
                'executed': executed,
                'executed_count': len(executed),
                'message': (
                    f"Saved {len(executed)} land planning assumptions for project {project_id}."
                ),
            }

    except ValueError as e:
        return {'success': False, 'error': str(e)}
    except Exception as e:
        logger.error(f"land_planning_save failed: {e}", exc_info=True)
        return {'success': False, 'error': f"Save failed: {str(e)}"}


# =============================================================================
# Helpers
# =============================================================================

def _float_or_none(val) -> Optional[float]:
    """Convert a value to float, or return None if empty/None."""
    if val is None or val == '' or val == 'None':
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
