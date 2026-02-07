// app/components/Planning/PlanningContent.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr'
import ParcelDetailCard from '../PlanningWizard/cards/ParcelDetailCard'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
import type { Parcel as WizardParcel, Phase as WizardPhase, Area as WizardArea } from '../PlanningWizard/PlanningWizard'
import PlanningOverviewControls from './PlanningOverviewControls'
import CollapsibleSection from './CollapsibleSection'

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
  lot_width?: number;
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
  type_code?: string;
  family_name?: string;
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
    planningEfficiency
  } = useProjectConfig(projectId ?? undefined)

  const { level1Label, level2Label, level3Label, level1LabelPlural, level2LabelPlural, level3LabelPlural } = labels

  // Format Parcel ID display: should be {area}.{parcel_number} with single decimal
  const formatParcelIdDisplay = useCallback((dbId: string): string => {
    if (!dbId) return '';

    // If the database value contains multiple decimals (e.g., "1.1.02"),
    // reformat to single decimal: area.parcel (e.g., "1.102")
    const parts = dbId.split('.');
    if (parts.length === 3) {
      // Format: area.phase.parcel → area.parcel (combine last two parts)
      const area = parts[0];
      const parcelNum = parts[1] + parts[2]; // "1" + "02" = "102"
      return `${area}.${parcelNum}`;
    }

    // Already in correct format or single number
    return dbId;
  }, []);

  // number formatting helpers moved inline in JSX

  const getAreaStats = useCallback((areaNo: number) => {
    // Filter out parcels with null area_no
    const areaParcels = parcels.filter(p => p.area_no === areaNo && p.area_no != null);
    const areaPhases = [...new Set(areaParcels.map(p => p.phase_name).filter(phaseName => phaseName != null))].sort();

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

    // Filter out null/undefined area_no to prevent "Plan Area null"
    const distinctAreas = Array.from(new Set(parcels.map(p => p.area_no).filter(areaNo => areaNo != null))).sort((a, b) => a - b)
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

  // Import PDF modal state
  const [showImportPdfModal, setShowImportPdfModal] = useState(false)

  // Land use filter for Phasing tile
  const [selectedLandUseFilter, setSelectedLandUseFilter] = useState<string>('')

  // Shared land use data cache for EditableParcelRow - prevents loading on every edit
  const [sharedFamilies, setSharedFamilies] = useState<{ family_id: string; name: string }[]>([])
  const [sharedFamiliesLoading, setSharedFamiliesLoading] = useState(false)

  // Shared lot products cache - keyed by type_id
  const [sharedLotProducts, setSharedLotProducts] = useState<Map<string, any[]>>(new Map())

  // Load families data once for all parcel rows
  useEffect(() => {
    if (projectId && !sharedFamiliesLoading && sharedFamilies.length === 0) {
      setSharedFamiliesLoading(true)
      fetch('/api/landuse/families')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const normalized = (Array.isArray(data) ? data : [])
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
          setSharedFamilies(normalized)
        })
        .catch(e => console.error('Failed to load shared families', e))
        .finally(() => setSharedFamiliesLoading(false))
    }
  }, [projectId, sharedFamiliesLoading, sharedFamilies.length])

  // Get unique land use codes across all parcels
  const allLandUseCodes = useMemo(() => {
    return Array.from(new Set(parcels.map(p => p.type_code).filter(Boolean))).sort()
  }, [parcels])

  // Filter parcels based on area, phase, and land use filters
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

    // Apply land use filter
    if (selectedLandUseFilter) {
      filtered = filtered.filter(parcel => parcel.type_code === selectedLandUseFilter)
    }

    return filtered
  }, [parcels, selectedAreaFilters, selectedPhaseFilters, selectedLandUseFilter])

  // Filter phases based on area filters only, and exclude empty phases (with no parcels)
  const filteredPhases = useMemo(() => {
    let filtered = phases

    // Filter out phases with no parcels
    const phasesWithParcels = phases.filter(phase => {
      const parcelCount = parcels.filter(p => p.phase_name === phase.phase_name).length
      return parcelCount > 0
    })

    filtered = phasesWithParcels

    // Apply area filters
    if (selectedAreaFilters.length > 0) {
      filtered = filtered.filter(phase => selectedAreaFilters.includes(phase.area_no))
    }

    return filtered
  }, [phases, parcels, selectedAreaFilters])

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
    setSelectedLandUseFilter('')
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
      areaNo,
      phaseNo,
      familyName: p.family_name,
      subtypeName: p.type_code,
      landuseCode: p.usecode,
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
    <div className="space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      {/* Planning Overview with Granularity Controls */}
      <PlanningOverviewControls projectId={projectId} />

      {/* Plan Areas and Phases Overview - Read-only rollups from Parcel Detail */}
      <div className={`grid gap-4 transition-all duration-300 ${
        isAnyPhaseEditing
          ? 'grid-cols-1 lg:grid-cols-[20%_1fr]'
          : 'grid-cols-1 lg:grid-cols-[40%_1fr]'
      }`}>
        {/* Level 1 summary - Wrapped with CollapsibleSection */}
        <CollapsibleSection
          title={level1LabelPlural}
          itemCount={areaCards.length}
          defaultExpanded={areaCards.length > 0}
        >
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {areaCards.map(({ key, areaNo, title, stats }) => (
                <div
                  key={key}
                  className={`planning-tile text-center min-w-[140px] ${
                    selectedAreaFilters.includes(areaNo) ? 'planning-tile-active' : ''
                  }`}
                  onClick={() => toggleAreaFilter(areaNo)}
                >
                  <div
                    className="planning-tile-header whitespace-nowrap"
                    title={title}
                  >
                    {title}
                  </div>
                  <div className="space-y-1">
                    <div className="planning-tile-stat">{stats.grossAcres} acres</div>
                    <div className="planning-tile-stat">{stats.phases} {level2LabelPlural}</div>
                    <div className="planning-tile-stat">{stats.parcels} {level3LabelPlural}</div>
                    <div className="planning-tile-stat">{stats.units} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Level 2 summary - Wrapped with CollapsibleSection */}
        <CollapsibleSection
          title={level2LabelPlural}
          itemCount={filteredPhases.length}
          defaultExpanded={true}
        >
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                    <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--cui-body-color)', width: '12%' }}>{level2Label}</th>
                    <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--cui-body-color)', width: '35%' }}>Land Uses</th>
                    <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--cui-body-color)', width: '12%' }}>Acres</th>
                    <th className="text-center py-2 px-2 font-medium" style={{ color: 'var(--cui-body-color)', width: '12%' }}>Units</th>
                    <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--cui-body-color)', width: '140px' }}>Actions</th>
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
        </CollapsibleSection>
      </div>

      {/* Parcel Detail Section */}
      <CollapsibleSection
        title={`${level3Label} Detail Table`}
        itemCount={filteredParcels.length}
        defaultExpanded={true}
        headerActions={
          <>
            {(selectedAreaFilters.length > 0 || selectedPhaseFilters.length > 0 || selectedLandUseFilter) && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1 text-white text-xs rounded-full transition-colors"
                style={{ backgroundColor: 'var(--cui-danger)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Clear Filters ({selectedAreaFilters.length + selectedPhaseFilters.length + (selectedLandUseFilter ? 1 : 0)})
              </button>
            )}
            <button
              onClick={() => setShowImportPdfModal(true)}
              className="px-2.5 py-1 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-info)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Import PDF
            </button>
            <button
              onClick={() => {
                // JX116: Open blank flyout immediately, no phase selection required
                // User fills Area/Phase within the flyout
                setDetailCtx({
                  parcel: {
                    id: 'new-parcel',
                    name: '',
                    landUse: 'MDR',
                    acres: 0,
                    units: 0,
                    efficiency: 0.85,
                    frontage: 0,
                    dbId: 0,
                    areaNo: 0,
                    phaseNo: 0
                  },
                  phase: { id: 'new-phase', name: '', parcels: [], phaseDbId: 0, areaId: '', areaNo: 0, phaseNo: 0 },
                  area: { id: 'new-area', name: '', phases: [], areaDbId: 0, areaNo: 0 }
                })
                setDetailOpen(true)
              }}
              className="px-2.5 py-1 text-xs font-medium rounded"
              style={{
                backgroundColor: 'var(--cui-primary)',
                color: 'white',
                border: 'none'
              }}
            >
              + Add {level3Label}
            </button>
          </>
        }
      >
        <div className={detailOpen ? 'p-4 grid grid-cols-3 gap-4' : 'p-4'}>
          <div className={detailOpen ? 'col-span-2' : ''}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <tr>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Area</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>{level2Label}</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Parcel</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Use Family</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Use Type</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Product</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Acres</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Units</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>DUA</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>FF/Acre</th>
                <th className="text-center px-2 py-2 font-medium text-[15px]" style={{ color: 'var(--cui-body-color)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParcels.map((parcel, index) => (
                <EditableParcelRow key={parcel.parcel_id} parcel={parcel} index={index}
                  onSaved={(updated) => setParcels(prev => prev.map(p => p.parcel_id === updated.parcel_id ? { ...p, ...updated } : p))}
                  onOpenDetail={() => openDetailForParcel(parcel)}
                  onDelete={deleteParcel}
                  getFamilyName={getFamilyName}
                  formatParcelIdDisplay={formatParcelIdDisplay}
                  projectId={projectId}
                  sharedFamilies={sharedFamilies}
                  sharedLotProducts={sharedLotProducts}
                  setSharedLotProducts={setSharedLotProducts}
                  planningEfficiency={planningEfficiency}
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

                    // Add type_code and family_name if provided
                    if (updates.type_code) {
                      payload.type_code = updates.type_code
                    }
                    if (updates.family_name) {
                      payload.family_name = updates.family_name
                    }

                    // Add product if provided
                    if (updates.product !== undefined) {
                      payload.lot_product = updates.product || null
                    }

                    // Use actualLanduseCode (the real land use code) instead of landUse (planning type)
                    if (updates.actualLanduseCode && updates.actualLanduseCode.trim() !== '') {
                      payload.landuse_code = updates.actualLanduseCode

                      // Check if this is a residential land use code to determine if product should be kept
                      const isResidential = ['SFD', 'BTR', 'SFA', 'CONDO', 'MF', 'HDR', 'MHDR', 'MDR', 'MLDR'].includes(updates.actualLanduseCode)
                      if (isResidential) {
                        // Keep product for residential uses
                        if (updates.product !== undefined) {
                          payload.lot_product = updates.product ?? null
                        }
                      } else {
                        // Clear product for non-residential uses (Commercial, Industrial, etc.)
                        payload.lot_product = null
                      }
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
                planningEfficiency={planningEfficiency}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Import PDF Modal - Coming Soon */}
      {showImportPdfModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImportPdfModal(false)}
        >
          <div
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)', border: '1px solid' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--cui-body-color)' }}>
              PDF Import - Coming Soon
            </h3>
            <p className="mb-6" style={{ color: 'var(--cui-body-color)' }}>
              Landscaper AI will soon extract parcel data from PDF tables automatically.
              For now, please add parcels manually using the <strong>Add {level3Label}</strong> dropdown.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowImportPdfModal(false)}
                className="px-4 py-2 text-white rounded transition-colors"
                style={{ backgroundColor: 'var(--cui-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Filter helper UI
// Inline-editable parcel row
const EditableParcelRow: React.FC<{
  parcel: Parcel;
  index: number;
  onSaved: (p: Parcel) => void;
  onOpenDetail?: () => void;
  onDelete?: (parcelId: number) => void;
  getFamilyName: (parcel: Parcel) => string;
  formatParcelIdDisplay: (dbId: string) => string;
  projectId?: number | null;
  sharedFamilies?: { family_id: string; name: string }[];
  sharedLotProducts?: Map<string, any[]>;
  setSharedLotProducts?: React.Dispatch<React.SetStateAction<Map<string, any[]>>>;
  planningEfficiency?: number | null;
}> = ({ parcel, index, onSaved, onOpenDetail, onDelete, getFamilyName, formatParcelIdDisplay, projectId, sharedFamilies = [], sharedLotProducts = new Map(), setSharedLotProducts, planningEfficiency }) => {
  const [editing, setEditing] = useState(false)
  const [editingFamily, setEditingFamily] = useState(false)
  const [editingType, setEditingType] = useState(false)
  const [editingProduct, setEditingProduct] = useState(false)
  const [products, setProducts] = useState<{ product_id: string; code: string; name?: string; subtype_id?: string; lot_width?: number; lot_depth?: number; lot_area?: number }[]>([])
  const [families, setFamilies] = useState<{ family_id: string; name: string }[]>([])
  const [types, setTypes] = useState<{ type_id: string; family_id: string; name: string }[]>([])
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [draft, setDraft] = useState({
    product: parcel.product ?? '',
    acres: parcel.acres ?? 0,
    units: parcel.units ?? 0,
    frontfeet: parcel.frontfeet ?? 0,
    lot_width: parcel.lot_width ?? 0,
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
      // Check if we already have this data in the shared cache
      if (sharedLotProducts.has(typeId)) {
        console.log('Using cached lot products for type_id:', typeId)
        setProducts(sharedLotProducts.get(typeId) || [])
        return
      }

      // The types API returns subtype_id as type_id, so we can use it directly
      console.log('Loading products for type_id (which is actually subtype_id):', typeId)

      // Use the lot-products API endpoint with the type_id (which is the subtype_id)
      const response = await fetch(`/api/landuse/lot-products/${typeId}`)
      if (response.ok) {
        const lotProductsData = await response.json()
        console.log('Raw lot products response:', lotProductsData)

        // Store the raw data with lot_width included
        const productsWithWidth = Array.isArray(lotProductsData) ? lotProductsData : []
        setProducts(productsWithWidth)

        // Cache it for future use
        if (setSharedLotProducts) {
          setSharedLotProducts(prev => new Map(prev).set(typeId, productsWithWidth))
        }

        console.log('Loaded', productsWithWidth.length, 'products for subtype_id:', typeId)
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

          // Use shared families data (already loaded at parent level)
          setFamilies(sharedFamilies)

          // Set the draft values to current parcel values
          setDraft({
            product: parcel.product || '',
            acres: parcel.acres || 0,
            units: parcel.units || 0,
            frontfeet: parcel.frontfeet || 0,
            lot_width: parcel.lot_width || 0,
          })

          // Pre-populate dropdowns from existing parcel data
          if (parcel.family_name && sharedFamilies.length > 0) {
            // Find the family by name
            const matchedFamily = sharedFamilies.find(f =>
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

          console.log('Using shared families:', sharedFamilies.length)
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
  }, [editing, sharedFamilies])

  const cancel = () => {
    // Reset all state to original parcel values
    setDraft({
      product: parcel.product || '',
      acres: parcel.acres || 0,
      units: parcel.units || 0,
      frontfeet: parcel.frontfeet || 0,
      lot_width: parcel.lot_width || 0,
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
        lot_width: Number(draft.lot_width),
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
    <tr className={`border-b transition-colors ${!editing ? 'cursor-pointer' : ''}`} style={{
      borderColor: 'var(--cui-border-color)',
      backgroundColor: editing ? 'rgba(13, 110, 253, 0.08)' : (index % 2 === 0 ? 'var(--cui-body-bg)' : 'rgba(0, 0, 0, 0.02)')
    }}
    onClick={() => {
      if (!editing) {
        setEditing(true);
      }
    }}
    onMouseEnter={(e) => {
      if (!editing) {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      }
    }}
    onMouseLeave={(e) => {
      if (!editing) {
        e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--cui-body-bg)' : 'rgba(0, 0, 0, 0.02)';
      }
    }}>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{parcel.area_no}</td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{parcel.phase_name}</td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{formatParcelIdDisplay(parcel.parcel_name)}</td>
      <td className="px-2 py-1.5 text-center" onClick={(e) => editing && e.stopPropagation()}>
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
      <td className="px-2 py-1.5 text-center" onClick={(e) => editing && e.stopPropagation()}>
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
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }} onClick={(e) => editing && e.stopPropagation()}>
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
              onChange={e => {
                const selectedCode = e.target.value
                // Find the selected product to get its lot_width
                const selectedProduct = products.find(p => p.code === selectedCode)
                const lotWidth = selectedProduct?.lot_width || 0
                console.log('Selected product:', selectedCode, 'with lot_width:', lotWidth)
                setDraft(d => ({ ...d, product: selectedCode, lot_width: lotWidth }))
              }}
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
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }} onClick={(e) => editing && e.stopPropagation()}>
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
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }} onClick={(e) => editing && e.stopPropagation()}>
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
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>
        {(() => {
          const numberValue = editing ? draft.units : parcel.units
          const acresValue = editing ? draft.acres : parcel.acres
          const familyName = getFamilyName(parcel)
          if (familyName?.toLowerCase() !== 'residential') {
            return <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          }
          if (acresValue <= 0) {
            return <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          }
          // DUA = units / (acres × planning_efficiency)
          // This gives density on developable land (after removing ROW, open space, etc.)
          const efficiency = planningEfficiency ?? 1
          const dua = numberValue / (acresValue * efficiency)
          return Number.isFinite(dua)
            ? dua.toFixed(2)
            : <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
        })()}
      </td>
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>
        {(() => {
          const unitsValue = editing ? draft.units : parcel.units
          const acresValue = editing ? draft.acres : parcel.acres
          const lotWidth = parcel.lot_width
          const familyName = getFamilyName(parcel)

          // Only calculate for residential parcels with valid data
          if (familyName?.toLowerCase() !== 'residential') {
            return <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          }
          if (!lotWidth || lotWidth <= 0 || acresValue <= 0 || unitsValue <= 0) {
            return <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
          }

          // Formula: (units × lot_width) / acres
          const ffPerAcre = (unitsValue * lotWidth) / acresValue

          return Number.isFinite(ffPerAcre)
            ? Math.round(ffPerAcre).toLocaleString()
            : <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
        })()}
      </td>
      <td className="px-2 py-1.5 text-center">
        {editing ? (
          <div className="flex items-center gap-2 justify-center">
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={(e) => {
                e.stopPropagation();
                save();
              }}
            >
              Save
            </button>
            <button
              className="px-1.5 py-0.5 text-xs rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-secondary)', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-info)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail && onOpenDetail();
              }}
            >
              Detail
            </button>
            <button
              className="px-1.5 py-0.5 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-danger)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete(parcel.parcel_id);
              }}
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

  const isSelected = selectedFilters.includes(phase.phase_name);

  return (
    <>
      <tr className={`border-b transition-colors cursor-pointer`}
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: isSelected ? 'var(--cui-primary)' : (index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)'),
          opacity: isSelected ? 0.9 : 1
        }}
        onClick={() => onToggleFilter(phase.phase_name)}
        onMouseEnter={(e) => {
          if (isSelected) {
            e.currentTarget.style.opacity = '1';
          } else {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (isSelected) {
            e.currentTarget.style.opacity = '0.9';
          } else {
            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)';
          }
        }}>
        {/* Phase column */}
        <td className="py-2 px-2" style={{ color: isSelected ? 'white' : 'var(--cui-body-color)' }}>
          <span>{phase.phase_name}</span>
        </td>

        {/* Land Uses column */}
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

        {/* Acres column */}
        <td className="py-2 px-2 text-center" style={{ color: isSelected ? 'white' : 'var(--cui-body-color)' }}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.gross_acres)}</td>

        {/* Units column */}
        <td className="py-2 px-2 text-center" style={{ color: isSelected ? 'white' : 'var(--cui-body-color)' }}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(phase.units_total)}</td>

        {/* Actions column - Notes and Reports chips (JX116 Fix #6) */}
        <td className="py-2 px-2">
          <div className="flex items-center gap-2">
            {/* Notes chip - outlined if no notes, solid if notes exist */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                phase.description && phase.description.trim() !== ''
                  ? 'bg-primary text-white border-0 hover:opacity-90'
                  : 'bg-transparent border hover:bg-primary/10'
              }`}
              style={{
                borderColor: phase.description && phase.description.trim() !== '' ? 'transparent' : 'var(--cui-primary)',
                color: phase.description && phase.description.trim() !== '' ? 'var(--text-inverse)' : 'var(--cui-primary)'
              }}
            >
              Notes
            </button>

            {/* Reports chip */}
            <button
              className="px-2.5 py-1 rounded-full text-xs font-medium cursor-help transition-all border-0 hover:opacity-80"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                color: 'var(--cui-secondary-color)'
              }}
              title="Coming soon"
            >
              Reports
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded description row */}
      {expanded && (
        <tr style={{ backgroundColor: index % 2 === 0 ? 'var(--cui-body-bg)' : 'var(--cui-tertiary-bg)' }}>
          <td colSpan={5} className="px-4 py-3">
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
