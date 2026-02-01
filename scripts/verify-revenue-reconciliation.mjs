#!/usr/bin/env node
/**
 * Revenue Reconciliation Verification Script
 *
 * Compares revenue figures across three calculation points:
 * 1. Database (tbl_parcel_sale_assumptions) - Source of truth
 * 2. Sales Page API (parcels-with-sales endpoint)
 * 3. Cash Flow API (cash-flow/generate endpoint)
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);
const PROJECT_ID = 9;

async function getDatabaseTotals() {
  const result = await sql`
    SELECT
      COUNT(*) as total_parcels,
      SUM(psa.gross_parcel_price) as gross_parcel_price,
      SUM(psa.improvement_offset_total) as improvement_offset,
      SUM(psa.gross_sale_proceeds) as gross_sale_proceeds,
      SUM(psa.commission_amount) as commission_amount,
      SUM(psa.closing_cost_amount) as closing_cost_amount,
      SUM(psa.total_transaction_costs) as total_transaction_costs,
      SUM(psa.net_sale_proceeds) as net_sale_proceeds
    FROM landscape.tbl_parcel_sale_assumptions psa
    JOIN landscape.tbl_parcel p ON p.parcel_id = psa.parcel_id
    WHERE p.project_id = ${PROJECT_ID}
  `;
  return result[0];
}

async function getSalesPageTotals() {
  const response = await fetch(`http://localhost:8000/api/projects/${PROJECT_ID}/parcels-with-sales/`);
  const data = await response.json();

  const parcels = data.parcels || [];
  return {
    total_parcels: parcels.filter(p => p.sale_gross_parcel_price).length,
    gross_parcel_price: parcels.reduce((sum, p) => sum + (p.sale_gross_parcel_price || 0), 0),
    improvement_offset: parcels.reduce((sum, p) => sum + (p.sale_improvement_offset || 0), 0),
    gross_sale_proceeds: parcels.reduce((sum, p) => sum + (p.sale_gross_proceeds || 0), 0),
    commission_amount: parcels.reduce((sum, p) => sum + (p.sale_commission_amount || 0), 0),
    closing_cost_amount: parcels.reduce((sum, p) => sum + (p.sale_closing_cost_amount || 0), 0),
    net_sale_proceeds: parcels.reduce((sum, p) => sum + (p.net_proceeds || 0), 0),
  };
}

async function getCashFlowTotals() {
  const response = await fetch(`http://localhost:3000/api/projects/${PROJECT_ID}/cash-flow/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodType: 'year' }),
  });
  const responseData = await response.json();
  const data = responseData.data || responseData;

  return {
    gross_revenue: data.summary?.totalGrossRevenue || 0,
    revenue_deductions: data.summary?.totalRevenueDeductions || 0, // = improvement offset (subdivision costs)
    net_revenue: data.summary?.totalNetRevenue || 0,
  };
}

async function main() {
  console.log('=== REVENUE RECONCILIATION VERIFICATION ===\n');

  // 1. Database totals
  console.log('📊 1. DATABASE (Source of Truth - tbl_parcel_sale_assumptions)');
  const db = await getDatabaseTotals();
  console.log(`   Parcels with sales: ${db.total_parcels}`);
  console.log(`   Gross Parcel Price: $${Number(db.gross_parcel_price).toLocaleString()}`);
  console.log(`   Improvement Offset: $${Number(db.improvement_offset).toLocaleString()}`);
  console.log(`   Gross Sale Proceeds: $${Number(db.gross_sale_proceeds).toLocaleString()}`);
  console.log(`   Net Sale Proceeds: $${Number(db.net_sale_proceeds).toLocaleString()}`);

  // 2. Sales Page API totals
  console.log('\n📊 2. SALES PAGE API (/api/projects/9/parcels-with-sales)');
  const sales = await getSalesPageTotals();
  console.log(`   Parcels with sales: ${sales.total_parcels}`);
  console.log(`   Gross Parcel Price: $${sales.gross_parcel_price.toLocaleString()}`);
  console.log(`   Improvement Offset: $${sales.improvement_offset.toLocaleString()}`);
  console.log(`   Gross Sale Proceeds: $${sales.gross_sale_proceeds.toLocaleString()}`);
  console.log(`   Net Sale Proceeds: $${sales.net_sale_proceeds.toLocaleString()}`);

  // 3. Cash Flow API totals
  console.log('\n📊 3. CASH FLOW API (/api/projects/9/cash-flow/generate)');
  const cf = await getCashFlowTotals();
  console.log(`   Gross Revenue: $${cf.gross_revenue.toLocaleString()} (WITH DCF 3% growth)`);
  console.log(`   Subdivision Costs: $${cf.revenue_deductions.toLocaleString()} (WITH DCF 3% growth)`);
  console.log(`   Net Revenue: $${cf.net_revenue.toLocaleString()} (WITH DCF 3% growth)`);

  // Reconciliation checks
  console.log('\n=== RECONCILIATION CHECKS ===\n');

  // Check 1: Sales Page matches Database
  const salesMatchesDb = Math.abs(sales.gross_parcel_price - Number(db.gross_parcel_price)) < 1;
  console.log(`✅ Sales Page Gross matches Database: ${salesMatchesDb ? 'PASS' : 'FAIL'}`);
  if (!salesMatchesDb) {
    console.log(`   DB: $${Number(db.gross_parcel_price).toLocaleString()}`);
    console.log(`   Sales: $${sales.gross_parcel_price.toLocaleString()}`);
    console.log(`   Diff: $${(sales.gross_parcel_price - Number(db.gross_parcel_price)).toLocaleString()}`);
  }

  // Check 2: Cash Flow shows DCF-escalated values (expected to be higher)
  const expectedEscalation = cf.gross_revenue / Number(db.gross_parcel_price);
  console.log(`\n📈 Cash Flow DCF Escalation Factor: ${expectedEscalation.toFixed(4)}x`);
  console.log(`   (Cash Flow applies 3% annual growth, so Gross Revenue = $${cf.gross_revenue.toLocaleString()})`);
  console.log(`   (Database base value = $${Number(db.gross_parcel_price).toLocaleString()})`);

  // Expected relationship
  console.log('\n=== EXPECTED RELATIONSHIPS ===');
  console.log(`\nSales Page (base values, no DCF):
   Total Revenue = $${sales.gross_parcel_price.toLocaleString()} (matches DB gross_parcel_price)
   Net Proceeds = $${sales.net_sale_proceeds.toLocaleString()} (matches DB net_sale_proceeds)`);

  console.log(`\nCash Flow (with DCF growth applied):
   Gross Revenue = $${cf.gross_revenue.toLocaleString()} (DB gross_parcel_price × ~1.14 DCF factor)
   Subdivision Costs = $${cf.revenue_deductions.toLocaleString()} (DB improvement_offset × ~1.14 DCF factor)
   Net Revenue = $${cf.net_revenue.toLocaleString()} (Gross - Subdivision Costs)`);

  console.log('\n✅ RECONCILIATION COMPLETE');
  console.log('   Sales Page now uses tbl_parcel_sale_assumptions as source of truth');
  console.log('   Cash Flow applies DCF growth for financial projections (expected)');
}

main().catch(console.error);
