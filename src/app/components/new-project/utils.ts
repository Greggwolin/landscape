import type { NewProjectFormData } from './types'

export const generateProjectName = (data: NewProjectFormData): string => {
  if (data.project_name?.trim()) {
    return data.project_name.trim()
  }

  const locationSegments: string[] = []

  if (data.street_address) {
    locationSegments.push(data.street_address)
  } else if (data.cross_streets) {
    locationSegments.push(data.cross_streets)
  } else if (data.latitude && data.longitude) {
    locationSegments.push(`${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`)
  }

  if (data.city) {
    locationSegments.push(data.city)
  }

  if (data.state) {
    locationSegments.push(data.state)
  }

  const base = locationSegments.join(', ')
  if (!base) {
    return 'New Project'
  }

  return `${base} Project`
}

export const formatNumber = (value?: string): string | undefined => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toLocaleString() : undefined
}

export type ParsedAddress = {
  street: string
  city: string
  state: string
  zip?: string
}

export const parseSingleLineAddress = (value: string): ParsedAddress | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const pattern = /^(?<street>[^,]+),\s*(?<city>[^,]+),\s*(?<state>[A-Z]{2})(?:\s+(?<zip>\d{5}(?:-\d{4})?))?$/i
  const match = trimmed.match(pattern)
  if (!match || !match.groups) return null

  const street = match.groups.street.trim()
  const city = match.groups.city.trim()
  const state = match.groups.state.trim().toUpperCase()
  const zip = match.groups.zip?.trim()

  if (!street || !city || !state) return null
  return { street, city, state, zip }
}
