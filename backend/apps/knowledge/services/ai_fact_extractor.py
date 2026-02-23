"""
AI Fact Extractor - Auto-ingest knowledge facts from Landscaper responses.

When Landscaper answers questions using document-sourced data (e.g., comp amenities
from an OM), this service extracts structured facts and persists them to the
knowledge base via EntitySyncService and FactService.

Usage (called from ai_handler.py post-response):
    from apps.knowledge.services.ai_fact_extractor import extract_facts_from_response

    result = extract_facts_from_response(
        response_text="The OM shows 9038 Artesia has pool, gym...",
        source_context={
            'project_id': 17,
            'page_context': 'mf_market',
            'document_sources': [101, 102],
            'user_id': 1,
        }
    )
    # result: {'success': True, 'facts_created': 14, 'entities_created': 6, 'message': '...'}
"""

import json
import logging
import os
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.db import transaction

from ..models import KnowledgeFact
from .entity_sync_service import EntitySyncService
from .fact_service import FactService

logger = logging.getLogger(__name__)

# Confidence score for AI-inferred facts (conservative — not 1.0)
AI_INFERENCE_CONFIDENCE = Decimal('0.75')

# Minimum response length to consider for extraction
MIN_RESPONSE_LENGTH = 200

# Haiku model for fast extraction
HAIKU_MODEL = 'claude-haiku-4-5-20251001'

# Structured data markers that suggest extractable content
EXTRACTION_MARKERS = [
    r'\b\d+\s+\w+\s+(Blvd|Ave|St|Dr|Rd|Ln|Way|Ct|Pl)\b',  # Addresses
    r'amenit',   # Amenities
    r'pool|gym|laundry|parking|elevator|spa|fitness',  # Common amenities
    r'\$[\d,]+',  # Dollar amounts
    r'\d+\s*(sf|SF|sq\s*ft|units?|beds?|baths?)',  # Property metrics
    r'cap\s*rate|noi|rent|vacancy',  # Financial metrics
]

EXTRACTION_SYSTEM_PROMPT = """You are a structured data extractor for a real estate analytics platform.

Given an AI response about properties, comparables, or market data, extract ALL factual statements
about specific properties into a structured JSON format.

RULES:
- Only extract facts that are explicitly stated in the text
- Use exact addresses/names as they appear
- Amenities should be normalized to lowercase single terms (e.g., "pool", "gym", "in-unit laundry")
- Attributes should use snake_case keys (e.g., "bedrooms", "asking_rent", "year_built", "sq_ft")
- If no extractable property data exists, return {"extractable": false}
- Set "type" to "comparable" for comp properties, "subject" for the subject property

Return ONLY valid JSON, no markdown or explanation."""

EXTRACTION_USER_PROMPT = """Extract structured property facts from this AI response:

---
{response_text}
---

Return JSON in this exact format:
{{
  "extractable": true,
  "properties": [
    {{
      "name": "Full property name or address",
      "type": "comparable",
      "amenities": ["pool", "gym", "in-unit laundry"],
      "attributes": {{"bedrooms": "2", "asking_rent": "1500", "sq_ft": "1200"}}
    }}
  ]
}}"""


