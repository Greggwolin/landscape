export const formatNumber = (val: number | string | null | undefined) => {
  if (val === null || val === undefined || val === '') return ''
  const num = typeof val === 'number' ? val : Number(String(val).toString().replace(/,/g, ''))
  if (Number.isNaN(num)) return ''
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(num)
}

export const parseNumber = (display: string): number => {
  if (!display) return 0
  const cleaned = display.replace(/,/g, '').replace(/%/g, '').trim()
  const n = Number(cleaned)
  return Number.isNaN(n) ? 0 : n
}

