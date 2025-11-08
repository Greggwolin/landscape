import { sql } from '@/lib/db';

export type TemplateRow = {
  template_id: number;
  category_id: number;
  category_name: string;
  item_name: string;
  default_uom_code: string;
  typical_mid_value: number | null;
  quantity: number | null;
  market_geography: string | null;
  source: string | null;
  as_of_date: string | null;
  project_type_code: string;
  usage_count: number | null;
  last_used_date: string | null;
  is_active: boolean;
  created_from_ai: boolean;
  created_from_project_id: number | null;
  has_benchmarks: boolean;
};

export const templateSelectFields = `
  t.template_id,
  t.category_id,
  c.category_name,
  t.item_name,
  t.default_uom_code,
  t.typical_mid_value,
  t.quantity,
  t.market_geography,
  t.source,
  t.as_of_date,
  t.project_type_code,
  t.usage_count,
  t.last_used_date,
  t.is_active,
  t.created_from_ai,
  t.created_from_project_id,
  EXISTS (
    SELECT 1 FROM landscape.core_template_benchmark_link l
    WHERE l.template_id = t.template_id
  ) AS has_benchmarks
`;

export const allowedTemplateFields = new Set([
  'category_id',
  'item_name',
  'default_uom_code',
  'typical_mid_value',
  'quantity',
  'market_geography',
  'source',
  'as_of_date',
  'project_type_code',
  'usage_count',
  'last_used_date',
  'is_active',
  'created_from_project_id'
]);

const isDatabaseError = (error: unknown): error is { code?: string } =>
  typeof error === 'object' && error !== null && 'code' in error;

export const coerceDecimal = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const coerceInteger = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeTemplatePayload = (body: Record<string, unknown>) => {
  const categoryId = coerceInteger(body.category_id);
  const itemName = typeof body.item_name === 'string' ? body.item_name.trim() : '';
  const defaultUom = typeof body.default_uom_code === 'string' ? body.default_uom_code.trim().toUpperCase() : '';
  if (!categoryId || !itemName || !defaultUom) {
    throw new Error('category_id, item_name, and default_uom_code are required');
  }

  const projectType = typeof body.project_type_code === 'string'
    ? body.project_type_code.trim().toUpperCase()
    : 'LAND';

  return {
    category_id: categoryId,
    item_name: itemName,
    default_uom_code: defaultUom,
    typical_mid_value: coerceDecimal(body.typical_mid_value),
    quantity: coerceDecimal(body.quantity),
    market_geography: typeof body.market_geography === 'string'
      ? body.market_geography.trim() || null
      : null,
    source: typeof body.source === 'string'
      ? body.source.trim() || null
      : null,
    as_of_date: typeof body.as_of_date === 'string' && body.as_of_date
      ? body.as_of_date
      : null,
    project_type_code: projectType || 'LAND',
    usage_count: coerceInteger(body.usage_count) ?? 0,
    last_used_date: typeof body.last_used_date === 'string' ? body.last_used_date : null,
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    created_from_project_id: coerceInteger(body.created_from_project_id),
    created_from_ai: Boolean(body.created_from_ai)
  };
};

export const mapTemplateRow = (row: TemplateRow) => ({
  template_id: Number(row.template_id),
  category_id: Number(row.category_id),
  category_name: row.category_name,
  item_name: row.item_name,
  default_uom_code: row.default_uom_code,
  typical_mid_value: row.typical_mid_value !== null ? Number(row.typical_mid_value) : null,
  quantity: row.quantity !== null ? Number(row.quantity) : null,
  market_geography: row.market_geography,
  source: row.source,
  as_of_date: row.as_of_date,
  project_type_code: row.project_type_code,
  usage_count: row.usage_count !== null ? Number(row.usage_count) : 0,
  last_used_date: row.last_used_date,
  is_active: Boolean(row.is_active),
  created_from_ai: Boolean(row.created_from_ai),
  created_from_project_id: row.created_from_project_id,
  has_benchmarks: Boolean(row.has_benchmarks)
});

export const insertTemplateDirect = async (body: Record<string, unknown>) => {
  const payload = normalizeTemplatePayload(body);
  const values = [
    payload.category_id,
    payload.item_name,
    payload.default_uom_code,
    payload.typical_mid_value,
    payload.quantity,
    payload.market_geography,
    payload.source,
    payload.as_of_date,
    payload.project_type_code,
    payload.usage_count ?? 0,
    payload.last_used_date,
    payload.is_active,
    payload.created_from_project_id,
    payload.created_from_ai
  ];

  const query = `
    INSERT INTO landscape.core_unit_cost_template (
      category_id,
      item_name,
      default_uom_code,
      typical_mid_value,
      quantity,
      market_geography,
      source,
      as_of_date,
      project_type_code,
      usage_count,
      last_used_date,
      is_active,
      created_from_project_id,
      created_from_ai,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    )
    RETURNING ${templateSelectFields};
  `;

  try {
    const result = await sql.query<TemplateRow>(query, values);
    const row = result.rows?.[0];
    if (!row) {
      throw new Error('Insert failed');
    }
    return mapTemplateRow(row);
  } catch (error: unknown) {
    if (isDatabaseError(error) && error.code === '23505') {
      throw new Error('Template already exists for this category/UOM/project type');
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
};
