'use client'

import Badge from './Badge'
import type { NewProjectFormData, UploadedDocument } from './types'
import { formatNumber, generateProjectName } from './utils'

type ProjectSummaryPreviewProps = {
  data: NewProjectFormData
  uploadedDocuments: UploadedDocument[]
  extractionPending: boolean
}

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-400'
const valueClass = 'text-sm text-slate-100'

const buildLocationLine = (data: NewProjectFormData) => {
  if (data.street_address) {
    return data.street_address
  }
  if (data.cross_streets) {
    return data.cross_streets
  }
  if (data.latitude && data.longitude) {
    return `${data.latitude}, ${data.longitude}`
  }
  return 'Location pending'
}

const buildLocationSuffix = (data: NewProjectFormData) => {
  const parts = [data.city, data.state].filter(Boolean)
  return parts.length ? parts.join(', ') : ''
}

const buildSizeSummary = (data: NewProjectFormData) => {
  const parts: string[] = []
  if (data.total_units) {
    parts.push(`${formatNumber(data.total_units)} units`)
  }
  if (data.building_sf) {
    const formatted = formatNumber(data.building_sf)
    if (formatted) {
      parts.push(`${formatted} SF`)
    }
  }
  if (data.site_area) {
    const formatted = formatNumber(data.site_area)
    if (formatted) {
      parts.push(`${formatted} ${data.site_area_unit}`)
    }
  }
  return parts.join(' / ') || 'Size pending'
}

const ProjectSummaryPreview = ({ data, uploadedDocuments, extractionPending }: ProjectSummaryPreviewProps) => {
  const name = generateProjectName(data)
  const locationLine = buildLocationLine(data)
  const locationSuffix = buildLocationSuffix(data)
  const sizeSummary = buildSizeSummary(data)

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">
        Project Summary
      </h3>

      <div className="space-y-4">
        <div>
          <div className={labelClass}>Name</div>
          <div className={valueClass}>{name}</div>
        </div>

        <div>
          <div className={labelClass}>Type</div>
          <div className={valueClass}>
            {data.development_type || 'Select a property type'}
            {data.project_type_code && ` • ${data.project_type_code}`}
            {data.property_subtype && ` (${data.property_subtype})`}
          </div>
        </div>

        <div>
          <div className={labelClass}>Location</div>
          <div className={valueClass}>
            {locationLine}
            {locationSuffix && `, ${locationSuffix}`}
          </div>
        </div>

        <div>
          <div className={labelClass}>Size</div>
          <div className={valueClass}>{sizeSummary}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className={labelClass}>Status</div>
          <Badge variant="success" size="sm">
            Ready to create
          </Badge>
        </div>

        {uploadedDocuments.length > 0 && (
          <div className="flex items-center gap-2">
            <div className={labelClass}>Documents</div>
            <span className={valueClass}>{uploadedDocuments.length} uploaded</span>
            {extractionPending && (
              <Badge variant="warning" size="sm">
                Pending extraction
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectSummaryPreview
