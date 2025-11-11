/**
 * Fix Orphaned Container IDs in Budget Items
 *
 * This script identifies budget items with container_ids that don't belong
 * to their project's container hierarchy and provides options to fix them.
 *
 * Usage:
 *   npx tsx scripts/fix-orphaned-containers.ts [project_id]
 */

import { sql } from '@/lib/db';

interface OrphanedBudgetItem {
  fact_id: number;
  project_id: number;
  container_id: number;
  amount: number;
  notes: string | null;
  category_l1_name: string | null;
  category_l2_name: string | null;
}

interface ValidContainer {
  container_id: number;
  container_level: number;
  display_name: string;
  container_code: string;
  parent_container_id: number | null;
}

async function findOrphanedItems(projectId?: number) {
  const whereClause = projectId
    ? sql`AND fb.project_id = ${projectId}`
    : sql``;

  const orphanedItems = await sql<OrphanedBudgetItem[]>`
    SELECT
      fb.fact_id,
      fb.project_id,
      fb.container_id,
      fb.amount,
      fb.notes,
      c1.name AS category_l1_name,
      c2.name AS category_l2_name
    FROM landscape.core_fin_fact_budget fb
    LEFT JOIN landscape.core_container c ON fb.container_id = c.container_id
    LEFT JOIN landscape.core_budget_category c1 ON fb.category_l1_id = c1.category_id
    LEFT JOIN landscape.core_budget_category c2 ON fb.category_l2_id = c2.category_id
    WHERE fb.container_id IS NOT NULL
      AND (c.container_id IS NULL OR c.project_id != fb.project_id)
      ${whereClause}
    ORDER BY fb.project_id, fb.fact_id
  `;

  return orphanedItems;
}

async function getValidContainers(projectId: number) {
  const containers = await sql<ValidContainer[]>`
    SELECT
      container_id,
      container_level,
      display_name,
      container_code,
      parent_container_id
    FROM landscape.core_container
    WHERE project_id = ${projectId}
      AND is_active = true
    ORDER BY container_level, sort_order, display_name
  `;

  return containers;
}

async function setToProjectLevel(factIds: number[]) {
  const result = await sql`
    UPDATE landscape.core_fin_fact_budget
    SET container_id = NULL
    WHERE fact_id = ANY(${factIds})
    RETURNING fact_id
  `;

  return result.length;
}

async function remapContainers(oldContainerId: number, newContainerId: number, projectId: number) {
  const result = await sql`
    UPDATE landscape.core_fin_fact_budget
    SET container_id = ${newContainerId}
    WHERE project_id = ${projectId}
      AND container_id = ${oldContainerId}
    RETURNING fact_id
  `;

  return result.length;
}

async function main() {
  const projectIdArg = process.argv[2];
  const projectId = projectIdArg ? parseInt(projectIdArg, 10) : undefined;

  console.log('🔍 Searching for orphaned container references...\n');

  const orphanedItems = await findOrphanedItems(projectId);

  if (orphanedItems.length === 0) {
    console.log('✅ No orphaned container references found!');
    return;
  }

  console.log(`❌ Found ${orphanedItems.length} budget items with orphaned container references:\n`);

  // Group by project
  const byProject = orphanedItems.reduce((acc, item) => {
    if (!acc[item.project_id]) {
      acc[item.project_id] = [];
    }
    acc[item.project_id].push(item);
    return acc;
  }, {} as Record<number, OrphanedBudgetItem[]>);

  // Display summary
  for (const [pid, items] of Object.entries(byProject)) {
    console.log(`\n📦 Project ${pid}: ${items.length} orphaned items`);

    // Group by container_id to show which containers are referenced
    const byContainer = items.reduce((acc, item) => {
      if (!acc[item.container_id]) {
        acc[item.container_id] = [];
      }
      acc[item.container_id].push(item);
      return acc;
    }, {} as Record<number, OrphanedBudgetItem[]>);

    for (const [cid, containerItems] of Object.entries(byContainer)) {
      console.log(`  - Container ${cid}: ${containerItems.length} items`);
      containerItems.slice(0, 3).forEach(item => {
        const category = [item.category_l1_name, item.category_l2_name]
          .filter(Boolean)
          .join(' > ') || 'No category';
        console.log(`    • fact_id ${item.fact_id}: ${category} - $${item.amount?.toLocaleString() || 0}`);
      });
      if (containerItems.length > 3) {
        console.log(`    ... and ${containerItems.length - 3} more`);
      }
    }

    // Show valid containers for this project
    console.log(`\n  📋 Valid containers for Project ${pid}:`);
    const validContainers = await getValidContainers(parseInt(pid));

    const areas = validContainers.filter(c => c.container_level === 1);
    const phases = validContainers.filter(c => c.container_level === 2);
    const parcels = validContainers.filter(c => c.container_level === 3);

    if (areas.length > 0) {
      console.log(`    Areas (${areas.length}):`);
      areas.forEach(c => console.log(`      - ${c.display_name} (ID: ${c.container_id})`));
    }
    if (phases.length > 0) {
      console.log(`    Phases (${phases.length}):`);
      phases.forEach(c => console.log(`      - ${c.display_name} (ID: ${c.container_id})`));
    }
    if (parcels.length > 0) {
      console.log(`    Parcels (${parcels.length}):`);
      parcels.slice(0, 5).forEach(c => console.log(`      - ${c.display_name} (ID: ${c.container_id})`));
      if (parcels.length > 5) {
        console.log(`      ... and ${parcels.length - 5} more`);
      }
    }
  }

  console.log('\n\n📝 To fix these issues, you can:');
  console.log('   1. Set orphaned items to Project-Level (container_id = NULL)');
  console.log('   2. Remap specific container IDs to valid containers');
  console.log('\n💡 Example SQL commands:');
  console.log('   -- Set all orphaned items in project 7 to project-level:');
  console.log('   UPDATE landscape.core_fin_fact_budget SET container_id = NULL');
  console.log('   WHERE project_id = 7 AND container_id IN (483, 488);');
  console.log('\n   -- Or remap container 488 to phase 485 in project 7:');
  console.log('   UPDATE landscape.core_fin_fact_budget SET container_id = 485');
  console.log('   WHERE project_id = 7 AND container_id = 488;');
  console.log('\n   See scripts/fix-orphaned-container-ids.sql for more options.');
}

main()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
