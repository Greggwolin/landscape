/**
 * DMS Audit Trail Helpers
 * Utilities for tracking profile changes and document history
 */

import { sql } from './db';

export interface ProfileAudit {
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

/**
 * Calculate diff between two profile objects
 * Returns array of field names that changed
 */
export function calculateProfileDiff(
  oldProfile: Record<string, any>,
  newProfile: Record<string, any>
): string[] {
  const changedFields: string[] = [];
  const allKeys = new Set([
    ...Object.keys(oldProfile || {}),
    ...Object.keys(newProfile || {}),
  ]);

  for (const key of allKeys) {
    const oldValue = oldProfile?.[key];
    const newValue = newProfile?.[key];

    // Deep comparison via JSON stringify
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Create audit log entry for profile change
 */
export async function logProfileChange(
  docId: number,
  oldProfile: Record<string, any>,
  newProfile: Record<string, any>,
  changedBy?: number,
  reason?: string,
  changeType: string = 'profile_update'
): Promise<ProfileAudit> {
  const changedFields = calculateProfileDiff(oldProfile, newProfile);

  if (changedFields.length === 0) {
    console.log(`ℹ️ No changes detected for document ${docId}, skipping audit`);
    // Return a stub audit record
    return {
      audit_id: 0,
      doc_id: docId,
      changed_by: changedBy,
      change_type: 'no_change',
      old_profile_json: oldProfile,
      new_profile_json: newProfile,
      changed_fields: [],
      change_reason: reason,
      created_at: new Date().toISOString(),
    };
  }

  const result = await sql<ProfileAudit[]>`
    INSERT INTO landscape.dms_profile_audit (
      doc_id,
      changed_by,
      change_type,
      old_profile_json,
      new_profile_json,
      changed_fields,
      change_reason
    )
    VALUES (
      ${docId},
      ${changedBy || null},
      ${changeType},
      ${JSON.stringify(oldProfile)},
      ${JSON.stringify(newProfile)},
      ${changedFields},
      ${reason || null}
    )
    RETURNING *
  `;

  console.log(
    `📝 Audit log created for document ${docId}: ${changedFields.length} fields changed`
  );

  return result[0];
}

/**
 * Get audit history for a document
 */
export async function getDocumentAuditHistory(
  docId: number,
  limit: number = 50
): Promise<ProfileAudit[]> {
  return await sql<ProfileAudit[]>`
    SELECT *
    FROM landscape.dms_profile_audit
    WHERE doc_id = ${docId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

/**
 * Get recent audit activity across all documents
 */
export async function getRecentAuditActivity(
  projectId?: number,
  limit: number = 100
): Promise<
  Array<
    ProfileAudit & {
      doc_name: string;
      doc_type: string;
    }
  >
> {
  if (projectId) {
    return await sql<
      Array<
        ProfileAudit & {
          doc_name: string;
          doc_type: string;
        }
      >
    >`
      SELECT a.*, d.doc_name, d.doc_type
      FROM landscape.dms_profile_audit a
      JOIN landscape.core_doc d ON a.doc_id = d.doc_id
      WHERE d.project_id = ${projectId}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
  } else {
    return await sql<
      Array<
        ProfileAudit & {
          doc_name: string;
          doc_type: string;
        }
      >
    >`
      SELECT a.*, d.doc_name, d.doc_type
      FROM landscape.dms_profile_audit a
      JOIN landscape.core_doc d ON a.doc_id = d.doc_id
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
  }
}

/**
 * Generate human-readable change summary
 */
export function generateChangeSummary(audit: ProfileAudit): string {
  if (audit.changed_fields.length === 0) {
    return 'No changes';
  }

  const fieldSummaries: string[] = [];

  for (const field of audit.changed_fields) {
    const oldValue = audit.old_profile_json?.[field];
    const newValue = audit.new_profile_json?.[field];

    // Format values for display
    const oldDisplay = formatValue(oldValue);
    const newDisplay = formatValue(newValue);

    if (oldValue === undefined || oldValue === null) {
      fieldSummaries.push(`Added ${field}: ${newDisplay}`);
    } else if (newValue === undefined || newValue === null) {
      fieldSummaries.push(`Removed ${field}`);
    } else {
      fieldSummaries.push(`Changed ${field} from ${oldDisplay} to ${newDisplay}`);
    }
  }

  return fieldSummaries.join(', ');
}

/**
 * Format value for human-readable display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).substring(0, 50) + '...';
  }
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...';
  }
  return String(value);
}

/**
 * Revert document to a previous profile state
 * (Admin function - use with caution)
 */
export async function revertToAuditState(
  docId: number,
  auditId: number,
  revertedBy?: number,
  reason?: string
): Promise<void> {
  // Get the audit record
  const audit = await sql<ProfileAudit[]>`
    SELECT * FROM landscape.dms_profile_audit
    WHERE audit_id = ${auditId} AND doc_id = ${docId}
  `;

  if (audit.length === 0) {
    throw new Error(`Audit record ${auditId} not found for document ${docId}`);
  }

  const targetProfile = audit[0].old_profile_json;

  // Get current profile
  const currentDoc = await sql<Array<{ profile_json: Record<string, any> }>>`
    SELECT profile_json FROM landscape.core_doc
    WHERE doc_id = ${docId}
  `;

  if (currentDoc.length === 0) {
    throw new Error(`Document ${docId} not found`);
  }

  // Update document with reverted profile
  await sql`
    UPDATE landscape.core_doc
    SET profile_json = ${JSON.stringify(targetProfile)},
        updated_at = NOW(),
        updated_by = ${revertedBy || null}
    WHERE doc_id = ${docId}
  `;

  // Log the revert action
  await logProfileChange(
    docId,
    currentDoc[0].profile_json,
    targetProfile,
    revertedBy,
    reason || `Reverted to audit state ${auditId}`,
    'profile_revert'
  );

  console.log(`⏮️ Reverted document ${docId} to audit state ${auditId}`);
}
