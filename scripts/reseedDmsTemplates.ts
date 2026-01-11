/**
 * Reseed a handful of DMS templates with doc_type_options after the refactor.
 *
 * Usage: npx ts-node --transpile-only scripts/reseedDmsTemplates.ts
 */

import { neon } from '@neondatabase/serverless';

type TemplateSeed = {
  template_name: string;
  description: string;
  doc_type_options: string[];
  is_default: boolean;
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = neon(url);
  const workspace = await sql<{ workspace_id: number }[]>`
    SELECT workspace_id
    FROM landscape.dms_workspaces
    ORDER BY is_default DESC, workspace_id ASC
    LIMIT 1
  `;

  if (!workspace[0]) {
    throw new Error('No workspace found to reseed templates');
  }

  const workspaceId = workspace[0].workspace_id;

  const seeds: TemplateSeed[] = [
    {
      template_name: 'Default',
      description: 'Standard document types',
      doc_type_options: [
        'general',
        'contract',
        'invoice',
        'report',
        'drawing',
        'permit',
        'correspondence',
        'proposal',
        'budget',
        'schedule'
      ],
      is_default: true
    },
    {
      template_name: 'Valuation',
      description: 'Valuation/underwriting document types',
      doc_type_options: [
        'Agreement',
        'Title',
        'Closing',
        'Correspondence',
        'Loan Documents',
        'Operations',
        'Sets',
        'Lease',
        'Other Research',
        'Reports, Studies',
        'Entity Documents',
        'Other',
        'Invoice'
      ],
      is_default: false
    }
  ];

  for (const seed of seeds) {
    if (seed.is_default) {
      await sql`
        UPDATE landscape.dms_templates
        SET is_default = false
        WHERE workspace_id = ${workspaceId}
      `;
    }

    const existing = await sql<{ template_id: number }[]>`
      SELECT template_id
      FROM landscape.dms_templates
      WHERE workspace_id = ${workspaceId}
        AND template_name = ${seed.template_name}
      LIMIT 1
    `;

    if (existing[0]) {
      await sql`
        UPDATE landscape.dms_templates
        SET
          description = ${seed.description},
          doc_type_options = ${seed.doc_type_options},
          is_default = ${seed.is_default},
          updated_at = NOW()
        WHERE template_id = ${existing[0].template_id}
      `;
    } else {
      await sql`
        INSERT INTO landscape.dms_templates (
          template_name,
          workspace_id,
          description,
          doc_type_options,
          is_default
        ) VALUES (
          ${seed.template_name},
          ${workspaceId},
          ${seed.description},
          ${seed.doc_type_options},
          ${seed.is_default}
        )
      `;
    }
  }

  console.log('Reseed complete for workspace', workspaceId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
