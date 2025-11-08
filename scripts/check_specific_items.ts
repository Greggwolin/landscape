#!/usr/bin/env tsx

import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('/Users/5150east/landscape/uploads/Benchmark_UnitCost_Seed.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];

console.log('EXCEL FILE ANALYSIS\n');
console.log('Headers (Row 1):', rows[1]);
console.log('\nColumn mapping: Col0=Category, Col1=Item, Col2=?, Col3=?, Col4=?\n');

const itemsToCheck = [
  'Grade out Temp Basin',
  'Monthly Rental of Fence',
  'Over excavation',
  "5' Manhole",
  'Fire Hydrant Complete',
  '16" x 6" T'
];

rows.slice(2).forEach((row) => {
  const item = row[1];
  if (typeof item === 'string' && itemsToCheck.some(check => item.includes(check))) {
    console.log(`"${item}"`);
    console.log(`  Col2=${row[2]}, Col3="${row[3]}", Col4=${row[4]}`);
  }
});
