'use client'

import React, { useState, useEffect } from 'react'
import { Project, Area, Phase, Parcel, LandUseType } from './PlanningWizard'
import DropZone from './DropZone'
import ParcelForm from './forms/ParcelForm'
import NavigationTiles from './NavigationTiles'

interface PhaseCanvasInlineProps {
  project: Project
  area: Area
  phase: Phase
  onAddParcel: (areaId: string, phaseId: string, parcelData: Omit<Parcel, 'id'>) => void
  onBack: () => void
  onNavigateToArea?: (areaId: string) => void
  onAddPhase?: (areaId: string) => void
  onOpenParcel?: (areaId: string, phaseId: string, parcelId: string) => void
}

const PhaseCanvasInline: React.FC<PhaseCanvasInlineProps> = ({
  project,
  area,
  phase,
  onAddParcel,
  onBack,
  onNavigateToArea,
  onAddPhase,
  onOpenParcel
}) => {
  console.log('🏗️ PhaseCanvasInline loaded with phase:', phase.name, 'parcels:', phase.parcels.length)
  const [showParcelForm, setShowParcelForm] = useState(false)
  const [editingParcel, setEditingParcel] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [landUseFamilies, setLandUseFamilies] = useState<any[]>([])
  const [landUseSubtypes, setLandUseSubtypes] = useState<any[]>([])
  const [landUseProducts, setLandUseProducts] = useState<any[]>([])

  // Load land use families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const response = await fetch('/api/landuse/choices?type=families')
        const families = await response.json()
        setLandUseFamilies(families || [])
      } catch (error) {
        console.error('Error loading families:', error)
      }
    }
    loadFamilies()
  }, [])

  // Load subtypes when family changes
  useEffect(() => {
    const loadSubtypes = async () => {
      const selectedFamily = editValues.family
      if (!selectedFamily) {
        setLandUseSubtypes([])
        return
      }

      try {
        const response = await fetch('/api/landuse/choices?type=subtypes')
        const allSubtypes = await response.json()
        // Filter subtypes by selected family on the frontend for now
        const filteredSubtypes = allSubtypes.filter((subtype: any) =>
          subtype.family_name === selectedFamily
        )
        setLandUseSubtypes(filteredSubtypes || [])
      } catch (error) {
        console.error('Error loading subtypes:', error)
        setLandUseSubtypes([])
      }
    }
    loadSubtypes()
  }, [editValues.family])

  // Load products when subtype changes
  useEffect(() => {
    const loadProducts = async () => {
      const selectedSubtype = editValues.subtype
      if (!selectedSubtype) {
        setLandUseProducts([])
        return
      }

      // Find the subtype ID from the selected subtype name
      const subtype = landUseSubtypes.find(st => st.name === selectedSubtype)
      if (!subtype) {
        setLandUseProducts([])
        return
      }

      try {
        const response = await fetch(`/api/landuse/products?subtype_id=${subtype.subtype_id}`)
        const products = await response.json()
        setLandUseProducts(products || [])
      } catch (error) {
        console.error('Error loading products:', error)
        setLandUseProducts([])
      }
    }
    loadProducts()
  }, [editValues.subtype, landUseSubtypes])

  // 'A' key handling to navigate back to Area page
  useEffect(() => {
    const handleAKey = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        if (!showParcelForm && !editingParcel && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Only trigger if no forms are open and no modifier keys
          const target = e.target as HTMLElement
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            return // Don't trigger if user is typing in a form field
          }
          e.preventDefault()
          e.stopPropagation()
          onBack()
        }
      }
    }

    document.addEventListener('keydown', handleAKey, true)
    return () => {
      document.removeEventListener('keydown', handleAKey, true)
    }
  }, [showParcelForm, editingParcel, onBack])

  const handleDropParcel = (item: { type: string }) => {
    if (item.type === 'parcel') {
      setShowParcelForm(true)
    }
  }

  const handleAddParcel = () => {
    setShowParcelForm(true)
  }

  const handleParcelFormSubmit = (parcelData: Omit<Parcel, 'id'>) => {
    onAddParcel(area.id, phase.id, parcelData)
    setShowParcelForm(false)
  }

  const handleParcelFormCancel = () => {
    setShowParcelForm(false)
  }

  const handleEditParcel = (parcelId: string, parcel: Parcel) => {
    if (onOpenParcel) {
      onOpenParcel(area.id, phase.id, parcelId)
      return
    }
    console.log('📦 Parcel edit clicked:', parcelId, parcel.name)
    setEditingParcel(parcelId)
    setEditValues({
      family: '',
      subtype: '',
      acres: parcel.acres || 0,
      units: parcel.units || 0,
      product: parcel.product || ''
    })
  }

  const handleSaveParcel = async (parcelId: string) => {
    try {
      // Find the parcel to get the database ID
      const parcel = phase.parcels.find(p => p.id === parcelId)
      if (!parcel?.dbId) {
        console.error('No database ID found for parcel')
        return
      }

      // Map the edit values to the API format
      const updateData = {
        acres: editValues.acres,
        units: editValues.units,
        product: editValues.product,
        // For now, save the selected family as usecode until we have proper DVL mapping
        usecode: editValues.family
      }

      const response = await fetch(`/api/parcels/${parcel.dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setEditingParcel(null)
        setEditValues({})
        // Clear the cascading dropdown state
        setLandUseSubtypes([])
        setLandUseProducts([])
        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('dataChanged'))
      } else {
        console.error('Failed to save parcel:', await response.text())
      }
    } catch (error) {
      console.error('Error saving parcel:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingParcel(null)
    setEditValues({})
    // Clear the cascading dropdown state
    setLandUseSubtypes([])
    setLandUseProducts([])
  }

  const handleInputChange = (field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getLandUseColor = (landUse: LandUseType) => {
    switch (landUse) {
      case 'LDR': return 'bg-emerald-600'
      case 'MDR': return 'bg-green-600'
      case 'HDR': return 'bg-teal-600'
      case 'MHDR': return 'bg-cyan-600'
      case 'C': return 'bg-orange-600'
      case 'MU': return 'bg-amber-600'
      case 'OS': return 'bg-blue-600'
      default: return 'bg-slate-600'
    }
  }

  const getLandUseBorderColor = (landUse: LandUseType) => {
    switch (landUse) {
      case 'LDR': return 'border-emerald-500'
      case 'MDR': return 'border-green-500'
      case 'HDR': return 'border-teal-500'
      case 'MHDR': return 'border-cyan-500'
      case 'C': return 'border-orange-500'
      case 'MU': return 'border-amber-500'
      case 'OS': return 'border-blue-500'
      default: return 'border-slate-500'
    }
  }

  const renderInlineInput = (field: string, value: any, type = 'text', parcelId?: string) => {
    if (field === 'family') {
      return (
        <select
          id={`parcel-${field}-${parcelId}`}
          name={`parcel-${field}-${parcelId}`}
          value={editValues[field] ?? ''}
          onChange={(e) => {
            handleInputChange(field, e.target.value)
            // Clear dependent fields when family changes
            setEditValues(prev => ({ ...prev, subtype: '', product: '' }))
          }}
          className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select Family</option>
          {landUseFamilies.map((family, index) => (
            <option key={family.family_id || family.family_name || index} value={family.family_name} className="bg-gray-800">
              {family.family_name}
            </option>
          ))}
        </select>
      )
    }

    if (field === 'subtype') {
      return (
        <select
          id={`parcel-${field}-${parcelId}`}
          name={`parcel-${field}-${parcelId}`}
          value={editValues[field] ?? ''}
          onChange={(e) => {
            handleInputChange(field, e.target.value)
            // Clear product when subtype changes
            setEditValues(prev => ({ ...prev, product: '' }))
          }}
          className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full font-semibold"
          onClick={(e) => e.stopPropagation()}
          disabled={!editValues.family}
        >
          <option value="">Select Subtype</option>
          {landUseSubtypes.map((subtype, index) => (
            <option key={subtype.subtype_id || subtype.subtype_name || index} value={subtype.subtype_name} className="bg-gray-800">
              {subtype.subtype_name}
            </option>
          ))}
        </select>
      )
    }

    if (field === 'product') {
      return (
        <select
          id={`parcel-${field}-${parcelId}`}
          name={`parcel-${field}-${parcelId}`}
          value={editValues[field] ?? ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full min-w-[7rem] font-semibold"
          onClick={(e) => e.stopPropagation()}
          disabled={!editValues.subtype}
        >
          <option value="">Select Product</option>
          {landUseProducts.map((product, index) => (
            <option key={product.product_id || product.code || index} value={product.code} className="bg-gray-800">
              {product.code}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={type}
        id={`parcel-${field}-${parcelId}`}
        name={`parcel-${field}-${parcelId}`}
        value={editValues[field] ?? value ?? ''}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full font-semibold"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 bg-gray-950">
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
          {/* Header with Navigation Tiles */}
          <div className="border-b border-gray-700 p-4">
            <NavigationTiles
              project={project}
              currentArea={area}
              currentPhase={phase}
              onNavigateToProject={onBack}
              onNavigateToArea={onNavigateToArea}
              onAddPhase={onAddPhase}
              onAddParcel={handleAddParcel}
              showProjectTile={false}
            />
          </div>

          {/* Phase Canvas */}
          <div className="p-6 h-full bg-gray-900">
            {/* Phase Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{phase.name}</h2>
              {(phase as any).description && (
                <p className="text-sm text-gray-300 mt-1">{(phase as any).description}</p>
              )}
            </div>

            <DropZone
              accepts={['parcel']}
              onDrop={handleDropParcel}
              className="w-full h-96 bg-gray-700 border-2 border-solid border-gray-600 rounded-lg"
            >
              <div className="p-4 grid grid-cols-1 gap-4 h-full overflow-y-auto">
                {phase.parcels.map((parcel) => {
                  const isEditing = editingParcel === parcel.id

                  return (
                    <div
                      key={parcel.id}
                      className={`${getLandUseColor(parcel.landUse)} ${getLandUseBorderColor(parcel.landUse)} text-white border-2 rounded-lg p-3 ${isEditing ? 'ring-2 ring-blue-400' : 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-white'} transition-all duration-200 h-fit`}
                    onClick={() => {
                      if (onOpenParcel) {
                        onOpenParcel(area.id, phase.id, parcel.id)
                        return
                      }
                      if (!isEditing) {
                        handleEditParcel(parcel.id, parcel)
                      }
                    }}
                    >
                      <div className="text-center mb-3">
                        <div className="font-bold text-sm mb-1 leading-tight">
                          Parcel {parcel.name.replace('Parcel: ', '')}
                        </div>
                        {(parcel as any).description && (
                          <p className="text-xs text-gray-100 opacity-90 mb-2">{(parcel as any).description}</p>
                        )}
                        {parcel.notes && (
                          <p className="text-xs text-gray-200 opacity-80 italic">{parcel.notes}</p>
                        )}
                      </div>

                      <div className="w-full text-xs mb-3 space-y-1">
                        <div className="flex items-center">
                          <span className="opacity-90 w-16 text-left">Family:</span>
                          <div className="flex-1">
                            {isEditing ?
                              renderInlineInput('family', '', 'text', parcel.id) :
                              <span className="font-semibold">-</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="opacity-90 w-16 text-left">Subtype:</span>
                          <div className="flex-1">
                            {isEditing ?
                              renderInlineInput('subtype', '', 'text', parcel.id) :
                              <span className="font-semibold">-</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="opacity-90 w-14 text-left">Product:</span>
                          <div className="flex-1 min-w-[7.5rem]">
                            {isEditing ?
                              renderInlineInput('product', parcel.product, 'text', parcel.id) :
                              <span className="font-semibold">{parcel.product || '-'}</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="opacity-90 w-16 text-left">Acres:</span>
                          <div className="flex-1">
                            {isEditing ?
                              renderInlineInput('acres', parcel.acres, 'number', parcel.id) :
                              <span className="font-semibold">{parcel.acres || 0}</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="opacity-90 w-16 text-left">Units:</span>
                          <div className="flex-1">
                            {isEditing ?
                              renderInlineInput('units', parcel.units, 'number', parcel.id) :
                              <span className="font-semibold">{parcel.units || 0}</span>
                            }
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - only show when editing */}
                      {isEditing && (
                        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSaveParcel(parcel.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </DropZone>
          </div>
        </div>
      </div>

      {/* Parcel Form Modal */}
      {showParcelForm && (
        <ParcelForm
          areaName={area.name}
          phaseName={phase.name}
          onSubmit={handleParcelFormSubmit}
          onCancel={handleParcelFormCancel}
        />
      )}
    </div>
  )
}

export default PhaseCanvasInline
