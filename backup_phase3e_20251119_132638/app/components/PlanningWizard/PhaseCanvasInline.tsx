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
    <div className="flex h-full" style={{ minWidth: 0, overflow: 'visible' }}>
      <div className="flex-1 p-6 bg-gray-950" style={{ minWidth: 0, overflow: 'visible' }}>
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full" style={{ minWidth: 0, overflow: 'visible' }}>
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
          <div className="p-6 h-full bg-gray-900" style={{ minWidth: 0, overflow: 'visible' }}>
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
              className="bg-gray-700 border-2 border-solid border-gray-600 rounded-lg"
              style={{ width: '100%', minWidth: '400px', height: '384px', overflow: 'visible' }}
            >
              <div style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
                height: '100%',
                overflowY: 'auto',
                width: '100%'
              }}>
                {phase.parcels.map((parcel) => {
                  console.log('🔴 RENDERING FROM PhaseCanvasInline.tsx - Parcel:', parcel.name)
                  const isEditing = editingParcel === parcel.id
                  const bgColor = parcel.landUse === 'C' ? '#ea580c' : '#16a34a'

                  return (
                    <div
                      key={parcel.id}
                      style={{
                        backgroundColor: bgColor,
                        color: 'white',
                        border: isEditing ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        minWidth: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: isEditing ? 'default' : 'pointer',
                        transition: 'all 0.2s'
                      }}
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
                      <div style={{
                        backgroundColor: 'yellow',
                        color: 'black',
                        padding: '4px',
                        fontWeight: 'bold'
                      }}>
                        TEST - CODE IS UPDATING
                      </div>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                          Parcel {parcel.name.replace('Parcel: ', '')}
                        </div>
                        {(parcel as any).description && (
                          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>{(parcel as any).description}</p>
                        )}
                        {parcel.notes && (
                          <p style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>{parcel.notes}</p>
                        )}
                      </div>

                      <div style={{ width: '100%', fontSize: '13px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ opacity: 0.9, minWidth: '64px', flexShrink: 0 }}>Family:</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ?
                              renderInlineInput('family', '', 'text', parcel.id) :
                              <span style={{ fontWeight: 600, wordWrap: 'break-word', overflowWrap: 'anywhere' }}>-</span>
                            }
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ opacity: 0.9, minWidth: '64px', flexShrink: 0 }}>Type:</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ?
                              renderInlineInput('subtype', '', 'text', parcel.id) :
                              <span style={{ fontWeight: 600, wordWrap: 'break-word', overflowWrap: 'anywhere' }}>{parcel.landUse || '-'}</span>
                            }
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ opacity: 0.9, minWidth: '64px', flexShrink: 0 }}>Product:</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ?
                              renderInlineInput('product', parcel.product, 'text', parcel.id) :
                              <span style={{ fontWeight: 600, wordWrap: 'break-word', overflowWrap: 'anywhere' }}>{parcel.product || '-'}</span>
                            }
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ opacity: 0.9, minWidth: '64px', flexShrink: 0 }}>Acres:</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ?
                              renderInlineInput('acres', parcel.acres, 'number', parcel.id) :
                              <span style={{ fontWeight: 600, wordWrap: 'break-word', overflowWrap: 'anywhere' }}>{parcel.acres || 0}</span>
                            }
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ opacity: 0.9, minWidth: '64px', flexShrink: 0 }}>Units:</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ?
                              renderInlineInput('units', parcel.units, 'number', parcel.id) :
                              <span style={{ fontWeight: 600, wordWrap: 'break-word', overflowWrap: 'anywhere' }}>{parcel.units || 0}</span>
                            }
                          </div>
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSaveParcel(parcel.id)}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '6px 8px',
                              backgroundColor: '#4b5563',
                              color: 'white',
                              fontSize: '12px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
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
          projectId={phase.projectId}
          areaId={area.dbId}
          phaseId={phase.dbId}
          onSubmit={handleParcelFormSubmit}
          onCancel={handleParcelFormCancel}
        />
      )}
    </div>
  )
}

export default PhaseCanvasInline
