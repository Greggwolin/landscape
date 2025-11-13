"""
Knowledge Ingestion Service

Converts document extraction results into knowledge entities and facts.
Handles rent rolls, operating statements, and other financial documents.
"""

from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, date
from django.db import transaction
from django.utils import timezone

from ..models import KnowledgeEntity, KnowledgeFact


class KnowledgeIngestionService:
    """
    Service for ingesting document extractions into the knowledge graph.

    Main entry point: ingest_rent_roll()
    """

    def __init__(self, user_id: Optional[int] = None):
        """
        Initialize service.

        Args:
            user_id: User performing the ingestion (for created_by tracking)
        """
        self.user_id = user_id

    @transaction.atomic
    def ingest_rent_roll(
        self,
        doc_id: int,
        extraction_result: Dict,
        project_id: Optional[int] = None
    ) -> Dict:
        """
        Main entry point: Convert rent roll extraction into knowledge entities + facts.

        Args:
            doc_id: CoreDoc ID (source document)
            extraction_result: Output from RentRollExtractor.extract()
                {
                    'property_info': {...},
                    'unit_types': [...],
                    'units': [...],
                    'leases': [...],
                    'quality_score': 0.0-1.0,
                    'validation_warnings': [...]
                }
            project_id: Optional project context

        Returns:
            {
                'entities_created': int,
                'facts_created': int,
                'property_entity_id': int,
                'unit_entity_ids': [int],
                'unit_type_entity_ids': [int]
            }
        """
        result = {
            'entities_created': 0,
            'facts_created': 0,
            'property_entity_id': None,
            'unit_entity_ids': [],
            'unit_type_entity_ids': []
        }

        # Extract components
        property_info = extraction_result.get('property_info', {})
        unit_types = extraction_result.get('unit_types', [])
        units = extraction_result.get('units', [])
        leases = extraction_result.get('leases', [])
        quality_score = extraction_result.get('quality_score', 0.95)

        # Step 1: Get or create property entity
        property_entity = self._get_or_create_property_entity(
            property_info,
            project_id
        )
        result['property_entity_id'] = property_entity.entity_id
        result['entities_created'] += 1

        # Step 2: Create unit type entities (BD/BA aggregations)
        for unit_type_data in unit_types:
            unit_type_entity = self._create_unit_type_entity(
                property_entity,
                unit_type_data
            )
            result['unit_type_entity_ids'].append(unit_type_entity.entity_id)
            result['entities_created'] += 1

            # Create unit type facts (market rent, sqft, etc.)
            facts_created = self._create_unit_type_facts(
                unit_type_entity,
                unit_type_data,
                doc_id,
                quality_score
            )
            result['facts_created'] += facts_created

        # Step 3: Create individual unit entities
        unit_entity_map = {}  # unit_number -> entity
        for unit_data in units:
            unit_entity = self._create_unit_entity(
                property_entity,
                unit_data
            )
            unit_number = unit_data.get('unit_number')
            unit_entity_map[unit_number] = unit_entity
            result['unit_entity_ids'].append(unit_entity.entity_id)
            result['entities_created'] += 1

            # Create unit facts (sqft, occupancy, etc.)
            facts_created = self._create_unit_facts(
                unit_entity,
                unit_data,
                doc_id,
                quality_score
            )
            result['facts_created'] += facts_created

        # Step 4: Create lease facts for occupied units
        for lease_data in leases:
            unit_number = lease_data.get('unit_number')
            unit_entity = unit_entity_map.get(unit_number)

            if not unit_entity:
                continue  # Skip if unit not found

            facts_created = self._create_lease_facts(
                unit_entity,
                lease_data,
                doc_id,
                quality_score
            )
            result['facts_created'] += facts_created

        return result

    def _get_or_create_property_entity(
        self,
        property_info: Dict,
        project_id: Optional[int] = None
    ) -> KnowledgeEntity:
        """
        Get or create property entity.

        Args:
            property_info: {
                'property_name': str,
                'address': str,
                'city': str,
                'state': str,
                'zip': str
            }
            project_id: Project context

        Returns:
            KnowledgeEntity
        """
        property_name = property_info.get('property_name', 'Unknown Property')
        canonical_name = f"property:{property_name}"

        # Try to find existing
        try:
            entity = KnowledgeEntity.objects.get(canonical_name=canonical_name)
            return entity
        except KnowledgeEntity.DoesNotExist:
            pass

        # Create new
        entity = KnowledgeEntity.objects.create(
            entity_type='property',
            entity_subtype='multifamily',  # Assume multifamily for rent rolls
            canonical_name=canonical_name,
            metadata={
                'property_name': property_name,
                'address': property_info.get('address'),
                'city': property_info.get('city'),
                'state': property_info.get('state'),
                'zip': property_info.get('zip'),
                'project_id': project_id
            },
            created_by_id=self.user_id
        )
        return entity

    def _create_unit_entity(
        self,
        property_entity: KnowledgeEntity,
        unit_data: Dict
    ) -> KnowledgeEntity:
        """
        Create individual unit entity.

        Args:
            property_entity: Parent property
            unit_data: {
                'unit_number': str,
                'bedrooms': int,
                'bathrooms': float,
                'sqft': int,
                'is_occupied': bool
            }

        Returns:
            KnowledgeEntity
        """
        unit_number = unit_data.get('unit_number', 'Unknown')
        property_name = property_entity.metadata.get('property_name', 'Unknown')

        canonical_name = f"unit:{property_name}:{unit_number}"

        entity = KnowledgeEntity.objects.create(
            entity_type='unit',
            entity_subtype=f"{unit_data.get('bedrooms', 0)}BD/{unit_data.get('bathrooms', 0)}BA",
            canonical_name=canonical_name,
            metadata={
                'unit_number': unit_number,
                'bedrooms': unit_data.get('bedrooms'),
                'bathrooms': unit_data.get('bathrooms'),
                'sqft': unit_data.get('sqft'),
                'is_occupied': unit_data.get('is_occupied', False),
                'property_entity_id': property_entity.entity_id
            },
            created_by_id=self.user_id
        )

        # Create "located_in" relationship fact
        KnowledgeFact.objects.create(
            subject_entity=entity,
            predicate='located_in',
            object_entity=property_entity,
            source_type='document_extract',
            source_id=property_entity.entity_id,  # Reference property for now
            confidence_score=Decimal('1.00'),
            is_current=True,
            created_by_id=self.user_id
        )

        return entity

    def _create_unit_facts(
        self,
        unit_entity: KnowledgeEntity,
        unit_data: Dict,
        doc_id: int,
        quality_score: float
    ) -> int:
        """
        Create facts about a unit (sqft, occupancy, etc.).

        Args:
            unit_entity: Unit entity
            unit_data: Unit data from extraction
            doc_id: Source document ID
            quality_score: Extraction quality (0.0-1.0)

        Returns:
            Number of facts created
        """
        facts_created = 0

        # Sqft fact
        if unit_data.get('sqft'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='square_feet',
                object_value=str(unit_data['sqft']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Occupancy fact
        KnowledgeFact.objects.create(
            subject_entity=unit_entity,
            predicate='is_occupied',
            object_value=str(unit_data.get('is_occupied', False)),
            source_type='document_extract',
            source_id=doc_id,
            confidence_score=Decimal(str(quality_score)),
            is_current=True,
            created_by_id=self.user_id
        )
        facts_created += 1

        # Bedrooms fact
        if unit_data.get('bedrooms') is not None:
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='bedrooms',
                object_value=str(unit_data['bedrooms']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Bathrooms fact
        if unit_data.get('bathrooms') is not None:
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='bathrooms',
                object_value=str(unit_data['bathrooms']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        return facts_created

    def _create_lease_facts(
        self,
        unit_entity: KnowledgeEntity,
        lease_data: Dict,
        doc_id: int,
        quality_score: float
    ) -> int:
        """
        Create lease-related facts (rent, dates, subsidy, etc.).

        Args:
            unit_entity: Unit entity
            lease_data: {
                'unit_number': str,
                'monthly_rent': float,
                'lease_start': date,
                'lease_end': date,
                'tenant_name': str,
                'subsidy_amount': float
            }
            doc_id: Source document ID
            quality_score: Extraction quality

        Returns:
            Number of facts created
        """
        facts_created = 0

        # Monthly rent fact (with temporal validity)
        if lease_data.get('monthly_rent'):
            valid_from = lease_data.get('lease_start')
            valid_to = lease_data.get('lease_end')

            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='monthly_rent',
                object_value=str(lease_data['monthly_rent']),
                valid_from=valid_from,
                valid_to=valid_to,
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Lease start date
        if lease_data.get('lease_start'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='lease_start_date',
                object_value=str(lease_data['lease_start']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Lease end date
        if lease_data.get('lease_end'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='lease_end_date',
                object_value=str(lease_data['lease_end']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Subsidy amount
        if lease_data.get('subsidy_amount'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='subsidy_amount',
                object_value=str(lease_data['subsidy_amount']),
                valid_from=lease_data.get('lease_start'),
                valid_to=lease_data.get('lease_end'),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Tenant name
        if lease_data.get('tenant_name'):
            KnowledgeFact.objects.create(
                subject_entity=unit_entity,
                predicate='tenant_name',
                object_value=lease_data['tenant_name'],
                valid_from=lease_data.get('lease_start'),
                valid_to=lease_data.get('lease_end'),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        return facts_created

    def _create_unit_type_entity(
        self,
        property_entity: KnowledgeEntity,
        unit_type_data: Dict
    ) -> KnowledgeEntity:
        """
        Create unit type entity (aggregated BD/BA type).

        Args:
            property_entity: Parent property
            unit_type_data: {
                'unit_type': '2BD/2BA',
                'count': 50,
                'avg_market_rent': 2500.00,
                'avg_sqft': 1200
            }

        Returns:
            KnowledgeEntity
        """
        unit_type = unit_type_data.get('unit_type', 'Unknown')
        property_name = property_entity.metadata.get('property_name', 'Unknown')

        canonical_name = f"unit_type:{property_name}:{unit_type}"

        entity = KnowledgeEntity.objects.create(
            entity_type='unit_type',
            entity_subtype=unit_type,
            canonical_name=canonical_name,
            metadata={
                'unit_type': unit_type,
                'unit_count': unit_type_data.get('count', 0),
                'avg_market_rent': unit_type_data.get('avg_market_rent'),
                'avg_sqft': unit_type_data.get('avg_sqft'),
                'property_entity_id': property_entity.entity_id
            },
            created_by_id=self.user_id
        )

        # Create "type_of" relationship
        KnowledgeFact.objects.create(
            subject_entity=entity,
            predicate='type_of',
            object_entity=property_entity,
            source_type='document_extract',
            source_id=property_entity.entity_id,
            confidence_score=Decimal('1.00'),
            is_current=True,
            created_by_id=self.user_id
        )

        return entity

    def _create_unit_type_facts(
        self,
        unit_type_entity: KnowledgeEntity,
        unit_type_data: Dict,
        doc_id: int,
        quality_score: float
    ) -> int:
        """
        Create facts about a unit type (market rent, avg sqft, etc.).

        Args:
            unit_type_entity: Unit type entity
            unit_type_data: Unit type data from extraction
            doc_id: Source document ID
            quality_score: Extraction quality

        Returns:
            Number of facts created
        """
        facts_created = 0

        # Average market rent
        if unit_type_data.get('avg_market_rent'):
            KnowledgeFact.objects.create(
                subject_entity=unit_type_entity,
                predicate='avg_market_rent',
                object_value=str(unit_type_data['avg_market_rent']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Average sqft
        if unit_type_data.get('avg_sqft'):
            KnowledgeFact.objects.create(
                subject_entity=unit_type_entity,
                predicate='avg_square_feet',
                object_value=str(unit_type_data['avg_sqft']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        # Unit count
        if unit_type_data.get('count'):
            KnowledgeFact.objects.create(
                subject_entity=unit_type_entity,
                predicate='unit_count',
                object_value=str(unit_type_data['count']),
                source_type='document_extract',
                source_id=doc_id,
                confidence_score=Decimal(str(quality_score)),
                is_current=True,
                created_by_id=self.user_id
            )
            facts_created += 1

        return facts_created
