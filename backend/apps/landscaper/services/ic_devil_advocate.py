"""
Investment Committee Devil's Advocate Service.

Phase 7 of What-If Engine: Investment Committee Page.

Scans project assumptions against benchmarks, ranks by deviation,
and generates proactive challenges for the IC review process.
"""

import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# ASSUMPTION SCANNING CONFIGURATION
# =============================================================================

# Maps project fields to benchmark categories for comparison
ASSUMPTION_BENCHMARK_MAP = {
    # Land development assumptions
    'absorption_rate': {
        'table': 'tbl_project',
        'field': 'absorption_rate',
        'benchmark_category': 'absorption',
        'label': 'Absorption Rate',
        'unit': 'lots/month',
        'direction': 'higher_is_aggressive',
    },
    'lot_price_avg': {
        'table': 'tbl_parcel',
        'field': 'lot_price',
        'benchmark_category': 'pricing',
        'label': 'Average Lot Price',
        'unit': '$',
        'direction': 'higher_is_aggressive',
        'aggregation': 'avg',
    },
    'cost_inflation_pct': {
        'table': 'tbl_project',
        'field': 'cost_inflation_pct',
        'benchmark_category': 'inflation',
        'label': 'Cost Inflation',
        'unit': '%',
        'direction': 'lower_is_aggressive',
    },
    'discount_rate': {
        'table': 'tbl_dcf_analysis',
        'field': 'discount_rate',
        'benchmark_category': 'discount_rate',
        'label': 'Discount Rate',
        'unit': '%',
        'direction': 'lower_is_aggressive',
    },
    'exit_cap_rate': {
        'table': 'tbl_dcf_analysis',
        'field': 'exit_cap_rate',
        'benchmark_category': 'cap_rate',
        'label': 'Exit Cap Rate',
        'unit': '%',
        'direction': 'lower_is_aggressive',
    },
    # Multifamily assumptions
    'vacancy_loss_pct': {
        'table': 'tbl_vacancy_assumption',
        'field': 'vacancy_loss_pct',
        'benchmark_category': 'vacancy',
        'label': 'Vacancy Rate',
        'unit': '%',
        'direction': 'lower_is_aggressive',
    },
    'rent_growth_pct': {
        'table': 'tbl_revenue_rent',
        'field': 'annual_growth_rate',
        'benchmark_category': 'rent_growth',
        'label': 'Rent Growth Rate',
        'unit': '%',
        'direction': 'higher_is_aggressive',
    },
    'expense_growth_pct': {
        'table': 'tbl_operating_expenses',
        'field': 'annual_escalation_pct',
        'benchmark_category': 'expense_growth',
        'label': 'Expense Growth Rate',
        'unit': '%',
        'direction': 'lower_is_aggressive',
    },
}

# Aggressiveness thresholds (std deviations from benchmark)
AGGRESSIVENESS_THRESHOLDS = {
    # level: (min_std_dev_to_flag, max_challenges)
    1: (2.5, 2),
    2: (2.0, 2),
    3: (2.0, 3),
    4: (1.5, 4),
    5: (1.0, 5),
    6: (1.0, 6),
    7: (0.5, 7),
    8: (0.5, 8),
    9: (0.25, 10),
    10: (0.0, 15),  # Flag everything above median
}


# =============================================================================
# CORE FUNCTIONS
# =============================================================================

def start_ic_session(
    project_id: int,
    aggressiveness: int = 5,
    thread_id: str = None,
) -> Dict[str, Any]:
    """
    Start an Investment Committee devil's advocate session.

    1. Loads current project assumptions
    2. Scans against benchmarks in tbl_global_benchmark_registry
    3. Ranks by deviation (adjusted by aggressiveness)
    4. Returns ordered list of challenges to present

    Returns:
        Dict with session info, challenge ranking, and baseline snapshot.
    """
    aggressiveness = max(1, min(10, aggressiveness))
    threshold_std, max_challenges = AGGRESSIVENESS_THRESHOLDS[aggressiveness]

    try:
        # Load project info
        project_info = _load_project_info(project_id)
        if not project_info:
            return {'success': False, 'error': f'Project {project_id} not found'}

        property_type = project_info.get('project_type_code', 'LAND')

        # Scan assumptions against benchmarks
        assumptions = _scan_project_assumptions(project_id, property_type)

        # Load benchmark data
        benchmarks = _load_benchmarks(property_type)

        # Rank assumptions by deviation from benchmarks
        challenges = _rank_challenges(
            assumptions, benchmarks, threshold_std, aggressiveness
        )

        # Limit to max challenges
        challenges = challenges[:max_challenges]

        # Create session record in scenario_log
        session_id = _create_ic_session_log(
            project_id=project_id,
            thread_id=thread_id,
            aggressiveness=aggressiveness,
            challenges=challenges,
        )

        return {
            'success': True,
            'session_id': session_id,
            'project_name': project_info.get('project_name', f'Project {project_id}'),
            'property_type': property_type,
            'aggressiveness': aggressiveness,
            'threshold_std_dev': threshold_std,
            'total_assumptions_scanned': len(assumptions),
            'challenges_identified': len(challenges),
            'challenges': challenges,
            'hint': (
                'Present challenges one at a time, starting with the most aggressive. '
                'For each, reference the benchmark comparison and ask the user to respond. '
                'Use whatif_compute to model each challenge.'
            ),
        }

    except Exception as e:
        logger.error(f"[IC] start_ic_session failed: {e}")
        return {'success': False, 'error': str(e)}


