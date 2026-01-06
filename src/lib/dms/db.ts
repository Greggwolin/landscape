/**
 * DMS Database Utilities
 * Thin SQL tagged helper using Neon client
 */

import { sql } from '@/lib/db';

// Re-export the sql helper for DMS operations
export { sql };

// DMS-specific database types
export interface DMSWorkspace {
  workspace_id: number;
  workspace_code: string;
  workspace_name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DMSAttribute {
  attr_id: number;
  attr_key: string;
  attr_name: string;
  attr_type: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'enum' | 'lookup' | 'tags' | 'json';
  attr_description?: string;
  is_required: boolean;
  is_searchable: boolean;
  validation_rules: Record<string, any>;
  enum_values?: string[];
  lookup_table?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DMSTemplate {
  template_id: number;
  template_name: string;
  workspace_id: number;
  project_id?: number;
  doc_type?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreDoc {
  doc_id: number;
  project_id: number;
  workspace_id: number;
  phase_id?: number;
  parcel_id?: number;
  doc_name: string;
  doc_type: string;
  discipline?: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  storage_uri: string;
  version_no: number;
  parent_doc_id?: number;
  status: 'draft' | 'processing' | 'indexed' | 'failed' | 'archived';
  profile_json: Record<string, any>;
  doc_date?: string;
  contract_value?: number;
  priority?: string;
  tags?: string[];
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface DMSProfileAudit {
  audit_id: number;
  doc_id: number;
  changed_by?: number;
  change_type: string;
  old_profile_json: Record<string, any>;
  new_profile_json: Record<string, any>;
  changed_fields: string[];
  change_reason?: string;
  created_at: string;
}

export interface DMSExtractQueue {
  queue_id: number;
  doc_id: number;
  extract_type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  extracted_data: Record<string, any>;
  created_at: string;
  processed_at?: string;
}

// Helper functions for common DMS operations
export const dmsDb = {
  /**
   * Get default workspace
   */
  async getDefaultWorkspace(): Promise<DMSWorkspace | null> {
    const result = await sql<DMSWorkspace[]>`
      SELECT * FROM landscape.dms_workspaces 
      WHERE is_default = true 
      LIMIT 1
    `;
    return result[0] || null;
  },

  /**
   * Get workspace by code
   */
  async getWorkspaceByCode(code: string): Promise<DMSWorkspace | null> {
    const result = await sql<DMSWorkspace[]>`
      SELECT * FROM landscape.dms_workspaces 
      WHERE workspace_code = ${code}
    `;
    return result[0] || null;
  },

  /**
   * Get attributes for template
   */
  async getTemplateAttributes(templateId: number): Promise<(DMSAttribute & { is_required: boolean; display_order: number })[]> {
    return await sql<(DMSAttribute & { is_required: boolean; display_order: number })[]>`
      SELECT a.*, ta.is_required, ta.display_order
      FROM landscape.dms_attributes a
      JOIN landscape.dms_template_attributes ta ON a.attr_id = ta.attr_id
      WHERE ta.template_id = ${templateId}
      ORDER BY ta.display_order, a.attr_name
    `;
  },

  /**
   * Get default template for workspace/project
   */
  async getDefaultTemplate(workspaceId: number, projectId?: number, docType?: string): Promise<DMSTemplate | null> {
    const result = await sql<DMSTemplate[]>`
      SELECT * FROM landscape.dms_templates
      WHERE workspace_id = ${workspaceId}
        AND (project_id IS NULL OR project_id = ${projectId || null})
        AND (doc_type IS NULL OR doc_type = ${docType || null})
        AND is_default = true
      ORDER BY 
        CASE WHEN project_id IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN doc_type IS NOT NULL THEN 1 ELSE 2 END
      LIMIT 1
    `;
    return result[0] || null;
  },

  /**
   * Create document with profile validation
   */
  async createDocument(doc: Omit<CoreDoc, 'doc_id' | 'created_at' | 'updated_at'>): Promise<CoreDoc> {
    const result = await sql<CoreDoc[]>`
      INSERT INTO landscape.core_doc (
        project_id, workspace_id, phase_id, parcel_id, parcel_id_int, doc_name, doc_type,
        discipline, mime_type, file_size_bytes, sha256_hash, storage_uri,
        version_no, parent_doc_id, status, profile_json, created_by, updated_by
      )
      VALUES (
        ${doc.project_id}, ${doc.workspace_id}, ${doc.phase_id || null}, ${doc.parcel_id || null}, ${doc.parcel_id || null},
        ${doc.doc_name}, ${doc.doc_type}, ${doc.discipline || null}, ${doc.mime_type},
        ${doc.file_size_bytes}, ${doc.sha256_hash}, ${doc.storage_uri}, ${doc.version_no},
        ${doc.parent_doc_id || null}, ${doc.status}, ${JSON.stringify(doc.profile_json)},
        ${doc.created_by || null}, ${doc.updated_by || null}
      )
      RETURNING *
    `;
    return result[0];
  },

  /**
   * Update document profile with audit trail
   */
  async updateDocumentProfile(
    docId: number,
    newProfile: Record<string, any>,
    changedBy?: number,
    changeReason?: string
  ): Promise<CoreDoc> {
    // Get current document
    const currentDoc = await sql<CoreDoc[]>`
      SELECT * FROM landscape.core_doc WHERE doc_id = ${docId}
    `;
    
    if (!currentDoc[0]) {
      throw new Error(`Document ${docId} not found`);
    }

    const oldProfile = currentDoc[0].profile_json;
    
    // Determine changed fields
    const changedFields: string[] = [];
    for (const key in newProfile) {
      if (JSON.stringify(oldProfile[key]) !== JSON.stringify(newProfile[key])) {
        changedFields.push(key);
      }
    }

    // Update document
    const updatedDoc = await sql<CoreDoc[]>`
      UPDATE landscape.core_doc 
      SET profile_json = ${JSON.stringify(newProfile)},
          updated_by = ${changedBy || null},
          updated_at = NOW()
      WHERE doc_id = ${docId}
      RETURNING *
    `;

    // Create audit entry
    if (changedFields.length > 0) {
      await sql`
        INSERT INTO landscape.dms_profile_audit (
          doc_id, changed_by, change_type, old_profile_json, 
          new_profile_json, changed_fields, change_reason
        )
        VALUES (
          ${docId}, ${changedBy || null}, 'profile_update',
          ${JSON.stringify(oldProfile)}, ${JSON.stringify(newProfile)},
          ${changedFields}, ${changeReason || null}
        )
      `;
    }

    return updatedDoc[0];
  },

  /**
   * Search documents with faceting (database fallback)
   */
  async searchDocuments(params: {
    query?: string;
    projectId?: number;
    workspaceId?: number;
    docType?: string;
    discipline?: string;
    status?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const normalizeParcelId = <T extends { parcel_id?: number; parcel_id_int?: number }>(row: T) => ({
      ...row,
      parcel_id: row.parcel_id_int ?? row.parcel_id,
    });

    // For now, return a simple query with the most common filters
    // This is a fallback when Meilisearch is not available
    
    if (params.projectId && params.workspaceId) {
      const rows = await sql`
        SELECT 
          d.*,
          p.project_name,
          w.workspace_name,
          ph.phase_no::text as phase_no
        FROM landscape.core_doc d
        LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
        LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
        LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
        WHERE d.status != 'archived'
          AND d.project_id = ${params.projectId}
          AND d.workspace_id = ${params.workspaceId}
          ${params.query ? sql`AND (d.doc_name ILIKE ${'%' + params.query + '%'} OR d.doc_type ILIKE ${'%' + params.query + '%'})` : sql``}
          ${params.docType ? sql`AND d.doc_type = ${params.docType}` : sql``}
          ${params.discipline ? sql`AND d.discipline = ${params.discipline}` : sql``}
          ${params.status ? sql`AND d.status = ${params.status}` : sql``}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows.map(normalizeParcelId);
    } else if (params.projectId) {
      const rows = await sql`
        SELECT 
          d.*,
          p.project_name,
          w.workspace_name,
          ph.phase_no::text as phase_no
        FROM landscape.core_doc d
        LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
        LEFT JOIN landscape.dms_workspaces w ON d.workspace_id = w.workspace_id
        LEFT JOIN landscape.tbl_phase ph ON d.phase_id = ph.phase_id
        WHERE d.status != 'archived'
          AND d.project_id = ${params.projectId}
          ${params.query ? sql`AND (d.doc_name ILIKE ${'%' + params.query + '%'} OR d.doc_type ILIKE ${'%' + params.query + '%'})` : sql``}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return rows.map(normalizeParcelId);
    } else {
      // Return empty result set if no project specified
      return [];
    }
  }
};
