"""
Entity Sync Service - Get-or-create canonical entities.

This service ensures that canonical entities exist for projects, documents,
markets, and other objects that need knowledge graph representation.

Usage:
    sync_service = EntitySyncService(user_id=1)
    project_entity = sync_service.get_or_create_project_entity(
        project_id=123,
        project_name="My Project",
        project_type_code="MF"
    )
"""

import logging
from typing import Optional, Dict, Any

from django.db import transaction

from ..models import KnowledgeEntity

logger = logging.getLogger(__name__)


class EntitySyncService:
    """
    Service for creating and retrieving canonical entities.

    Uses get_or_create pattern with canonical_name as the unique key.
    All operations are idempotent - calling twice with same inputs returns same entity.
    """

    def __init__(self, user_id: Optional[int] = None):
        """
        Initialize the service.

        Args:
            user_id: Optional user ID for created_by tracking
        """
        self.user_id = user_id

    def get_or_create_project_entity(
        self,
        project_id: int,
        project_name: str,
        project_type_code: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        **extra_metadata
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for a project.

        Args:
            project_id: The project's ID
            project_name: Display name of the project
            project_type_code: Property type (MF, LAND, OFF, RET, etc.)
            city: City location
            state: State location
            **extra_metadata: Additional metadata fields (submarket, msa, etc.)

        Returns:
            KnowledgeEntity for the project

        Canonical name format: "project:{project_id}"
        """
        canonical_name = f"project:{project_id}"

        metadata = {
            'project_id': project_id,
            'project_name': project_name,
            'project_type_code': project_type_code,
            'city': city,
            'state': state,
            **extra_metadata
        }
        # Remove None values
        metadata = {k: v for k, v in metadata.items() if v is not None}

        entity, created = KnowledgeEntity.objects.get_or_create(
            canonical_name=canonical_name,
            defaults={
                'entity_type': 'project',
                'entity_subtype': project_type_code,
                'metadata': metadata,
                'created_by_id': self.user_id
            }
        )

        if created:
            logger.info(f"Created project entity: {canonical_name}")
        else:
            # Update metadata if entity already exists (project details may have changed)
            needs_update = False

            # Update subtype if changed
            if project_type_code and entity.entity_subtype != project_type_code:
                entity.entity_subtype = project_type_code
                needs_update = True

            # Merge metadata (preserve existing, update with new)
            if entity.metadata != metadata:
                entity.metadata = {**entity.metadata, **metadata}
                needs_update = True

            if needs_update:
                entity.save()
                logger.info(f"Updated project entity: {canonical_name}")

        return entity

    def get_or_create_document_entity(
        self,
        doc_id: int,
        doc_name: str,
        doc_type: Optional[str] = None,
        project_id: Optional[int] = None,
        **extra_metadata
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for a document.

        Args:
            doc_id: The document's ID
            doc_name: Display name of the document
            doc_type: Document type (om, rent_roll, t12, appraisal, etc.)
            project_id: Associated project ID
            **extra_metadata: Additional metadata fields

        Returns:
            KnowledgeEntity for the document

        Canonical name format: "document:{doc_id}"
        """
        canonical_name = f"document:{doc_id}"

        metadata = {
            'doc_id': doc_id,
            'doc_name': doc_name,
            'doc_type': doc_type,
            'project_id': project_id,
            **extra_metadata
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        entity, created = KnowledgeEntity.objects.get_or_create(
            canonical_name=canonical_name,
            defaults={
                'entity_type': 'document',
                'entity_subtype': doc_type,
                'metadata': metadata,
                'created_by_id': self.user_id
            }
        )

        if created:
            logger.info(f"Created document entity: {canonical_name}")

        return entity

    def get_or_create_market_entity(
        self,
        city: str,
        state: str,
        submarket: Optional[str] = None,
        msa: Optional[str] = None,
        **extra_metadata
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for a market/submarket.

        Args:
            city: City name
            state: State abbreviation
            submarket: Submarket name (optional)
            msa: MSA name (optional)
            **extra_metadata: Additional metadata fields

        Returns:
            KnowledgeEntity for the market

        Canonical name format:
            - With submarket: "market:{city}:{state}:{submarket}"
            - Without submarket: "market:{city}:{state}"
        """
        # Normalize inputs
        city_normalized = city.strip().lower()
        state_normalized = state.strip().upper()

        if submarket:
            submarket_normalized = submarket.strip().lower()
            canonical_name = f"market:{city_normalized}:{state_normalized}:{submarket_normalized}"
            entity_subtype = 'submarket'
        else:
            canonical_name = f"market:{city_normalized}:{state_normalized}"
            entity_subtype = 'city'

        metadata = {
            'city': city,
            'state': state,
            'city_normalized': city_normalized,
            'state_normalized': state_normalized,
            'submarket': submarket,
            'msa': msa,
            **extra_metadata
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        entity, created = KnowledgeEntity.objects.get_or_create(
            canonical_name=canonical_name,
            defaults={
                'entity_type': 'market',
                'entity_subtype': entity_subtype,
                'metadata': metadata,
                'created_by_id': self.user_id
            }
        )

        if created:
            logger.info(f"Created market entity: {canonical_name}")

        return entity

    def get_or_create_assumption_type_entity(
        self,
        assumption_key: str,
        category: Optional[str] = None,
        **extra_metadata
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for an assumption type.

        This represents the TYPE of assumption (e.g., "cap_rate", "vacancy_rate"),
        not a specific value. Used for tracking what kinds of assumptions exist.

        Args:
            assumption_key: The assumption field name
            category: Category (income, expense, valuation, etc.)
            **extra_metadata: Additional metadata fields

        Returns:
            KnowledgeEntity for the assumption type

        Canonical name format: "assumption_type:{assumption_key}"
        """
        canonical_name = f"assumption_type:{assumption_key}"

        metadata = {
            'assumption_key': assumption_key,
            'category': category,
            **extra_metadata
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        entity, created = KnowledgeEntity.objects.get_or_create(
            canonical_name=canonical_name,
            defaults={
                'entity_type': 'assumption',
                'entity_subtype': category,
                'metadata': metadata,
                'created_by_id': self.user_id
            }
        )

        if created:
            logger.info(f"Created assumption type entity: {canonical_name}")

        return entity

    def get_project_entity(self, project_id: int) -> Optional[KnowledgeEntity]:
        """
        Get existing project entity, if it exists.

        Args:
            project_id: The project's ID

        Returns:
            KnowledgeEntity or None if not found
        """
        try:
            return KnowledgeEntity.objects.get(canonical_name=f"project:{project_id}")
        except KnowledgeEntity.DoesNotExist:
            return None

    def get_document_entity(self, doc_id: int) -> Optional[KnowledgeEntity]:
        """
        Get existing document entity, if it exists.

        Args:
            doc_id: The document's ID

        Returns:
            KnowledgeEntity or None if not found
        """
        try:
            return KnowledgeEntity.objects.get(canonical_name=f"document:{doc_id}")
        except KnowledgeEntity.DoesNotExist:
            return None

    @staticmethod
    def get_entity_by_canonical_name(canonical_name: str) -> Optional[KnowledgeEntity]:
        """
        Get an entity by its canonical name.

        Args:
            canonical_name: The entity's canonical name

        Returns:
            KnowledgeEntity or None if not found
        """
        try:
            return KnowledgeEntity.objects.get(canonical_name=canonical_name)
        except KnowledgeEntity.DoesNotExist:
            return None

    # -------------------------------------------------------------------------
    # Convenience methods that accept Django model objects directly
    # -------------------------------------------------------------------------

    def ensure_project_entity(self, project) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity from a Project model instance.

        This is a convenience wrapper around get_or_create_project_entity
        that extracts fields from the Project model.

        Args:
            project: A Project model instance

        Returns:
            KnowledgeEntity for the project
        """
        return self.get_or_create_project_entity(
            project_id=project.project_id,
            project_name=project.project_name,
            project_type_code=getattr(project, 'project_type_code', None),
            city=getattr(project, 'jurisdiction_city', None),
            state=getattr(project, 'jurisdiction_state', None),
            property_subtype=getattr(project, 'property_subtype', None),
            county=getattr(project, 'jurisdiction_county', None),
        )

    def ensure_property_entity(
        self,
        name: str,
        address: str,
        city: str,
        state: str,
        property_type: str,
        **kwargs
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for a property (comps, subject properties).
        Uses normalized address for deduplication.

        Args:
            name: Property name
            address: Street address
            city: City
            state: State
            property_type: Property type code
            **kwargs: Additional metadata (unit_count, year_built, etc.)

        Returns:
            KnowledgeEntity for the property
        """
        normalized_address = address.lower().strip() if address else ''
        canonical_name = f"property:{normalized_address}" if normalized_address else f"property:{name}"

        metadata = {
            'name': name,
            'address': address,
            'normalized_address': normalized_address,
            'city': city,
            'state': state,
            'property_type': property_type,
            **kwargs
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        entity, created = KnowledgeEntity.objects.get_or_create(
            canonical_name=canonical_name,
            defaults={
                'entity_type': 'property',
                'entity_subtype': property_type,
                'metadata': metadata,
                'created_by_id': self.user_id
            }
        )

        if created:
            logger.info(f"Created property entity: {canonical_name}")

        return entity

    def ensure_document_entity(
        self,
        document_id: int,
        document_name: str,
        document_type: str,
        **kwargs
    ) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for an uploaded document.

        Convenience wrapper around get_or_create_document_entity.

        Args:
            document_id: Document ID
            document_name: Document display name
            document_type: Document type (om, rent_roll, t12, etc.)
            **kwargs: Additional metadata

        Returns:
            KnowledgeEntity for the document
        """
        return self.get_or_create_document_entity(
            doc_id=document_id,
            doc_name=document_name,
            doc_type=document_type,
            **kwargs
        )

    def ensure_market_entity(self, msa: str, submarket: str = None) -> KnowledgeEntity:
        """
        Get or create a KnowledgeEntity for a market/submarket.

        Convenience wrapper with simpler signature.

        Args:
            msa: MSA name
            submarket: Submarket name (optional)

        Returns:
            KnowledgeEntity for the market
        """
        # Extract city/state from MSA if possible, otherwise use MSA as city
        # Common format: "Phoenix-Mesa-Scottsdale, AZ"
        city = msa
        state = ''
        if ', ' in msa:
            parts = msa.rsplit(', ', 1)
            city = parts[0]
            state = parts[1] if len(parts) > 1 else ''

        return self.get_or_create_market_entity(
            city=city,
            state=state,
            submarket=submarket,
            msa=msa
        )