def get_next_challenge(
    session_id: int,
    current_aggressiveness: int = None,
) -> Dict[str, Any]:
    """
    Get the next assumption challenge for the IC session.

    Tracks which challenges have been presented via the session log's
    scenario_data JSON field, and returns the next unaddressed challenge.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT scenario_data
                FROM tbl_scenario_log
                WHERE id = %s
            """, [session_id])
            row = cursor.fetchone()

        if not row:
            return {'success': False, 'error': f'IC session {session_id} not found'}

        session_data = row[0] if isinstance(row[0], dict) else json.loads(row[0] or '{}')
        challenges = session_data.get('challenges', [])
        presented = session_data.get('presented_indices', [])

        # Find next unaddressed challenge
        next_idx = None
        for i, c in enumerate(challenges):
            if i not in presented:
                next_idx = i
                break

        if next_idx is None:
            return {
                'success': True,
                'completed': True,
                'message': 'All assumptions have been challenged. IC review is complete.',
                'total_challenges': len(challenges),
                'challenges_presented': len(presented),
            }

        challenge = challenges[next_idx]

        # Mark as presented
        presented.append(next_idx)
        session_data['presented_indices'] = presented

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE tbl_scenario_log
                SET scenario_data = %s, updated_at = %s
                WHERE id = %s
            """, [json.dumps(session_data), timezone.now(), session_id])

        return {
            'success': True,
            'completed': False,
            'challenge_index': next_idx + 1,
            'total_challenges': len(challenges),
            'remaining': len(challenges) - len(presented),
            'challenge': challenge,
            'hint': (
                f"Challenge {next_idx + 1} of {len(challenges)}: "
                f"Present this as a proactive question. Reference the benchmark "
                f"and ask the user what the model looks like with the suggested value."
            ),
        }

    except Exception as e:
        logger.error(f"[IC] get_next_challenge failed: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _load_project_info(project_id: int) -> Optional[Dict]:
    """Load basic project info."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT project_id, project_name, project_type_code
            FROM tbl_project
            WHERE project_id = %s AND is_active = true
        """, [project_id])
        row = cursor.fetchone()
        if not row:
            return None
        return {
            'project_id': row[0],
            'project_name': row[1],
            'project_type_code': row[2] or 'LAND',
        }


def _scan_project_assumptions(
    project_id: int,
    property_type: str,
) -> Dict[str, Dict]:
    """
    Scan project tables for current assumption values.
    Returns dict of assumption_key -> {value, table, field, label, unit}.
    """
    results = {}

    for key, config in ASSUMPTION_BENCHMARK_MAP.items():
        table = config['table']
        field = config['field']
        agg = config.get('aggregation')

        try:
            with connection.cursor() as cursor:
                if agg == 'avg':
                    cursor.execute(f"""
                        SELECT AVG({field})::NUMERIC
                        FROM {table}
                        WHERE project_id = %s
                    """, [project_id])
                else:
                    cursor.execute(f"""
                        SELECT {field}
                        FROM {table}
                        WHERE project_id = %s
                        LIMIT 1
                    """, [project_id])
                row = cursor.fetchone()
                if row and row[0] is not None:
                    results[key] = {
                        'value': float(row[0]),
                        'table': table,
                        'field': field,
                        'label': config['label'],
                        'unit': config['unit'],
                        'direction': config['direction'],
                    }
        except Exception as e:
            logger.debug(f"[IC] Could not scan {table}.{field}: {e}")

    return results


def _load_benchmarks(property_type: str) -> Dict[str, Dict]:
    """
    Load benchmark values from tbl_global_benchmark_registry.
    Returns dict of benchmark_category -> {mean, median, std_dev, ...}.
    """
    benchmarks = {}

    try:
        with connection.cursor() as cursor:
            # Load benchmarks grouped by category
            cursor.execute("""
                SELECT category, subcategory, benchmark_name,
                       context_metadata
                FROM tbl_global_benchmark_registry
                WHERE is_active = true
                  AND (property_type = %s OR property_type IS NULL OR property_type = 'all')
                ORDER BY category, subcategory
            """, [property_type.lower()])

            for row in cursor.fetchall():
                category = row[0] or ''
                subcategory = row[1] or ''
                name = row[2] or ''
                metadata = row[3] or {}

                key = category.lower()
                if key not in benchmarks:
                    benchmarks[key] = {
                        'category': category,
                        'subcategory': subcategory,
                        'name': name,
                    }

                # Extract stats from context_metadata if available
                if isinstance(metadata, dict):
                    for stat_key in ('mean', 'median', 'p25', 'p75', 'std_dev', 'min', 'max'):
                        if stat_key in metadata:
                            benchmarks[key][stat_key] = float(metadata[stat_key])

    except Exception as e:
        logger.warning(f"[IC] Could not load benchmarks: {e}")

    return benchmarks


def _rank_challenges(
    assumptions: Dict[str, Dict],
    benchmarks: Dict[str, Dict],
    threshold_std: float,
    aggressiveness: int,
) -> List[Dict]:
    """
    Rank assumptions by deviation from benchmarks.
    Returns ordered list of challenges (most aggressive first).
    """
    challenges = []

    for key, assumption in assumptions.items():
        config = ASSUMPTION_BENCHMARK_MAP.get(key, {})
        bench_category = config.get('benchmark_category', '')
        benchmark = benchmarks.get(bench_category, {})

        # Need at least mean to compare
        bench_mean = benchmark.get('mean') or benchmark.get('median')
        if bench_mean is None:
            # No benchmark data — generate a generic challenge for high aggressiveness
            if aggressiveness >= 8:
                challenges.append({
                    'assumption_key': key,
                    'label': assumption['label'],
                    'current_value': assumption['value'],
                    'unit': assumption['unit'],
                    'benchmark_available': False,
                    'deviation_score': 0.5,  # Low priority
                    'challenge_text': (
                        f"No market benchmark available for {assumption['label']}. "
                        f"Current value is {assumption['value']}{assumption['unit']}. "
                        f"What is this based on?"
                    ),
                    'suggested_value': None,
                })
            continue

        bench_std = benchmark.get('std_dev', abs(bench_mean * 0.15))  # Default 15% if no std
        if bench_std == 0:
            bench_std = abs(bench_mean * 0.1) or 1.0

        value = assumption['value']
        direction = assumption['direction']

        # Calculate deviation in std units
        raw_deviation = (value - bench_mean) / bench_std

        # Adjust sign based on direction
        if direction == 'higher_is_aggressive':
            deviation_score = raw_deviation  # Positive = more aggressive
        else:
            deviation_score = -raw_deviation  # Lower = more aggressive for these

        # Check threshold
        if deviation_score < threshold_std:
            continue

        # Determine percentile description
        if deviation_score >= 2.0:
            percentile_desc = 'well above the 95th percentile'
        elif deviation_score >= 1.5:
            percentile_desc = 'above the 90th percentile'
        elif deviation_score >= 1.0:
            percentile_desc = 'above the 75th percentile'
        elif deviation_score >= 0.5:
            percentile_desc = 'above the median'
        else:
            percentile_desc = 'near market average'

        # Generate suggested alternative (move toward benchmark)
        if direction == 'higher_is_aggressive':
            suggested = bench_mean + (bench_std * 0.5)  # Suggest 0.5 std above mean
        else:
            suggested = bench_mean - (bench_std * 0.5)  # Suggest 0.5 std below mean

        suggested = round(suggested, 2)

        challenge_text = (
            f"Your {assumption['label']} assumption of "
            f"{assumption['value']}{assumption['unit']} is {percentile_desc} "
            f"for this market (benchmark: {round(bench_mean, 2)}{assumption['unit']}). "
            f"What does the model look like at {suggested}{assumption['unit']}?"
        )

        # For high aggressiveness, also flag conservative assumptions
        if aggressiveness >= 8 and deviation_score < -0.5:
            challenge_text = (
                f"Your {assumption['label']} of {assumption['value']}{assumption['unit']} "
                f"appears conservative vs market ({round(bench_mean, 2)}{assumption['unit']}). "
                f"Are you accounting for all factors, or is this intentionally cautious?"
            )

        challenges.append({
            'assumption_key': key,
            'label': assumption['label'],
            'current_value': assumption['value'],
            'unit': assumption['unit'],
            'table': assumption['table'],
            'field': assumption['field'],
            'benchmark_mean': round(bench_mean, 2),
            'benchmark_std': round(bench_std, 2),
            'benchmark_available': True,
            'deviation_score': round(deviation_score, 2),
            'percentile_desc': percentile_desc,
            'suggested_value': suggested,
            'challenge_text': challenge_text,
        })

    # Sort by deviation score descending (most aggressive first)
    challenges.sort(key=lambda c: c['deviation_score'], reverse=True)

    return challenges


def _create_ic_session_log(
    project_id: int,
    thread_id: str = None,
    aggressiveness: int = 5,
    challenges: List[Dict] = None,
) -> int:
    """
    Create a scenario_log entry for this IC session.
    """
    session_data = {
        'type': 'ic_session',
        'aggressiveness': aggressiveness,
        'challenges': challenges or [],
        'presented_indices': [],
    }

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO tbl_scenario_log
                (project_id, thread_id, scenario_name, status, source,
                 scenario_data, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, [
            project_id,
            thread_id,
            f'IC Session (Aggressiveness {aggressiveness}/10)',
            'active_shadow',
            'ic_session',
            json.dumps(session_data),
            json.dumps(['ic', 'devil_advocate']),
            timezone.now(),
            timezone.now(),
        ])
        return cursor.fetchone()[0]
