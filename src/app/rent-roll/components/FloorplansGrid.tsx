'use client'

import { useCallback, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community'
import useSWR from 'swr'
import { fetchUnitTypes, unitTypesAPI } from '@/lib/api/multifamily'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import '../rent-roll-grid.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface UnitType {
  unit_type_id: number
  project_id: number
  unit_type_code: string
  bedrooms: number
  bathrooms: number
  avg_square_feet: number
  current_market_rent: number
  total_units: number
  notes?: string
  other_features?: string
  floorplan_doc_id?: number
}

interface UnitTypeResponse {
  success: boolean
  data: UnitType[]
  count: number
}

interface FloorplansGridProps {
  projectId: number
}

const FloorplansGrid: React.FC<FloorplansGridProps> = ({ projectId }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Fetch unit types
  const { data: response, error, mutate } = useSWR(
    projectId ? `/api/multifamily/unit-types?project_id=${projectId}` : null,
    fetchUnitTypes,
    { revalidateOnFocus: false }
  )

  const unitTypes = response?.data ?? []

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
    return new Intl.NumberFormat('en-US').format(numValue)
  }, [])

  // Delete unit type
  const handleDeleteRow = useCallback(async (unitType: UnitType) => {
    const confirmed = confirm(
      `Delete unit type "${unitType.unit_type_code}"? This cannot be undone.`
    )

    if (!confirmed) return

    try {
      await unitTypesAPI.delete(unitType.unit_type_id)

      await mutate()
      showNotification('✅ Deleted successfully', 'success')
    } catch (error) {
      console.error('Failed to delete:', error)
      showNotification(
        `❌ Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    }
  }, [mutate, showNotification])

  // Column definitions
  const columnDefs = useMemo<ColDef<UnitType>[]>(() => [
    {
      headerName: 'Unit Type',
      field: 'unit_type_code',
      width: 130,
      pinned: 'left',
      editable: true,
      cellStyle: { fontWeight: '600', color: 'rgb(147 197 253)' }
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
        precision: 0  // INTEGER ONLY (no decimals)
      },
      cellStyle: {
        textAlign: 'center'  // CENTER TEXT
      },
      valueFormatter: (params) => {
        if (!params.value) return ''
        return Math.floor(params.value).toString()  // Ensure integer display
      },
      valueParser: (params) => {
        return Math.floor(parseFloat(params.newValue))  // Round down to integer
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
        max: 10,
        precision: 2,  // UP TO 2 DECIMAL PLACES (allows 1.5, 2.25, 2.75, etc.)
        step: 0.25     // Increment by 0.25 when using arrow keys
      },
      cellStyle: {
        textAlign: 'center'  // CENTER TEXT
      },
      valueFormatter: (params) => {
        if (!params.value) return ''
        // Ensure we have a number first
        const numValue = typeof params.value === 'number' ? params.value : parseFloat(params.value)
        if (isNaN(numValue)) return ''
        // Show up to 2 decimals, but trim trailing zeros
        const num = parseFloat(numValue.toFixed(2))
        return num.toString()  // "1.5", "2", "2.25"
      }
    },
    {
      headerName: 'Avg SF',
      field: 'avg_square_feet',
      width: 100,
      type: 'numericColumn',
      editable: true,
      valueFormatter: (params) => params.value ? formatNumber(params.value) : '',
    },
    {
      headerName: 'Market Rent',
      field: 'current_market_rent',
      width: 130,
      type: 'numericColumn',
      editable: true,
      cellStyle: { fontWeight: '500', color: 'rgb(134 239 172)' }, // green-300
      valueFormatter: (params) => params.value ? formatCurrency(params.value) : '$0',
    },
    {
      headerName: 'Total Units',
      field: 'total_units',
      width: 110,
      type: 'numericColumn',
      editable: true,
      cellStyle: { fontWeight: '500', color: 'rgb(253 224 71)' }, // yellow-300
    },
    {
      headerName: 'Other Features',
      field: 'other_features',
      width: 200,
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
      headerName: 'Notes',
      field: 'notes',
      width: 250,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorParams: {
        maxLength: 500,
        rows: 5,
        cols: 40
      },
      tooltipField: 'notes'
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return (
          <button
            onClick={() => handleDeleteRow(params.data)}
            className="px-2 py-1 text-xs font-medium rounded bg-red-900/50 text-red-300 hover:bg-red-800 border border-red-700"
          >
            🗑️ Delete
          </button>
        )
      },
    },
  ], [formatCurrency, formatNumber, handleDeleteRow])

  // Auto-save on cell change
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<UnitType>) => {
    const updatedType = event.data
    const unitTypeId = updatedType?.unit_type_id
    const field = event.colDef.field!
    const newValue = event.newValue
    const oldValue = event.oldValue

    // Don't save if value didn't actually change
    if (newValue === oldValue) return

    if (!unitTypeId) return

    try {
      await unitTypesAPI.update(unitTypeId, { [field]: newValue })

      // Refresh grid data
      await mutate()
      showNotification('✅ Saved successfully', 'success')
    } catch (error) {
      console.error('Failed to save:', error)
      // Revert cell value
      if (event.node && event.colDef.field) {
        event.node.setDataValue(event.colDef.field, oldValue)
      }
      showNotification('❌ Failed to save changes', 'error')
    }
  }, [mutate, showNotification])

  // Add new unit type
  const handleAddRow = useCallback(async () => {
    setIsAdding(true)

    // Generate unique unit type code
    const existingCodes = unitTypes.map(ut => ut.unit_type_code)
    let newCode = 'NEW-1'
    let counter = 1
    while (existingCodes.includes(newCode)) {
      counter++
      newCode = `NEW-${counter}`
    }

    const newType = {
      project_id: projectId,
      unit_type_code: newCode,
      bedrooms: 1,
      bathrooms: 1,
      avg_square_feet: 650,
      current_market_rent: 0,
      total_units: 0,
    }

    try {
      await unitTypesAPI.create(newType)

      await mutate()
      showNotification('✅ Created new unit type successfully', 'success')
    } catch (error) {
      console.error('Failed to add row:', error)
      showNotification(
        `❌ Failed to add unit type: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    } finally {
      setIsAdding(false)
    }
  }, [projectId, unitTypes, mutate, showNotification])

  // Loading/error states
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Failed to load floorplans: {error.message}</p>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading floorplans...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
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

      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-6 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Floorplans & Market Assumptions</h2>
          <p className="text-sm text-gray-400">
            Define unit types with physical characteristics and market rent assumptions. Upload floorplan documents for AI analysis.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Total units across all types: {unitTypes.reduce((sum, ut) => sum + ut.total_units, 0)}
          </p>
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
            {isAdding ? '⏳ Adding...' : '➕ Add Unit Type'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="ag-theme-alpine-dark" style={{ height: '600px', minWidth: '1200px', width: '100%' }}>
          <AgGridReact<UnitType>
            rowData={unitTypes}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
              suppressSizeToFit: true,  // Prevent auto-sizing that truncates
              minWidth: 80,              // Minimum column width
              wrapText: false,           // Keep single-line (no wrapping)
              autoHeight: false          // Fixed row height
            }}
            suppressColumnVirtualisation={true}  // Render all columns (no truncation)
            suppressHorizontalScroll={false}     // Enable horizontal scroll
            domLayout="normal"                   // Normal layout (not autoHeight)
            theme="legacy"
            rowHeight={40}
            onCellValueChanged={onCellValueChanged}
            animateRows={true}
            enableCellTextSelection={true}
          />
        </div>
      </div>
    </div>
  )
}

export default FloorplansGrid