def extract_facts_from_response(
    response_text: str,
    source_context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Main entry point: extract and persist structured facts from a Landscaper response.

    Args:
        response_text: The AI response content
        source_context: Dict with project_id, page_context, document_sources, user_id

    Returns:
        {success, facts_created, entities_created, message}
    """
    project_id = source_context.get('project_id')
    if not project_id:
        return {'success': False, 'facts_created': 0, 'entities_created': 0, 'message': 'No project_id'}

    # Gate: should we even try extraction?
    if not _should_extract(response_text, source_context):
        logger.debug("[FactExtractor] Skipping extraction — heuristic gate failed")
        return {'success': False, 'facts_created': 0, 'entities_created': 0, 'message': 'Extraction not warranted'}

    # Call Haiku to extract structured facts
    extraction = _call_haiku_extraction(response_text)
    if not extraction or not extraction.get('extractable'):
        logger.debug("[FactExtractor] Haiku returned no extractable data")
        return {'success': False, 'facts_created': 0, 'entities_created': 0, 'message': 'No extractable data'}

    properties = extraction.get('properties', [])
    if not properties:
        return {'success': False, 'facts_created': 0, 'entities_created': 0, 'message': 'No properties found'}

    # Persist extracted facts
    try:
        facts_count, entities_count = _persist_extracted_facts(
            properties=properties,
            project_id=project_id,
            source_docs=source_context.get('document_sources', []),
            user_id=source_context.get('user_id'),
        )
        msg = f"Saved {facts_count} facts ({entities_count} properties) to knowledge base"
        logger.info(f"[FactExtractor] {msg} for project {project_id}")
        return {'success': True, 'facts_created': facts_count, 'entities_created': entities_count, 'message': msg}
    except Exception as e:
        logger.error(f"[FactExtractor] Persistence failed: {e}", exc_info=True)
        return {'success': False, 'facts_created': 0, 'entities_created': 0, 'message': str(e)}


def _should_extract(response_text: str, source_context: Dict[str, Any]) -> bool:
    """
    Heuristic gate: decide if extraction is warranted.

    Returns True if the response likely contains structured property data from documents.
    """
    # Must have document sources
    if not source_context.get('document_sources'):
        return False

    # Must be substantive response
    if len(response_text) < MIN_RESPONSE_LENGTH:
        return False

    # Must contain structured data markers
    marker_hits = sum(1 for pattern in EXTRACTION_MARKERS if re.search(pattern, response_text, re.IGNORECASE))
    if marker_hits < 2:
        return False

    return True


def _call_haiku_extraction(response_text: str) -> Optional[Dict]:
    """
    Call Claude Haiku to extract structured facts from response text.

    Returns parsed JSON dict or None on failure.
    """
    try:
        import anthropic
    except ImportError:
        logger.error("[FactExtractor] anthropic package not installed")
        return None

    api_key = os.getenv('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)
    if not api_key:
        logger.warning("[FactExtractor] ANTHROPIC_API_KEY not set")
        return None

    try:
        client = anthropic.Anthropic(api_key=api_key, timeout=30)

        # Truncate very long responses to keep Haiku fast
        truncated = response_text[:8000] if len(response_text) > 8000 else response_text

        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=2048,
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": EXTRACTION_USER_PROMPT.format(response_text=truncated)
            }]
        )

        # Extract text content
        text = ""
        for block in response.content:
            if hasattr(block, 'text'):
                text += block.text

        if not text.strip():
            logger.warning("[FactExtractor] Haiku returned empty response")
            return None

        # Parse JSON — handle markdown code fences if present
        cleaned = text.strip()
        if cleaned.startswith('```'):
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)

        parsed = json.loads(cleaned)
        logger.info(f"[FactExtractor] Haiku extracted {len(parsed.get('properties', []))} properties")
        return parsed

    except json.JSONDecodeError as e:
        logger.warning(f"[FactExtractor] Haiku returned invalid JSON: {e}")
        return None
    except anthropic.APIError as e:
        logger.error(f"[FactExtractor] Haiku API error: {e}")
        return None
    except Exception as e:
        logger.error(f"[FactExtractor] Unexpected error in Haiku call: {e}", exc_info=True)
        return None


@transaction.atomic
def _persist_extracted_facts(
    properties: List[Dict],
    project_id: int,
    source_docs: List[int],
    user_id: Optional[int] = None,
) -> Tuple[int, int]:
    """
    Persist extracted property facts to knowledge base.

    Creates property entities and amenity/attribute facts using existing services.

    Returns:
        (facts_created_count, entities_created_count)
    """
    entity_sync = EntitySyncService(user_id=user_id)
    fact_service = FactService(user_id=user_id)

    # Ensure project entity exists
    project_entity = entity_sync.get_or_create_project_entity(
        project_id=project_id,
        project_name=f"Project {project_id}",
    )

    # Use first source doc as source_id for fact provenance
    source_id = source_docs[0] if source_docs else None

    facts_created = 0
    entities_created = 0

    for prop in properties:
        name = prop.get('name', '').strip()
        if not name:
            continue

        prop_type = prop.get('type', 'comparable')

        # Create property entity (track if newly created)
        from ..models import KnowledgeEntity
        canonical = f"property:{name.strip().upper()}"
        is_new = not KnowledgeEntity.objects.filter(canonical_name=canonical).exists()

        entity = entity_sync.get_or_create_property_entity(
            address=name,
            entity_subtype=prop_type,
            project_id=project_id,
        )
        if is_new:
            entities_created += 1

        # Create amenity facts
        for amenity in prop.get('amenities', []):
            amenity_normalized = amenity.strip().lower()
            if not amenity_normalized:
                continue

            predicate = f"has_amenity:{amenity_normalized}"

            # Check if this exact fact already exists (idempotent)
            existing = KnowledgeFact.objects.filter(
                subject_entity=entity,
                predicate=predicate,
                is_current=True,
            ).first()

            if not existing:
                KnowledgeFact.objects.create(
                    subject_entity=entity,
                    predicate=predicate,
                    object_value="true",
                    source_type='ai_inference',
                    source_id=source_id,
                    confidence_score=AI_INFERENCE_CONFIDENCE,
                    is_current=True,
                    created_by_id=user_id,
                )
                facts_created += 1

        # Create attribute facts
        for attr_key, attr_value in prop.get('attributes', {}).items():
            if attr_value is None:
                continue

            attr_key_normalized = attr_key.strip().lower().replace(' ', '_')
            value_str = str(attr_value).strip()
            if not value_str:
                continue

            predicate = f"has_attribute:{attr_key_normalized}"

            # Check existing — supersede if value changed
            existing = KnowledgeFact.objects.filter(
                subject_entity=entity,
                predicate=predicate,
                is_current=True,
            ).first()

            if existing:
                if existing.object_value == value_str:
                    continue  # Idempotent — same value
                # Supersede old fact
                new_fact = KnowledgeFact.objects.create(
                    subject_entity=entity,
                    predicate=predicate,
                    object_value=value_str,
                    source_type='ai_inference',
                    source_id=source_id,
                    confidence_score=AI_INFERENCE_CONFIDENCE,
                    is_current=True,
                    created_by_id=user_id,
                )
                existing.is_current = False
                existing.superseded_by = new_fact
                existing.save(update_fields=['is_current', 'superseded_by'])
                facts_created += 1
            else:
                KnowledgeFact.objects.create(
                    subject_entity=entity,
                    predicate=predicate,
                    object_value=value_str,
                    source_type='ai_inference',
                    source_id=source_id,
                    confidence_score=AI_INFERENCE_CONFIDENCE,
                    is_current=True,
                    created_by_id=user_id,
                )
                facts_created += 1

        # Create relationship fact: property → linked_to → project
        rel_predicate = "linked_to_project"
        existing_rel = KnowledgeFact.objects.filter(
            subject_entity=entity,
            predicate=rel_predicate,
            object_entity=project_entity,
            is_current=True,
        ).first()
        if not existing_rel:
            KnowledgeFact.objects.create(
                subject_entity=entity,
                predicate=rel_predicate,
                object_entity=project_entity,
                source_type='ai_inference',
                source_id=source_id,
                confidence_score=AI_INFERENCE_CONFIDENCE,
                is_current=True,
                created_by_id=user_id,
            )
            facts_created += 1

    return facts_created, entities_created
