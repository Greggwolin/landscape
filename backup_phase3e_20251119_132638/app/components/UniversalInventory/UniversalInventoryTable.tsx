'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, CellValueChangedEvent, GridReadyEvent } from 'ag-grid-community'
import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'
import { Plus, Upload, Download, Settings } from 'lucide-react'
// Using AG Grid legacy theme to avoid v34 Theming API conflict
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

// Land Use types
interface LandUseOption {
  value: string
  label: string
  code: string
  family_id?: string // For types
}

interface InventoryItem {
  item_id: number
  project_id: number
  property_type: string
  item_code: string
  hierarchy_values: Record<string, any>
  data_values: Record<string, any>
  container_id: number | null
  status: string | null
  [key: string]: any // For dynamic columns
}

interface ColumnConfig {
  column_config_id: number
  column_name: string
  column_label: string
  column_type: 'hierarchy' | 'data'
  container_level: number | null
  data_type: string | null
  is_required: boolean
  is_visible: boolean
  display_order: number
}

interface UniversalInventoryTableProps {
  projectId: number
  propertyType?: string
}

export default function UniversalInventoryTable({
  projectId,
  propertyType: propPropertyType
}: UniversalInventoryTableProps) {
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // State for land use options
  const [familyOptions, setFamilyOptions] = useState<LandUseOption[]>([])
  const [typeOptions, setTypeOptions] = useState<LandUseOption[]>([])
  const [productOptions, setProductOptions] = useState<LandUseOption[]>([])

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Fetch inventory data
  const fetcher = (url: string) => fetchJson<any>(url)
  const { data: response, error, mutate } = useSWR(
    projectId ? `/api/projects/${projectId}/inventory` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const inventoryData = response?.data
  const propertyType = propPropertyType || inventoryData?.property_type || 'mpc'
  const typeConfig = inventoryData?.type_config
  const columns: ColumnConfig[] = inventoryData?.columns || []
  const items: InventoryItem[] = inventoryData?.items || []

  // Transform items into flat structure for AG Grid
  const gridData = useMemo(() => {
    const transformed = items.map(item => {
      const flat: any = {
        item_id: item.item_id,
        item_code: item.item_code,
        container_id: item.container_id,
        // Land use FK fields (stored at row level, not in JSONB)
        family_id: item.family_id,
        type_id: item.type_id,
        product_id: item.product_id
      }

      // Flatten hierarchy_values
      if (item.hierarchy_values) {
        Object.entries(item.hierarchy_values).forEach(([key, value]) => {
          flat[key] = value
        })
      }

      // Flatten data_values
      if (item.data_values) {
        Object.entries(item.data_values).forEach(([key, value]) => {
          flat[key] = value
        })
      }

      return flat
    })
    console.log('UniversalInventoryTable - gridData:', transformed)
    return transformed
  }, [items])

  // Load land use options on mount
  useEffect(() => {
    const loadLandUseOptions = async () => {
      try {
        // Load families
        const familiesRes = await fetch('/api/land-use/families')
        const families = await familiesRes.json()
        setFamilyOptions(families)

        // Load all types (we'll filter them dynamically)
        const typesRes = await fetch('/api/land-use/types')
        const types = await typesRes.json()
        setTypeOptions(types)

        // Load all products (we'll filter them dynamically)
        const productsRes = await fetch('/api/land-use/products')
        const products = await productsRes.json()
        setProductOptions(products)
      } catch (error) {
        console.error('Failed to load land use options:', error)
      }
    }

    loadLandUseOptions()
  }, [])

  // Generate column definitions for AG Grid
  const columnDefs = useMemo<ColDef[]>(() => {
    const defs: ColDef[] = []

    console.log('UniversalInventoryTable - columns:', columns)
    console.log('UniversalInventoryTable - typeConfig:', typeConfig)

    // Note: item_code is hidden for MPC projects since Parcel hierarchy column shows the same info
    // For other property types (multifamily, office, etc.) we may want to show it

    // Add columns from configuration
    columns
      .filter(col => col.is_visible)
      .forEach(col => {
        const colDef: ColDef = {
          field: col.column_name,
          headerName: col.column_label,
          editable: true,
          width: col.column_type === 'hierarchy' ? 120 : 150,
          wrapHeaderText: true,
          autoHeaderHeight: true,
          headerClass: 'header-wrap-text'
        }

        // Right-justify numeric columns: lot_, acres_, units_, and product_id
        if (col.column_name.startsWith('lot_') ||
            col.column_name.startsWith('acres_') ||
            col.column_name.startsWith('units_') ||
            col.column_name === 'product_id') {
          colDef.cellClass = (colDef.cellClass ? colDef.cellClass + ' ' : '') + 'text-right'
          colDef.headerClass = (colDef.headerClass ? colDef.headerClass + ' ' : '') + 'header-wrap-text text-right'
        }

        // Configure based on data type
        if (col.data_type === 'number') {
          colDef.type = 'numericColumn'
          colDef.valueFormatter = (params) => {
            return params.value != null ? Number(params.value).toLocaleString() : ''
          }
        } else if (col.data_type === 'currency') {
          colDef.type = 'numericColumn'
          colDef.valueFormatter = (params) => {
            if (params.value == null) return ''
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(Number(params.value))
          }
        } else if (col.data_type === 'date') {
          colDef.valueFormatter = (params) => {
            if (!params.value) return ''
            return new Date(params.value).toLocaleDateString()
          }
        } else if (col.data_type === 'boolean') {
          colDef.cellRenderer = (params: any) => {
            return params.value ? '✓' : ''
          }
        } else if (col.column_name === 'family_id') {
          // Family dropdown (no cascading needed)
          colDef.cellEditor = 'agSelectCellEditor'
          colDef.cellEditorParams = {
            values: familyOptions.map(f => f.value)
          }
          colDef.valueFormatter = (params) => {
            const family = familyOptions.find(f => f.value === params.value?.toString())
            return family?.label || params.value || ''
          }
        } else if (col.column_name === 'type_id') {
          // Type dropdown (filtered by family_id)
          colDef.cellEditor = 'agSelectCellEditor'
          colDef.cellEditorParams = (params: any) => {
            const familyId = params.data.family_id
            const filteredTypes = familyId
              ? typeOptions.filter(t => t.family_id === familyId.toString())
              : typeOptions
            return {
              values: filteredTypes.map(t => t.value)
            }
          }
          colDef.valueFormatter = (params) => {
            const type = typeOptions.find(t => t.value === params.value?.toString())
            return type?.label || params.value || ''
          }
        } else if (col.column_name === 'product_id') {
          // Product dropdown (filtered by type_id via junction table)
          colDef.cellEditor = 'agSelectCellEditor'
          colDef.cellEditorParams = (params: any) => {
            const typeId = params.data.type_id
            const filteredProducts = typeId
              ? productOptions.filter(p => {
                  // Note: In real implementation, this would check junction table
                  // For now, showing all products
                  return true
                })
              : productOptions
            return {
              values: filteredProducts.map(p => p.value)
            }
          }
          colDef.valueFormatter = (params) => {
            const product = productOptions.find(p => p.value === params.value?.toString())
            return product?.label || params.value || ''
          }
        }

        // Hierarchy columns get special styling and string formatting
        if (col.column_type === 'hierarchy') {
          colDef.cellClass = 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
          // Force string type to prevent any number parsing
          colDef.cellDataType = 'text'
          // Ensure hierarchy values are always treated as strings
          colDef.valueFormatter = (params) => {
            if (params.value == null) return ''
            // Return as string, preserving leading zeros and dots
            return String(params.value)
          }
          // Prevent any value parsing
          colDef.valueParser = (params) => {
            // Return the raw string value without any parsing
            return params.newValue
          }
          // Use text cell editor to prevent number parsing
          colDef.cellEditor = 'agTextCellEditor'
        }

        defs.push(colDef)
      })

    // Note: Status column removed - status is for sales/leasing, not inventory

    console.log('UniversalInventoryTable - columnDefs:', defs)
    return defs
  }, [columns, typeConfig, familyOptions, typeOptions, productOptions])

  // Handle cell value changed
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const { data, colDef, newValue, oldValue } = event

    if (newValue === oldValue) return

    try {
      const field = colDef.field as string
      const columnInfo = columns.find(c => c.column_name === field)

      // Auto-populate lot dimensions when product is selected
      if (field === 'product_id' && newValue) {
        try {
          const productRes = await fetch(`/api/land-use/products/${newValue}`)
          const productDetails = await productRes.json()

          if (productDetails.lot_w_ft && productDetails.lot_d_ft) {
            const lotArea = productDetails.lot_w_ft * productDetails.lot_d_ft

            // Update the current row with lot area
            const item = items.find(i => i.item_id === data.item_id)
            const updates = {
              product_id: newValue,
              data_values: {
                ...(item?.data_values || {}),
                lot_area: lotArea
              }
            }

            const response = await fetch(`/api/projects/${projectId}/inventory/${data.item_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            })

            if (!response.ok) {
              throw new Error('Failed to update product and lot area')
            }

            await mutate()
            showNotification('✓ Product updated with lot dimensions', 'success')
            return
          }
        } catch (error) {
          console.error('Failed to auto-populate lot dimensions:', error)
          // Continue with regular update if auto-population fails
        }
      }

      // Determine if this is hierarchy or data value
      const isHierarchy = columnInfo?.column_type === 'hierarchy'
      const isItemCode = field === 'item_code'

      // Build update payload
      const updates: any = {}

      if (isItemCode) {
        updates.item_code = newValue
      } else if (field === 'family_id' || field === 'type_id' || field === 'product_id') {
        // Land use fields are stored directly on the row, not in JSONB
        updates[field] = newValue
      } else if (isHierarchy) {
        // Update hierarchy_values
        const item = items.find(i => i.item_id === data.item_id)
        updates.hierarchy_values = {
          ...(item?.hierarchy_values || {}),
          [field]: newValue
        }
      } else {
        // Update data_values
        const item = items.find(i => i.item_id === data.item_id)
        updates.data_values = {
          ...(item?.data_values || {}),
          [field]: newValue
        }
      }

      // Send update to API
      const response = await fetch(`/api/projects/${projectId}/inventory/${data.item_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update')
      }

      await mutate()
      showNotification('✓ Updated', 'success')
    } catch (error) {
      console.error('Failed to update cell:', error)
      showNotification(
        `✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
      // Revert the change
      event.node.setDataValue(event.colDef.field as string, oldValue)
    }
  }, [items, columns, projectId, mutate, showNotification])

  // Handle add new row
  const handleAddRow = useCallback(async () => {
    try {
      const newItemCode = `NEW-${items.length + 1}`

      const response = await fetch(`/api/projects/${projectId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_type: propertyType,
          item_code: newItemCode,
          hierarchy_values: {},
          data_values: {},
          status: 'Available'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create')
      }

      await mutate()
      showNotification('✓ Row added', 'success')
    } catch (error) {
      console.error('Failed to add row:', error)
      showNotification(
        `✗ Failed to add row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    }
  }, [items, projectId, propertyType, mutate, showNotification])

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Failed to load inventory data. Please refresh the page.
        </p>
      </div>
    )
  }

  if (!inventoryData) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading inventory...
      </div>
    )
  }

  const tabLabel = typeConfig?.tab_label || 'Inventory Table'

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{tabLabel}</h3>
            <span className="text-sm text-gray-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>

            <button
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>

            <button
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            <button
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Columns
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`px-6 py-2 text-sm flex-shrink-0 ${
          notification.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-b border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-b border-red-200 dark:border-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Grid */}
      <style jsx global>{`
        .ag-theme-alpine-dark .ag-header-cell-text {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          max-height: 2.6em; /* 2 lines * 1.3 line-height */
        }
        /* Custom dark theme to match Overview page styling */
        .ag-theme-alpine-dark {
          --ag-background-color: rgb(31, 41, 55); /* bg-gray-800 */
          --ag-foreground-color: rgb(229, 231, 235); /* text-gray-200 */
          --ag-header-background-color: rgb(17, 24, 39); /* bg-gray-900 */
          --ag-header-foreground-color: rgb(209, 213, 219); /* text-gray-300 */
          --ag-border-color: rgb(55, 65, 81); /* border-gray-700 */
          --ag-row-hover-color: rgb(55, 65, 81); /* hover:bg-gray-700 */
          --ag-selected-row-background-color: rgb(55, 65, 81);
          --ag-odd-row-background-color: rgb(31, 41, 55);
          --ag-header-cell-hover-background-color: rgb(31, 41, 55);
          --ag-input-focus-border-color: rgb(59, 130, 246); /* blue-500 */
        }
      `}</style>
      <div className="ag-theme-alpine-dark border border-gray-700 rounded-lg overflow-hidden" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          theme="legacy"
          rowData={gridData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            editable: true,
            flex: 1,
            minWidth: 100,
            wrapHeaderText: true,
            autoHeaderHeight: true
          }}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          enableCellChangeFlash={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
        />
      </div>
    </div>
  )
}
