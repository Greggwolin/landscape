'use client'

import React, { useState, useEffect } from 'react'
import { Parcel, Phase, Area, LandUseType } from '../PlanningWizard'

const landUseOptions: { value: LandUseType; label: string; densityRange: string }[] = [
  { value: 'LDR', label: 'Low Density Residential', densityRange: '1-3 units/acre' },
  { value: 'MDR', label: 'Medium Density Residential', densityRange: '4-8 units/acre' },
  { value: 'HDR', label: 'High Density Residential', densityRange: '12-25 units/acre' },
  { value: 'MHDR', label: 'Very High Density Residential', densityRange: '25+ units/acre' },
  { value: 'C', label: 'Commercial', densityRange: 'N/A' },
  { value: 'MU', label: 'Mixed Use', densityRange: 'Variable' },
  { value: 'OS', label: 'Open Space', densityRange: 'N/A' },
]

interface LandUseFamily {
  family_id: number
  name: string
}

interface LandUseSubtype {
  subtype_id: number
  family_id: number
  code: string
  name: string
  ord: number
  active: boolean
}

interface LandUseCode {
  landuse_id: number
  landuse_code: string
  name: string
  family_id: number
  subtype_id: number
  has_zoning: boolean
  has_programming: boolean
}

interface ProductType {
  type_code: string
  product: string
}

interface ParcelDetailCardProps {
  parcel: Parcel | null
  phase: Phase | null
  area: Area | null
  isOpen: boolean
  onSave: (areaId: string, phaseId: string, parcelId: string, updates: {
    name: string
    landUse: LandUseType
    acres: number
    units: number
    description: string
    landuse_code_id?: number
    type_code?: string
    family_name?: string
    product?: string
    frontage?: number
  }) => void
  onClose: () => void
  onDelete?: (areaId: string, phaseId: string, parcelId: string) => void
  onAddParcel?: () => void
}

