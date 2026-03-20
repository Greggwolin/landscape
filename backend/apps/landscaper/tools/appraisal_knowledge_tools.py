"""
Appraisal Knowledge Tools for Landscaper AI.

Provides tools for extracting and storing knowledge from appraisal documents,
including market intelligence, valuation benchmarks, and comparable sale data.
These tools write to the knowledge fact system (entity-fact triples) so data
is queryable by Landscaper across projects and via RAG retrieval.

Two scopes:
  - Project knowledge: Valuation conclusions, cost approach details, comps
  - Platform knowledge: Market narratives, construction cost benchmarks,
    absorption data, pricing trends (reusable across projects in the market)

Tools:
  1. store_appraisal_valuation     - Store valuation conclusions as project facts
  2. store_market_intelligence      - Store market narrative data as platform facts
  3. store_construction_benchmarks  - Store cost/SF benchmarks for market area
  4. get_appraisal_knowledge        - Query stored appraisal knowledge for a project or market
"""

import json
import logging
from datetime import date
from decimal import Decimal
from django.db import connection
from django.utils import timezone
from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


def _get_or_create_market_entity(market_name: str, state: str, city: str = None):
    """
    Get or create a market-area entity for platform-level knowledge.
    Returns entity_id.
    """
    from apps.knowledge.services.entity_sync_service import EntitySyncService
    sync = EntitySyncService()

    # Try to find existing market entity
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT entity_id FROM landscape.tbl_knowledge_entity
            WHERE entity_type = 'market_area'
              AND entity_name = %s
              AND is_active = true
            LIMIT 1
        """, [market_name])
        row = cursor.fetchone()
        if row:
            return row[0]

        # Create new market entity
        cursor.execute("""
            INSERT INTO landscape.tbl_knowledge_entity
                (entity_type, entity_name, entity_subtype, metadata, is_active, created_at, updated_at)
            VALUES ('market_area', %s, 'appraisal_market', %s::jsonb, true, NOW(), NOW())
            RETURNING entity_id
        """, [market_name, json.dumps({
            'state': state,
            'city': city,
            'source': 'appraisal_extraction',
        })])
        return cursor.fetchone()[0]


def _store_knowledge_fact(entity_id: int, predicate: str, value: str,
                          source_type: str = 'appraisal_extraction',
                          source_doc_id: int = None,
                          confidence: float = 0.90,
                          valid_from: str = None):
    """
    Store a single knowledge fact with supersession logic.
    """
    with connection.cursor() as cursor:
        # Check for existing current fact with same predicate
        cursor.execute("""
            SELECT fact_id, object_value FROM landscape.tbl_knowledge_fact
            WHERE subject_entity_id = %s
              AND predicate = %s
              AND is_current = true
            LIMIT 1
        """, [entity_id, predicate])
        existing = cursor.fetchone()

        if existing and existing[1] == str(value):
            return None  # Idempotent — same value exists

        if existing:
            # Supersede old fact
            cursor.execute("""
                UPDATE landscape.tbl_knowledge_fact
                SET is_current = false, updated_at = NOW()
                WHERE fact_id = %s
            """, [existing[0]])

        # Insert new fact
        cursor.execute("""
            INSERT INTO landscape.tbl_knowledge_fact
                (subject_entity_id, predicate, object_value,
                 source_type, source_id, confidence_score,
                 valid_from, is_current, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            RETURNING fact_id
        """, [
            entity_id, predicate, str(value),
            source_type, source_doc_id, confidence,
            valid_from or date.today().isoformat(),
        ])
        return cursor.fetchone()[0]


@register_tool('store_appraisal_valuation', is_mutation=True)
def store_appraisal_valuation(valuation_data: dict = None, **kwargs):
    """
    Store appraisal valuation conclusions as project knowledge facts.

    Accepts key valuation figures from a URAR or narrative appraisal and
    writes them as knowledge facts tied to the project entity.

    Expected valuation_data keys:
      - reconciled_value: Final reconciled market value
      - sales_comparison_value: Indicated value by sales comparison
      - cost_approach_value: Indicated value by cost approach
      - income_approach_value: Indicated value by income approach (if any)
      - as_is_value: Current as-is market value
      - site_value: Estimated site/land value
      - effective_date: Effective date of appraisal (YYYY-MM-DD)
      - appraiser_name: Name of appraiser
      - appraiser_company: Appraisal firm
      - appraiser_license: State certification/license number
      - exposure_time: Estimated reasonable exposure time
      - highest_best_use: Highest and best use conclusion
      - hypothetical_conditions: Any hypothetical conditions noted
      - doc_id: Source document ID (for provenance tracking)
    """
    project_context = kwargs.get('project_context', {})
    project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    valuation_data = valuation_data or tool_input.get('valuation_data', {})

    if not project_id:
        return {'success': False, 'error': 'project_id not available in context'}
    if not valuation_data:
        return {'success': False, 'error': 'valuation_data is required'}

    if propose_only:
        return {
            'success': True,
            'proposed': True,
            'action': 'store_appraisal_valuation',
            'valuation_data': valuation_data,
            'message': f'Propose storing {len(valuation_data)} valuation fields as project knowledge. Confirm to apply.',
        }

    try:
        # Get project entity
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.entity_id FROM landscape.tbl_knowledge_entity e
                WHERE e.entity_type = 'project'
                  AND e.metadata->>'project_id' = %s
                  AND e.is_active = true
                LIMIT 1
            """, [str(project_id)])
            row = cursor.fetchone()

            if not row:
                # Create project entity
                cursor.execute("""
                    SELECT project_name, city, state FROM landscape.tbl_project
                    WHERE project_id = %s
                """, [project_id])
                proj = cursor.fetchone()
                proj_name = proj[0] if proj else f"Project {project_id}"

                cursor.execute("""
                    INSERT INTO landscape.tbl_knowledge_entity
                        (entity_type, entity_name, metadata, is_active, created_at, updated_at)
                    VALUES ('project', %s, %s::jsonb, true, NOW(), NOW())
                    RETURNING entity_id
                """, [proj_name, json.dumps({'project_id': project_id})])
                entity_id = cursor.fetchone()[0]
            else:
                entity_id = row[0]

        doc_id = valuation_data.pop('doc_id', None)
        effective_date = valuation_data.pop('effective_date', None)

        # Map valuation_data keys to predicates
        predicate_map = {
            'reconciled_value': 'appraisal:reconciled_value',
            'sales_comparison_value': 'appraisal:sales_comparison_value',
            'cost_approach_value': 'appraisal:cost_approach_value',
            'income_approach_value': 'appraisal:income_approach_value',
            'as_is_value': 'appraisal:as_is_value',
            'site_value': 'appraisal:site_value',
            'appraiser_name': 'appraisal:appraiser_name',
            'appraiser_company': 'appraisal:appraiser_company',
            'appraiser_license': 'appraisal:appraiser_license',
            'exposure_time': 'appraisal:exposure_time',
            'highest_best_use': 'appraisal:highest_best_use',
            'hypothetical_conditions': 'appraisal:hypothetical_conditions',
        }

        stored = []
        skipped = []
        for key, value in valuation_data.items():
            if value is None or value == '':
                continue
            predicate = predicate_map.get(key, f'appraisal:{key}')
            fact_id = _store_knowledge_fact(
                entity_id=entity_id,
                predicate=predicate,
                value=value,
                source_doc_id=doc_id,
                confidence=0.95,
                valid_from=effective_date,
            )
            if fact_id:
                stored.append({'key': key, 'value': value, 'fact_id': fact_id})
            else:
                skipped.append(key)

        return {
            'success': True,
            'project_id': project_id,
            'entity_id': entity_id,
            'stored_count': len(stored),
            'skipped_count': len(skipped),
            'stored_fields': stored,
            'skipped_fields': skipped,
            'message': f'Stored {len(stored)} appraisal valuation facts. {len(skipped)} unchanged/skipped.',
        }

    except Exception as e:
        logger.error(f"Error storing appraisal valuation: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('store_market_intelligence', is_mutation=True)
def store_market_intelligence(market_data: dict = None, **kwargs):
    """
    Store market intelligence from an appraisal as platform-level knowledge.

    This data is NOT project-scoped — it's tied to a market area entity
    and queryable across all projects in that market.

    Expected market_data keys:
      - market_name: Market area name (e.g., "Blaine County" or "Wood River Valley")
      - state: State abbreviation (e.g., "ID")
      - city: City name (optional, for specificity)
      - data_year: Year the data represents (e.g., 2025)
      - doc_id: Source document ID

      Market metrics (all optional, include what's available):
      - total_sales_volume: Total market sales volume ($)
      - residential_sales_volume: Residential component ($)
      - avg_sale_price: Average sale price
      - median_sale_price: Median sale price
      - avg_price_per_sf: Average price per SF
      - days_on_market_avg: Average days on market
      - inventory_count: Active listing count
      - absorption_trend: Description of absorption trends
      - price_trend: Description of price trends (e.g., "stable", "increasing 6%")
      - vacancy_rate: Market vacancy rate (if applicable)
      - construction_cost_range: Cost per SF range (e.g., "$700-$1,400")
      - entrepreneurial_profit_range: Observed profit ranges (e.g., "63%-93%")
      - market_narrative: Full market summary text from appraiser
      - vacant_land_avg_price: Average vacant land price
      - vacant_land_avg_acres: Average lot size for land sales
      - vacant_land_price_per_acre: Average price per acre
    """
    project_context = kwargs.get('project_context', {})
    project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    market_data = market_data or tool_input.get('market_data', {})

    market_name = market_data.get('market_name')
    state = market_data.get('state')

    if not market_name or not state:
        return {'success': False, 'error': 'market_name and state are required'}

    if propose_only:
        field_count = len([v for v in market_data.values() if v is not None and v != ''])
        return {
            'success': True,
            'proposed': True,
            'action': 'store_market_intelligence',
            'market_name': market_name,
            'field_count': field_count,
            'message': f'Propose storing {field_count} market intelligence fields for {market_name}, {state}. Confirm to apply.',
        }

    try:
        city = market_data.get('city')
        entity_id = _get_or_create_market_entity(market_name, state, city)

        doc_id = market_data.get('doc_id')
        data_year = market_data.get('data_year', date.today().year)

        # Skip meta keys, store everything else
        meta_keys = {'market_name', 'state', 'city', 'doc_id', 'data_year'}

        stored = []
        skipped = []
        for key, value in market_data.items():
            if key in meta_keys or value is None or value == '':
                continue

            predicate = f'market:{data_year}:{key}'
            fact_id = _store_knowledge_fact(
                entity_id=entity_id,
                predicate=predicate,
                value=value,
                source_type='appraisal_market_intel',
                source_doc_id=doc_id,
                confidence=0.90,
                valid_from=f'{data_year}-12-31',
            )
            if fact_id:
                stored.append({'key': key, 'value': str(value)[:200], 'fact_id': fact_id})
            else:
                skipped.append(key)

        return {
            'success': True,
            'market_name': market_name,
            'entity_id': entity_id,
            'data_year': data_year,
            'stored_count': len(stored),
            'skipped_count': len(skipped),
            'stored_fields': stored,
            'message': f'Stored {len(stored)} market intelligence facts for {market_name} ({data_year}). {len(skipped)} unchanged.',
        }

    except Exception as e:
        logger.error(f"Error storing market intelligence: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('store_construction_benchmarks', is_mutation=True)
def store_construction_benchmarks(benchmark_data: dict = None, **kwargs):
    """
    Store construction cost benchmarks from an appraisal for platform use.

    These benchmarks help Landscaper provide informed cost estimates to users
    working on projects in the same market. Data is tied to a market entity.

    Expected benchmark_data keys:
      - market_name: Market area name
      - state: State abbreviation
      - data_year: Year data represents
      - doc_id: Source document ID
      - property_type: Property type (e.g., "SFR", "custom_home", "spec_home")

      Cost benchmarks:
      - dwelling_cost_per_sf_low: Low end of construction cost range ($/SF)
      - dwelling_cost_per_sf_high: High end of construction cost range ($/SF)
      - dwelling_cost_per_sf_avg: Average construction cost ($/SF)
      - garage_cost_per_sf: Garage construction cost ($/SF)
      - site_improvements_typical: Typical site improvement allowance ($)
      - entrepreneurial_profit_pct_low: Low end of observed profit %
      - entrepreneurial_profit_pct_high: High end of observed profit %
      - land_value_avg: Average land/site value in market
      - land_price_per_acre_avg: Average land price per acre
      - total_development_cost_range: Total dev cost range description
    """
    project_context = kwargs.get('project_context', {})
    tool_input = kwargs.get('tool_input', {})
    propose_only = kwargs.get('propose_only', True)

    benchmark_data = benchmark_data or tool_input.get('benchmark_data', {})

    market_name = benchmark_data.get('market_name')
    state = benchmark_data.get('state')

    if not market_name or not state:
        return {'success': False, 'error': 'market_name and state are required'}

    if propose_only:
        field_count = len([v for v in benchmark_data.values() if v is not None and v != ''])
        return {
            'success': True,
            'proposed': True,
            'action': 'store_construction_benchmarks',
            'market_name': market_name,
            'field_count': field_count,
            'message': f'Propose storing {field_count} construction benchmark fields for {market_name}. Confirm to apply.',
        }

    try:
        entity_id = _get_or_create_market_entity(market_name, state)

        doc_id = benchmark_data.get('doc_id')
        data_year = benchmark_data.get('data_year', date.today().year)
        property_type = benchmark_data.get('property_type', 'residential')

        meta_keys = {'market_name', 'state', 'city', 'doc_id', 'data_year', 'property_type'}

        stored = []
        for key, value in benchmark_data.items():
            if key in meta_keys or value is None or value == '':
                continue

            predicate = f'benchmark:{data_year}:{property_type}:{key}'
            fact_id = _store_knowledge_fact(
                entity_id=entity_id,
                predicate=predicate,
                value=value,
                source_type='appraisal_benchmark',
                source_doc_id=doc_id,
                confidence=0.85,
                valid_from=f'{data_year}-12-31',
            )
            if fact_id:
                stored.append({'key': key, 'value': str(value), 'fact_id': fact_id})

        return {
            'success': True,
            'market_name': market_name,
            'entity_id': entity_id,
            'property_type': property_type,
            'data_year': data_year,
            'stored_count': len(stored),
            'stored_fields': stored,
            'message': f'Stored {len(stored)} construction benchmarks for {market_name} ({property_type}, {data_year}).',
        }

    except Exception as e:
        logger.error(f"Error storing construction benchmarks: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('get_appraisal_knowledge')
def get_appraisal_knowledge(scope: str = None, market_name: str = None, **kwargs):
    """
    Query stored appraisal knowledge — project-level or platform-level.

    Args:
      scope: "project" to get project appraisal facts, "market" for market-level facts
      market_name: Required if scope="market". Market area name to query.

    Returns stored knowledge facts for the requested scope.
    """
    project_context = kwargs.get('project_context', {})
    project_id = project_context.get('project_id')
    tool_input = kwargs.get('tool_input', {})

    scope = scope or tool_input.get('scope', 'project')
    market_name = market_name or tool_input.get('market_name')

    try:
        with connection.cursor() as cursor:
            if scope == 'project':
                if not project_id:
                    return {'success': False, 'error': 'project_id not available in context'}

                cursor.execute("""
                    SELECT f.fact_id, f.predicate, f.object_value,
                           f.confidence_score, f.valid_from, f.source_type
                    FROM landscape.tbl_knowledge_fact f
                    JOIN landscape.tbl_knowledge_entity e ON f.subject_entity_id = e.entity_id
                    WHERE e.entity_type = 'project'
                      AND e.metadata->>'project_id' = %s
                      AND f.predicate LIKE 'appraisal:%%'
                      AND f.is_current = true
                    ORDER BY f.predicate
                """, [str(project_id)])
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

                # Serialize decimals
                for row in rows:
                    if row.get('confidence_score'):
                        row['confidence_score'] = float(row['confidence_score'])
                    if row.get('valid_from'):
                        row['valid_from'] = str(row['valid_from'])

                return {
                    'success': True,
                    'scope': 'project',
                    'project_id': project_id,
                    'fact_count': len(rows),
                    'facts': rows,
                }

            elif scope == 'market':
                if not market_name:
                    return {'success': False, 'error': 'market_name is required for market scope'}

                cursor.execute("""
                    SELECT f.fact_id, f.predicate, f.object_value,
                           f.confidence_score, f.valid_from, f.source_type,
                           e.entity_name AS market_name
                    FROM landscape.tbl_knowledge_fact f
                    JOIN landscape.tbl_knowledge_entity e ON f.subject_entity_id = e.entity_id
                    WHERE e.entity_type = 'market_area'
                      AND e.entity_name ILIKE %s
                      AND f.is_current = true
                    ORDER BY f.predicate
                """, [f'%{market_name}%'])
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

                for row in rows:
                    if row.get('confidence_score'):
                        row['confidence_score'] = float(row['confidence_score'])
                    if row.get('valid_from'):
                        row['valid_from'] = str(row['valid_from'])

                return {
                    'success': True,
                    'scope': 'market',
                    'market_name': market_name,
                    'fact_count': len(rows),
                    'facts': rows,
                }

            else:
                return {'success': False, 'error': f'Unknown scope: {scope}. Use "project" or "market".'}

    except Exception as e:
        logger.error(f"Error querying appraisal knowledge: {e}")
        return {'success': False, 'error': str(e)}
