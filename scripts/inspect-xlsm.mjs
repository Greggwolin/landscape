#!/usr/bin/env node
// Quick inspector for Excel (xlsm/xlsx): lists sheets and named ranges
// Usage: node scripts/inspect-xlsm.mjs LocalFiles/PeoriaLakes\ MPC_2023.xlsm

import fs from 'node:fs'
import xlsx from 'xlsx'

const MAX_CELLS_PER_SHEET = 200_000
const MAX_TOTAL_CELLS = 1_000_000
const MAX_CELL_TEXT_LENGTH = 200_000

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
enforceWorkbookLimits(wb, file)

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
  const rawData = xlsx.utils.sheet_to_json(sheet, { range: a1, header: 1, defval: null })
  const data = sanitizeMatrix(rawData, sheetName)
  console.log(`\nSample from ${name} (${range}):`)
  console.log(data.slice(0, 10))
}

;['ADMIN!i_Cost.Conting','tbl_Planning','ADMIN!tbl_Planning','i_Cost.Conting'].forEach(dumpNamed)

function enforceWorkbookLimits(workbook, source) {
  let totalCells = 0
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet || !sheet['!ref']) return
    const range = xlsx.utils.decode_range(sheet['!ref'])
    const rowCount = range.e.r - range.s.r + 1
    const colCount = range.e.c - range.s.c + 1
    const cellCount = rowCount * colCount
    if (cellCount > MAX_CELLS_PER_SHEET) {
      throw new Error(`Sheet "${sheetName}" in ${source} has ${cellCount.toLocaleString()} cells; limit is ${MAX_CELLS_PER_SHEET.toLocaleString()}`)
    }
    totalCells += cellCount
    if (totalCells > MAX_TOTAL_CELLS) {
      throw new Error(`Workbook "${source}" exceeds safe total cell limit of ${MAX_TOTAL_CELLS.toLocaleString()}`)
    }
  })
}

function sanitizeMatrix(rows, sheetName) {
  return rows.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      const value = sanitizeValue(row, sheetName, xlsx.utils.encode_cell({ r: rowIndex, c: 0 }))
      return [value]
    }
    return row.map((cell, colIndex) =>
      sanitizeValue(cell, sheetName, xlsx.utils.encode_cell({ r: rowIndex, c: colIndex }))
    )
  })
}

function sanitizeValue(value, sheetName, cellRef) {
  if (typeof value === 'string' && value.length > MAX_CELL_TEXT_LENGTH) {
    throw new Error(`Cell ${sheetName}!${cellRef} exceeds safe text length of ${MAX_CELL_TEXT_LENGTH.toLocaleString()} characters`)
  }
  return value
}
