'use client'

import { useCallback, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community'
import useSWR from 'swr'
import {
  fetchLeases,
  fetchUnits,
  fetchUnitTypes,
  leasesAPI,
  unitsAPI,
} from '@/lib/api/multifamily'
import { FloorplanUpdateDialog } from './FloorplanUpdateDialog'
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh'
import { usePendingRentRollChanges } from '@/hooks/usePendingRentRollChanges'
import { SemanticButton } from '@/components/ui/landscape'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '../rent-roll-grid.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface Lease {
  lease_id: number
  unit_id: number
  unit_number: string
  building_name: string | null
  unit_type: string
  square_feet: number
  resident_name: string | null
  lease_start_date: string
  lease_end_date: string
  base_rent_monthly: number
  lease_status: string
  bedrooms: number | null
  bathrooms: number | null
  market_rent: number | null
  other_features: string | null
}

interface Unit {
  unit_id: number
  project_id: number
  unit_number: string
  building_name: string | null
  unit_type: string
  bedrooms: number
  bathrooms: number
  square_feet: number
  current_rent: number | null
  market_rent: number
  occupancy_status: string | null
  renovation_status: string
  other_features: string | null
}

// Unified row type for grid display - works with either lease or unit data
interface RentRollRow {
  // Identifiers
  lease_id?: number
  unit_id: number
  unit_number: string
  building_name: string | null
  // Unit properties
  unit_type: string
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number
  market_rent: number | null
  other_features: string | null
  // Lease/rent properties
  resident_name?: string | null
  lease_start_date?: string
  lease_end_date?: string
  base_rent_monthly: number  // from lease or unit.current_rent
  lease_status: string       // from lease or derived from occupancy_status
  // Source tracking
  _source: 'lease' | 'unit'
}

interface UnitType {
  unit_type_id: number
  project_id: number
  unit_type_code: string
  bedrooms: number
  bathrooms: number
  avg_square_feet: number
  current_market_rent: number
  total_units: number
  notes: string | null
  other_features: string | null
  floorplan_doc_id: number | null
}

interface LeaseResponse {
  success: boolean
  data: Lease[]
  count: number
}

interface UnitResponse {
  success: boolean
  data: Unit[]
  count: number
}

interface RentRollGridProps {
  projectId: number
}

interface MetricTileProps {
  label: string
  value: string | number
  subtext?: string
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

// Metric tile component
const MetricTile: React.FC<MetricTileProps> = ({ label, value, subtext, color = 'blue' }) => {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-950/20',
    green: 'border-green-500/30 bg-green-950/20',
    yellow: 'border-yellow-500/30 bg-yellow-950/20',
    red: 'border-red-500/30 bg-red-950/20'
  }

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-gray-400 mt-1">
          {subtext}
        </div>
      )}
    </div>
  )
}

// Status badge component
const StatusBadge = ({ value }: { value: string }) => {
  const colorClasses = {
    ACTIVE: 'bg-green-900 text-green-300',
    NOTICE_GIVEN: 'bg-yellow-900 text-yellow-300',
    EXPIRED: 'bg-red-900 text-red-300',
    MONTH_TO_MONTH: 'bg-blue-900 text-blue-300',
    CANCELLED: 'bg-gray-700 text-gray-300',
  }

  const className = colorClasses[value as keyof typeof colorClasses] || 'bg-gray-700 text-gray-300'

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
      {value.replace('_', ' ')}
    </span>
  )
}

