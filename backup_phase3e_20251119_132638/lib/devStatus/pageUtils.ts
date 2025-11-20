const ACRONYM_WORDS = new Set(['ai', 'dms', 'gis', 'db', 'api', 'id', 'crm'])

function capitalize(word: string) {
  if (!word) return word
  if (ACRONYM_WORDS.has(word.toLowerCase())) {
    return word.toUpperCase()
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function splitIntoWords(segment: string) {
  if (!segment) return []

  const cleaned = segment
    .replace(/\[|\]/g, '')
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()

  return cleaned.split('-').filter(Boolean)
}

function formatSegmentLabel(segment: string) {
  if (!segment) return ''

  if (/^\d+$/.test(segment)) {
    return `#${segment}`
  }

  if (segment === '/') return 'Home'

  const words = splitIntoWords(segment)
  if (words.length === 0) {
    return capitalize(segment)
  }

  return words.map(capitalize).join(' ')
}

export function formatRouteLabel(route: string) {
  if (!route || route === '/') {
    return 'Home'
  }

  const segments = route.split('/').filter(Boolean)
  return segments.map(formatSegmentLabel).join(' · ')
}

export function normalizeRoutePath(route: string) {
  if (!route) return '/'
  const trimmed = route.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.replace(/\/+$/, '') || '/'
}

const PLACEHOLDER_SEGMENTS = new Set(['sample', 'demo', 'example', 'slug', 'id', 'item'])

export function routesRoughlyMatch(target: string, candidate: string) {
  const a = normalizeRoutePath(target)
  const b = normalizeRoutePath(candidate)
  if (a === b) return true

  const segA = a.split('/').filter(Boolean)
  const segB = b.split('/').filter(Boolean)
  if (segA.length !== segB.length) return false

  return segA.every((segment, index) => {
    const other = segB[index]
    if (segment === other) return true

    const segmentIsNumber = /^\d+$/.test(segment)
    const otherIsNumber = /^\d+$/.test(other)
    if (segmentIsNumber && otherIsNumber) return true

    if (PLACEHOLDER_SEGMENTS.has(segment.toLowerCase())) return true
    if (PLACEHOLDER_SEGMENTS.has(other.toLowerCase())) return true

    return false
  })
}
