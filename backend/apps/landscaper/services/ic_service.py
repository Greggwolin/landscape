"""
Investment Committee Service Layer.

Extends ic_devil_advocate.py with:
  - respond_to_challenge: Record user response to an IC challenge
  - generate_sensitivity_grid: Multi-point sensitivity analysis
  - get_session_summary: Full session data for results panel
"""

import logging
import json
from typing import Dict, Any, List, Optional
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# RESPOND TO CHALLENGE
# =============================================================================

def respond_to_challenge(
    session_id: int,
    challenge_index: int,
    response: str,
    user_value: float = None,
    whatif_deltas: Dict = None,
) -> Dict[str, Any]:
    """
    Record the user's response to an IC challenge.

    Updates the tbl_ic_challenge row with the user's decision and any
    impact metrics from whatif_compute. Also updates the parent session's
    progress counters.

    Args:
        session_id: IC session ID (tbl_ic_session.ic_session_id)
        challenge_index: 1-based index of the challenge
        response: 'accept' | 'reject' | 'modify'
        user_value: User's proposed value (for 'modify' responses)
        whatif_deltas: KPI impact deltas from whatif_compute
    """
    if not session_id:
        return {'success': False, 'error': 'session_id is required'}
    if not challenge_index:
        return {'success': False, 'error': 'challenge_index is required'}
    if response not in ('accept', 'reject', 'modify'):
        return {'success': False, 'error': f'Invalid response: {response}. Must be accept/reject/modify.'}

    try:
        now = timezone.now()

        # Map response to challenge status
        status_map = {
            'accept': 'accepted',
            'reject': 'rejected',
            'modify': 'modified',
        }
        challenge_status = status_map[response]

        with connection.cursor() as cursor:
            # Update the challenge record
            cursor.execute("""
                UPDATE tbl_ic_challenge
                SET status = %s,
                    user_response = %s,
                    user_value = %s,
                    impact_deltas = %s,
                    responded_at = %s
                WHERE ic_session_id = %s
                  AND challenge_index = %s
                RETURNING ic_challenge_id, label, current_value, suggested_value, unit
            """, [
                challenge_status,
                response,
                user_value,
                json.dumps(whatif_deltas or {}),
                now,
                session_id,
                challenge_index,
            ])
            row = cursor.fetchone()

            if not row:
                return {
                    'success': False,
                    'error': f'Challenge {challenge_index} not found in session {session_id}',
                }

            challenge_id = row[0]
            label = row[1]
            current_value = float(row[2]) if row[2] is not None else None
            suggested_value = float(row[3]) if row[3] is not None else None
            unit = row[4]

            # Update session counters
            cursor.execute("""
                UPDATE tbl_ic_session
                SET challenges_presented = (
                    SELECT COUNT(*) FROM tbl_ic_challenge
                    WHERE ic_session_id = %s AND status != 'pending'
                ),
                updated_at = %s
                WHERE ic_session_id = %s
                RETURNING challenges_presented, total_challenges
            """, [session_id, now, session_id])
            session_row = cursor.fetchone()

        presented = session_row[0] if session_row else 0
        total = session_row[1] if session_row else 0
        completed = presented >= total and total > 0

        return {
            'success': True,
            'challenge_id': challenge_id,
            'challenge_index': challenge_index,
            'response': response,
            'challenge_status': challenge_status,
            'label': label,
            'current_value': current_value,
            'suggested_value': suggested_value,
            'user_value': user_value,
            'unit': unit,
            'impact_deltas': whatif_deltas or {},
            'session_progress': {
                'presented': presented,
                'total': total,
                'completed': completed,
            },
        }

    except Exception as e:
        logger.error(f"[IC] respond_to_challenge failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# SENSITIVITY GRID
# =============================================================================

def generate_sensitivity_grid(
    project_id: int,
    assumption_key: str,
    table: str,
    field: str,
    base_value: float,
    steps: List[float] = None,
    target_metrics: List[str] = None,
    thread_id: str = None,
) -> Dict[str, Any]:
    """
    Generate a sensitivity matrix for an assumption.

    Tests the assumption at multiple values (percentage offsets from base)
    and returns a grid of metric impacts at each level.

    Args:
        project_id: Project to analyze
        assumption_key: Key identifier for the assumption
        table: Database table containing the assumption
        field: Database field name
        base_value: Current value of the assumption
        steps: Percentage changes to test (e.g., [-0.2, -0.1, 0, 0.1, 0.2])
        target_metrics: Which metrics to include (e.g., ['irr', 'npv', 'noi'])
        thread_id: Chat thread ID for whatif context

    Returns:
        Dict with grid data: rows (one per step), columns (metrics), metadata
    """
    if not project_id:
        return {'success': False, 'error': 'project_id is required'}
    if not field:
        return {'success': False, 'error': 'field is required'}
    if base_value is None:
        return {'success': False, 'error': 'base_value is required'}

    if steps is None:
        steps = [-0.20, -0.10, -0.05, 0, 0.05, 0.10, 0.20]

    if target_metrics is None:
        target_metrics = ['irr', 'npv', 'total_profit', 'equity_multiple', 'noi']

    try:
        from .whatif_engine import WhatIfEngine, ShadowContext
        from . import whatif_storage

        engine = WhatIfEngine(project_id)
        grid_rows = []

        for step_pct in steps:
            test_value = round(base_value * (1 + step_pct), 4)

            # Create a fresh shadow for each step (no compounding)
            shadow = engine.create_shadow(f"sensitivity_{assumption_key}")

            # Apply the override
            shadow = engine.apply_override(
                shadow,
                field=field,
                table=table,
                new_value=test_value,
                label=f"{assumption_key} @ {step_pct:+.0%}",
                unit='',
            )

            # Compute metrics
            results = engine.compute_shadow_metrics(shadow)

            # Extract target metrics from results
            metrics = results.get('metrics', {})
            delta = results.get('delta', {})

            row = {
                'step_pct': step_pct,
                'test_value': test_value,
                'is_baseline': step_pct == 0,
                'metrics': {k: metrics.get(k) for k in target_metrics if k in metrics},
                'deltas': {k: delta.get(k) for k in target_metrics if k in delta},
            }
            grid_rows.append(row)

        return {
            'success': True,
            'assumption_key': assumption_key,
            'field': field,
            'table': table,
            'base_value': base_value,
            'steps_tested': len(grid_rows),
            'target_metrics': target_metrics,
            'grid': grid_rows,
            'hint': (
                'Display this as a sensitivity table with step values as rows '
                'and metrics as columns. Highlight the baseline row.'
            ),
        }

    except ImportError as e:
        logger.warning(f"[IC] WhatIfEngine not available for sensitivity: {e}")
        # Fallback: return a grid with estimated linear interpolation
        grid_rows = []
        for step_pct in steps:
            test_value = round(base_value * (1 + step_pct), 4)
            grid_rows.append({
                'step_pct': step_pct,
                'test_value': test_value,
                'is_baseline': step_pct == 0,
                'metrics': {},
                'deltas': {},
                'note': 'WhatIfEngine unavailable — values are estimates only',
            })

        return {
            'success': True,
            'assumption_key': assumption_key,
            'field': field,
            'base_value': base_value,
            'steps_tested': len(grid_rows),
            'target_metrics': target_metrics,
            'grid': grid_rows,
            'fallback': True,
        }

    except Exception as e:
        logger.error(f"[IC] generate_sensitivity_grid failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# SESSION SUMMARY
# =============================================================================

def get_session_summary(session_id: int) -> Dict[str, Any]:
    """
    Get full IC session summary including all challenges with responses.

    Used by the frontend ICResultsTabs component to populate the
    Compare and Sensitivity views.
    """
    if not session_id:
        return {'success': False, 'error': 'session_id is required'}

    try:
        with connection.cursor() as cursor:
            # Load session
            cursor.execute("""
                SELECT ic_session_id, project_id, aggressiveness, status,
                       total_assumptions_scanned, total_challenges,
                       challenges_presented, baseline_snapshot, summary,
                       created_at, completed_at
                FROM tbl_ic_session
                WHERE ic_session_id = %s
            """, [session_id])
            session_row = cursor.fetchone()

            if not session_row:
                return {'success': False, 'error': f'IC session {session_id} not found'}

            session = {
                'ic_session_id': session_row[0],
                'project_id': session_row[1],
                'aggressiveness': session_row[2],
                'status': session_row[3],
                'total_assumptions_scanned': session_row[4],
                'total_challenges': session_row[5],
                'challenges_presented': session_row[6],
                'baseline_snapshot': session_row[7] or {},
                'summary': session_row[8] or {},
                'created_at': session_row[9].isoformat() if session_row[9] else None,
                'completed_at': session_row[10].isoformat() if session_row[10] else None,
            }

            # Load all challenges
            cursor.execute("""
                SELECT ic_challenge_id, challenge_index, assumption_key,
                       label, current_value, suggested_value, unit,
                       benchmark_mean, benchmark_std, deviation_score,
                       percentile_desc, challenge_text, status,
                       user_response, user_value, impact_deltas,
                       presented_at, responded_at
                FROM tbl_ic_challenge
                WHERE ic_session_id = %s
                ORDER BY challenge_index
            """, [session_id])

            challenges = []
            for row in cursor.fetchall():
                challenges.append({
                    'ic_challenge_id': row[0],
                    'challenge_index': row[1],
                    'assumption_key': row[2],
                    'label': row[3],
                    'current_value': float(row[4]) if row[4] is not None else None,
                    'suggested_value': float(row[5]) if row[5] is not None else None,
                    'unit': row[6],
                    'benchmark_mean': float(row[7]) if row[7] is not None else None,
                    'benchmark_std': float(row[8]) if row[8] is not None else None,
                    'deviation_score': float(row[9]) if row[9] is not None else None,
                    'percentile_desc': row[10],
                    'challenge_text': row[11],
                    'status': row[12],
                    'user_response': row[13],
                    'user_value': float(row[14]) if row[14] is not None else None,
                    'impact_deltas': row[15] or {},
                    'presented_at': row[16].isoformat() if row[16] else None,
                    'responded_at': row[17].isoformat() if row[17] else None,
                })

        return {
            'success': True,
            'session': session,
            'challenges': challenges,
        }

    except Exception as e:
        logger.error(f"[IC] get_session_summary failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# HELPER: Create IC Session Record (extends ic_devil_advocate)
# =============================================================================

def create_ic_session_record(
    project_id: int,
    scenario_log_id: int,
    thread_id: str = None,
    aggressiveness: int = 5,
    total_assumptions_scanned: int = 0,
    challenges: List[Dict] = None,
    baseline_snapshot: Dict = None,
) -> Optional[int]:
    """
    Create tbl_ic_session and tbl_ic_challenge records from an
    ic_start_session result. Called by ic_devil_advocate.start_ic_session.

    Returns the ic_session_id.
    """
    challenges = challenges or []
    now = timezone.now()

    try:
        with connection.cursor() as cursor:
            # Create session
            cursor.execute("""
                INSERT INTO tbl_ic_session
                    (project_id, scenario_log_id, thread_id, aggressiveness,
                     status, total_assumptions_scanned, total_challenges,
                     baseline_snapshot, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING ic_session_id
            """, [
                project_id,
                scenario_log_id,
                thread_id,
                aggressiveness,
                'active',
                total_assumptions_scanned,
                len(challenges),
                json.dumps(baseline_snapshot or {}),
                now,
                now,
            ])
            ic_session_id = cursor.fetchone()[0]

            # Bulk insert challenges
            for i, challenge in enumerate(challenges):
                cursor.execute("""
                    INSERT INTO tbl_ic_challenge
                        (ic_session_id, challenge_index, assumption_key,
                         label, current_value, suggested_value, unit,
                         benchmark_mean, benchmark_std, deviation_score,
                         percentile_desc, challenge_text, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, [
                    ic_session_id,
                    i + 1,  # 1-based
                    challenge.get('assumption_key', ''),
                    challenge.get('label', ''),
                    challenge.get('current_value'),
                    challenge.get('suggested_value'),
                    challenge.get('unit', ''),
                    challenge.get('benchmark_mean'),
                    challenge.get('benchmark_std'),
                    challenge.get('deviation_score'),
                    challenge.get('percentile_desc', ''),
                    challenge.get('challenge_text', ''),
                    'pending',
                    now,
                ])

            return ic_session_id

    except Exception as e:
        logger.error(f"[IC] create_ic_session_record failed: {e}")
        return None