export default function RentRollGrid({ projectId }: RentRollGridProps) {
  const [gridApi, setGridApi] = useState<any>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)
  const [floorplanDialogOpen, setFloorplanDialogOpen] = useState(false)
  const [floorplanCheck, setFloorplanCheck] = useState<any>(null)
  const [pendingUpdate, setPendingUpdate] = useState<{
    leaseId: number
    field: string
    newValue: any
    oldValue: any
    event: CellValueChangedEvent<Lease>
  } | null>(null)

  // Show notification helper
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Pending rent roll changes (delta highlighting)
  const {
    hasPending,
    pendingByCell,
    summary: pendingSummary,
    documentName: pendingDocName,
    acceptChange,
    rejectChange,
    acceptAll,
    rejectAll,
    refresh: refreshPending,
    getFieldState,
    toggleFieldAcceptance,
    selectAllForUnit,
    deselectAllForUnit,
    getUnitSelectionState,
    unitsWithChanges,
    pendingCount,
  } = usePendingRentRollChanges(projectId)

  const { data: response, error, mutate: mutateLeases } = useSWR(
    projectId ? `/api/multifamily/leases?project_id=${projectId}` : null,
    fetchLeases
  )

  const { data: unitsResponse, mutate: mutateUnits } = useSWR(
    projectId ? `/api/multifamily/units?project_id=${projectId}` : null,
    fetchUnits
  )

  // Fetch unit types for DVL and auto-fill
  const { data: unitTypesResponse, mutate: mutateUnitTypes } = useSWR(
    projectId ? `/api/multifamily/unit-types?project_id=${projectId}` : null,
    fetchUnitTypes,
    { revalidateOnFocus: false }
  )

  const leases = response?.data ?? []
  const units = unitsResponse?.data ?? []
  const unitTypes = unitTypesResponse?.data ?? []

  // Convert units to RentRollRow format when no leases exist
  const unitsAsRows: RentRollRow[] = useMemo(() => {
    return units.map((unit: Unit) => ({
      unit_id: unit.unit_id,
      unit_number: unit.unit_number,
      building_name: unit.building_name,
      unit_type: unit.unit_type || 'Unknown',
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      square_feet: unit.square_feet || 0,
      market_rent: unit.market_rent,
      other_features: unit.other_features,
      base_rent_monthly: Number(unit.current_rent) || 0,
      lease_status: unit.occupancy_status?.toLowerCase() === 'vacant' ? 'VACANT' : 'ACTIVE',
      resident_name: null,
      _source: 'unit' as const
    }))
  }, [units])

  // Use leases if available, otherwise fall back to units
  const gridData: RentRollRow[] = useMemo(() => {
    if (leases.length > 0) {
      return leases.map((lease: Lease) => ({
        ...lease,
        base_rent_monthly: Number(lease.base_rent_monthly) || 0,
        _source: 'lease' as const
      }))
    }
    return unitsAsRows
  }, [leases, unitsAsRows])

  const isShowingUnitsOnly = leases.length === 0 && units.length > 0

  // Auto-refresh when Landscaper completes mutations affecting rent roll data
  const refreshAllData = useCallback(() => {
    console.log('[RentRollGrid] Refreshing data after Landscaper mutation')
    mutateLeases()
    mutateUnits()
    mutateUnitTypes()
    refreshPending()
  }, [mutateLeases, mutateUnits, mutateUnitTypes, refreshPending])

  useLandscaperRefresh(
    projectId,
    ['units', 'leases', 'unit_types'],
    refreshAllData
  )

  // Build dropdown options from unit types
  const unitTypeOptions = useMemo(() => {
    return unitTypes.map(ut => ut.unit_type_code)
  }, [unitTypes])

  // Create lookup map for auto-fill
  const unitTypeMap = useMemo(() => {
    const map = new Map()
    unitTypes.forEach(ut => {
      map.set(ut.unit_type_code, {
        bedrooms: Number(ut.bedrooms),
        bathrooms: Number(ut.bathrooms),
        square_feet: Number(ut.avg_square_feet),
        market_rent: Number(ut.current_market_rent)
      })
    })
    return map
  }, [unitTypes])

  // Calculate metrics - works with either leases or units
  const metrics = useMemo(() => {
    const totalUnits = units.length
    // When showing units only, count occupied from occupancy_status
    const occupiedUnits = leases.length > 0
      ? leases.filter(l => l.lease_status === 'ACTIVE').length
      : units.filter((u: Unit) => u.occupancy_status?.toLowerCase() === 'occupied').length
    const vacantUnits = totalUnits - occupiedUnits
    const physicalOccupancyPct = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

    // Monthly rent from leases or units
    const monthlyScheduledRent = leases.length > 0
      ? leases
          .filter(l => l.lease_status === 'ACTIVE')
          .reduce((sum, l) => sum + (Number(l.base_rent_monthly) || 0), 0)
      : units
          .filter((u: Unit) => u.occupancy_status?.toLowerCase() === 'occupied')
          .reduce((sum, u: Unit) => sum + (Number(u.current_rent) || 0), 0)

    const annualScheduledRent = monthlyScheduledRent * 12

    const leasesExpiring90Days = leases.filter(l => {
      if (!l.lease_end_date) return false
      const endDate = new Date(l.lease_end_date)
      const today = new Date()
      const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 90
    }).length

    // Calculate total loss-to-lease
    const totalMonthlyL2L = leases
      .filter(l => l.lease_status === 'ACTIVE')
      .reduce((sum, lease) => {
        const floorplanData = unitTypeMap.get(lease.unit_type)
        if (!floorplanData || !floorplanData.market_rent) return sum

        const marketRent = floorplanData.market_rent
        const inPlaceRent = Number(lease.base_rent_monthly) || 0
        const l2l = marketRent - inPlaceRent

        return sum + l2l
      }, 0)

    const totalAnnualL2L = totalMonthlyL2L * 12

    // Economic occupancy = (scheduled rent / potential rent)
    const potentialMonthlyRent = leases
      .filter(l => l.lease_status === 'ACTIVE')
      .reduce((sum, lease) => {
        const floorplanData = unitTypeMap.get(lease.unit_type)
        return sum + (floorplanData?.market_rent || 0)
      }, 0)

    const economicOccupancyPct = potentialMonthlyRent > 0
      ? (monthlyScheduledRent / potentialMonthlyRent) * 100
      : 0

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      physicalOccupancyPct,
      monthlyScheduledRent,
      annualScheduledRent,
      leasesExpiring90Days,
      totalMonthlyL2L,
      totalAnnualL2L,
      economicOccupancyPct
    }
  }, [units, leases, unitTypeMap])

  // Format date as MM/DD/YYYY
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US')
  }, [])

  // Format currency
  const formatCurrency = useCallback((value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(numValue)
  }, [])

  // Format number with commas
  const formatNumber = useCallback((value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return ''
    return numValue.toLocaleString()
  }, [])

  // Delete row handler
  const handleDeleteRow = useCallback(async (lease: Lease) => {
    const confirmed = confirm(
      `Delete unit ${lease.unit_number}? This will delete both the unit and its lease.`
    )

    if (!confirmed) return

    try {
      // Delete lease first
      if (lease.lease_id) {
        await leasesAPI.delete(lease.lease_id)
      }

      // Then delete unit
      await unitsAPI.delete(lease.unit_id)

      // Refresh grid
      await mutateLeases()
      showNotification('✅ Deleted successfully', 'success')

    } catch (error) {
      console.error('Failed to delete:', error)
      showNotification(`❌ Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }, [mutateLeases, showNotification])

  // Add row at specific index (used by inline Add pill)
  const handleAddRowAt = useCallback(async (_rowIndex: number) => {
    setIsAdding(true)

    try {
      // Create a unit
      const newUnit = {
        project_id: projectId,
        unit_number: 'NEW-' + Date.now(),
        unit_type: '1BR',
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 650,
        market_rent: 1250,
        renovation_status: 'ORIGINAL',
      }

      const createdUnit = await unitsAPI.create(newUnit)
      const unitId = createdUnit.unit_id

      // Create a lease for that unit
      const today = new Date().toISOString().split('T')[0]
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const newLease = {
        unit_id: unitId,
        resident_name: null,
        lease_start_date: today,
        lease_end_date: nextYear,
        lease_term_months: 12,
        base_rent_monthly: 0,
        lease_status: 'ACTIVE',
      }

      await leasesAPI.create(newLease)

      await mutateLeases()
      showNotification('✅ Created new unit successfully', 'success')
    } catch (error) {
      console.error('Failed to add row:', error)
      showNotification(`❌ Failed to add unit: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsAdding(false)
    }
  }, [projectId, mutateLeases, showNotification])

  // Helper: get pending change style overlay for a cell (yellow = pending, green = accepted)
  const getPendingCellStyle = useCallback((params: any): Record<string, string> | null => {
    if (!params.data?.unit_id || !params.colDef?.field) return null
    const key = `${params.data.unit_id}:${params.colDef.field}`
    const change = pendingByCell.get(key)
    if (!change) return null

    const state = getFieldState(change.unitId, change.field)
    if (state === 'accepted') {
      return {
        backgroundColor: 'var(--rr-accepted-bg, rgba(34, 197, 94, 0.15))',
        borderBottom: '2px solid var(--rr-accepted-border, #22c55e)',
        cursor: 'pointer',
      }
    }
    return {
      backgroundColor: 'var(--rr-pending-bg, rgba(255, 193, 7, 0.15))',
      borderBottom: '2px solid var(--rr-pending-border, #ffc107)',
      cursor: 'pointer',
    }
  }, [pendingByCell, getFieldState])

  // Helper: get pending change tooltip for a cell
  const getPendingTooltip = useCallback((params: any): string | undefined => {
    if (!params.data?.unit_id || !params.colDef?.field) return undefined
    const key = `${params.data.unit_id}:${params.colDef.field}`
    const change = pendingByCell.get(key)
    if (!change) return undefined

    const state = getFieldState(change.unitId, change.field)
    if (state === 'accepted') {
      return `Accepted: will update to ${change.newValue} — click to undo`
    }
    return `Pending: ${change.currentValue} → ${change.newValue} — click to accept`
  }, [pendingByCell, getFieldState])

  // Handle click on a cell with a pending change — toggles acceptance
  const handlePendingCellClick = useCallback((params: any) => {
    if (!params.data?.unit_id || !params.colDef?.field) return false
    const key = `${params.data.unit_id}:${params.colDef.field}`
    const change = pendingByCell.get(key)
    if (!change) return false

    toggleFieldAcceptance(change.unitId, params.colDef.field)
    // Refresh this cell to update styling
    if (params.api) {
      params.api.refreshCells({
        rowNodes: [params.node],
        columns: [params.colDef.field],
        force: true,
      })
    }
    return true // Indicates we handled the click
  }, [pendingByCell, toggleFieldAcceptance])

  // Cell renderer for pending changes — shows "old / new" inline
  const pendingCellRenderer = useCallback((params: any) => {
    if (!params.data?.unit_id || !params.colDef?.field) return undefined
    const key = `${params.data.unit_id}:${params.colDef.field}`
    const change = pendingByCell.get(key)
    if (!change) return undefined

    const state = getFieldState(change.unitId, change.field)

    // Format values for display
    const fmtVal = (v: unknown): string => {
      if (v === null || v === undefined || v === '') return '—'
      if (typeof v === 'number') {
        // Currency fields
        if (['current_rent', 'base_rent_monthly', 'market_rent'].includes(change.field)) {
          return `$${v.toLocaleString()}`
        }
        return v.toLocaleString()
      }
      return String(v)
    }

    const oldStr = fmtVal(change.currentValue)
    const newStr = fmtVal(change.newValue)

    if (state === 'accepted') {
      // Accepted: show new value only, green
      return <span className="rr-delta-accepted">{newStr}</span>
    }

    // Pending: show "old / new"
    return (
      <span className="rr-delta-pending">
        <span className="rr-delta-old">{oldStr}</span>
        <span className="rr-delta-arrow"> / </span>
        <span className="rr-delta-new">{newStr}</span>
      </span>
    )
  }, [pendingByCell, getFieldState])

  const columnDefs = useMemo<ColDef<Lease>[]>(() => [
    // Row-level checkbox for delta review (only visible when changes are pending)
    ...(hasPending ? [{
      headerName: '',
      field: '_delta_select' as any,
      pinned: 'left' as const,
      width: 40,
      maxWidth: 40,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const unitId = params.data?.unit_id
        if (!unitId || !unitsWithChanges.has(unitId)) return null
        const state = getUnitSelectionState(unitId)
        return (
          <input
            type="checkbox"
            checked={state === 'all'}
            ref={(el) => { if (el) el.indeterminate = state === 'some' }}
            onChange={() => {
              if (state === 'all') {
                deselectAllForUnit(unitId)
              } else {
                selectAllForUnit(unitId)
              }
              // Refresh all cells in this row to update styling
              if (params.api) {
                params.api.refreshCells({ rowNodes: [params.node], force: true })
              }
            }}
            className="rr-delta-checkbox"
          />
        )
      },
    }] : []),
    {
      field: 'unit_number',
      headerName: 'Unit',
      pinned: 'left',
      editable: true,
      width: 100,
      minWidth: 80,
      cellStyle: (params) => {
        const pending = getPendingCellStyle(params)
        return { fontWeight: 'bold', ...(pending || {}) }
      },
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.value
      },
      tooltipValueGetter: getPendingTooltip,
    },
    {
      field: 'building_name',
      headerName: 'Building',
      editable: true,
      width: 120,
      minWidth: 100,
    },
    {
      field: 'unit_type',
      headerName: 'Unit Type',
      editable: true,
      width: 140,
      minWidth: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: unitTypeOptions.length > 0 ? unitTypeOptions : ['1BR', '2BR', '3BR', '4BR', 'Studio']
      },
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.value
      },
      cellStyle: (params) => {
        const pending = getPendingCellStyle(params)
        if (pending) return pending
        // Highlight if unit type exists in floorplans
        const hasFloorplan = unitTypeMap.has(params.value)
        return hasFloorplan
          ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' }  // green tint
          : {}
      },
      tooltipValueGetter: (params) => {
        const pendingTip = getPendingTooltip(params)
        if (pendingTip) return pendingTip
        const hasFloorplan = unitTypeMap.has(params.value)
        return hasFloorplan
          ? `✓ Floorplan defined with market rent`
          : `⚠ No floorplan defined - add in Floorplans tab`
      }
    },
    {
      headerName: 'Bed',
      field: 'bedrooms',
      width: 80,
      type: 'numericColumn',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 10,
        precision: 0,  // Whole numbers only
      },
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => {
        if (!params.value) return ''
        return params.value.toString()
      }
    },
    {
      headerName: 'Bath',
      field: 'bathrooms',
      width: 80,
      type: 'numericColumn',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0.5,
        max: 5,
        precision: 1,  // Allows 1.5, 2.5, etc.
      },
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => {
        if (!params.value) return ''
        return params.value.toString()
      }
    },
    {
      headerName: 'Other',
      field: 'other_features',
      width: 180,
      minWidth: 150,
      flex: 1,  // Takes remaining space
      editable: true,
      tooltipField: 'other_features',
      cellEditor: 'agLargeTextCellEditor',
      cellEditorParams: {
        maxLength: 100,
        rows: 3,
        cols: 30
      }
    },
    {
      field: 'square_feet',
      headerName: 'SF',
      editable: true,
      width: 90,
      type: 'numericColumn',
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => params.value ? formatNumber(params.value) : '',
    },
    {
      field: 'lease_start_date',
      headerName: 'Lease Start',
      editable: true,
      width: 120,
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: 'lease_end_date',
      headerName: 'Lease End',
      editable: true,
      width: 120,
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: 'base_rent_monthly',
      headerName: 'Monthly Rent',
      editable: true,
      width: 130,
      type: 'numericColumn',
      cellRenderer: (params: any) => {
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return params.valueFormatted ?? params.value
      },
      tooltipValueGetter: getPendingTooltip,
      valueFormatter: (params) => params.value ? formatCurrency(params.value) : '$0',
    },
    {
      headerName: 'Loss-to-Lease',
      field: 'loss_to_lease',
      width: 130,
      type: 'numericColumn',
      headerTooltip: 'Market Rent - Current Rent. Positive = below market (opportunity), Negative = above market (risk). Uses market rent from Floorplans.',
      cellStyle: (params) => {
        const pending = getPendingCellStyle(params)
        if (pending) return pending
        const unitType = params.data.unit_type
        const hasMarketRent = unitTypeMap.has(unitType)

        if (!hasMarketRent) {
          return { color: 'rgb(156 163 175)', fontWeight: '400' } // gray-400 (no market rent)
        }

        const l2l = params.value || 0
        if (l2l > 0) {
          return {
            color: 'rgb(134 239 172)',      // green-300 (below market - opportunity)
            fontWeight: '600'
          }
        } else if (l2l < 0) {
          return {
            color: 'rgb(252 165 165)',      // red-300 (above market - risk)
            fontWeight: '600'
          }
        }
        return { color: 'rgb(147 197 253)' } // blue-300 (at market)
      },
      valueFormatter: (params) => {
        const unitType = params.data.unit_type
        const hasMarketRent = unitTypeMap.has(unitType)

        if (!hasMarketRent) {
          return '—' // No market rent defined
        }

        const l2l = params.value || 0
        if (l2l === 0) return 'At Market'

        const sign = l2l > 0 ? '+' : ''
        return `${sign}$${Math.abs(l2l).toLocaleString()}`
      },
      valueGetter: (params) => {
        if (!params.data) return null
        const unitType = params.data.unit_type
        const inPlaceRent = Number(params.data.base_rent_monthly) || 0

        // Look up market rent from floorplan
        const floorplanData = unitTypeMap.get(unitType)
        if (!floorplanData || !floorplanData.market_rent) {
          return null
        }

        const marketRent = floorplanData.market_rent
        return marketRent - inPlaceRent
      },
      tooltipValueGetter: (params) => {
        const pendingTip = getPendingTooltip(params)
        if (pendingTip) return pendingTip
        if (!params.data) return ''
        const unitType = params.data.unit_type
        const floorplanData = unitTypeMap.get(unitType)

        if (!floorplanData) {
          return 'Define market rent in Floorplans tab'
        }

        const marketRent = floorplanData.market_rent || 0
        const inPlaceRent = Number(params.data.base_rent_monthly) || 0
        const l2l = marketRent - inPlaceRent

        return `Market: $${marketRent.toLocaleString()} | In-Place: $${inPlaceRent.toLocaleString()} | L2L: ${l2l >= 0 ? '+' : ''}$${l2l.toLocaleString()}`
      }
    },
    {
      field: 'lease_status',
      headerName: 'Status',
      editable: true,
      width: 150,
      minWidth: 130,
      cellRenderer: (params: any) => {
        // Pending change display takes precedence over StatusBadge
        const pending = pendingCellRenderer(params)
        if (pending !== undefined) return pending
        return <StatusBadge value={params.value} />
      },
      tooltipValueGetter: getPendingTooltip,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['ACTIVE', 'NOTICE_GIVEN', 'EXPIRED', 'MONTH_TO_MONTH', 'CANCELLED'],
      },
    },
    {
      headerName: '',
      field: 'actions',
      width: 80,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const lease = params.data
        if (!lease) return null

        return (
          <div className="d-flex justify-content-end gap-2" style={{ height: '100%', alignItems: 'center', display: 'flex' }}>
            <SemanticButton
              intent="secondary-action"
              variant="ghost"
              size="sm"
              className="p-1"
              title="Add row below"
              onClick={() => handleAddRowAt(params.node.rowIndex)}
            >
              <CIcon icon={cilPlus} size="sm" />
            </SemanticButton>
            <SemanticButton
              intent="destructive-action"
              variant="ghost"
              size="sm"
              className="p-1"
              title="Delete this row"
              onClick={() => handleDeleteRow(lease)}
            >
              <CIcon icon={cilTrash} size="sm" />
            </SemanticButton>
          </div>
        )
      },
    },
  ], [formatDate, formatCurrency, formatNumber, handleDeleteRow, handleAddRowAt, unitTypeMap, mutateLeases, showNotification, getPendingCellStyle, getPendingTooltip, pendingCellRenderer, hasPending, unitsWithChanges, getUnitSelectionState, selectAllForUnit, deselectAllForUnit])

  // Context menu with pending change actions
  const getContextMenuItems = useCallback((params: any) => {
    const items: any[] = []

    // Check if this cell has a pending change
    if (params.node?.data?.unit_id && params.column?.colDef?.field) {
      const key = `${params.node.data.unit_id}:${params.column.colDef.field}`
      const change = pendingByCell.get(key)
      if (change) {
        items.push({
          name: `Accept change (${change.currentValue} → ${change.newValue})`,
          action: () => {
            acceptChange(change.extractionId)
            showNotification('Accepted change', 'success')
          },
        })
        items.push({
          name: 'Keep existing value',
          action: () => {
            rejectChange(change.extractionId)
            showNotification('Kept existing value', 'success')
          },
        })
        items.push('separator')
      }
    }

    // Default AG-Grid items
    items.push('copy', 'copyWithHeaders', 'separator', 'export')
    return items
  }, [pendingByCell, acceptChange, rejectChange, showNotification])

  // Auto-save on cell change
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<Lease>) => {
    const updatedLease = event.data
    const leaseId = updatedLease?.lease_id
    const field = event.colDef.field!
    const newValue = event.newValue
    const oldValue = event.oldValue

    console.log(`Field changed: ${field}, Old: ${oldValue}, New: ${newValue}`)

    // Don't save if value didn't actually change
    if (newValue === oldValue) return

    // Skip if both values are "empty" (null, undefined, or empty string)
    const isOldEmpty = oldValue === null || oldValue === undefined || oldValue === ''
    const isNewEmpty = newValue === null || newValue === undefined || newValue === ''
    if (isOldEmpty && isNewEmpty) {
      console.log('Both old and new values are empty, skipping save')
      return
    }

    // Don't proceed if no lease_id (new row not yet saved)
    if (!leaseId) {
      console.warn('No lease_id - row not yet saved')
      return
    }

    // AUTO-FILL: When unit_type changes, populate related fields from floorplan
    if (field === 'unit_type') {
      const floorplanData = unitTypeMap.get(newValue)

      console.log(`Unit type changed to: ${newValue}`)
      console.log('Floorplan data found:', floorplanData)

      try {
        // Always save the unit_type value first
        const updates: any = { unit_type: newValue }

        // Add auto-fill values if available from floorplan
        // Always update bed/bath/SF when unit type changes (overwrite existing values)
        if (floorplanData) {
          console.log('Auto-filling from floorplan:', floorplanData)
          console.log('Current row values - bedrooms:', updatedLease.bedrooms, 'bathrooms:', updatedLease.bathrooms, 'square_feet:', updatedLease.square_feet)

          // Always overwrite bedrooms with floorplan data
          if (floorplanData.bedrooms) {
            console.log('Updating bedrooms from', updatedLease.bedrooms, 'to', floorplanData.bedrooms)
            updates.bedrooms = floorplanData.bedrooms
          }

          // Always overwrite bathrooms with floorplan data
          if (floorplanData.bathrooms) {
            console.log('Updating bathrooms from', updatedLease.bathrooms, 'to', floorplanData.bathrooms)
            updates.bathrooms = floorplanData.bathrooms
          }

          // Always overwrite square_feet with floorplan data
          if (floorplanData.square_feet) {
            console.log('Updating square_feet from', updatedLease.square_feet, 'to', floorplanData.square_feet)
            updates.square_feet = floorplanData.square_feet
          }
        }

        console.log('Saving unit_type and auto-fill to units table:', updates)

        await unitsAPI.update(updatedLease.unit_id, updates)

        // Update the underlying data object directly
        // This won't trigger onCellValueChanged events
        const rowData = event.node.data
        rowData.unit_type = newValue
        if (updates.bedrooms !== undefined) {
          rowData.bedrooms = updates.bedrooms
        }
        if (updates.bathrooms !== undefined) {
          rowData.bathrooms = updates.bathrooms
        }
        if (updates.square_feet !== undefined) {
          rowData.square_feet = updates.square_feet
        }

        // Refresh the cells to show the updated values
        const columnsToRefresh = ['unit_type', 'bedrooms', 'bathrooms', 'square_feet']
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: columnsToRefresh,
          force: true
        })

        console.log('✅ Unit type and auto-fill saved successfully')
        showNotification(`✅ Unit type set to: ${newValue}`, 'success')
        return

      } catch (error) {
        console.error('Failed to save unit_type:', error)
        // Revert on error
        event.node.setDataValue(field, oldValue)
        showNotification(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
        return
      }
    }

    // NORMAL SAVE: For all other field changes
    try {
      console.log(`Saving ${field}: ${newValue}`)

      // Determine which API to call based on field
      const isUnitField = ['unit_number', 'building_name', 'bedrooms', 'bathrooms', 'square_feet', 'other_features'].includes(field)
      const isFloorplanAffectingField = ['bedrooms', 'bathrooms', 'square_feet'].includes(field)

      if (isUnitField && isFloorplanAffectingField) {
        // Check if this differs from the floorplan
        const checkResponse = await leasesAPI.checkFloorplanDiff(leaseId, {
          [field]: newValue,
          unit_type: updatedLease.unit_type
        })

        if (checkResponse.differs_from_floorplan) {
          // Store the pending update and show dialog
          setPendingUpdate({
            leaseId,
            field,
            newValue,
            oldValue,
            event
          })
          setFloorplanCheck(checkResponse)
          setFloorplanDialogOpen(true)
          return
        } else {
          // No difference, just update the unit
          await unitsAPI.update(updatedLease.unit_id, { [field]: newValue })
        }
      } else if (isUnitField) {
        // Update unit (non-floorplan fields)
        await unitsAPI.update(updatedLease.unit_id, { [field]: newValue })
      } else {
        // Update lease
        await leasesAPI.update(leaseId, { [field]: newValue })
      }

      console.log(`✅ Saved ${field}`)
      await mutateLeases()
      showNotification('✅ Saved successfully', 'success')

    } catch (error) {
      console.error('Failed to save:', error)
      event.node.setDataValue(field, oldValue)
      showNotification(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }, [mutateLeases, showNotification, unitTypeMap])

  // Add new row
  const handleAddRow = useCallback(async () => {
    setIsAdding(true)

    try {
      // First, create a unit
      const newUnit = {
        project_id: projectId,
        unit_number: 'NEW-' + Date.now(),
        unit_type: '1BR',
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 650,
        market_rent: 1250,
        renovation_status: 'ORIGINAL',
      }

      const createdUnit = await unitsAPI.create(newUnit)
      const unitId = createdUnit.unit_id

      // Then, create a lease for that unit
      const today = new Date().toISOString().split('T')[0]
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const newLease = {
        unit_id: unitId,
        resident_name: null,
        lease_start_date: today,
        lease_end_date: nextYear,
        lease_term_months: 12,
        base_rent_monthly: 0,
        lease_status: 'ACTIVE',
      }

      await leasesAPI.create(newLease)

      await mutateLeases() // Refresh grid
      showNotification('✅ Created new unit successfully', 'success')
    } catch (error) {
      console.error('Failed to add row:', error)
      showNotification(`❌ Failed to add unit: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsAdding(false)
    }
  }, [projectId, mutateLeases, showNotification])

  // Refresh data
  const handleRefresh = useCallback(async () => {
    await mutateLeases()
  }, [mutateLeases])

  // Handle floorplan dialog confirmation
  const handleFloorplanConfirm = useCallback(async (
    action: 'create' | 'update' | 'none',
    newUnitTypeCode?: string
  ) => {
    if (!pendingUpdate) return

    try {
      const { leaseId, field, newValue } = pendingUpdate

      // Call the update-with-floorplan endpoint
      await leasesAPI.updateWithFloorplan(leaseId, {
        unit_fields: { [field]: newValue },
        floorplan_action: action,
        new_unit_type_code: newUnitTypeCode
      })

      // Clear pending state
      setPendingUpdate(null)
      setFloorplanCheck(null)
      setFloorplanDialogOpen(false)

      // Refresh data
      await mutateLeases()
      showNotification('✅ Saved successfully', 'success')
    } catch (error) {
      console.error('Failed to save with floorplan:', error)
      // Revert the cell value
      if (pendingUpdate.event) {
        pendingUpdate.event.node.setDataValue(pendingUpdate.field, pendingUpdate.oldValue)
      }
      showNotification(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }, [pendingUpdate, mutateLeases, showNotification])

  // Handle floorplan dialog cancellation
  const handleFloorplanCancel = useCallback(() => {
    if (pendingUpdate && pendingUpdate.event) {
      // Revert the cell value
      pendingUpdate.event.node.setDataValue(pendingUpdate.field, pendingUpdate.oldValue)
    }
    setPendingUpdate(null)
    setFloorplanCheck(null)
  }, [pendingUpdate])

  // Loading state
  if (!response && !error) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading rent roll...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">
            Failed to load rent roll: {error.message}
          </p>
        </div>
      </div>
    )
  }

  // Empty state - only show when BOTH leases and units are empty
  if (gridData.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">No leases or units found. Click "Add Unit/Suite" to start.</p>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500"
          >
            ➕ Add Unit/Suite
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Metrics Tiles */}
      <div className="px-6 pt-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <MetricTile
            label="Total Units"
            value={metrics.totalUnits}
            color="blue"
          />
          <MetricTile
            label="Occupied"
            value={metrics.occupiedUnits}
            subtext={`${metrics.physicalOccupancyPct.toFixed(1)}% physical`}
            color="green"
          />
          <MetricTile
            label="Vacant"
            value={metrics.vacantUnits}
            color="red"
          />
          <MetricTile
            label="Monthly Rent"
            value={`$${metrics.monthlyScheduledRent.toLocaleString()}`}
            subtext="Scheduled"
            color="green"
          />
          <MetricTile
            label="Economic Occ"
            value={`${metrics.economicOccupancyPct.toFixed(1)}%`}
            subtext="Rent/Market"
            color={metrics.economicOccupancyPct >= 95 ? 'green' : 'yellow'}
          />
          <MetricTile
            label="Monthly L2L"
            value={`${metrics.totalMonthlyL2L >= 0 ? '+' : ''}$${Math.abs(metrics.totalMonthlyL2L).toLocaleString()}`}
            subtext={metrics.totalMonthlyL2L >= 0 ? 'Opportunity' : 'Premium'}
            color={metrics.totalMonthlyL2L >= 0 ? 'green' : 'red'}
          />
          <MetricTile
            label="Expiring Soon"
            value={metrics.leasesExpiring90Days}
            subtext="Next 90 days"
            color="yellow"
          />
        </div>
      </div>

      {/* Warning Banner for Missing Floorplans */}
      {unitTypes.length === 0 && (
        <div className="px-6 pb-4">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 flex items-center gap-3">
            <span className="text-yellow-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-300">No Floorplans Defined</p>
              <p className="text-xs text-yellow-400/80">
                Go to the Floorplans tab to define unit types. This will enable auto-fill and loss-to-lease calculations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`
          fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50
          ${notification.type === 'success'
            ? 'bg-green-900 border border-green-700 text-green-300'
            : 'bg-red-900 border border-red-700 text-red-300'
          }
        `}>
          {notification.message}
        </div>
      )}

      {/* Units-only mode banner */}
      {isShowingUnitsOnly && (
        <div className="px-6 pb-4">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 flex items-center gap-3">
            <span className="text-blue-400 text-xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300">Showing Unit Data (No Lease Records)</p>
              <p className="text-xs text-blue-400/80">
                Extracted from rent roll. Monthly rent shown from unit current_rent field.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Changes Banner */}
      {hasPending && pendingSummary && (
        <div className="px-6 pb-4">
          <div className="rr-pending-banner">
            <span className="text-yellow-400 text-xl">&#9670;</span>
            <div className="flex-1">
              <span className="rr-pending-banner__text">
                {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
                {pendingSummary.units_with_changes > 0 && ` across ${pendingSummary.units_with_changes} unit${pendingSummary.units_with_changes !== 1 ? 's' : ''}`}
                {pendingDocName && <span className="rr-pending-banner__subtext"> from {pendingDocName}</span>}
              </span>
            </div>
            <div className="rr-pending-banner__actions">
              <button
                onClick={acceptAll}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-700 text-white hover:bg-green-600"
              >
                Accept All
              </button>
              <button
                onClick={rejectAll}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
              >
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 px-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {isShowingUnitsOnly ? 'Unit Inventory' : 'Current Leases'}
          </h2>
          <p className="text-sm text-gray-400">{gridData.length} units/suites</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddRow}
            disabled={isAdding}
            className={`
              px-3 py-2 text-xs font-medium rounded-md
              ${isAdding
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-500'
              }
            `}
          >
            {isAdding ? '⏳ Adding...' : '➕ Add Unit/Suite'}
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* AG-Grid */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="ag-theme-alpine" style={{ height: '600px', minWidth: '1200px', width: '100%' }}>
          <AgGridReact<RentRollRow>
            rowData={gridData}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
              suppressSizeToFit: true,  // Prevent auto-sizing that truncates
              minWidth: 80,              // Minimum column width
              wrapText: false,           // Keep single-line (no wrapping)
              autoHeight: false,         // Fixed row height
              cellStyle: (params) => {
                const pendingStyle = getPendingCellStyle(params)
                return pendingStyle || {}
              },
            }}
            suppressColumnVirtualisation={true}  // Render all columns (no truncation)
            suppressHorizontalScroll={false}     // Enable horizontal scroll
            domLayout="normal"                   // Normal layout (not autoHeight)
            theme="legacy"
            rowHeight={40}
            onGridReady={(params) => setGridApi(params.api)}
            onCellClicked={(params) => {
              // If this cell has a pending change, toggle acceptance on click
              handlePendingCellClick(params)
            }}
            onCellValueChanged={onCellValueChanged}
            getContextMenuItems={getContextMenuItems}
            animateRows={true}
            enableCellTextSelection={true}
          />
        </div>
      </div>

      {/* Floorplan Update Dialog */}
      <FloorplanUpdateDialog
        open={floorplanDialogOpen}
        onOpenChange={setFloorplanDialogOpen}
        floorplanCheck={floorplanCheck}
        proposedChanges={pendingUpdate ? { [pendingUpdate.field]: pendingUpdate.newValue } : {}}
        onConfirm={handleFloorplanConfirm}
        onCancel={handleFloorplanCancel}
      />
    </div>
  )
}
