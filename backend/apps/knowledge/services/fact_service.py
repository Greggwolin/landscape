"""
Fact Service - Create and manage knowledge facts with provenance and supersession.

This service creates facts (assertions) linking entities with predicates and values.
It handles versioning via supersession - when a fact value changes, the old fact
is marked as superseded and a new fact is created.

Usage:
    fact_service = FactService(user_id=1)
    fact = fact_service.create_assumption_fact(
        project_id=123,
        assumption_key='cap_rate',
        value='0.055',
        source_type='document_extract',
        source_id=456  # document_id
    )
"""

import logging
from decimal import Decimal
from datetime import date
from typing import Optional, Any, List, Dict

from django.db import transaction
from django.utils import timezone

from ..models import KnowledgeEntity, KnowledgeFact
from .entity_sync_service import EntitySyncService

logger = logging.getLogger(__name__)


class FactService:
    """
    Service for creating and managing knowledge facts.

    Implements supersession logic: when a fact value changes for the same
    subject+predicate, the old fact is marked as superseded and linked
    to the new fact.
    """

    def __init__(self, user_id: Optional[int] = None):
        """
        Initialize the service.

        Args:
            user_id: Optional user ID for created_by tracking
        """
        self.user_id = user_id
        self.entity_sync = EntitySyncService(user_id=user_id)

    @transaction.atomic
    def create_assumption_fact(
        self,
        project_id: int,
        assumption_key: str,
        value: Any,
        source_type: str,
        source_id: Optional[int] = None,
        confidence_score: Decimal = Decimal('1.00'),
        valid_from: Optional[date] = None,
        valid_to: Optional[date] = None,
        project_name: Optional[str] = None,
        project_type_code: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
    ) -> Optional[KnowledgeFact]:
        """
        Create an assumption fact for a project.

        Handles supersession: if a current fact exists for the same
        project+assumption_key with a different value, it's superseded.

        Args:
            project_id: The project's ID
            assumption_key: The assumption field name (e.g., 'cap_rate', 'vacancy_rate')
            value: The assumption value
            source_type: One of 'user_input', 'document_extract', 'ai_inference', etc.
            source_id: ID of source record (document_id, extraction_id, etc.)
            confidence_score: Confidence level 0.00-1.00
            valid_from: When this fact became true (default: today)
            valid_to: When this fact expires
            project_name: Project name (for entity creation if needed)
            project_type_code: Property type code
            city: City (for entity metadata)
            state: State (for entity metadata)

        Returns:
            KnowledgeFact if created, None if skipped (idempotent - same value exists)
        """
        # Normalize value to string
        value_str = str(value) if value is not None else ''

        # Ensure project entity exists
        project_entity = self.entity_sync.get_or_create_project_entity(
            project_id=project_id,
            project_name=project_name or f"Project {project_id}",
            project_type_code=project_type_code,
            city=city,
            state=state,
        )

        # Build predicate
        predicate = f"has_assumption:{assumption_key}"

        # Check for existing current fact
        existing_fact = KnowledgeFact.objects.filter(
            subject_entity=project_entity,
            predicate=predicate,
            is_current=True
        ).first()

        if existing_fact:
            # If same value, skip (idempotent)
            if existing_fact.object_value == value_str:
                logger.debug(f"Fact unchanged, skipping: {predicate} = {value_str}")
                return None

            # Different value - supersede the old fact
            logger.info(f"Superseding fact: {predicate} {existing_fact.object_value} -> {value_str}")

        # Create new fact
        new_fact = KnowledgeFact.objects.create(
            subject_entity=project_entity,
            predicate=predicate,
            object_value=value_str,
            source_type=source_type,
            source_id=source_id,
            confidence_score=confidence_score,
            valid_from=valid_from or date.today(),
            valid_to=valid_to,
            is_current=True,
            created_by_id=self.user_id,
        )

        # Supersede old fact if it existed
        if existing_fact:
            existing_fact.is_current = False
            existing_fact.superseded_by = new_fact
            existing_fact.save(update_fields=['is_current', 'superseded_by'])

        logger.info(f"Created fact {new_fact.fact_id}: {predicate} = {value_str}")
        return new_fact

    def create_extracted_fact(
        self,
        project_id: int,
        assumption_key: str,
        value: Any,
        source_document_id: int,
        confidence_score: Decimal = Decimal('0.85'),
        project_name: Optional[str] = None,
        project_type_code: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
    ) -> Optional[KnowledgeFact]:
        """
        Create an assumption fact sourced from document extraction.

        Convenience wrapper around create_assumption_fact with document provenance.
        """
        return self.create_assumption_fact(
            project_id=project_id,
            assumption_key=assumption_key,
            value=value,
            source_type='document_extract',
            source_id=source_document_id,
            confidence_score=confidence_score,
            project_name=project_name,
            project_type_code=project_type_code,
            city=city,
            state=state,
        )

    @transaction.atomic
    def create_comparable_facts(
        self,
        comp_entity: KnowledgeEntity,
        comp_type: str,
        values: Dict[str, Any],
        source_document_id: Optional[int] = None,
        confidence_score: Decimal = Decimal('0.90'),
    ) -> List[KnowledgeFact]:
        """
        Create facts for a comparable property entity.

        Args:
            comp_entity: Property entity for the comp
            comp_type: 'sale', 'rent', or 'expense'
            values: Comparable field values
            source_document_id: Optional document ID
            confidence_score: Fact confidence

        Returns:
            List of created KnowledgeFact objects
        """
        predicate_map = {
            'sale': {
                'sale_price': 'sale_price',
                'price_per_unit': 'price_per_unit',
                'price_per_sf': 'price_per_sf',
                'cap_rate': 'sale_cap_rate',
                'sale_date': 'sale_date',
                'grm': 'grm',
            },
            'rent': {
                'asking_rent': 'asking_rent',
                'effective_rent': 'effective_rent',
                'rent_per_sf': 'rent_per_sf',
                'concessions': 'concessions',
                'avg_rent': 'asking_rent',
                'avg_rent_psf': 'rent_per_sf',
            },
            'expense': {
                'total_expenses': 'total_expenses',
                'expenses_per_unit': 'expenses_per_unit',
                'expenses_per_sf': 'expenses_per_sf',
                'expense_ratio': 'expense_ratio',
            },
        }

        predicates = predicate_map.get(comp_type, {})
        if not predicates:
            return []

        facts: List[KnowledgeFact] = []
        for value_key, predicate in predicates.items():
            if value_key not in values or values[value_key] is None:
                continue

            fact = KnowledgeFact.objects.create(
                subject_entity=comp_entity,
                predicate=predicate,
                object_value=str(values[value_key]),
                source_type='document_extract' if source_document_id else 'user_input',
                source_id=source_document_id,
                confidence_score=confidence_score,
                valid_from=date.today(),
                is_current=True,
                created_by_id=self.user_id,
            )
            facts.append(fact)

        return facts

    @transaction.atomic
    def create_relationship_fact(
        self,
        subject_entity: KnowledgeEntity,
        predicate: str,
        object_entity: KnowledgeEntity,
        source_type: str,
        source_id: Optional[int] = None,
        confidence_score: Decimal = Decimal('1.00'),
    ) -> Optional[KnowledgeFact]:
        """
        Create an entity-to-entity relationship fact.

        E.g., project -> located_in -> market

        Args:
            subject_entity: The subject entity
            predicate: Relationship type (e.g., 'located_in', 'extracted_from')
            object_entity: The object entity
            source_type: Source of this fact
            source_id: ID of source record
            confidence_score: Confidence level

        Returns:
            KnowledgeFact if created, None if skipped
        """
        # Check for existing current fact
        existing_fact = KnowledgeFact.objects.filter(
            subject_entity=subject_entity,
            predicate=predicate,
            object_entity=object_entity,
            is_current=True
        ).first()

        if existing_fact:
            # Same relationship exists, skip
            logger.debug(f"Relationship fact unchanged, skipping: {predicate}")
            return None

        # Check if there's a different object for this predicate (supersession)
        old_fact = KnowledgeFact.objects.filter(
            subject_entity=subject_entity,
            predicate=predicate,
            is_current=True
        ).exclude(object_entity=object_entity).first()

        new_fact = KnowledgeFact.objects.create(
            subject_entity=subject_entity,
            predicate=predicate,
            object_entity=object_entity,
            source_type=source_type,
            source_id=source_id,
            confidence_score=confidence_score,
            valid_from=date.today(),
            is_current=True,
            created_by_id=self.user_id,
        )

        if old_fact:
            old_fact.is_current = False
            old_fact.superseded_by = new_fact
            old_fact.save(update_fields=['is_current', 'superseded_by'])
            logger.info(f"Superseded relationship: {predicate}")

        logger.info(f"Created relationship fact {new_fact.fact_id}: {predicate}")
        return new_fact

    def get_current_facts_for_project(
        self,
        project_id: int,
        predicate_filter: Optional[str] = None
    ) -> List[KnowledgeFact]:
        """
        Get all current (non-superseded) facts for a project.

        Args:
            project_id: The project's ID
            predicate_filter: Optional predicate prefix filter (e.g., 'has_assumption')

        Returns:
            List of current KnowledgeFact objects
        """
        project_entity = self.entity_sync.get_project_entity(project_id)
        if not project_entity:
            return []

        queryset = KnowledgeFact.objects.filter(
            subject_entity=project_entity,
            is_current=True
        )

        if predicate_filter:
            queryset = queryset.filter(predicate__startswith=predicate_filter)

        return list(queryset.select_related('object_entity').order_by('predicate'))

    def get_fact_history(
        self,
        project_id: int,
        assumption_key: str
    ) -> List[KnowledgeFact]:
        """
        Get full history of an assumption fact including superseded versions.

        Args:
            project_id: The project's ID
            assumption_key: The assumption field name

        Returns:
            List of KnowledgeFact objects ordered by created_at desc
        """
        project_entity = self.entity_sync.get_project_entity(project_id)
        if not project_entity:
            return []

        predicate = f"has_assumption:{assumption_key}"

        return list(
            KnowledgeFact.objects.filter(
                subject_entity=project_entity,
                predicate=predicate
            ).order_by('-created_at')
        )

    def record_user_correction(
        self,
        fact: KnowledgeFact,
        corrected_value: Any,
        correction_reason: Optional[str] = None
    ) -> KnowledgeFact:
        """
        Record a user correction to a fact, creating a new version.

        Args:
            fact: The fact being corrected
            corrected_value: The corrected value
            correction_reason: Optional reason for correction

        Returns:
            The new corrected fact
        """
        # Extract assumption_key from predicate
        assumption_key = fact.predicate.replace('has_assumption:', '')

        # Get project_id from subject entity metadata
        project_id = fact.subject_entity.metadata.get('project_id')

        if not project_id:
            raise ValueError("Cannot correct fact: no project_id in entity metadata")

        return self.create_assumption_fact(
            project_id=project_id,
            assumption_key=assumption_key,
            value=corrected_value,
            source_type='user_correction',
            source_id=fact.fact_id,  # Reference to original fact
            confidence_score=Decimal('1.00'),  # User corrections are definitive
        )


# Convenience function for quick fact creation
def create_project_fact(
    project_id: int,
    assumption_key: str,
    value: Any,
    source_type: str = 'user_input',
    source_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Optional[KnowledgeFact]:
    """
    Convenience function to create a project assumption fact.

    Args:
        project_id: The project's ID
        assumption_key: The assumption field name
        value: The assumption value
        source_type: Source type
        source_id: Source ID
        user_id: User ID

    Returns:
        KnowledgeFact if created
    """
    service = FactService(user_id=user_id)
    return service.create_assumption_fact(
        project_id=project_id,
        assumption_key=assumption_key,
        value=value,
        source_type=source_type,
        source_id=source_id,
    )
