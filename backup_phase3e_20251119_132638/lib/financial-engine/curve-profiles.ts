import { sql } from '@/lib/db';

export interface CurveProfileSummary {
  curveId: number | null;
  curveCode: string;
  curveName: string;
  description: string | null;
}

function normalizeCurveCode(code?: string | null): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed === '' ? null : trimmed;
}

export async function fetchCurveProfileSummary(opts: {
  curveId?: number | null;
  curveCode?: string | null;
}): Promise<CurveProfileSummary | null> {
  const normalizedCode = normalizeCurveCode(opts.curveCode);

  if (!opts.curveId && !normalizedCode) {
    return null;
  }

  const rows = await sql<CurveProfileSummary>`
    SELECT
      curve_id AS "curveId",
      curve_code AS "curveCode",
      curve_name AS "curveName",
      description
    FROM landscape.core_fin_curve_profile
    WHERE (${opts.curveId ?? null} IS NOT NULL AND curve_id = ${opts.curveId ?? null})
       OR (${normalizedCode ?? null} IS NOT NULL AND curve_code = ${normalizedCode ?? null})
    ORDER BY curve_id
    LIMIT 1
  `;

  if (rows.length > 0) {
    const result = rows[0];
    return {
      curveId: result.curveId,
      curveCode: (result.curveCode || '').toUpperCase(),
      curveName: result.curveName,
      description: result.description
    };
  }

  if (normalizedCode) {
    return {
      curveId: opts.curveId ?? null,
      curveCode: normalizedCode,
      curveName: normalizedCode,
      description: null
    };
  }

  return null;
}
