// app/components/Planning/PlanningContentHot.tsx
'use client'

import React, { useMemo, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { HotTable } from '@handsontable/react-wrapper'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import '@/styles/horizon-dark.css'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'

type ParcelRow = {
  parcel_id: number
  phase_id: number
  area_no: number
  phase_name: string
  parcel_name: string
  usecode: string
  product: string
  acres: number
  units: number
  efficiency: number
}

type PhaseRow = {
  phase_id: number
  area_no: number
  phase_name: string
  gross_acres: number
  net_acres: number
  units_total: number
}

type Family = {
  family_id: number
  name: string
  ord: number
  active: boolean
}

type Subtype = {
  subtype_id: number
  family_id: number
  code: string
  name: string
  ord: number
  active: boolean
}

type LandUse = {
  landuse_id: number
  subtype_id: number | null
  landuse_code: string
  landuse_type: string
  name: string
  description?: string
  active: boolean
}

const fetcher = (url: string) => fetchJson(url)

type Props = { projectId?: number | null }
const PlanningContentHot: React.FC<Props> = ({ projectId = null }) => {
  // Register all plugins/cell types/renderers once for community build
  registerAllModules()
  const { data: parcelsData, error: parcelsError, mutate: mutateParcels } = useSWR<ParcelRow[]>(projectId ? `/api/parcels?project_id=${projectId}` : null, fetcher)
  const { data: phasesData, error: phasesError } = useSWR<PhaseRow[]>(projectId ? `/api/phases?project_id=${projectId}` : null, fetcher)
  const { data: familiesData, error: familiesError } = useSWR<Family[]>('/api/landuse/choices?type=families', fetcher)
  const { data: subtypesData, error: subtypesError } = useSWR<Subtype[]>('/api/landuse/choices?type=subtypes', fetcher)
  const { data: landusesData, error: landusesError } = useSWR<LandUse[]>('/api/landuse/choices?type=codes', fetcher)

  const {
    labels,
    areaDisplayByNumber,
    phaseDisplayById,
    parcelDisplayById,
  } = useProjectConfig(projectId ?? undefined)

  const { level1Label, level2Label, level3Label } = labels

  const hasError = parcelsError || phasesError || familiesError || subtypesError || landusesError

  const parcels = useMemo(() => (Array.isArray(parcelsData) ? parcelsData : []), [parcelsData])
  const phases = useMemo(() => (Array.isArray(phasesData) ? phasesData : []), [phasesData])
  const families = useMemo(() => (Array.isArray(familiesData) ? familiesData : []), [familiesData])
  const subtypes = useMemo(() => (Array.isArray(subtypesData) ? subtypesData : []), [subtypesData])
  const landuses = useMemo(() => (Array.isArray(landusesData) ? landusesData : []), [landusesData])

  const phasesTable = useMemo(() => phases.map(phase => ({
    ...phase,
    phase_display: phaseDisplayById.get(phase.phase_id) ?? phase.phase_name,
    area_display: areaDisplayByNumber.get(phase.area_no) ?? `${level1Label} ${phase.area_no}`
  })), [phases, phaseDisplayById, areaDisplayByNumber, level1Label])

  const parcelsTable = useMemo(() => parcels.map(parcel => ({
    ...parcel,
    phase_display: phaseDisplayById.get(parcel.phase_id) ?? parcel.phase_name,
    area_display: areaDisplayByNumber.get(parcel.area_no) ?? `${level1Label} ${parcel.area_no}`,
    parcel_display: parcelDisplayById.get(parcel.parcel_id) ?? parcel.parcel_name
  })), [parcels, phaseDisplayById, areaDisplayByNumber, parcelDisplayById, level1Label])

  const landUseValues = landuses.filter(lu => lu.active).map(lu => lu.landuse_code)

  const fmtInt = useCallback((n: unknown) => {
    const v = Number(n)
    if (!v) return '-'
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)
  }, [])
  const intRenderer = useCallback((instance: any, td: any, row: number, col: number, prop: any, value: any) => {
    td.textContent = fmtInt(value)
    td.className = 'htCenter htMiddle'
  }, [fmtInt])

  const phaseSettings = useMemo(() => ({
    data: phasesTable,
    colHeaders: [level2Label, level1Label, 'Gross Acres', 'Net Acres', 'Units'],
    columns: [
      { data: 'phase_display', readOnly: true },
      { data: 'area_display', readOnly: true },
      { data: 'gross_acres', readOnly: true, renderer: intRenderer },
      { data: 'net_acres', readOnly: true, renderer: intRenderer },
      { data: 'units_total', readOnly: true, renderer: intRenderer },
    ],
    rowHeights: 30,
    rowHeaders: false,
    height: Math.max(120, 30 * phasesTable.length + 28),
    licenseKey: 'non-commercial-and-evaluation',
    stretchH: 'last',
    className: 'ht-theme-dark'
  }), [phasesTable, level1Label, level2Label, intRenderer])

  const [saving, setSaving] = useState(false)
  const parcelsHotRef = useRef<any>(null)

  const parcelSettings = useMemo(() => ({
    data: parcelsTable,
    colHeaders: [level1Label, level2Label, level3Label, 'Use', 'Product', 'Acres', 'Units', 'Eff.%'],
    columns: [
      { data: 'area_display', readOnly: true },
      { data: 'phase_display', readOnly: true },
      { data: 'parcel_display', readOnly: true },
      {
        data: 'usecode',
        type: 'dropdown',
        source: landUseValues,
        strict: false,
        allowInvalid: true,
        renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
          const landuse = landuses.find(lu => lu.landuse_code === value)
          if (landuse && landuse.subtype_id) {
            const subtype = subtypes.find(st => st.subtype_id === landuse.subtype_id)
            if (subtype) {
              const family = families.find(f => f.family_id === subtype.family_id)
              td.title = `${family?.name || 'Unknown'} → ${subtype.name} → ${value}`
            }
          }
          td.textContent = value || ''
          td.className = 'htCenter htMiddle'
        }
      },
      { data: 'product' },
      { data: 'acres', renderer: intRenderer },
      { data: 'units', renderer: intRenderer },
      { data: 'efficiency', readOnly: true, renderer: (instance: any, td: any, row: number, col: number, prop: any, value: any) => {
          const v = Number(value)
          td.textContent = v ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v * 100)}%` : '-'
          td.className = 'htRight'
        }
      }
    ],
    rowHeights: 30,
    rowHeaders: false,
    manualColumnResize: true,
    dropdownMenu: true,
    filters: true,
    height: Math.max(120, 30 * parcelsTable.length + 28),
    licenseKey: 'non-commercial-and-evaluation',
    stretchH: 'last',
    className: 'ht-theme-dark',
    afterChange: async (changes: any[], source: string) => {
      if (source === 'loadData' || !changes) return
      try {
        setSaving(true)
        // Take the last change
        const [rowIndex] = changes[changes.length - 1]
        const row = parcelsTable[rowIndex]
        if (!row) return
        await fetch(`/api/parcels/${row.parcel_id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usecode: row.usecode, product: row.product, acres: Number(row.acres), units: Number(row.units) })
        })
        mutateParcels(undefined, { revalidate: true })
        window.dispatchEvent(new CustomEvent('dataChanged'))
      } catch (e) {
        console.error('Save failed', e)
      } finally {
        setSaving(false)
      }
    }
  }), [parcelsTable, mutateParcels, landUseValues, landuses, subtypes, families, level1Label, level2Label, level3Label, intRenderer])

  if (hasError) {
    return (
      <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white">
        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-red-400">
          Unable to load spreadsheet view. Please resolve server errors and reload.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white">
      {/* View Mode Toggle */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Planning Overview - Spreadsheet View</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">View Mode:</span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview' } }))}
              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
            >
              Table
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview-grid' } }))}
              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
            >
              Grid
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview-hot' } }))}
              className="px-3 py-1 rounded text-sm bg-blue-600 text-white border border-blue-500"
            >
              Spreadsheet
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded border border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 text-base">Development Phasing (HOT)</div>
          <div className="p-2">
            <HotTable className="ht-theme-dark" {...phaseSettings} />
          </div>
        </div>

        <div className="bg-gray-800 rounded border border-gray-700">
          <div className="px-3 py-2 border-b border-gray-700 text-base flex items-center gap-3">
            <div>Parcels (HOT)</div>
            <div className="text-sm text-gray-300">{saving ? 'Saving…' : ''}</div>
          </div>
          <div className="p-2">
            <HotTable className="ht-theme-dark" ref={parcelsHotRef} {...parcelSettings} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanningContentHot
