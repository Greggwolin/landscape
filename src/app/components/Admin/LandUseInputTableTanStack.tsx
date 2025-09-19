'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Select components not currently used in this file; using custom select below
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
// Radix Select primitives not used; remove to reduce bundle and lint noise

interface LandUseFamily {
  family_id: string
  name: string
}

interface LandUseSubtype {
  subtype_id: string
  name: string
  family_id: string
}

interface LandUseCode {
  landuse_id: number
  landuse_code: string
  name: string
  subtype_id: number
  has_programming: boolean
  has_zoning: boolean
}

interface UnitOfMeasure {
  uom_code: string
  name: string
  uom_type: string
}

interface LandUseRow {
  id: string
  family_id: string | null
  subtype_id: string | null
  landuse_code_id: number | null
  uom_code: string | null
  unit_price: number
  has_programming: boolean
  has_zoning: boolean
  programming_sf?: number
  programming_units?: number
  zoning_sf?: number
  zoning_units?: number
  zoning_acres?: number
  notes?: string
}

const landUseRowSchema = z.object({
  family_id: z.string().min(1, 'Family is required'),
  subtype_id: z.string().min(1, 'Subtype is required'),
  landuse_code_id: z.number().min(1, 'Land use code is required'),
  uom_code: z.string().min(1, 'Unit of measure is required'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  has_programming: z.boolean(),
  has_zoning: z.boolean(),
  programming_sf: z.number().optional(),
  programming_units: z.number().optional(),
  zoning_sf: z.number().optional(),
  zoning_units: z.number().optional(),
  zoning_acres: z.number().optional(),
  notes: z.string().optional(),
})

const familyColors = {
  'Residential': { bg: 'bg-blue-600', text: 'text-white', dot: 'bg-blue-500' },
  'Commercial': { bg: 'bg-red-600', text: 'text-white', dot: 'bg-red-500' },
  'Industrial': { bg: 'bg-gray-500', text: 'text-white', dot: 'bg-gray-400' },
  'Mixed Use': { bg: 'bg-purple-600', text: 'text-white', dot: 'bg-purple-500' },
  'Open Space': { bg: 'bg-green-600', text: 'text-white', dot: 'bg-green-500' },
  'Public': { bg: 'bg-orange-600', text: 'text-white', dot: 'bg-orange-500' },
  'Transportation': { bg: 'bg-yellow-600', text: 'text-black', dot: 'bg-yellow-500' },
  'Utility': { bg: 'bg-cyan-600', text: 'text-white', dot: 'bg-cyan-500' },
}

const columnHelper = createColumnHelper<LandUseRow>()

// Custom dropdown component that renders outside container
const CustomSelect = ({ 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select...",
  disabled = false 
}: {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 200)
      })
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <>
      <div
        ref={triggerRef}
        className={`w-full border-0 bg-transparent p-0 h-8 text-white hover:bg-gray-700 flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="text-sm">{selectedOption?.label || placeholder}</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 999999,
          }}
          className="bg-gray-700 border border-gray-600 rounded-md shadow-xl max-h-60 overflow-auto"
        >
          {options.map((option) => (
            <div
              key={option.value}
              className="px-3 py-2 text-white hover:bg-gray-600 cursor-pointer text-sm"
              onClick={() => {
                onValueChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function LandUseInputTableTanStack() {
  const [families, setFamilies] = useState<LandUseFamily[]>([])
  const [subtypes, setSubtypes] = useState<LandUseSubtype[]>([])
  const [landUseCodes, setLandUseCodes] = useState<LandUseCode[]>([])
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [data, setData] = useState<LandUseRow[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<LandUseRow>({
    resolver: zodResolver(landUseRowSchema),
  })

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }


  useEffect(() => {
    Promise.all([
      fetch('/api/landuse/choices?type=families').then(res => res.json()),
      fetch('/api/landuse/choices?type=subtypes').then(res => res.json()),
      fetch('/api/landuse/choices?type=codes').then(res => res.json()),
      fetch('/api/fin/uoms').then(res => res.json()),
    ]).then(([familiesData, subtypesData, codesData, uomsData]) => {
      setFamilies(Array.isArray(familiesData) ? familiesData : [])
      setSubtypes(Array.isArray(subtypesData) ? subtypesData : [])
      setLandUseCodes(Array.isArray(codesData) ? codesData : [])
      setUoms(Array.isArray(uomsData) ? uomsData : [])
    }).catch(error => {
      console.error('Error loading data:', error)
      setFamilies([])
      setSubtypes([])
      setLandUseCodes([])
      setUoms([])
    })
  }, [])


  const toggleFamilySelection = (familyId: string) => {
    setSelectedFamilies(prev => 
      prev.includes(familyId) 
        ? prev.filter(id => id !== familyId)
        : [...prev, familyId]
    )
  }

  const addRow = () => {
    const newRow: LandUseRow = {
      id: Date.now().toString(),
      family_id: selectedFamilies.length === 1 ? selectedFamilies[0] : null,
      subtype_id: null,
      landuse_code_id: null,
      uom_code: null,
      unit_price: 0,
      has_programming: false,
      has_zoning: false,
    }
    setData(prev => [...prev, newRow])
  }

  // Auto-create rows when families are selected
  const createRowsForSelectedFamilies = () => {
    const existingFamilyIds = data.map(row => row.family_id)
    const newFamilyIds = selectedFamilies.filter(familyId => !existingFamilyIds.includes(familyId))
    
    if (newFamilyIds.length > 0) {
      const newRows = newFamilyIds.map(familyId => ({
        id: `${Date.now()}-${familyId}`,
        family_id: familyId,
        subtype_id: null,
        landuse_code_id: null,
        uom_code: null,
        unit_price: 0,
        has_programming: false,
        has_zoning: false,
      }))
      setData(prev => [...prev, ...newRows])
    }

    // Remove rows for unselected families
    setData(prev => prev.filter(row => 
      !row.family_id || selectedFamilies.includes(row.family_id)
    ))
  }

  // Effect to manage rows based on selected families
  useEffect(() => {
    if (selectedFamilies.length > 0) {
      createRowsForSelectedFamilies()
    } else {
      // Clear all rows if no families selected
      setData([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamilies])


  const updateCell = (rowId: string, field: keyof LandUseRow, value: any) => {
    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, [field]: value }
        
        // If updating landuse_code_id, also update has_zoning and has_programming flags
        if (field === 'landuse_code_id' && value) {
          const selectedCode = landUseCodes.find(c => c.landuse_id === parseInt(value))
          if (selectedCode) {
            updatedRow.has_zoning = selectedCode.has_zoning
            updatedRow.has_programming = selectedCode.has_programming
          }
        }
        
        return updatedRow
      }
      return row
    }))
  }


  const columns = useMemo<ColumnDef<LandUseRow>[]>(() => [
    columnHelper.accessor('subtype_id', {
      header: 'Subtype',
      cell: ({ getValue, row }) => {
        const subtypeId = getValue()
        const familyId = row.original.family_id
        const availableSubtypes = subtypes.filter(s => s.family_id === familyId)
        
        
        return (
          <select
            value={subtypeId || ''}
            onChange={(e) => updateCell(row.original.id, 'subtype_id', e.target.value)}
            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
          >
            <option value="">Select subtype</option>
            {availableSubtypes.length > 0 ? (
              availableSubtypes.map((subtype) => (
                <option key={subtype.subtype_id} value={subtype.subtype_id} className="text-white bg-gray-700">
                  {subtype.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No subtypes available</option>
            )}
          </select>
        )
      },
    }),
    columnHelper.accessor('landuse_code_id', {
      header: 'Zoning',
      cell: ({ getValue, row }) => {
        const codeId = getValue()
        const subtypeId = row.original.subtype_id
        const availableCodes = landUseCodes.filter(c => c.subtype_id && c.subtype_id.toString() === subtypeId)
        
        return (
          <select
            value={codeId?.toString() || ''}
            onChange={(e) => updateCell(row.original.id, 'landuse_code_id', parseInt(e.target.value))}
            disabled={!subtypeId}
            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm disabled:opacity-50"
          >
            <option value="">
              {subtypeId ? "Select code" : "Select subtype first"}
            </option>
            {availableCodes.map((code) => (
              <option key={code.landuse_id} value={code.landuse_id.toString()} className="text-white bg-gray-700">
                {code.landuse_code} - {code.name}
              </option>
            ))}
          </select>
        )
      },
    }),
    columnHelper.accessor('uom_code', {
      header: 'UOM',
      cell: ({ getValue, row }) => {
        const uomCode = getValue()
        
        return (
          <select
            value={uomCode || ''}
            onChange={(e) => updateCell(row.original.id, 'uom_code', e.target.value)}
            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
          >
            <option value="">Select UOM</option>
            {uoms.map((uom) => (
              <option key={uom.uom_code} value={uom.uom_code} className="text-white bg-gray-700">
                {uom.uom_code}
              </option>
            ))}
          </select>
        )
      },
    }),
    columnHelper.accessor('unit_price', {
      header: 'Unit Price',
      cell: ({ getValue, row }) => {
        const price = getValue()
        
        return (
          <Input
            type="number"
            step="0.01"
            value={price || ''}
            onChange={(e) => updateCell(row.original.id, 'unit_price', parseFloat(e.target.value) || 0)}
            className="w-full border-0 bg-transparent p-0 h-8 text-right text-white hover:bg-gray-700"
            placeholder="0.00"
          />
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id)
        const familyId = row.original.family_id
        const family = families.find(f => f.family_id === familyId)
        const colors = family ? familyColors[family.name as keyof typeof familyColors] : null
        
        return (
          <Button
            onClick={() => toggleRowExpansion(row.original.id)}
            size="sm"
            className={cn(
              "h-6 px-3 text-xs font-medium rounded-full transition-colors",
              isExpanded
                ? colors?.bg + " " + colors?.text + " border-transparent"
                : "bg-gray-600 text-gray-200 hover:bg-gray-500 border border-gray-500"
            )}
          >
            Detail
          </Button>
        )
      },
    }),
  ], [subtypes, landUseCodes, uoms, expandedRows])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })


  return (
    <div className="w-full space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Project Land Use Schema</h2>
          <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full font-medium">
            TanStack + shadcn/ui
          </span>
        </div>
        <Button onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white">Add Row</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {families.map((family) => {
          const isSelected = selectedFamilies.includes(family.family_id)
          const colors = familyColors[family.name as keyof typeof familyColors] || 
                        { bg: 'bg-gray-500', text: 'text-white', dot: 'bg-gray-400' }
          
          return (
            <Button
              key={family.family_id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFamilySelection(family.family_id)}
              className={cn(
                'flex items-center gap-2 border',
                isSelected ? `${colors.bg} ${colors.text} border-transparent` : 'bg-transparent text-white border-gray-600 hover:border-gray-400'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
              {family.name}
            </Button>
          )
        })}
      </div>

      <div className="border border-gray-700 rounded-md bg-gray-800 overflow-visible">
        <Table>
          {expandedRows.size === 0 && (
            <TableHeader className="sticky top-0 bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-gray-700 hover:bg-gray-700">
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id}
                      className={cn(
                        'text-gray-300 font-semibold',
                        header.column.id === 'unit_price' ? 'text-right' : ''
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                      }
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          )}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const familyId = row.original.family_id
                const family = families.find(f => f.family_id === familyId)
                const colors = family ? familyColors[family.name as keyof typeof familyColors] : null
                const isExpanded = expandedRows.has(row.original.id)
                
                if (isExpanded) {
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow className="bg-gray-900 border-gray-600">
                        <TableHead className="text-gray-300 font-semibold text-xs h-8">Subtype</TableHead>
                        <TableHead className="text-gray-300 font-semibold text-xs h-8">Zoning</TableHead>
                        <TableHead className="text-gray-300 font-semibold text-xs h-8">UOM</TableHead>
                        <TableHead className="text-gray-300 font-semibold text-xs h-8 text-right">Unit Price</TableHead>
                        
                        {row.original.has_programming && family?.name === 'Residential' && (
                          <TableHead className="text-gray-300 font-semibold text-xs h-8">Programming Units</TableHead>
                        )}
                        {row.original.has_zoning && family?.name === 'Residential' && (
                          <TableHead className="text-gray-300 font-semibold text-xs h-8">Zoning Units</TableHead>
                        )}

                        {row.original.has_programming && ['Commercial', 'Industrial', 'Mixed Use'].includes(family?.name || '') && (
                          <TableHead className="text-gray-300 font-semibold text-xs h-8">Programming SF</TableHead>
                        )}
                        {row.original.has_zoning && ['Commercial', 'Industrial', 'Mixed Use'].includes(family?.name || '') && (
                          <TableHead className="text-gray-300 font-semibold text-xs h-8">Zoning SF</TableHead>
                        )}

                        {row.original.has_zoning && ['Open Space', 'Transportation'].includes(family?.name || '') && (
                          <TableHead className="text-gray-300 font-semibold text-xs h-8">Zoning Acres</TableHead>
                        )}

                        <TableHead className="text-gray-300 font-semibold text-xs h-8">Notes</TableHead>
                        <TableHead className="text-gray-300 font-semibold text-xs h-8"></TableHead>
                      </TableRow>
                      
                      <TableRow className="bg-gray-800 border-gray-700 shadow-lg ring-2 ring-blue-500/20">
                        <TableCell className="text-white p-3">
                          <select
                            value={row.original.subtype_id || ''}
                            onChange={(e) => updateCell(row.original.id, 'subtype_id', e.target.value)}
                            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
                          >
                            <option value="">Select subtype</option>
                            {subtypes.filter(s => s.family_id === row.original.family_id).map(subtype => (
                              <option key={subtype.subtype_id} value={subtype.subtype_id}>
                                {subtype.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-white p-3">
                          <select
                            value={row.original.landuse_code_id?.toString() || ''}
                            onChange={(e) => updateCell(row.original.id, 'landuse_code_id', parseInt(e.target.value))}
                            disabled={!row.original.subtype_id}
                            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm disabled:opacity-50"
                          >
                            <option value="">
                              {row.original.subtype_id ? "Select code" : "Select subtype first"}
                            </option>
                            {landUseCodes.filter(c => c.subtype_id && c.subtype_id.toString() === row.original.subtype_id).map(code => (
                              <option key={code.landuse_id} value={code.landuse_id}>
                                {code.landuse_code} - {code.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-white p-3">
                          <select
                            value={row.original.uom_code || ''}
                            onChange={(e) => updateCell(row.original.id, 'uom_code', e.target.value)}
                            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
                          >
                            <option value="">Select UOM</option>
                            {uoms.map(uom => (
                              <option key={uom.uom_code} value={uom.uom_code}>
                                {uom.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-white p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={row.original.unit_price || ''}
                            onChange={(e) => updateCell(row.original.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500 text-right"
                            placeholder="0.00"
                          />
                        </TableCell>
                        
                        {row.original.has_programming && family?.name === 'Residential' && (
                          <TableCell className="text-white p-3">
                            <Input
                              type="number"
                              value={row.original.programming_units || ''}
                              onChange={(e) => updateCell(row.original.id, 'programming_units', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </TableCell>
                        )}
                        {row.original.has_zoning && family?.name === 'Residential' && (
                          <TableCell className="text-white p-3">
                            <Input
                              type="number"
                              value={row.original.zoning_units || ''}
                              onChange={(e) => updateCell(row.original.id, 'zoning_units', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </TableCell>
                        )}

                        {row.original.has_programming && ['Commercial', 'Industrial', 'Mixed Use'].includes(family?.name || '') && (
                          <TableCell className="text-white p-3">
                            <Input
                              type="number"
                              value={row.original.programming_sf || ''}
                              onChange={(e) => updateCell(row.original.id, 'programming_sf', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </TableCell>
                        )}
                        {row.original.has_zoning && ['Commercial', 'Industrial', 'Mixed Use'].includes(family?.name || '') && (
                          <TableCell className="text-white p-3">
                            <Input
                              type="number"
                              value={row.original.zoning_sf || ''}
                              onChange={(e) => updateCell(row.original.id, 'zoning_sf', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </TableCell>
                        )}

                        {row.original.has_zoning && ['Open Space', 'Transportation'].includes(family?.name || '') && (
                          <TableCell className="text-white p-3">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.original.zoning_acres || ''}
                              onChange={(e) => updateCell(row.original.id, 'zoning_acres', parseFloat(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </TableCell>
                        )}

                        <TableCell className="text-white p-3">
                          <Input
                            value={row.original.notes || ''}
                            onChange={(e) => updateCell(row.original.id, 'notes', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white h-8 focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes..."
                          />
                        </TableCell>
                        
                        <TableCell className="text-white p-3">
                          <Button
                            onClick={() => toggleRowExpansion(row.original.id)}
                            size="sm"
                            className={cn(
                              "h-6 px-3 text-xs font-medium rounded-full transition-colors",
                              colors?.bg + " " + colors?.text + " border-transparent"
                            )}
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                }
                
                return (
                  <TableRow key={row.id} className="hover:bg-gray-700 border-gray-700 text-white">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        className={cn(
                          'relative text-white',
                          cell.column.id === 'unit_price' && 'text-right tabular-nums'
                        )}
                      >
                        {colors && cell.column.id === 'subtype_id' && (
                          <div className={cn('absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full', colors.dot)} />
                        )}
                        <div className={colors && cell.column.id === 'subtype_id' ? 'ml-4' : ''}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="border-gray-700">
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-400">
                  Select family chips above to create land use entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}
