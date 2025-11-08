#!/usr/bin/env tsx

import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('/Users/5150east/landscape/uploads/Benchmark_UnitCost_Seed.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];

console.log('Row 0 (should be empty):', rows[0]);
console.log('\nRow 1 (headers):', rows[1]);

console.log('\nFirst 5 data rows:');
rows.slice(2, 7).forEach((row, idx) => {
  console.log(`Row ${idx+2}: [${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}]`);
});

console.log('\n\nProblematic items from Excel:');
rows.slice(2).forEach((row) => {
  const item = row[1];
  if (typeof item === 'string' && (item.includes('Manhole') || item.includes('Fire Hydrant') || item.includes('16"'))) {
    console.log(`${item}:`);
    console.log(`  Category="${row[0]}", Item="${row[1]}", Col2=${row[2]}, Col3="${row[3]}", Col4=${row[4]}`);
  }
});
