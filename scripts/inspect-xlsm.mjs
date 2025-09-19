#!/usr/bin/env node
// Quick inspector for Excel (xlsm/xlsx): lists sheets and named ranges
// Usage: node scripts/inspect-xlsm.mjs LocalFiles/PeoriaLakes\ MPC_2023.xlsm

import fs from 'node:fs'
import xlsx from 'xlsx'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/inspect-xlsm.mjs <path-to-xlsm>')
  process.exit(1)
}
if (!fs.existsSync(file)) {
  console.error('File not found:', file)
  process.exit(1)
}

const wb = xlsx.readFile(file, { cellDates: true, WTF: false })
console.log('Sheets:')
wb.SheetNames.forEach((name, i) => console.log(` ${i + 1}. ${name}`))

console.log('\nDefined Names:')
const names = (wb.Workbook && wb.Workbook.Names) || []
names.forEach(n => {
  console.log(` - ${n.Name} -> ${n.Ref}`)
})

// Dump a few specific named ranges if found
function dumpNamed(name) {
  const def = names.find(n => n.Name === name)
  if (!def) return
  const range = def.Ref
  const [sheetName, a1] = range.split('!')
  const sheet = wb.Sheets[sheetName.replace(/^'/, '').replace(/'$/,'')]
  if (!sheet) return
  const data = xlsx.utils.sheet_to_json(sheet, { range: a1, header: 1, defval: null })
  console.log(`\nSample from ${name} (${range}):`)
  console.log(data.slice(0, 10))
}

;['ADMIN!i_Cost.Conting','tbl_Planning','ADMIN!tbl_Planning','i_Cost.Conting'].forEach(dumpNamed)
