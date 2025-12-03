/**
 * Phase Measurements Aggregation
 * Aggregates parcel-level data (units, acres, front feet) to phase level
 * for use in the Planning Budget grid.
 */

import { sql } from '@/lib/db';

export interface PhaseMeasurements {
  division_id: number;
  phase_name: string;
  total_units: number;
  total_acres: number;
  total_front_feet: number;
}

/**
 * Fetch phase measurements aggregated from parcel data.
 *
 * Data flow:
 * - Budget items reference phases via division_id (tbl_division tier=2)
 * - tbl_division.display_name maps to tbl_phase.phase_name
 * - tbl_parcel contains units_total, acres_gross, lot_width linked by phase_id
 *
 * Front feet formula: SUM(units_total × lot_width) per phase
 */
export async function getPhaseMeasurements(
  projectId: number
): Promise<Map<number, PhaseMeasurements>> {
  const rows = await sql<PhaseMeasurements[]>`
    SELECT
      d.division_id::int as division_id,
      d.display_name as phase_name,
      COALESCE(SUM(p.units_total), 0)::int as total_units,
      COALESCE(SUM(p.acres_gross), 0)::int as total_acres,
      COALESCE(SUM(p.units_total * COALESCE(p.lot_width, 0)), 0)::int as total_front_feet
    FROM landscape.tbl_division d
    JOIN landscape.tbl_phase ph
      ON ph.phase_name = d.display_name
      AND ph.project_id = d.project_id
    LEFT JOIN landscape.tbl_parcel p
      ON p.phase_id = ph.phase_id
    WHERE d.project_id = ${projectId}
      AND d.tier = 2
    GROUP BY d.division_id, d.display_name
  `;

  const map = new Map<number, PhaseMeasurements>();
  rows.forEach(row => map.set(row.division_id, row));
  return map;
}

/**
 * Check if any phase in the project has front feet data.
 * Used to conditionally show the Frt Ft column.
 */
export async function projectHasFrontFeet(projectId: number): Promise<boolean> {
  const result = await sql<[{ has_ff: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM landscape.tbl_division d
      JOIN landscape.tbl_phase ph
        ON ph.phase_name = d.display_name
        AND ph.project_id = d.project_id
      JOIN landscape.tbl_parcel p
        ON p.phase_id = ph.phase_id
      WHERE d.project_id = ${projectId}
        AND d.tier = 2
        AND p.lot_width IS NOT NULL
        AND p.lot_width > 0
        AND p.units_total IS NOT NULL
        AND p.units_total > 0
    ) as has_ff
  `;
  return result[0]?.has_ff ?? false;
}
