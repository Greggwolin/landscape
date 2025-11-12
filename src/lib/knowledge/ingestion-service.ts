/**
 * Knowledge Ingestion Service
 *
 * Date: November 12, 2025
 * Session: GR47
 * Purpose: Convert extracted data into knowledge entities and facts
 */

import { sql } from '@/lib/db';
import type {
  KnowledgeEntity,
  KnowledgeFact,
  CreateEntityInput,
  CreateFactInput,
  ExtractionResult,
  IngestionResult,
  UnitData,
  LeaseData,
  UnitTypeData,
} from './types';

export class KnowledgeIngestionService {
  /**
   * Convert rent roll extraction into knowledge base
   */
  async ingestRentRoll(
    docId: number,
    extractionResult: ExtractionResult,
    projectId: number
  ): Promise<IngestionResult> {
    try {
      // 1. Create/get property entity
      const propertyEntity = await this.getOrCreatePropertyEntity(
        extractionResult.property_info,
        extractionResult.extraction_metadata,
        projectId
      );

      // 2. Create unit entities and facts
      const unitEntities: KnowledgeEntity[] = [];
      for (const unitData of extractionResult.units) {
        const unitEntity = await this.createUnitEntity(propertyEntity, unitData);
        unitEntities.push(unitEntity);

        // Create facts about this unit
        await this.createUnitFacts(unitEntity, unitData, docId);
      }

      // 3. Create lease facts
      const leaseFacts: KnowledgeFact[] = [];
      for (const leaseData of extractionResult.leases) {
        const facts = await this.createLeaseFacts(
          propertyEntity,
          unitEntities,
          leaseData,
          docId
        );
        leaseFacts.push(...facts);
      }

      // 4. Create unit type aggregations
      const unitTypeEntities: KnowledgeEntity[] = [];
      for (const utData of extractionResult.unit_types) {
        const utEntity = await this.createUnitTypeEntity(propertyEntity, utData);
        unitTypeEntities.push(utEntity);

        await this.createUnitTypeFacts(utEntity, utData, docId);
      }

      return {
        success: true,
        property_entity_id: propertyEntity.entity_id,
        units_created: unitEntities.length,
        unit_types_created: unitTypeEntities.length,
        lease_facts_created: leaseFacts.length,
      };
    } catch (error) {
      console.error('Knowledge ingestion error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Create or retrieve property entity
   */
  private async getOrCreatePropertyEntity(
    propertyInfo: any,
    metadata: any,
    projectId: number
  ): Promise<KnowledgeEntity> {
    const propertyName = propertyInfo?.property_name || `Property ${projectId}`;

    // Try to find existing property
    const existing = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_type = 'property'
        AND canonical_name = ${propertyName}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new property entity
    const result = await sql<KnowledgeEntity[]>`
      INSERT INTO landscape.knowledge_entities (
        entity_type,
        entity_subtype,
        canonical_name,
        metadata
      ) VALUES (
        'property',
        'multifamily',
        ${propertyName},
        ${JSON.stringify({
          project_id: projectId,
          address: propertyInfo?.property_address,
          total_units: metadata?.total_units,
          source: 'rent_roll_extraction',
        })}
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Create unit entity
   */
  private async createUnitEntity(
    propertyEntity: KnowledgeEntity,
    unitData: UnitData
  ): Promise<KnowledgeEntity> {
    const unitNumber = unitData.unit_number;
    const canonicalName = `${propertyEntity.canonical_name} - Unit ${unitNumber}`;

    // Check if already exists
    const existing = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_type = 'unit'
        AND canonical_name = ${canonicalName}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new unit entity
    const result = await sql<KnowledgeEntity[]>`
      INSERT INTO landscape.knowledge_entities (
        entity_type,
        entity_subtype,
        canonical_name,
        metadata
      ) VALUES (
        'unit',
        ${unitData.is_commercial ? 'commercial' : 'residential'},
        ${canonicalName},
        ${JSON.stringify({
          property_entity_id: propertyEntity.entity_id,
          unit_number: unitNumber,
          bedrooms: unitData.bedroom_count,
          bathrooms: unitData.bathroom_count,
          sqft: unitData.square_feet,
          is_commercial: unitData.is_commercial || false,
        })}
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Create facts about a unit
   */
  private async createUnitFacts(
    unitEntity: KnowledgeEntity,
    unitData: UnitData,
    docId: number
  ): Promise<void> {
    // Occupancy status fact
    await sql`
      INSERT INTO landscape.knowledge_facts (
        subject_entity_id,
        predicate,
        object_value,
        source_type,
        source_id,
        confidence_score
      ) VALUES (
        ${unitEntity.entity_id},
        'occupancy_status',
        ${unitData.status},
        'document_extract',
        ${docId},
        ${unitData.confidence}
      )
    `;

    // Square footage fact (if present)
    if (unitData.square_feet) {
      await sql`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${unitEntity.entity_id},
          'square_feet',
          ${unitData.square_feet.toString()},
          'document_extract',
          ${docId},
          ${unitData.confidence}
        )
      `;
    }
  }

  /**
   * Create lease facts
   */
  private async createLeaseFacts(
    propertyEntity: KnowledgeEntity,
    unitEntities: KnowledgeEntity[],
    leaseData: LeaseData,
    docId: number
  ): Promise<KnowledgeFact[]> {
    // Find unit entity
    const unitEntity = unitEntities.find(
      (u) => u.metadata.unit_number === leaseData.unit_number
    );

    if (!unitEntity) {
      return [];
    }

    const facts: KnowledgeFact[] = [];

    // Monthly rent fact
    if (leaseData.monthly_rent) {
      const result = await sql<KnowledgeFact[]>`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          valid_from,
          valid_to,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${unitEntity.entity_id},
          'monthly_rent',
          ${leaseData.monthly_rent.toString()},
          ${leaseData.lease_start_date || null},
          ${leaseData.lease_end_date || null},
          'document_extract',
          ${docId},
          ${leaseData.confidence}
        )
        RETURNING *
      `;
      facts.push(result[0]);
    }

    // Lease start date
    if (leaseData.lease_start_date) {
      const result = await sql<KnowledgeFact[]>`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${unitEntity.entity_id},
          'lease_start_date',
          ${leaseData.lease_start_date},
          'document_extract',
          ${docId},
          ${leaseData.confidence}
        )
        RETURNING *
      `;
      facts.push(result[0]);
    }

    // Lease end date
    if (leaseData.lease_end_date) {
      const result = await sql<KnowledgeFact[]>`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${unitEntity.entity_id},
          'lease_end_date',
          ${leaseData.lease_end_date},
          'document_extract',
          ${docId},
          ${leaseData.confidence}
        )
        RETURNING *
      `;
      facts.push(result[0]);
    }

    // Section 8 flag
    if (leaseData.is_section_8) {
      const result = await sql<KnowledgeFact[]>`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${unitEntity.entity_id},
          'subsidy_type',
          'section_8',
          'document_extract',
          ${docId},
          1.0
        )
        RETURNING *
      `;
      facts.push(result[0]);
    }

    // Lease type
    const result = await sql<KnowledgeFact[]>`
      INSERT INTO landscape.knowledge_facts (
        subject_entity_id,
        predicate,
        object_value,
        source_type,
        source_id,
        confidence_score
      ) VALUES (
        ${unitEntity.entity_id},
        'lease_type',
        ${leaseData.lease_type || 'fixed_term'},
        'document_extract',
        ${docId},
        ${leaseData.confidence}
      )
      RETURNING *
    `;
    facts.push(result[0]);

    return facts;
  }

  /**
   * Create unit type entity
   */
  private async createUnitTypeEntity(
    propertyEntity: KnowledgeEntity,
    utData: UnitTypeData
  ): Promise<KnowledgeEntity> {
    const typeName = `${utData.bedroom_count}BR/${utData.bathroom_count}BA`;
    const canonicalName = `${propertyEntity.canonical_name} - ${typeName}`;

    // Check if exists
    const existing = await sql<KnowledgeEntity[]>`
      SELECT * FROM landscape.knowledge_entities
      WHERE entity_type = 'unit_type'
        AND canonical_name = ${canonicalName}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new unit type entity
    const result = await sql<KnowledgeEntity[]>`
      INSERT INTO landscape.knowledge_entities (
        entity_type,
        canonical_name,
        metadata
      ) VALUES (
        'unit_type',
        ${canonicalName},
        ${JSON.stringify({
          property_entity_id: propertyEntity.entity_id,
          bedrooms: utData.bedroom_count,
          bathrooms: utData.bathroom_count,
          unit_count: utData.unit_count,
        })}
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Create facts about unit type
   */
  private async createUnitTypeFacts(
    utEntity: KnowledgeEntity,
    utData: UnitTypeData,
    docId: number
  ): Promise<void> {
    // Market rent fact
    if (utData.market_rent_monthly) {
      await sql`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${utEntity.entity_id},
          'market_rent_monthly',
          ${utData.market_rent_monthly.toString()},
          'document_extract',
          ${docId},
          ${utData.confidence}
        )
      `;
    }

    // Typical square footage
    if (utData.typical_sqft) {
      await sql`
        INSERT INTO landscape.knowledge_facts (
          subject_entity_id,
          predicate,
          object_value,
          source_type,
          source_id,
          confidence_score
        ) VALUES (
          ${utEntity.entity_id},
          'typical_sqft',
          ${utData.typical_sqft.toString()},
          'document_extract',
          ${docId},
          ${utData.confidence}
        )
      `;
    }

    // Unit count
    await sql`
      INSERT INTO landscape.knowledge_facts (
        subject_entity_id,
        predicate,
        object_value,
        source_type,
        source_id,
        confidence_score
      ) VALUES (
        ${utEntity.entity_id},
        'unit_count',
        ${utData.unit_count.toString()},
        'document_extract',
        ${docId},
        1.0
      )
    `;
  }
}
