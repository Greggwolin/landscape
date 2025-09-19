#!/usr/bin/env node

/**
 * Seed Growth Rate Assumptions in NeonDB
 *
 * This script creates default growth rate assumptions in the tbl_assumptionrule table.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

const DEFAULT_GROWTH_RATE_ASSUMPTIONS = [
  {
    rule_category: 'DEVELOPMENT_COSTS',
    rule_key: 'DEVELOPMENT_COSTS_GLOBAL',
    rule_value: JSON.stringify({
      globalRate: "2.75%",
      steps: [
        { step: 1, period: 1, rate: "2.0%", periods: 16, thru: 16 },
        { step: 2, period: 17, rate: "3.0%", periods: 24, thru: 40 },
        { step: 3, period: 41, rate: "2.5%", periods: 20, thru: 44 },
        { step: 4, period: 45, rate: "2.0%", periods: "E", thru: 180 }
      ],
      impact: {
        dollarAmount: "$12.3M",
        percentOfProject: "24.1%",
        irrImpact: "-210"
      },
      tabs: [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    })
  },
  {
    rule_category: 'PRICE_APPRECIATION',
    rule_key: 'PRICE_APPRECIATION_GLOBAL',
    rule_value: JSON.stringify({
      globalRate: "3.8%",
      steps: [
        { step: 1, period: 1, rate: "4.5%", periods: 12, thru: 12 },
        { step: 2, period: 13, rate: "3.8%", periods: 24, thru: 36 },
        { step: 3, period: 37, rate: "3.2%", periods: 24, thru: 60 }
      ],
      impact: {
        dollarAmount: "$27.1M",
        percentOfProject: "18.7%",
        irrImpact: "+380"
      },
      tabs: [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    })
  },
  {
    rule_category: 'SALES_ABSORPTION',
    rule_key: 'SALES_ABSORPTION_GLOBAL',
    rule_value: JSON.stringify({
      globalRate: "7.5/mo",
      steps: [
        { step: 1, period: 1, rate: "8/mo", periods: 24, thru: 24 },
        { step: 2, period: 25, rate: "12/mo", periods: 36, thru: 60 },
        { step: 3, period: 61, rate: "6/mo", periods: 24, thru: 84 },
        { step: 4, period: 85, rate: "4/mo", periods: "E", thru: 180 }
      ],
      impact: {
        dollarAmount: "$45.2M",
        percentOfProject: "31.2%",
        irrImpact: "+430"
      },
      tabs: [
        { label: "Steps", content: "step-based" },
        { label: "Sensitivity", content: "sensitivity" },
        { label: "History", content: "historical" }
      ]
    })
  }
];

async function seedGrowthRates() {
  console.log('Starting growth rate assumptions seed...');

  try {
    // Check if table exists and has the expected structure
    const tableCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tbl_assumptionrule'
      AND table_schema = 'landscape'
      ORDER BY ordinal_position;
    `;

    if (tableCheck.length === 0) {
      throw new Error('Table tbl_assumptionrule does not exist in landscape schema');
    }

    console.log('Table structure:', tableCheck);

    // Insert default assumptions
    for (const assumption of DEFAULT_GROWTH_RATE_ASSUMPTIONS) {
      try {
        // Check if this rule already exists
        const existing = await sql`
          SELECT rule_id
          FROM landscape.tbl_assumptionrule
          WHERE rule_key = ${assumption.rule_key}
          LIMIT 1
        `;

        if (existing.length > 0) {
          console.log(`⚠️  Rule ${assumption.rule_key} already exists, skipping...`);
          continue;
        }

        // Insert new rule
        const result = await sql`
          INSERT INTO landscape.tbl_assumptionrule (rule_category, rule_key, rule_value)
          VALUES (${assumption.rule_category}, ${assumption.rule_key}, ${assumption.rule_value})
          RETURNING rule_id, rule_category, rule_key
        `;

        console.log(`✅ Created ${assumption.rule_category} assumption (ID: ${result[0].rule_id})`);

      } catch (insertError) {
        console.error(`❌ Failed to insert ${assumption.rule_key}:`, insertError.message);
      }
    }

    // Verify the insertions
    const allRules = await sql`
      SELECT rule_id, rule_category, rule_key
      FROM landscape.tbl_assumptionrule
      WHERE rule_category IN ('DEVELOPMENT_COSTS', 'PRICE_APPRECIATION', 'SALES_ABSORPTION')
      ORDER BY rule_category, rule_key
    `;

    console.log('\n📊 Growth rate assumptions in database:');
    allRules.forEach(rule => {
      console.log(`  - ${rule.rule_category}: ${rule.rule_key} (ID: ${rule.rule_id})`);
    });

    console.log('\n✅ Growth rate assumptions seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding growth rates:', error);
    process.exit(1);
  }
}

// Run the seeding
seedGrowthRates().catch(console.error);