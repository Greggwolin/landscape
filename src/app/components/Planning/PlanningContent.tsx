// app/components/Planning/PlanningContent.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr'
import ParcelDetailCard from '../PlanningWizard/cards/ParcelDetailCard'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
import type { Parcel as WizardParcel, Phase as WizardPhase, Area as WizardArea } from '../PlanningWizard/PlanningWizard'

interface Parcel {
  parcel_id: number;
  area_no: number;
  phase_name: string;
  parcel_name: string;
  usecode: string;
  type_code?: string;
  product: string;
  acres: number;
  units: number;
  efficiency: number;
  family_name?: string;
  frontfeet?: number;
}

interface Phase {
  phase_id: number;
  area_no: number;
  phase_name: string;
  gross_acres: number;
  net_acres: number;
  units_total: number;
  start_date: string | null;
  status: string;
}

type ParcelDetailUpdates = {
  acres: number;
  units: number;
  product?: string | null;
  frontage?: number | null;
  landUse?: string;
  actualLanduseCode?: string;
}

type DetailContext = {
  parcel: WizardParcel;
  phase: WizardPhase;
  area: WizardArea;
}

type Props = { projectId?: number | null }
const PlanningContent: React.FC<Props> = ({ projectId = null }) => {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const fetcher = (url: string) => fetchJson(url)
  const { data: parcelsData, error: parcelsError, mutate: mutateParcels } = useSWR(
    projectId ? `/api/parcels?project_id=${projectId}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 0 }
  )
  const { data: phasesData, error: phasesError, mutate: mutatePhases } = useSWR(
    projectId ? `/api/phases?project_id=${projectId}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 0 }
  )

  useEffect(() => {
    if (parcelsData) setParcels(Array.isArray(parcelsData) ? parcelsData : [])
    if (phasesData) setPhases(Array.isArray(phasesData) ? phasesData : [])
    if (projectId != null) setLoading(false)
  }, [parcelsData, phasesData, projectId])

  // Refresh data when component mounts
  useEffect(() => {
    if (projectId) {
      mutateParcels()
      mutatePhases()
    }
  }, [projectId, mutateParcels, mutatePhases])

  // Listen for data changes from other components
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      const { entity, projectId: changedProjectId } = e.detail || {}
      if (entity === 'parcel' && changedProjectId === projectId) {
        // Refresh parcel data when changes occur
        mutateParcels()
      }
      if (entity === 'phase' && changedProjectId === projectId) {
        // Refresh phase data when changes occur
        mutatePhases()
      }
    }

    window.addEventListener('dataChanged', handleDataChange as EventListener)
    return () => window.removeEventListener('dataChanged', handleDataChange as EventListener)
  }, [projectId, mutateParcels, mutatePhases])

  const {
    labels,
    areaDisplayByNumber,
  } = useProjectConfig(projectId ?? undefined)

  const { level1Label, level2Label, level3Label, level1LabelPlural, level2LabelPlural, level3LabelPlural } = labels

  // number formatting helpers moved inline in JSX

  const getAreaStats = useCallback((areaNo: number) => {
    const areaParcels = parcels.filter(p => p.area_no === areaNo);
    const areaPhases = [...new Set(areaParcels.map(p => p.phase_name))].sort();
    
    return {
      grossAcres: Math.round(areaParcels.reduce((sum, p) => sum + (p.acres || 0), 0)),
      phases: areaPhases.length,
      parcels: areaParcels.length,
      units: areaParcels.reduce((sum, p) => sum + (p.units || 0), 0)
    };
  }, [parcels]);

  const areaCards = useMemo(() => {
    const entries = Array.from(areaDisplayByNumber.entries())
    if (entries.length > 0) {
      return entries
        .sort((a, b) => a[0] - b[0])
        .map(([areaNo, title]) => ({
          key: `area-${areaNo}`,
          title,
          stats: getAreaStats(areaNo)
        }))
    }

    const distinctAreas = Array.from(new Set(parcels.map(p => p.area_no))).sort((a, b) => a - b)
    const fallbackList = distinctAreas.length > 0 ? distinctAreas : [1, 2, 3, 4]
    return fallbackList.map(areaNo => ({
      key: `area-${areaNo}`,
      title: `${level1Label} ${areaNo}`,
      stats: getAreaStats(areaNo)
    }))
  }, [areaDisplayByNumber, parcels, level1Label, getAreaStats])

  // Sidecard state for parcel detail (wizard card embedded on this page)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailCtx, setDetailCtx] = useState<DetailContext | null>(null)
  
  // Phase filtering state
  const [selectedPhaseFilters, setSelectedPhaseFilters] = useState<string[]>([])

  // Filter parcels based on selected phases
  const filteredParcels = selectedPhaseFilters.length > 0
    ? parcels.filter(parcel => selectedPhaseFilters.includes(parcel.phase_name))
    : parcels

  // Toggle phase filter
  const togglePhaseFilter = (phaseName: string) => {
    setSelectedPhaseFilters(prev => 
      prev.includes(phaseName) 
        ? prev.filter(p => p !== phaseName)
        : [...prev, phaseName]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedPhaseFilters([])
  }

  // Get family name from parcel data (now included in API response)
  const getFamilyName = (parcel: Parcel): string => {
    return parcel.family_name || 'Unknown'
  }

  const openDetailForParcel = (p: Parcel) => {
    // Map Overview parcel to Wizard types (minimal fields used by card)
    const [, pStr] = String(p.phase_name).split('.')
    const areaNo = Number(p.area_no)
    const phaseNo = Number(pStr)
    const area: WizardArea = { id: `area-${areaNo}`, name: `${level1Label} ${areaNo}`, phases: [], saved: true }
    const phase: WizardPhase = { id: `phase-${areaNo}-${phaseNo}`, name: `${level2Label} ${areaNo}.${phaseNo}`, parcels: [], saved: true }
    const landUseOptions = ['MDR','HDR','LDR','MHDR','C','MU','OS'] as const
    type KnownLandUse = typeof landUseOptions[number]
    const landUse = landUseOptions.includes(p.usecode as KnownLandUse) ? (p.usecode as KnownLandUse) : 'MDR'
    const parcel: WizardParcel = {
      id: `parcel-db-${p.parcel_id}`,
      name: `Parcel: ${p.parcel_name}`,
      landUse,
      acres: Number(p.acres ?? 0),
      units: Number(p.units ?? 0),
      product: p.product ?? '',
      efficiency: Number(p.efficiency ?? 0),
      frontage: p.frontfeet ?? 0,
      dbId: p.parcel_id,
    }
    setDetailCtx({ parcel, phase, area })
    setDetailOpen(true)
  }

  if (parcelsError || phasesError) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-red-400 text-sm">Failed to load planning data. Please refresh or check server logs.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading planning data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-gray-950 min-h-screen">
      {/* View Mode Toggle */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Planning Overview</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">View Mode:</span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview' } }))}
              className="px-3 py-1 rounded text-sm bg-blue-600 text-white border border-blue-500"
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
              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
            >
              Spreadsheet
            </button>
          </div>
        </div>
      </div>

      {/* Level overview row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Level 1 summary */}
        <div className="bg-gray-800 rounded border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{level1LabelPlural}</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {areaCards.map(({ key, title, stats }) => (
                <div key={key} className="bg-gray-700 rounded p-3 border border-gray-600 min-w-[200px]">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1 truncate" title={title}>{title}</div>
                    <div className="space-y-1 text-xs text-gray-300">
                      <div>{stats.grossAcres} acres</div>
                      <div>{stats.phases} {level2LabelPlural}</div>
                      <div>{stats.parcels} {level3LabelPlural}</div>
                      <div>{stats.units} units</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level 2 summary */}
        <div className="bg-gray-800 rounded border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{level2LabelPlural} Overview</h3>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-2 text-gray-300 font-medium">{level2Label}</th>
                    <th className="text-center py-2 text-gray-300 font-medium">Acres</th>
                    <th className="text-left py-2 text-gray-300 font-medium">Uses</th>
                    <th className="text-center py-2 text-gray-300 font-medium">Units</th>
                    <th className="text-center py-2 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase, index) => (
                    <PhaseRow
                      key={phase.phase_id}
                      phase={phase}
                      index={index}
                      selectedFilters={selectedPhaseFilters}
                      onToggleFilter={togglePhaseFilter}
                      parcels={parcels}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Parcel Detail Section */}
      <div className="bg-gray-800 rounded border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Parcel Detail</h3>
          {selectedPhaseFilters.length > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-red-700 text-white text-sm rounded-full hover:bg-red-600 transition-colors"
            >
              Clear Filters ({selectedPhaseFilters.length})
            </button>
          )}
        </div>
        <div className={detailOpen ? 'p-2 grid grid-cols-3 gap-4' : 'overflow-x-auto'}>
          <div className={detailOpen ? 'col-span-2 overflow-x-auto' : ''}>
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-2 py-2 font-medium text-gray-300">{level1Label}</th>
                <th className="text-left px-2 py-2 font-medium text-gray-300">{level2Label}</th>
                <th className="text-left px-2 py-2 font-medium text-gray-300">{level3Label} ID</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Use Family</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Use Type</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Product</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Acres</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Units</th>
                <th className="text-center px-2 py-2 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParcels.map((parcel, index) => (
                <EditableParcelRow key={parcel.parcel_id} parcel={parcel} index={index}
                  onSaved={(updated) => setParcels(prev => prev.map(p => p.parcel_id === updated.parcel_id ? { ...p, ...updated } : p))}
                  onOpenDetail={() => openDetailForParcel(parcel)}
                  getFamilyName={getFamilyName}
                  projectId={projectId}
                />
              ))}
            </tbody>
          </table>
          </div>
          {detailOpen && detailCtx && (
            <div className="col-span-1">
              <ParcelDetailCard
                parcel={detailCtx.parcel}
                phase={detailCtx.phase}
                area={detailCtx.area}
                isOpen={true}
                onSave={async (_areaId, _phaseId, _parcelId, updates: ParcelDetailUpdates) => {
                  try {
                    const payload: Record<string, unknown> = {
                      acres: updates.acres,
                      units: updates.units,
                      frontfeet: updates.frontage ?? null
                    }

                    // Use actualLanduseCode (the real land use code) instead of landUse (planning type)
                    if (updates.actualLanduseCode && updates.actualLanduseCode.trim() !== '') {
                      payload.landuse_code = updates.actualLanduseCode

                      // Check if this is a residential land use code to determine if product should be kept
                      const isResidential = ['SFD', 'BTR', 'SFA', 'CONDO', 'MF', 'HDR', 'MHDR', 'MDR', 'MLDR'].includes(updates.actualLanduseCode)
                      if (isResidential) {
                        // Keep product for residential uses
                        payload.lot_product = updates.product ?? null
                      } else {
                        // Clear product for non-residential uses (Commercial, Industrial, etc.)
                        payload.lot_product = null
                      }
                    } else {
                      payload.lot_product = updates.product ?? null
                    }

                    console.log('💾 PATCH payload being sent:', payload)
                    const response = await fetch(`/api/parcels/${detailCtx.parcel.dbId}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    })

                    if (response.ok) {
                      // Refresh data from server to ensure consistency
                      await mutateParcels()
                      await mutatePhases()

                      // Broadcast data change event for other components
                      try {
                        window.dispatchEvent(new CustomEvent('dataChanged', {
                          detail: { entity: 'parcel', id: detailCtx.parcel.dbId, projectId }
                        }))
                      } catch {}
                    }
                  } catch (e) { console.error('Save via sidecard failed', e) }
                }}
                onClose={() => setDetailOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Filter helper UI
// Inline-editable parcel row
const EditableParcelRow: React.FC<{ parcel: Parcel; index: number; onSaved: (p: Parcel) => void; onOpenDetail?: () => void; getFamilyName: (parcel: Parcel) => string; projectId?: number | null }> = ({ parcel, index, onSaved, onOpenDetail, getFamilyName, projectId }) => {
  const [editing, setEditing] = useState(false)
  const [products, setProducts] = useState<{ product_id: string; code: string; name?: string; subtype_id?: string }[]>([])
  const [families, setFamilies] = useState<{ family_id: string; name: string }[]>([])
  const [types, setTypes] = useState<{ type_id: string; family_id: string; name: string }[]>([])
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [draft, setDraft] = useState({
    product: parcel.product ?? '',
    acres: parcel.acres ?? 0,
    units: parcel.units ?? 0,
    frontfeet: parcel.frontfeet ?? 0,
  })

  const normalizeProducts = (input: unknown): { product_id: string; code: string; name?: string; subtype_id?: string }[] => {
    if (!Array.isArray(input)) return []
    return input
      .map(entry => {
        if (typeof entry !== 'object' || entry === null) return null
        const record = entry as Record<string, unknown>
        const productIdValue = record.product_id
        const codeValue = record.code
        const nameValue = record.name
        if (productIdValue == null || typeof codeValue !== 'string') return null
        const product_id = String(productIdValue)
        const code = codeValue.trim()
        if (!product_id || !code) return null
        const subtypeVal = record.subtype_id
        return {
          product_id,
          code,
          name: typeof nameValue === 'string' ? nameValue.trim() : undefined,
          subtype_id: subtypeVal != null ? String(subtypeVal) : undefined
        }
      })
      .filter(value => value !== null) as { product_id: string; code: string; name?: string; subtype_id?: string }[]
  }

  const normalizeFamilies = (input: unknown): { family_id: string; name: string }[] => {
    if (!Array.isArray(input)) return []
    return input
      .map(entry => {
        if (typeof entry !== 'object' || entry === null) return null
        const record = entry as Record<string, unknown>
        const idValue = record.family_id ?? record.id
        const nameValue = record.name ?? record.family_name ?? record.code
        if (idValue == null || typeof nameValue !== 'string') return null
        const family_id = String(idValue)
        const name = nameValue.trim()
        if (!family_id || !name) return null
        return { family_id, name }
      })
      .filter((value): value is { family_id: string; name: string } => Boolean(value))
  }

  const normalizeTypes = (input: unknown): { type_id: string; family_id: string; name: string }[] => {
    if (!Array.isArray(input)) return []
    return input
      .map(entry => {
        if (typeof entry !== 'object' || entry === null) return null
        const record = entry as Record<string, unknown>
        const typeValue = record.type_id ?? record.subtype_id
        const familyValue = record.family_id
        const nameValue = record.type_name ?? record.name
        if (typeValue != null && familyValue != null && typeof nameValue === 'string') {
          const type_id = String(typeValue)
          const family_id = String(familyValue)
          const name = nameValue.trim()
          if (type_id && family_id && name) {
            return { type_id, family_id, name }
          }
        }
        return null
      })
      .filter((value): value is { type_id: string; family_id: string; name: string } => Boolean(value))
  }

  const loadTypesForFamily = async (familyId: string, preselectedTypeId?: string) => {
    try {
      const response = await fetch(`/api/landuse/types/${familyId}`)
      if (response.ok) {
        const typesData = await response.json()
        const normalizedTypes = normalizeTypes(typesData)
        setTypes(normalizedTypes)
        if (preselectedTypeId) {
          setSelectedType(preselectedTypeId)
          loadProductsForType(preselectedTypeId)
        }
        console.log('Loaded types for family', familyId, ':', normalizedTypes.length)
      }
    } catch (e) {
      console.error('Failed to load types for family', familyId, e)
    }
  }

  // Map type_id from types API to subtype_id used in lot products
  const mapTypeIdToSubtypeId = (typeId: string): string | null => {
    const mapping: Record<string, string> = {
      // Residential
      '7': '7',  // Single Family Detached: type_id 7 → subtype_id 7
      '8': '8',  // Single Family Attached: type_id 8 → subtype_id 8
      '9': '9',  // Townhomes: type_id 9 → subtype_id 9
      '10': '10', // Condominiums: type_id 10 → subtype_id 10
      '11': '11', // Apartments: type_id 11 → subtype_id 11
      '12': '12', // Multi-Family: type_id 12 → subtype_id 12

      // Commercial
      '14': '14', // Retail: type_id 14 → subtype_id 14
      '15': '15', // Office: type_id 15 → subtype_id 15
      '16': '16', // Hotel: type_id 16 → subtype_id 16
    }
    return mapping[typeId] || null
  }

  const loadProductsForType = async (typeId: string) => {
    try {
      // Map type_id to the actual subtype_id used in products
      const actualSubtypeId = mapTypeIdToSubtypeId(typeId)
      console.log('Mapping type_id', typeId, 'to subtype_id', actualSubtypeId)

      if (actualSubtypeId) {
        // Use the new lot-products API endpoint
        const response = await fetch(`/api/landuse/lot-products/${actualSubtypeId}`)
        if (response.ok) {
          const lotProductsData = await response.json()
          console.log('Raw lot products response:', lotProductsData)
          const normalizedProducts = normalizeProducts(lotProductsData)
          console.log('Normalized products:', normalizedProducts)
          setProducts(normalizedProducts)
          console.log('Loaded lot products for type', typeId, '(subtype_id:', actualSubtypeId, '):', normalizedProducts.length, 'products:', normalizedProducts.map((p: any) => p.code))
        } else {
          console.error('Failed to fetch lot products:', response.statusText)
          setProducts([])
        }
      } else {
        console.log('No subtype_id mapping found for type_id', typeId)
        setProducts([])
      }
    } catch (e) {
      console.error('Failed to load products for type', typeId, e)
    }
  }

  useEffect(() => {
    if (editing) {
      ;(async () => {
        try {
          console.log('🔥 Edit mode activated for parcel:', parcel.parcel_id)

          // Load families data
          const famRes = await fetch('/api/landuse/families')
          const familiesData = famRes.ok ? await famRes.json() : []
          const normalizedFamilies = normalizeFamilies(familiesData)
          setFamilies(normalizedFamilies)

          // Set the draft values to current parcel values
          setDraft({
            product: parcel.product || '',
            acres: parcel.acres || 0,
            units: parcel.units || 0,
            frontfeet: parcel.frontfeet || 0,
          })

          // TODO: Add pre-population logic here step by step
          console.log('Loaded families:', normalizedFamilies.length)
        } catch (e) {
          console.error('Failed to load land use lists', e)
        }
      })()
    } else {
      // Reset selections when not editing
      setSelectedFamily('')
      setSelectedType('')
      setTypes([])
      setProducts([])
    }
  }, [editing])

  const save = async () => {
    try {
      const res = await fetch(`/api/parcels/${parcel.parcel_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: draft.product,
          acres: Number(draft.acres),
          units: Number(draft.units),
          frontfeet: Number(draft.frontfeet),
        })
      })
      if (!res.ok) throw new Error(await res.text())

      const updatedParcel = { ...parcel, ...draft, acres: Number(draft.acres), units: Number(draft.units) } as Parcel
      onSaved(updatedParcel)
      setEditing(false)

      // Broadcast data change event for cross-component updates
      try {
        window.dispatchEvent(new CustomEvent('dataChanged', {
          detail: { entity: 'parcel', id: parcel.parcel_id, projectId: projectId }
        }))
      } catch {}
    } catch (e) {
      console.error('Save parcel failed', e)
      alert('Failed to save parcel')
    }
  }

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
      <td className="px-2 py-1.5 text-gray-300">{parcel.area_no}</td>
      <td className="px-2 py-1.5 text-gray-300">{parcel.phase_name}</td>
      <td className="px-2 py-1.5 text-gray-300">{parcel.parcel_name}</td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <div className="w-32">
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              value={selectedFamily}
              onChange={e => {
                const newFamily = e.target.value
                setSelectedFamily(newFamily);
                setSelectedType('');
                setDraft(d => ({ ...d, product: '' }))
                if (newFamily) {
                  loadTypesForFamily(newFamily)
                } else {
                  setTypes([])
                  setProducts([])
                }
              }}
            >
              <option value="">Select Family</option>
              {families.map(f => <option key={f.family_id} value={f.family_id}>{f.name}</option>)}
            </select>
          </div>
        ) : (
          <span className="text-gray-300">{getFamilyName(parcel)}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <div className="flex flex-col gap-1 w-32">
            {selectedFamily && (
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                value={selectedType}
                onChange={e => {
                  const newType = e.target.value
                  setSelectedType(newType)
                  setDraft(d => ({ ...d, product: '' }))
                  if (newType) {
                    loadProductsForType(newType)
                  } else {
                    setProducts([])
                  }
                }}
              >
                <option value="">Select Type</option>
                {types.filter(t => t.family_id === selectedFamily).map(t =>
                  <option key={t.type_id} value={t.type_id}>{t.name}</option>
                )}
              </select>
            )}
            {selectedFamily && selectedType && (
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                value={draft.product}
                onChange={e => setDraft(d => ({ ...d, product: e.target.value }))}
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.code}>
                    {p.name || p.code}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            selectedFamily === '1' ? 'bg-blue-900 text-blue-300' :
            selectedFamily === '2' ? 'bg-purple-900 text-purple-300' :
            'bg-indigo-900 text-indigo-300'
          }`}>
            {parcel.type_code || 'No Type'}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center text-gray-300">
        {editing ? (
          <div className="text-center text-gray-400 text-xs">
            {draft.product || 'Select Type first'}
          </div>
        ) : (
          parcel.product || 'None'
        )}
      </td>
      <td className="px-2 py-1.5 text-center text-gray-300">
        {editing ? (
          <input className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
            value={draft.acres} onChange={e => setDraft(d => ({ ...d, acres: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
        ) : (
          new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(parcel.acres)
        )}
      </td>
      <td className="px-2 py-1.5 text-center text-gray-300">
        {editing ? (
          <input className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
            value={draft.units} onChange={e => setDraft(d => ({ ...d, units: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
        ) : (
          new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(parcel.units)
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <div className="flex items-center gap-2 justify-center">
            <button className="px-1.5 py-0.5 text-xs bg-blue-700 text-white rounded" onClick={save}>Save</button>
            <button className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-200 rounded" onClick={() => { setEditing(false); setDraft({ product: parcel.product, acres: parcel.acres, units: parcel.units, frontfeet: parcel.frontfeet ?? 0 }) }}>Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <button className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600" onClick={() => setEditing(true)}>Edit</button>
            <button className="px-1.5 py-0.5 text-xs bg-indigo-700 text-white rounded hover:bg-indigo-600" onClick={() => onOpenDetail && onOpenDetail()}>Detail</button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default PlanningContent;

// Inline-edit for phase label/description (persist via PATCH)
const PhaseRow: React.FC<{ phase: Phase; index: number; selectedFilters: string[]; onToggleFilter: (phaseName: string) => void; parcels: Parcel[] }> = ({ phase, index, selectedFilters, onToggleFilter, parcels }) => {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Get unique type codes for this phase
  const phaseUseCodes = [...new Set(parcels.filter(p => p.phase_name === phase.phase_name).map(p => p.type_code))].filter(Boolean)

  useEffect(() => {
    // no-op defaults; label/description come from DB if/when added to GET
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/phases/${phase.phase_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, description }) })
      // Broadcast to other views (wizard) to refresh if needed
      try { window.dispatchEvent(new CustomEvent('dataChanged', { detail: { entity: 'phase', id: phase.phase_id } })) } catch {}
      setEditing(false)
    } catch (e) { console.error('Phase save failed', e) } finally { setSaving(false) }
  }

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
      <td className="py-2 px-2 text-gray-300">
        <div className="flex items-center gap-2">
          <span>{phase.phase_name}</span>
          {label && <span className="text-xs text-gray-400">— {label}</span>}
        </div>
      </td>
      <td className="py-2 px-2 text-center text-gray-300">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.gross_acres)}</td>
      <td className="py-2 px-2 text-left">
        <div className="flex flex-wrap gap-1">
          {phaseUseCodes.map((useCode, idx) => (
            <span key={useCode} className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              idx % 8 === 0 ? 'bg-blue-900 text-blue-300' :
              idx % 8 === 1 ? 'bg-purple-900 text-purple-300' :
              idx % 8 === 2 ? 'bg-orange-900 text-orange-300' :
              idx % 8 === 3 ? 'bg-green-900 text-green-300' :
              idx % 8 === 4 ? 'bg-red-900 text-red-300' :
              idx % 8 === 5 ? 'bg-yellow-900 text-yellow-300' :
              idx % 8 === 6 ? 'bg-pink-900 text-pink-300' :
              'bg-indigo-900 text-indigo-300'
            }`}>
              {useCode}
            </span>
          ))}
          {phaseUseCodes.length === 0 && <span className="text-gray-400 text-xs">No uses</span>}
        </div>
      </td>
      <td className="py-2 px-2 text-center text-gray-300">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.units_total)}</td>
      <td className="py-2 px-2 text-center">
        {editing ? (
          <div className="flex items-center gap-2 justify-center">
            <input className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-28" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} />
            <input className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-40" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <button className="px-2 py-1 text-xs bg-blue-700 text-white rounded" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <button className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600" onClick={() => setEditing(true)}>Detail</button>
            <button
              onClick={() => onToggleFilter(phase.phase_name)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                selectedFilters.includes(phase.phase_name)
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Filter
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
