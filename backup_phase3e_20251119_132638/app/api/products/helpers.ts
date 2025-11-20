import { sql } from '@/lib/db';

export type ProductRow = {
  product_id: number;
  code: string;
  lot_w_ft: number | null;
  lot_d_ft: number | null;
  lot_area_sf: number | null;
  type_id: number | null;
  type_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const mapProductRow = (row: ProductRow) => ({
  product_id: Number(row.product_id),
  code: row.code,
  lot_w_ft: row.lot_w_ft !== null ? Number(row.lot_w_ft) : null,
  lot_d_ft: row.lot_d_ft !== null ? Number(row.lot_d_ft) : null,
  lot_area_sf: row.lot_area_sf !== null ? Number(row.lot_area_sf) : null,
  type_id: row.type_id !== null ? Number(row.type_id) : null,
  type_name: row.type_name,
  is_active: Boolean(row.is_active),
  created_at: row.created_at,
  updated_at: row.updated_at
});

export async function fetchPlanningEfficiency(): Promise<number | null> {
  const result = await sql.query(
    `SELECT default_planning_efficiency FROM landscape.core_planning_standards WHERE is_active = true ORDER BY standard_id LIMIT 1`
  );
  const value = result.rows?.[0]?.default_planning_efficiency;
  return value !== undefined && value !== null ? Number(value) : null;
}

export const computeDensity = (product: ReturnType<typeof mapProductRow>, efficiency: number | null) => {
  if (!product.lot_area_sf || product.lot_area_sf <= 0 || efficiency === null) {
    return null;
  }
  const density = (43560 / product.lot_area_sf) * efficiency;
  return Math.round(density * 100) / 100;
};

export async function getProductByIdDirect(id: number) {
  const result = await sql.query<ProductRow>(
    `
      SELECT
        p.product_id,
        p.code,
        p.lot_w_ft,
        p.lot_d_ft,
        p.lot_area_sf,
        p.type_id,
        t.name AS type_name,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM landscape.res_lot_product p
      LEFT JOIN landscape.lu_type t ON t.type_id = p.type_id
      WHERE p.product_id = $1
      LIMIT 1;
    `,
    [id]
  );

  const row = result.rows?.[0];
  return row ? mapProductRow(row) : null;
}
