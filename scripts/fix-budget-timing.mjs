#!/usr/bin/env node
/**
 * Fix budget timing to match phase-specific sale periods
 *
 * Maps:
 * - division_id 628 → Phase 1.1 (month 26)
 * - division_id 629 → Phase 1.2 (month 42)
 * - division_id 630 → Phase 2.1 (month 48)
 * - division_id 631 → Phase 2.2 (month 72-73)
 * - division_id 634 → Phase 4.1 (month 78)
 * - division_id 635 → Phase 4.2 (month 96)
 */

import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function main() {
  console.log('🔧 Fixing budget timing for Peoria Meadows\n');

  const projectId = 9;

  // Division to phase timing mapping (from user's phase schedule)
  const divisionTiming = [
    { division_id: '628', phase: '1.1', start: 1, duration: 25 },    // Phase 1.1: start=1, duration=25, end=25
    { division_id: '629', phase: '1.2', start: 24, duration: 18 },   // Phase 1.2: start=24, duration=18, end=41
    { division_id: '630', phase: '2.1', start: 24, duration: 24 },   // Phase 2.1: start=24, duration=24, end=47
    { division_id: '631', phase: '2.2', start: 42, duration: 21 },   // Phase 2.2: start=42, duration=21, end=62
    { division_id: '634', phase: '4.1', start: 60, duration: 18 },   // Phase 4.1: start=60, duration=18, end=77
    { division_id: '635', phase: '4.2', start: 84, duration: 12 },   // Phase 4.2: start=84, duration=12, end=95
  ];

  console.log('Updating budget item timing by phase:\n');

  for (const { division_id, phase, start, duration } of divisionTiming) {
    const result = await sql`
      UPDATE landscape.core_fin_fact_budget
      SET
        start_period = ${start},
        periods_to_complete = ${duration}
      WHERE project_id = ${projectId}
        AND division_id = ${division_id}
    `;

    console.log(`  ✓ Phase ${phase} (division ${division_id}): ${result.rowCount} items → start=${start}, duration=${duration}`);
  }

  console.log('\n✅ Budget timing updated successfully!\n');

  // Verification
  const verification = await sql`
    SELECT
      division_id,
      start_period,
      periods_to_complete,
      COUNT(*) as item_count
    FROM landscape.core_fin_fact_budget
    WHERE project_id = ${projectId}
      AND division_id IS NOT NULL
    GROUP BY division_id, start_period, periods_to_complete
    ORDER BY division_id
  `;

  console.log('Verification:');
  verification.rows.forEach(row => {
    console.log(`  Division ${row.division_id}: ${row.item_count} items, start=${row.start_period}, duration=${row.periods_to_complete}`);
  });
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
