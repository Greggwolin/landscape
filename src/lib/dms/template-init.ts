import { sql } from '@/lib/dms/db';

export interface TemplateMatch {
  template_id: number;
  template_name: string;
  doc_type_options: string[] | null;
}

type TemplateLookupOptions = {
  projectId?: number;
  workspaceId?: number;
};

const normalize = (value: string | null | undefined) =>
  value ? value.trim().toLowerCase() : null;

/**
 * Find matching DMS template for a project type.
 * Falls back to project-specific, workspace default, or global default.
 */
export async function findDmsTemplate(
  projectType: string,
  options: TemplateLookupOptions = {}
): Promise<TemplateMatch | null> {
  const { projectId, workspaceId } = options;
  const normalizedProjectType = normalize(projectType);

  if (projectId) {
    const projectTemplate = await sql<TemplateMatch[]>`
      SELECT template_id, template_name, doc_type_options
      FROM landscape.dms_templates
      WHERE project_id = ${projectId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
    if (projectTemplate[0]) return projectTemplate[0];
  }

  if (normalizedProjectType) {
    const typeTemplate = await sql<TemplateMatch[]>`
      SELECT template_id, template_name, doc_type_options
      FROM landscape.dms_templates
      WHERE LOWER(template_name) = ${normalizedProjectType}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
    if (typeTemplate[0]) return typeTemplate[0];
  }

  if (workspaceId) {
    const workspaceTemplate = await sql<TemplateMatch[]>`
      SELECT template_id, template_name, doc_type_options
      FROM landscape.dms_templates
      WHERE workspace_id = ${workspaceId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
    if (workspaceTemplate[0]) return workspaceTemplate[0];
  }

  const defaultTemplate = await sql<TemplateMatch[]>`
    SELECT template_id, template_name, doc_type_options
    FROM landscape.dms_templates
    WHERE is_default = true
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return defaultTemplate[0] ?? null;
}

/**
 * Initialize smart filters for a project from template doc types.
 * Smart filters are scoped via query.project_id since the table has no project_id column.
 */
export async function initProjectFilters(
  projectId: number,
  templateId: number
): Promise<void> {
  const template = await sql<{ doc_type_options: string[] | null }[]>`
    SELECT doc_type_options
    FROM landscape.dms_templates
    WHERE template_id = ${templateId}
  `;

  const docTypes = template[0]?.doc_type_options;
  if (!docTypes || docTypes.length === 0) {
    console.warn(`Template ${templateId} has no doc_type_options`);
    return;
  }

  for (const docType of docTypes) {
    const filterName = docType.trim();
    if (!filterName) continue;

    await sql`
      INSERT INTO landscape.core_doc_smartfilter (
        name,
        query,
        is_active,
        created_at,
        updated_at
      )
      SELECT
        ${filterName},
        ${JSON.stringify({ project_id: projectId, doc_type: filterName })},
        true,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM landscape.core_doc_smartfilter
        WHERE name = ${filterName}
          AND query->>'project_id' = ${projectId}::text
          AND query->>'doc_type' = ${filterName}
      )
    `;
  }
}

/**
 * Assign DMS template to a project and initialize filters.
 */
export async function assignDmsTemplate(
  projectId: number,
  projectType: string,
  options: TemplateLookupOptions = {}
): Promise<number | null> {
  const template = await findDmsTemplate(projectType, options);

  if (!template) {
    console.warn(`No DMS template found for project type: ${projectType}`);
    return null;
  }

  await sql`
    UPDATE landscape.tbl_project
    SET dms_template_id = ${template.template_id}
    WHERE project_id = ${projectId}
  `;

  await initProjectFilters(projectId, template.template_id);
  return template.template_id;
}
