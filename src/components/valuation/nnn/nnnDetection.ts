/**
 * NNN SLB Detection Utility
 *
 * Determines whether a project should use the NNN Sale-Leaseback
 * valuation workflow based on project properties.
 *
 * Detection checks (any match → NNN workflow):
 * 1. property_subtype contains 'NNN' or 'SALE_LEASEBACK' (explicit codes)
 * 2. property_subtype is 'SINGLE-TENANT RETAIL' or similar (descriptive label)
 * 3. project_type_code is 'RET' with single-tenant indicator in subtype
 *
 * Future: may also check recovery_structure on tbl_lease.
 *
 * @version 1.1
 * @created 2026-02-23
 * @updated 2026-02-23 - Added single-tenant retail detection
 * @session QT2
 */

/** Explicit NNN subtype codes */
const NNN_SUBTYPES = new Set([
  'RETAIL_NNN',
  'NNN',
  'NNN_SLB',
  'SALE_LEASEBACK',
]);

/** Subtypes that imply single-tenant NNN when project_type is Retail */
const SINGLE_TENANT_PATTERNS = [
  'SINGLE-TENANT',
  'SINGLE_TENANT',
  'SINGLETENANT',
  'NET LEASE',
  'NET_LEASE',
  'TRIPLE NET',
];

/**
 * Check if a project uses the NNN SLB workflow
 */
export function isNNNProject(project: {
  property_subtype?: string;
  project_type_code?: string;
  [key: string]: unknown;
}): boolean {
  const subtype = (project.property_subtype || '').toUpperCase().trim();
  const typeCode = (project.project_type_code || '').toUpperCase().trim();

  // Direct NNN subtype match
  if (NNN_SUBTYPES.has(subtype)) return true;

  // Compound subtype containing "NNN" (e.g. "RET_NNN")
  if (subtype.includes('NNN')) return true;

  // Single-tenant retail is fundamentally NNN
  if (typeCode === 'RET' || subtype.includes('RETAIL')) {
    if (SINGLE_TENANT_PATTERNS.some((p) => subtype.includes(p))) return true;
  }

  return false;
}
