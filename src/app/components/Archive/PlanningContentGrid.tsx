// Master-Detail Overview using react-data-grid
'use client'

import React, { useMemo, useState, useCallback } from 'react'
import useSWR from 'swr'
import { DataGrid, Column, RenderCellProps } from 'react-data-grid'
import 'react-data-grid/lib/styles.css'
import '@/styles/horizon-dark.css'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
const fmtInt = (n: unknown) => { const v = Number(n); if (!v) return '-'; return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v) }
const fmtPercent = (n: unknown) => { const v = Number(n); if (!v) return '-'; return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v * 100)}%` }

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
const PlanningContentGrid: React.FC<Props> = ({ projectId = null }) => {
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

  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editingParcel, setEditingParcel] = useState<number | null>(null)

  const { level1Label, level2Label, level3Label } = labels

  type DisplayRow =
    | ({ kind: 'phase'; area_display: string; phase_display: string } & PhaseRow)
    | ({ kind: 'parcel'; parent_phase_id: number; area_display: string; phase_display: string; parcel_display: string } & ParcelRow)

  const hasError = parcelsError || phasesError || familiesError || subtypesError || landusesError

  const rows: DisplayRow[] = useMemo(() => {
    if (!Array.isArray(phasesData)) return []
    const parcels = Array.isArray(parcelsData) ? parcelsData : []
    const out: DisplayRow[] = []
    for (const ph of phasesData) {
      const areaDisplay = areaDisplayByNumber.get(ph.area_no) ?? `${level1Label} ${ph.area_no}`
      const phaseDisplay = phaseDisplayById.get(ph.phase_id) ?? ph.phase_name
      out.push({ kind: 'phase', area_display: areaDisplay, phase_display: phaseDisplay, ...ph })
      if (expanded.has(ph.phase_id)) {
        for (const pr of parcels.filter(p => p.phase_id === ph.phase_id)) {
          const parcelDisplay = parcelDisplayById.get(pr.parcel_id) ?? pr.parcel_name
          out.push({
            kind: 'parcel',
            parent_phase_id: ph.phase_id,
            area_display: areaDisplay,
            phase_display: phaseDisplay,
            parcel_display: parcelDisplay,
            ...pr
          })
        }
      }
    }
    return out
  }, [phasesData, parcelsData, expanded, areaDisplayByNumber, phaseDisplayById, parcelDisplayById, level1Label])

  // Helper functions for land use data
  const families = useMemo(() => (Array.isArray(familiesData) ? familiesData : []), [familiesData])
  const subtypes = useMemo(() => (Array.isArray(subtypesData) ? subtypesData : []), [subtypesData])
  const landuses = useMemo(() => (Array.isArray(landusesData) ? landusesData : []), [landusesData])

  const getLandUseDisplayName = useCallback((usecode: string) => {
    const landuse = landuses.find(lu => lu.landuse_code === usecode)
    if (!landuse) return usecode

    if (landuse.subtype_id) {
      const subtype = subtypes.find(st => st.subtype_id === landuse.subtype_id)
      if (subtype) {
        const family = families.find(f => f.family_id === subtype.family_id)
        return `${family?.name || 'Unknown'} → ${subtype.name} → ${usecode}`
      }
    }
    return `${usecode} - ${landuse.name}`
  }, [landuses, subtypes, families])

  const getAvailableLandUses = useCallback(() => {
    return landuses.filter(lu => lu.active).map(lu => ({
      value: lu.landuse_code,
      label: getLandUseDisplayName(lu.landuse_code),
      family: lu.subtype_id ? subtypes.find(st => st.subtype_id === lu.subtype_id)?.family_id : null
    }))
  }, [landuses, subtypes, getLandUseDisplayName])

  // Custom cell renderer for usecode selection
  const renderUsecodeCell = useCallback(({ row, onRowChange }: RenderCellProps<DisplayRow>) => {
    if (row.kind !== 'parcel') return <span className="text-gray-400">—</span>

    const isEditing = editingParcel === row.parcel_id
    const availableLandUses = getAvailableLandUses()

    if (isEditing) {
      return (
        <select
          value={row.usecode || ''}
          onChange={(e) => {
            const newRow = { ...row, usecode: e.target.value }
            onRowChange(newRow)
            setEditingParcel(null)
          }}
          onBlur={() => setEditingParcel(null)}
          autoFocus
          className="w-full bg-gray-700 text-white text-xs border-none outline-none"
        >
          <option value="">Select land use...</option>
          {availableLandUses.map(lu => (
            <option key={lu.value} value={lu.value}>
              {lu.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <span
        className="cursor-pointer hover:bg-gray-600 px-1 rounded"
        onClick={() => setEditingParcel(row.parcel_id)}
        title={getLandUseDisplayName(row.usecode)}
      >
        {row.usecode || 'Click to set'}
      </span>
    )
  }, [editingParcel, getAvailableLandUses, getLandUseDisplayName])

  const rowHeight = 30
  const headerRowHeight = 34

  const columns = useMemo<Column<DisplayRow>[]>(() => [
    {
      key: 'expand', name: '', width: 34, frozen: true,
      renderCell: ({ row }) => row.kind === 'phase' ? (
        <button
          className="text-gray-200"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(prev => {
              const n = new Set(prev)
              if (n.has(row.phase_id)) n.delete(row.phase_id); else n.add(row.phase_id)
              return n
            })
          }}
        >{expanded.has((row as any).phase_id) ? '▾' : '▸'}</button>
      ) : <span className="opacity-60">•</span>
    },
    {
      key: 'name', name: `${level2Label} / ${level3Label}`, width: 240, resizable: true,
      renderCell: ({ row }) => row.kind === 'phase'
        ? <span className="font-medium text-white">{row.phase_display}</span>
        : <span className="pl-2 text-gray-200">{row.parcel_display}</span>
    },
    {
      key: 'area_no', name: level1Label, width: 160, renderCell: ({ row }) => (
        <span>{row.area_display}</span>
      )
    },
    { key: 'usecode', name: 'Use', width: 120, renderCell: renderUsecodeCell },
    { key: 'product', name: 'Product', width: 140, editable: (row) => row.kind === 'parcel', renderCell: ({ row }) => row.kind === 'parcel' ? <span>{row.product}</span> : <span className="text-gray-400">—</span> },
    { key: 'acres', name: 'Acres', width: 100, editable: (row) => row.kind === 'parcel', renderCell: ({ row }) => row.kind === 'parcel' ? <span>{fmtInt(row.acres)}</span> : <span>{fmtInt(row.gross_acres)}</span> },
    { key: 'units', name: 'Units', width: 90, editable: (row) => row.kind === 'parcel', renderCell: ({ row }) => row.kind === 'parcel' ? <span>{fmtInt(row.units)}</span> : <span>{fmtInt(row.units_total)}</span> },
    { key: 'efficiency', name: 'Eff.%', width: 90, renderCell: ({ row }) => row.kind === 'parcel' ? <span>{fmtPercent(row.efficiency)}</span> : <span className="text-gray-400">—</span> },
  ], [expanded, renderUsecodeCell, level1Label, level2Label, level3Label])

  const onRowsChange = async (nextRows: DisplayRow[], data: any) => {
    const idx = data.indexes?.[0]
    const r = nextRows[idx]
    if (r && r.kind === 'parcel') {
      try {
        setSaving(true)
        await fetch(`/api/parcels/${r.parcel_id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usecode: r.usecode, product: r.product, acres: Number(r.acres), units: Number(r.units) })
        })
        mutateParcels(undefined, { revalidate: true })
        window.dispatchEvent(new CustomEvent('dataChanged'))
      } catch (e) { console.error('Save failed', e) } finally { setSaving(false) }
    }
  }

  if (hasError) {
    return (
      <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white text-sm">
        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-red-400">
          Unable to load planning data grid. Please retry after resolving server errors.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white text-sm">
      {/* View Mode Toggle */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Planning Overview - Grid View</h2>
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
              className="px-3 py-1 rounded text-sm bg-blue-600 text-white border border-blue-500"
            >
              Grid
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview-hot' } }))}
              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
            >
              Spreadsheet
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded border border-gray-700">
        <div className="px-3 py-2 border-b border-gray-700 text-base flex items-center gap-3">
          <div>Development Phasing (Master) + Parcel Details (Detail)</div>
          <div className="text-sm text-gray-300">{saving ? 'Saving…' : ''}</div>
        </div>
        <div className="p-2">
          <div className="text-sm text-gray-300 mb-2">Phases: {Array.isArray(phasesData) ? phasesData.length : 0} · Parcels: {Array.isArray(parcelsData) ? parcelsData.length : 0}</div>
          <div className="bg-gray-900 border border-gray-700 rounded overflow-visible rdg-dark">
            <DataGrid
              className="text-sm"
              columns={columns}
              rows={rows}
              onRowsChange={onRowsChange}
              rowKeyGetter={(r) => r.kind === 'phase' ? `ph-${r.phase_id}` : `pr-${r.parcel_id}`}
              defaultColumnOptions={{ resizable: true }}
              rowHeight={rowHeight}
              headerRowHeight={headerRowHeight}
              style={{ fontSize: '1.0rem', height: headerRowHeight + rows.length * rowHeight }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanningContentGrid
