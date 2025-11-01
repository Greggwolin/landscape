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
  area_id?: number;
  phase_id?: number;
  phase_name: string;
  parcel_name: string;
  usecode: string;
  type_code?: string;
  product: string;
  product_code?: string;
  acres: number;
  units: number;
  efficiency: number;
  family_name?: string;
  frontfeet?: number;
}

interface Phase {
  phase_id: number;
  area_no: number;
  area_id?: number;
  phase_name: string;
  gross_acres: number;
  net_acres: number;
  units_total: number;
  start_date: string | null;
  status: string;
  description?: string;
  label?: string;
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
          areaNo,
          title,
          stats: getAreaStats(areaNo)
        }))
    }

    const distinctAreas = Array.from(new Set(parcels.map(p => p.area_no))).sort((a, b) => a - b)
    const fallbackList = distinctAreas.length > 0 ? distinctAreas : [1, 2, 3, 4]
    return fallbackList.map(areaNo => ({
      key: `area-${areaNo}`,
      areaNo,
      title: `${level1Label} ${areaNo}`,
      stats: getAreaStats(areaNo)
    }))
  }, [areaDisplayByNumber, parcels, level1Label, getAreaStats])

  // Sidecard state for parcel detail (wizard card embedded on this page)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailCtx, setDetailCtx] = useState<DetailContext | null>(null)

  // Area filtering state - now supports multiple selections
  const [selectedAreaFilters, setSelectedAreaFilters] = useState<number[]>([])

  // Phase filtering state
  const [selectedPhaseFilters, setSelectedPhaseFilters] = useState<string[]>([])

  // Phase editing state
  const [isAnyPhaseEditing, setIsAnyPhaseEditing] = useState(false)

  // Area editing state
  const [editingAreaNo, setEditingAreaNo] = useState<number | null>(null)
  const [editingAreaTitle, setEditingAreaTitle] = useState('')

  // Filter parcels based on area and phase filters
  const filteredParcels = useMemo(() => {
    let filtered = parcels

    // Apply area filters
    if (selectedAreaFilters.length > 0) {
      filtered = filtered.filter(parcel => selectedAreaFilters.includes(parcel.area_no))
    }

    // Apply phase filters
    if (selectedPhaseFilters.length > 0) {
      filtered = filtered.filter(parcel => selectedPhaseFilters.includes(parcel.phase_name))
    }

    return filtered
  }, [parcels, selectedAreaFilters, selectedPhaseFilters])

  // Filter phases based on area filters
  const filteredPhases = useMemo(() => {
    if (selectedAreaFilters.length > 0) {
      return phases.filter(phase => selectedAreaFilters.includes(phase.area_no))
    }
    return phases
  }, [phases, selectedAreaFilters])

  // Toggle area filter - multi-select like phase filters
  const toggleAreaFilter = (areaNo: number) => {
    setSelectedAreaFilters(prev =>
      prev.includes(areaNo)
        ? prev.filter(a => a !== areaNo)
        : [...prev, areaNo]
    )
  }

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
    setSelectedAreaFilters([])
    setSelectedPhaseFilters([])
  }

  // Add Phase function
  const addPhase = async (areaNo: number) => {
    if (!projectId) return

    try {
      const response = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, area_no: areaNo })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create phase')
      }

      const result = await response.json()
      console.log('Created phase:', result)

      // Refresh phases data
      await mutatePhases()
    } catch (error) {
      console.error('Error creating phase:', error)
      alert(`Failed to create phase: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Add Parcel function
  const addParcel = async (phaseId: number) => {
    if (!projectId) return

    try {
      // Find the phase to get area_id
      const phase = phases.find(p => p.phase_id === phaseId)
      if (!phase) {
        alert('Phase not found')
        return
      }

      // Find the next parcel number for this phase
      const phaseParcels = parcels.filter(p => p.phase_id === phaseId)
      const maxParcelNo = phaseParcels.length > 0
        ? Math.max(...phaseParcels.map(p => parseInt(p.parcel_name.split('.')[2] || '0')))
        : 0
      const nextParcelNo = maxParcelNo + 1

      const response = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          area_id: phase.area_id,
          phase_id: phaseId,
          family_name: 'Residential', // Default family
          acres_gross: 0,
          units_total: 0
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create parcel')
      }

      const result = await response.json()
      console.log('Created parcel:', result)

      // Refresh parcels data
      await mutateParcels()

      // Dispatch data change event
      window.dispatchEvent(new CustomEvent('dataChanged', {
        detail: { entity: 'parcel', id: result.parcel_id, projectId }
      }))
    } catch (error) {
      console.error('Error creating parcel:', error)
      alert(`Failed to create parcel: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Delete Parcel function
  const deleteParcel = async (parcelId: number) => {
    if (!projectId) return
    if (!confirm('Are you sure you want to delete this parcel?')) return

    try {
      const response = await fetch(`/api/parcels/${parcelId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to delete parcel')
      }

      // Refresh parcels and phases data
      await mutateParcels()
      await mutatePhases()

      // Dispatch data change event
      window.dispatchEvent(new CustomEvent('dataChanged', {
        detail: { entity: 'parcel', id: parcelId, projectId }
      }))
    } catch (error) {
      console.error('Error deleting parcel:', error)
      alert(`Failed to delete parcel: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Delete Phase function
  const deletePhase = async (phaseId: number) => {
    if (!projectId) return
    if (!confirm('Are you sure you want to delete this phase? All parcels in this phase must be deleted first.')) return

    try {
      const response = await fetch(`/api/phases/${phaseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete phase')
      }

      // Refresh phases data
      await mutatePhases()
      await mutateParcels()

      // Dispatch data change event
      window.dispatchEvent(new CustomEvent('dataChanged', {
        detail: { entity: 'phase', id: phaseId, projectId }
      }))
    } catch (error) {
      console.error('Error deleting phase:', error)
      alert(`Failed to delete phase: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Add Area function
  const addArea = async () => {
    if (!projectId) return

    const areaName = prompt('Enter area name (optional):')
    if (areaName === null) return // User cancelled

    try {
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          area_name: areaName || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create area')
      }

      const result = await response.json()
      console.log('Created area:', result)

      // Refresh all data
      await mutatePhases()
      await mutateParcels()
    } catch (error) {
      console.error('Error creating area:', error)
      alert(`Failed to create area: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Update Area function
  const updateAreaTitle = async (areaNo: number, newTitle: string) => {
    if (!projectId) return

    try {
      // Find the area_id for this area_no from phases data
      const phase = phases.find(p => p.area_no === areaNo)
      if (!phase?.area_id) {
        alert('Area not found - no phases exist for this area')
        return
      }

      const response = await fetch(`/api/areas/${phase.area_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newTitle
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update area')
      }

      // Refresh data
      await mutatePhases()
      await mutateParcels()

      setEditingAreaNo(null)
      setEditingAreaTitle('')
    } catch (error) {
      console.error('Error updating area:', error)
      alert(`Failed to update area: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Delete Area function
  const deleteArea = async (areaNo: number) => {
    if (!projectId) return
    if (!confirm('Are you sure you want to delete this area? All phases and parcels in this area must be deleted first.')) return

    try {
      // Find the area_id for this area_no from phases or parcels data
      const phase = phases.find(p => p.area_no === areaNo)
      const parcel = parcels.find(p => p.area_no === areaNo)
      const areaId = phase?.area_id || parcel?.area_id

      if (!areaId) {
        alert('Area not found or cannot be deleted - area_id not found')
        return
      }

      const response = await fetch(`/api/areas/${areaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete area')
      }

      // Refresh all data
      await mutatePhases()
      await mutateParcels()
    } catch (error) {
      console.error('Error deleting area:', error)
      alert(`Failed to delete area: ${error instanceof Error ? error.message : String(error)}`)
    }
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
    const area: WizardArea = {
      id: `area-${areaNo}`,
      name: `${level1Label} ${areaNo}`,
      phases: [],
      areaDbId: 0,
      areaNo
    }
    const phase: WizardPhase = {
      id: `phase-${areaNo}-${phaseNo}`,
      name: `${level2Label} ${areaNo}.${phaseNo}`,
      parcels: [],
      phaseDbId: 0,
      areaId: area.id,
      areaNo,
      phaseNo
    }
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
    <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'rgb(230, 231, 235)' }}>
      {/* Page Title */}
      <div className="rounded border p-3" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Planning Overview</h2>
      </div>

      {/* Level overview row */}
      <div className={`grid gap-4 transition-all duration-300 ${
        isAnyPhaseEditing
          ? 'grid-cols-1 lg:grid-cols-[20%_1fr]'
          : 'grid-cols-1 lg:grid-cols-[40%_1fr]'
      }`}>
        {/* Level 1 summary */}
        <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
          <div className="px-4 py-3 border-b" style={{ backgroundColor: 'rgb(241, 242, 246)', borderColor: 'var(--cui-border-color)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>{level1LabelPlural}</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {areaCards.map(({ key, areaNo, title, stats }) => (
                <div
                  key={key}
                  className="rounded p-3 border-2 transition-all min-w-[140px] relative"
                  style={selectedAreaFilters.includes(areaNo) ? {
                    backgroundColor: 'var(--cui-primary)',
                    borderColor: 'var(--cui-primary)',
                    opacity: 0.9
                  } : {
                    backgroundColor: 'var(--cui-card-bg)',
                    borderColor: 'var(--cui-border-color)'
                  }}
                >
                  <div
                    className="text-center cursor-pointer"
                    onClick={() => toggleAreaFilter(areaNo)}
                    onMouseEnter={(e) => {
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        if (selectedAreaFilters.includes(areaNo)) {
                          parent.style.opacity = '1';
                        } else {
                          parent.style.borderColor = 'var(--cui-primary)';
                          parent.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        if (selectedAreaFilters.includes(areaNo)) {
                          parent.style.opacity = '0.9';
                        } else {
                          parent.style.borderColor = 'var(--cui-border-color)';
                          parent.style.backgroundColor = 'var(--cui-card-bg)';
                        }
                      }
                    }}
                  >
                    <div className="text-lg font-bold mb-1 whitespace-nowrap"
                      style={{ color: selectedAreaFilters.includes(areaNo) ? 'white' : 'var(--cui-body-color)' }}
                      title={title}
                    >
                      {title}
                    </div>
                    <div className="space-y-1 text-xs"
                      style={{ color: selectedAreaFilters.includes(areaNo) ? 'rgba(255, 255, 255, 0.9)' : 'var(--cui-secondary-color)' }}
                    >
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
        <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
          <div className="px-4 py-3 border-b" style={{ backgroundColor: 'rgb(241, 242, 246)', borderColor: 'var(--cui-border-color)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>{level2LabelPlural} Overview</h3>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>{level2Label}</th>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Uses</th>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Description</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Acres</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Units</th>
                    <th className="text-center py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhases.map((phase, index) => (
                    <PhaseRow
                      key={phase.phase_id}
                      phase={phase}
                      index={index}
                      selectedFilters={selectedPhaseFilters}
                      onToggleFilter={togglePhaseFilter}
                      parcels={parcels}
                      onEditingChange={setIsAnyPhaseEditing}
                      onSaved={mutatePhases}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Parcel Detail Section */}
      <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: 'rgb(241, 242, 246)', borderColor: 'var(--cui-border-color)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Parcel Detail</h3>
          <div className="flex items-center gap-3">
            {(selectedAreaFilters.length > 0 || selectedPhaseFilters.length > 0) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-white text-sm rounded-full transition-colors"
                style={{ backgroundColor: 'var(--cui-danger)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Clear Filters ({selectedAreaFilters.length + selectedPhaseFilters.length})
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>Add {level3Label}:</span>
              <select
                className="rounded px-2 py-1 text-sm"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid'
                }}
                onChange={async (e) => {
                  if (e.target.value) {
                    const phaseId = parseInt(e.target.value)
                    await addParcel(phaseId)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select {level2Label}...</option>
                {filteredPhases.map((phase) => (
                  <option key={phase.phase_id} value={phase.phase_id}>
                    {phase.phase_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className={detailOpen ? 'p-2 grid grid-cols-3 gap-4' : 'overflow-x-auto'}>
          <div className={detailOpen ? 'col-span-2 overflow-x-auto' : ''}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
              <tr>
                <th className="text-left px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>{level1Label}</th>
                <th className="text-left px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>{level2Label}</th>
                <th className="text-left px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>{level3Label} ID</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Use Family</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Use Type</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Product</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Acres</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Units</th>
                <th className="text-center px-2 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParcels.map((parcel, index) => (
                <EditableParcelRow key={parcel.parcel_id} parcel={parcel} index={index}
                  onSaved={(updated) => setParcels(prev => prev.map(p => p.parcel_id === updated.parcel_id ? { ...p, ...updated } : p))}
                  onOpenDetail={() => openDetailForParcel(parcel)}
                  onDelete={deleteParcel}
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
const EditableParcelRow: React.FC<{ parcel: Parcel; index: number; onSaved: (p: Parcel) => void; onOpenDetail?: () => void; onDelete?: (parcelId: number) => void; getFamilyName: (parcel: Parcel) => string; projectId?: number | null }> = ({ parcel, index, onSaved, onOpenDetail, onDelete, getFamilyName, projectId }) => {
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

  const normalizeTypes = (input: unknown): { type_id: string; family_id: string; name: string; code: string }[] => {
    if (!Array.isArray(input)) return []
    return input
      .map(entry => {
        if (typeof entry !== 'object' || entry === null) return null
        const record = entry as Record<string, unknown>
        const typeValue = record.type_id ?? record.subtype_id
        const familyValue = record.family_id
        const nameValue = record.type_name ?? record.name
        const codeValue = record.code ?? record.type_code
        if (typeValue != null && familyValue != null && typeof nameValue === 'string' && typeof codeValue === 'string') {
          const type_id = String(typeValue)
          const family_id = String(familyValue)
          const name = nameValue.trim()
          const code = codeValue.trim()
          if (type_id && family_id && name && code) {
            return { type_id, family_id, name, code }
          }
        }
        return null
      })
      .filter((value): value is { type_id: string; family_id: string; name: string; code: string } => Boolean(value))
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

  const loadProductsForType = async (typeId: string) => {
    try {
      // The types API returns subtype_id as type_id, so we can use it directly
      console.log('Loading products for type_id (which is actually subtype_id):', typeId)

      // Use the lot-products API endpoint with the type_id (which is the subtype_id)
      const response = await fetch(`/api/landuse/lot-products/${typeId}`)
      if (response.ok) {
        const lotProductsData = await response.json()
        console.log('Raw lot products response:', lotProductsData)
        const normalizedProducts = normalizeProducts(lotProductsData)
        console.log('Normalized products:', normalizedProducts)
        setProducts(normalizedProducts)
        console.log('Loaded', normalizedProducts.length, 'products for subtype_id:', typeId)
      } else {
        console.error('Failed to fetch lot products:', response.statusText)
        setProducts([])
      }
    } catch (e) {
      console.error('Failed to load products for type', typeId, e)
      setProducts([])
    }
  }

  useEffect(() => {
    if (editing) {
      ;(async () => {
        try {
          console.log('🔥 Edit mode activated for parcel:', parcel.parcel_id)
          console.log('Current parcel data:', {
            family_name: parcel.family_name,
            type_code: parcel.type_code,
            product_code: parcel.product_code,
            product: parcel.product
          })

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

          // Pre-populate dropdowns from existing parcel data
          if (parcel.family_name) {
            // Find the family by name
            const matchedFamily = normalizedFamilies.find(f =>
              f.name.toLowerCase() === parcel.family_name?.toLowerCase()
            )

            if (matchedFamily) {
              console.log('✅ Found matching family:', matchedFamily)
              setSelectedFamily(matchedFamily.family_id)

              // Load types for this family
              const typesRes = await fetch(`/api/landuse/types/${matchedFamily.family_id}`)
              if (typesRes.ok) {
                const typesData = await typesRes.json()
                const normalizedTypes = normalizeTypes(typesData)
                setTypes(normalizedTypes)
                console.log('✅ Loaded types for family:', normalizedTypes.length)

                // Pre-populate type if available
                if (parcel.type_code) {
                  // Match by the code field (RET, SFD, etc.), not by type_id
                  const matchedType = normalizedTypes.find(t => {
                    const tCode = (t as any).code || (t as any).type_code
                    return tCode === parcel.type_code
                  })

                  if (matchedType) {
                    console.log('✅ Found matching type:', matchedType, 'for type_code:', parcel.type_code)
                    setSelectedType(matchedType.type_id)

                    // Load products for this type
                    await loadProductsForType(matchedType.type_id)
                  } else {
                    console.warn('⚠️ Type not found for code:', parcel.type_code, 'in types:', normalizedTypes)
                  }
                }
              }
            } else {
              console.warn('⚠️ Family not found for name:', parcel.family_name)
            }
          }

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

  const cancel = () => {
    // Reset all state to original parcel values
    setDraft({
      product: parcel.product || '',
      acres: parcel.acres || 0,
      units: parcel.units || 0,
      frontfeet: parcel.frontfeet || 0,
    })
    setSelectedFamily('')
    setSelectedType('')
    setTypes([])
    setProducts([])
    setEditing(false)
  }

  const save = async () => {
    try {
      console.log('💾 Starting save...')
      console.log('💾 State:', { selectedFamily, selectedType, families: families.length, types: types.length, draft })

      // Validation: Check that family/type/product chain is complete if any are selected
      if (selectedFamily && !selectedType) {
        alert('Please select a Use Type for the selected Family')
        return
      }
      // Only require product if the type actually has products available
      if (selectedType && products.length > 0 && !draft.product) {
        alert('Please select a Product for the selected Use Type')
        return
      }

      // Validate numeric fields
      if (draft.acres < 0) {
        alert('Acres cannot be negative')
        return
      }
      if (draft.units < 0) {
        alert('Units cannot be negative')
        return
      }

      // Build payload with family/type/product if selected
      const payload: Record<string, unknown> = {
        acres: Number(draft.acres),
        frontfeet: Number(draft.frontfeet),
      }

      // Only include units for Residential family
      // Check selected family during edit, fall back to parcel's family
      const currentFamilyName = selectedFamily
        ? families.find(f => f.family_id === selectedFamily)?.name
        : parcel.family_name

      if (currentFamilyName === 'Residential') {
        payload.units = Number(draft.units)
      } else {
        // Clear units for non-residential
        payload.units = null
      }

      // Add family name if selected
      if (selectedFamily) {
        const family = families.find(f => f.family_id === selectedFamily)
        console.log('🔍 Looking for family_id:', selectedFamily, 'in families:', families)
        if (family) {
          payload.family_name = family.name
          console.log('✅ Set family_name to:', family.name)
        }
      }

      // Add type code if selected
      if (selectedType) {
        const type = types.find(t => t.type_id === selectedType)
        console.log('🔍 Looking for type_id:', selectedType, 'in types:', types)
        console.log('🔍 Found type object:', type)
        if (type) {
          const typeCode = (type as any).code || (type as any).type_code
          console.log('🔍 Extracted type_code:', typeCode, 'from type:', type)
          payload.type_code = typeCode
          payload.type_id = selectedType  // Use type_id (from lu_type) instead of subtype_id
        } else {
          console.error('❌ Could not find type in types array for selectedType:', selectedType)
          console.error('❌ Available types:', types.map(t => ({ id: t.type_id, name: t.name })))
        }
      }

      // Add product if selected, or clear it if type has no products
      if (draft.product) {
        payload.lot_product = draft.product
        payload.product_code = draft.product
      } else if (selectedType && products.length === 0) {
        // Type has no products - explicitly clear the product fields
        payload.lot_product = null
        payload.product_code = null
      }

      console.log('💾 Saving parcel with payload:', payload)

      const res = await fetch(`/api/parcels/${parcel.parcel_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())

      console.log('✅ Save successful, refreshing from server...')

      // Close editing mode
      setEditing(false)

      // Trigger server refresh to get the latest data
      // This ensures we have the updated type_code, family_name, etc.
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
    <tr className={`border-b transition-colors`} style={{
      borderColor: 'var(--cui-border-color)',
      backgroundColor: index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)';
    }}>
      <td className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>{parcel.area_no}</td>
      <td className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>{parcel.phase_name}</td>
      <td className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>{parcel.parcel_name}</td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <select
            className="w-32 rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid'
            }}
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
        ) : (
          <span style={{ color: 'var(--cui-body-color)' }}>{getFamilyName(parcel)}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <select
            className="w-40 rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid'
            }}
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
            disabled={!selectedFamily}
          >
            <option value="">Select Type</option>
            {types.filter(t => t.family_id === selectedFamily).map(t =>
              <option key={t.type_id} value={t.type_id}>{t.name}</option>
            )}
          </select>
        ) : (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            parcel.family_name === 'Residential' ? 'bg-blue-900 text-blue-300' :
            parcel.family_name === 'Commercial' ? 'bg-purple-900 text-purple-300' :
            parcel.family_name === 'Industrial' ? 'bg-orange-900 text-orange-300' :
            'bg-indigo-900 text-indigo-300'
          }`}>
            {parcel.type_code || 'No Type'}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>
        {editing ? (
          selectedType && products.length > 0 ? (
            <select
              className="w-32 rounded px-2 py-1 text-xs"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)',
                border: '1px solid'
              }}
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
          ) : selectedType ? (
            <span className="text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>N/A</span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          )
        ) : (
          parcel.product || '—'
        )}
      </td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>
        {editing ? (
          <input className="w-20 rounded px-2 py-1 text-center" inputMode="decimal"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid'
            }}
            value={draft.acres} onChange={e => setDraft(d => ({ ...d, acres: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
        ) : (
          new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(parcel.acres)
        )}
      </td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>
        {editing ? (
          (() => {
            const currentFamilyName = selectedFamily
              ? families.find(f => f.family_id === selectedFamily)?.name
              : parcel.family_name
            return currentFamilyName === 'Residential' ? (
              <input className="w-20 rounded px-2 py-1 text-center" inputMode="decimal"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid'
                }}
                value={draft.units} onChange={e => setDraft(d => ({ ...d, units: e.target.value === '' ? 0 : Number(e.target.value) }))}
              />
            ) : (
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
            )
          })()
        ) : (
          parcel.family_name === 'Residential' ? (
            new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(parcel.units)
          ) : (
            <span style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          )
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <div className="flex items-center gap-2 justify-center">
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={save}
            >
              Save
            </button>
            <button
              className="px-1.5 py-0.5 text-xs rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-secondary)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <button
              className="px-1.5 py-0.5 text-xs rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-secondary)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-info)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={() => onOpenDetail && onOpenDetail()}
            >
              Detail
            </button>
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-danger)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={() => onDelete && onDelete(parcel.parcel_id)}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default PlanningContent;

// Inline-edit for phase label/description (persist via PATCH)
const PhaseRow: React.FC<{
  phase: Phase;
  index: number;
  selectedFilters: string[];
  onToggleFilter: (phaseName: string) => void;
  parcels: Parcel[];
  onEditingChange: (isEditing: boolean) => void;
  onSaved: () => void;
  onDelete?: (phaseId: number) => void;
}> = ({ phase, index, selectedFilters, onToggleFilter, parcels, onEditingChange, onSaved, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [description, setDescription] = useState(phase.description || '')
  const [saving, setSaving] = useState(false)

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingChange(editing || expanded)
  }, [editing, expanded, onEditingChange])

  // Get unique type codes for this phase
  const phaseUseCodes = [...new Set(parcels.filter(p => p.phase_name === phase.phase_name).map(p => p.type_code))].filter(Boolean)

  // Update description when phase changes
  useEffect(() => {
    setDescription(phase.description || '')
  }, [phase.description, phase.phase_id])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/phases/${phase.phase_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) })
      // Broadcast to other views (wizard) to refresh if needed
      try { window.dispatchEvent(new CustomEvent('dataChanged', { detail: { entity: 'phase', id: phase.phase_id } })) } catch {}
      setExpanded(false)
      setEditing(false)
      // Refresh phases data to update the chip
      onSaved()
    } catch (e) { console.error('Phase save failed', e) } finally { setSaving(false) }
  }

  const cancel = () => {
    setDescription(phase.description || '')
    setExpanded(false)
    setEditing(false)
  }

  return (
    <>
      <tr className={`border-b transition-colors`}
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)';
        }}>
        {/* Phase column */}
        <td className="py-2 px-2" style={{ color: 'var(--cui-body-color)' }}>
          <span>{phase.phase_name}</span>
        </td>

        {/* Uses column */}
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
            {phaseUseCodes.length === 0 && <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>No uses</span>}
          </div>
        </td>

        {/* Description column - icon and truncated text */}
        <td className="py-2 px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="transition-colors flex-shrink-0"
              style={{ color: 'var(--cui-secondary-color)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cui-body-color)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cui-secondary-color)'}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {expanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
            {phase.description && phase.description.trim().length > 0 && (
              <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--cui-body-color)' }} title={phase.description}>
                {phase.description}
              </span>
            )}
          </div>
        </td>

        {/* Acres column */}
        <td className="py-2 px-2 text-center" style={{ color: 'var(--cui-body-color)' }}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.gross_acres)}</td>

        {/* Units column */}
        <td className="py-2 px-2 text-center" style={{ color: 'var(--cui-body-color)' }}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.units_total)}</td>

        {/* Actions column - removed Filter and Delete buttons per MVP requirements */}
        <td className="py-2 px-2 text-center">
          <div className="flex items-center gap-2 justify-center">
            {/* No actions needed - phases are auto-created from Parcel Detail */}
          </div>
        </td>
      </tr>

      {/* Expanded description row */}
      {expanded && (
        <tr style={{ backgroundColor: index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)' }}>
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Phase {phase.phase_name} - Description
                </label>
              </div>
              <textarea
                className="w-full rounded px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid'
                }}
                placeholder="Enter phase description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <button
                  className="px-3 py-1.5 text-xs rounded transition-colors"
                  style={{ backgroundColor: 'var(--cui-secondary)', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  onClick={cancel}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-xs text-white rounded transition-colors"
                  style={{ backgroundColor: 'var(--cui-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