const ParcelDetailCard: React.FC<ParcelDetailCardProps> = ({
  parcel,
  phase,
  area,
  isOpen,
  onSave,
  onClose,
  onDelete,
  onAddParcel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    landUse: 'MDR' as LandUseType,
    acres: 0,
    units: 0,
    description: '',
    landuse_code_id: null as number | null,
    frontage: 0,
    product: '',
    status: 'Planned',
    efficiency: 0.85,
    density_gross: 0,
    ff_per_acre: 0
  })

  const [landUseData, setLandUseData] = useState({
    families: [] as LandUseFamily[],
    subtypes: [] as LandUseSubtype[],
    codes: [] as LandUseCode[]
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  const [selectedFamily, setSelectedFamily] = useState<number | null>(null)
  const [selectedSubtype, setSelectedSubtype] = useState<number | null>(null)
  const [products, setProducts] = useState<ProductType[]>([])
  const [selectedSubtypeCode, setSelectedSubtypeCode] = useState<string>('')

  // Load land use data
  useEffect(() => {
    Promise.all([
      fetch('/api/landuse/families').then(res => res.json()),
      fetch('/api/landuse/subtypes').then(res => res.json()),
      fetch('/api/landuse/codes').then(res => res.json())
    ]).then(([familiesData, subtypesData, codesData]) => {
      setLandUseData({
        families: Array.isArray(familiesData) ? familiesData : [],
        subtypes: Array.isArray(subtypesData) ? subtypesData : [],
        codes: Array.isArray(codesData) ? codesData : []
      })
    }).catch(error => {
      console.error('Error loading land use data:', error)
    })
  }, [])

  // Update form data when parcel changes
  useEffect(() => {
    if (parcel) {
      setFormData({
        name: parcel.name,
        landUse: parcel.landUse,
        acres: parcel.acres,
        units: parcel.units,
        description: (parcel as any).description || '',
        landuse_code_id: (parcel as any).landuse_code_id || null,
        frontage: parcel.frontage || 0,
        product: parcel.product || '',
        status: parcel.status || 'Planned',
        efficiency: parcel.efficiency || 0.85,
        density_gross: parcel.density_gross || (parcel.acres > 0 ? parcel.units / parcel.acres : 0),
        ff_per_acre: parcel.ff_per_acre || (parcel.frontage && parcel.acres > 0 ? parcel.frontage / parcel.acres : 0)
      })

      // Set family and subtype from parcel data
      // First try using familyName directly
      if (parcel.familyName && landUseData.families.length > 0) {
        console.log('ParcelDetailCard - Looking up family:', parcel.familyName)
        const family = landUseData.families.find(f => f.name === parcel.familyName)
        console.log('ParcelDetailCard - Found family:', family)
        if (family) {
          // Convert family_id to number (database returns strings)
          const familyIdNum = typeof family.family_id === 'string' ? parseInt(family.family_id) : family.family_id
          setSelectedFamily(familyIdNum)

          // Then try to set subtype using subtypeName (which is type_code)
          if (parcel.subtypeName && landUseData.subtypes.length > 0) {
            console.log('ParcelDetailCard - Looking up subtype:', parcel.subtypeName, 'for family_id:', family.family_id)
            // Convert family_id to number for comparison (database returns strings)
            const familyIdNum = typeof family.family_id === 'string' ? parseInt(family.family_id) : family.family_id
            console.log('ParcelDetailCard - Available subtypes:', landUseData.subtypes.filter(st => {
              const stFamilyId = typeof st.family_id === 'string' ? parseInt(st.family_id) : st.family_id
              return stFamilyId === familyIdNum
            }))
            const subtype = landUseData.subtypes.find(st => {
              const stFamilyId = typeof st.family_id === 'string' ? parseInt(st.family_id) : st.family_id
              return st.code === parcel.subtypeName && stFamilyId === familyIdNum
            })
            console.log('ParcelDetailCard - Found subtype:', subtype)
            if (subtype) {
              const subtypeIdNum = typeof subtype.subtype_id === 'string' ? parseInt(subtype.subtype_id) : subtype.subtype_id
              setSelectedSubtype(subtypeIdNum)
            } else {
              console.warn('ParcelDetailCard - Subtype not found for code:', parcel.subtypeName)
            }
          }
        } else {
          console.warn('ParcelDetailCard - Family not found:', parcel.familyName)
        }
      } else if ((parcel as any).landuse_code_id) {
        // Fallback: Set family and subtype if landuse_code_id exists
        const code = landUseData.codes.find(c => c.landuse_id === (parcel as any).landuse_code_id)
        if (code) {
          setSelectedFamily(code.family_id)
          setSelectedSubtype(code.subtype_id)
        }
      }

      setHasChanges(false)
    }
  }, [parcel, landUseData.families, landUseData.subtypes, landUseData.codes])

  // Fetch products when subtype changes
  useEffect(() => {
    if (selectedSubtype && landUseData.subtypes.length > 0) {
      const subtype = landUseData.subtypes.find(st => {
        const stId = typeof st.subtype_id === 'string' ? parseInt(st.subtype_id) : st.subtype_id
        return stId === selectedSubtype
      })

      if (subtype) {
        setSelectedSubtypeCode(subtype.code)
        // Fetch products for this subtype
        fetch(`/api/landuse/products?subtype_code=${subtype.code}`)
          .then(res => res.json())
          .then(data => setProducts(data || []))
          .catch(err => console.error('Failed to fetch products:', err))
      }
    } else {
      setProducts([])
      setSelectedSubtypeCode('')
    }
  }, [selectedSubtype, landUseData.subtypes])

  // ESC key handling
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      console.log('ParcelDetailCard - Key pressed:', e.key, 'isOpen:', isOpen, 'hasChanges:', hasChanges)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (hasChanges) {
          console.log('ParcelDetailCard - Showing exit dialog due to changes')
          setShowExitDialog(true)
        } else {
          console.log('ParcelDetailCard - Closing without changes')
          onClose()
        }
      }
    }

    if (isOpen) {
      console.log('ParcelDetailCard - Adding ESC key listener after delay')
      // Add a small delay to ensure the component is fully initialized
      const timeoutId = setTimeout(() => {
        document.addEventListener('keydown', handleEscKey, true)
      }, 100)
      
      return () => {
        console.log('ParcelDetailCard - Removing ESC key listener')
        clearTimeout(timeoutId)
        document.removeEventListener('keydown', handleEscKey, true)
      }
    }
  }, [isOpen, hasChanges, onClose])

  // Track form changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (!parcel) return
    
    // Check if any field has changed from original values
    const newData = { ...formData, [field]: value }
    const hasChangedData =
      newData.name !== parcel.name ||
      newData.landUse !== parcel.landUse ||
      newData.acres !== parcel.acres ||
      newData.units !== parcel.units ||
      newData.description !== ((parcel as any).description || '') ||
      newData.frontage !== (parcel.frontage || 0) ||
      newData.product !== (parcel.product || '') ||
      newData.status !== (parcel.status || 'Planned')
    
    console.log('ParcelDetailCard - Form change:', { field, value, hasChangedData })
    setHasChanges(hasChangedData)
  }

  // Calculate density
  const calculateDensity = () => {
    return formData.acres > 0 ? (formData.units / formData.acres).toFixed(2) : '0'
  }

  // Get filtered subtypes based on selected family
  const getFilteredSubtypes = () => {
    return landUseData.subtypes.filter(st => {
      const stFamilyId = typeof st.family_id === 'string' ? parseInt(st.family_id) : st.family_id
      return stFamilyId === selectedFamily
    })
  }

  // Get filtered codes based on selected family and subtype
  const getFilteredCodes = () => {
    return landUseData.codes.filter(c => {
      const cFamilyId = typeof c.family_id === 'string' ? parseInt(c.family_id) : c.family_id
      const cSubtypeId = typeof c.subtype_id === 'string' ? parseInt(c.subtype_id) : c.subtype_id
      return cFamilyId === selectedFamily &&
        (!selectedSubtype || cSubtypeId === selectedSubtype)
    })
  }

  const handleSave = () => {
    if (parcel && phase && area) {
      // Get type_code and family_name from selected subtype and family
      const family = landUseData.families.find(f => {
        const fId = typeof f.family_id === 'string' ? parseInt(f.family_id) : f.family_id
        return fId === selectedFamily
      })
      const subtype = landUseData.subtypes.find(st => {
        const stId = typeof st.subtype_id === 'string' ? parseInt(st.subtype_id) : st.subtype_id
        return stId === selectedSubtype
      })

      const updates = {
        ...formData,
        type_code: subtype?.code,
        family_name: family?.name
      }

      onSave(area.id, phase.id, parcel.id, updates)
      onClose()
    }
  }

  const handleCancel = () => {
    if (parcel) {
      setFormData({
        name: parcel.name,
        landUse: parcel.landUse,
        acres: parcel.acres,
        units: parcel.units,
        description: (parcel as any).description || '',
        landuse_code_id: (parcel as any).landuse_code_id || null
      })
    }
    onClose()
  }

  const handleFamilyChange = (familyId: number | null) => {
    setSelectedFamily(familyId)
    setSelectedSubtype(null)
    setFormData({ ...formData, landuse_code_id: null })
  }

  const handleSubtypeChange = (subtypeId: number | null) => {
    setSelectedSubtype(subtypeId)
    setFormData({ ...formData, landuse_code_id: null })
  }

  const handleCodeChange = (codeId: number) => {
    const code = landUseData.codes.find(c => c.landuse_id === codeId)
    if (code) {
      // Map land use code to Planning Wizard land use type
      let planningLandUse: LandUseType = 'MDR'
      const codeStr = code.landuse_code.toUpperCase()
      if (codeStr.includes('SFD') || codeStr.includes('SFR')) planningLandUse = 'LDR'
      else if (codeStr.includes('SFA')) planningLandUse = 'MDR'
      else if (codeStr.includes('MF') && codeStr.includes('LD')) planningLandUse = 'MDR'
      else if (codeStr.includes('MF') && codeStr.includes('MD')) planningLandUse = 'HDR'
      else if (codeStr.includes('MF') && codeStr.includes('HD')) planningLandUse = 'MHDR'
      else if (codeStr.includes('COM') || codeStr.includes('RET')) planningLandUse = 'C'
      else if (codeStr.includes('MU')) planningLandUse = 'MU'
      else if (codeStr.includes('OS') || codeStr.includes('PARK')) planningLandUse = 'OS'

      setFormData({ 
        ...formData, 
        landuse_code_id: codeId,
        landUse: planningLandUse
      })
    }
  }

  if (!parcel || !phase || !area) return null

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Slide-out card */}
      <div className={`fixed right-0 top-0 h-full w-[480px] bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-green-600 text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Parcel Details</h2>
              <p className="text-sm text-green-100">{area.name} • {phase.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <style jsx>{`
              /* Remove number input spinners */
              input[type=number]::-webkit-outer-spin-button,
              input[type=number]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              input[type=number] {
                -moz-appearance: textfield;
              }
            `}</style>

            <div className="space-y-6">
              {/* Row 1: Parcel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Parcel Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Parcel: 1.201"
                />
              </div>

              {/* Row 2: Land Use Family - MUST BE FIRST */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Land Use Family
                </label>
                <select
                  value={selectedFamily || ''}
                  onChange={(e) => handleFamilyChange(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Family</option>
                  {landUseData.families.map(family => (
                    <option key={family.family_id} value={family.family_id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Land Use Subtype - AFTER Family */}
              {selectedFamily && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Land Use Type
                  </label>
                  <select
                    value={selectedSubtype || ''}
                    onChange={(e) => handleSubtypeChange(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Type</option>
                    {getFilteredSubtypes().map(subtype => (
                      <option key={subtype.subtype_id} value={subtype.subtype_id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row 3.5: Product Type - AFTER Land Use Type, BEFORE Acres/Units */}
              {selectedSubtype && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Type
                  </label>
                  <select
                    value={formData.product}
                    onChange={(e) => handleFormChange('product', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Product</option>
                    {products.map((prod, idx) => (
                      <option key={idx} value={prod.product}>
                        {prod.product}
                      </option>
                    ))}
                    <option value="__custom__">+ Add Custom...</option>
                  </select>
                  {formData.product === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Enter custom product type"
                      onChange={(e) => handleFormChange('product', e.target.value)}
                      className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* Row 4: Acres & Units - SAME ROW, NO SPINNERS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Acres
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.acres === 0 ? '' : formData.acres}
                    onChange={(e) => handleFormChange('acres', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.units === 0 ? '' : formData.units}
                    onChange={(e) => handleFormChange('units', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={['OS'].includes(formData.landUse)}
                  />
                  {/* Density display */}
                  {formData.acres > 0 && formData.units > 0 && !['C', 'OS'].includes(formData.landUse) && (
                    <p className="text-gray-400 text-xs mt-1">
                      Density: {calculateDensity()} units/acre
                    </p>
                  )}
                </div>
              </div>

              {/* Row 5: Frontage - Only show for SFD products (not TH) */}
              {formData.product &&
               formData.product.startsWith('SF') &&
               !formData.product.toUpperCase().includes('TH') &&
               !formData.product.toUpperCase().includes('TOWNHOME') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frontage (ft)
                  </label>
                  <input
                    type="text"
                    value={formData.frontage ? formData.frontage.toLocaleString('en-US') : ''}
                    readOnly
                    className="w-full bg-gray-600 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 cursor-default"
                    placeholder="Calculated"
                  />
                </div>
              )}

              {/* Row 7: Description - LAST POSITION */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={4}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Optional notes about this parcel"
                />
              </div>

              {/* Notes field REMOVED per requirements */}

              {/* Summary Info */}
              <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                <h4 className="font-medium text-sm text-gray-300 mb-2">Summary</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Area: {area.name}</div>
                  <div>Phase: {phase.name}</div>
                  <div>Land Use: {formData.landUse}</div>
                  <div>Acres: {formData.acres.toFixed(1)}</div>
                  <div>Units: {formData.units}</div>
                  {formData.frontage > 0 && <div>Frontage: {formData.frontage} ft</div>}
                  {formData.product && <div>Product: {formData.product}</div>}
                  {/* Status removed */}
                  {formData.acres && formData.units && !['C', 'OS'].includes(formData.landUse) && (
                    <div>Density: {calculateDensity()} units/acre</div>
                  )}
                </div>
              </div>

              {/* Add New Parcel Chip */}
              {onAddParcel && (
                <button
                  onClick={() => {
                    onClose()
                    onAddParcel()
                  }}
                  className="w-full px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  + Add New Parcel
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 flex justify-between">
            <div>
              {onDelete && area && phase && parcel && (
                <button
                  onClick={() => onDelete(area.id, phase.id, parcel.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete Parcel
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
            <div className="border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Unsaved Changes</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">You have unsaved changes. What would you like to do?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    setShowExitDialog(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Exit Without Saving
                </button>
                <button
                  onClick={() => {
                    if (parcel && area && phase) {
                      onSave(area.id, phase.id, parcel.id, formData)
                    }
                    setShowExitDialog(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ParcelDetailCard
