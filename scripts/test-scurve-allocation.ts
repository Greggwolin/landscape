/**
 * Manual integration test for S-curve allocation.
 *
 * Usage: tsx scripts/test-scurve-allocation.ts
 */

import { allocateBudgetItem } from '@/lib/financial-engine/scurve-allocation';

async function testAllocation() {
  console.log('Testing S-Curve Allocation...\n');

  const params = {
    factId: 9999,
    totalAmount: 1_000_000,
    startPeriod: 1,
    duration: 12,
    curveProfile: 'S',
    steepness: 50
  };

  console.log('Input Parameters:');
  console.log(`  Total Amount: $${params.totalAmount.toLocaleString()}`);
  console.log(`  Duration: ${params.duration} periods`);
  console.log(`  Curve Profile: ${params.curveProfile}`);
  console.log(`  Steepness: ${params.steepness}%\n`);

  try {
    const result = await allocateBudgetItem(1, params);

    console.log('✓ Allocation successful!\n');
    console.log('Summary:');
    console.log(`  Total Allocated: $${result.summary.allocatedAmount.toLocaleString()}`);
    console.log(`  Period Count: ${result.summary.periodCount}`);
    console.log(`  Avg per Period: $${result.summary.avgPerPeriod.toLocaleString()}`);
    console.log(`  Peak Period: ${result.summary.peakPeriod}`);
    console.log(`  Peak Amount: $${result.summary.peakAmount.toLocaleString()}\n`);

    console.log('Period-by-Period Breakdown:');
    console.log('Period | Amount      | Cumulative  | Cumulative %');
    console.log('-------|-------------|-------------|-------------');

    result.allocations.forEach(allocation => {
      console.log(
        `${allocation.periodSequence.toString().padStart(4)} | ` +
          `$${allocation.amount.toFixed(2).padStart(10)} | ` +
          `$${allocation.cumulativeAmount.toFixed(2).padStart(10)} | ` +
          `${allocation.cumulativePercent.toFixed(1).padStart(5)}%`
      );
    });
  } catch (error) {
    console.error('✗ Allocation failed:', error);
  }
}

testAllocation();
