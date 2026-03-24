// app/components/Planning/PlanningContent.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
import PlanningOverviewControls from './PlanningOverviewControls'
import CollapsibleSection from './CollapsibleSection'
import { ExportButton } from '@/components/admin'
import styles from './PlanningContent.module.css'

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
  phase_no?: number;
  phase_name: string;
  gross_acres: number;
  net_acres: number;
  units_total: number;
  start_date: string | null;
  status: string;
  description?: string;
  label?: string;
}

interface Area {
  area_id: number;
  area_no: number;
  area_name: string;
  label?: string;
}

type Props = { projectId?: number | null; projectIdStr?: string }
const PlanningContent: React.FC<Props> = ({ projectId = null, projectIdStr }) => {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [areas, setAreas] = useState<Area[]>([])
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
  const { data: areasData, mutate: mutateAreas } = useSWR(
    projectId ? `/api/areas?project_id=${projectId}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 0 }
  )

  useEffect(() => {
    if (parcelsData) setParcels(Array.isArray(parcelsData) ? parcelsData : [])
    if (phasesData) setPhases(Array.isArray(phasesData) ? phasesData : [])
    if (areasData) setAreas(Array.isArray(areasData) ? areasData : [])
    if (projectId != null) setLoading(false)
  }, [parcelsData, phasesData, areasData, projectId])

  // Refresh data when component mounts
  useEffect(() => {
    if (projectId) {
      mutateParcels()
      mutatePhases()
      mutateAreas()
    }
  }, [projectId, mutateParcels, mutatePhases, mutateAreas])

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
      if (entity === 'area' && changedProjectId === projectId) {
        mutateAreas()
      }
    }

    window.addEventListener('dataChanged', handleDataChange as EventListener)
    return () => window.removeEventListener('dataChanged', handleDataChange as EventListener)
  }, [projectId, mutateParcels, mutatePhases, mutateAreas])

  const {
    labels,
    areaDisplayByNumber,
    planningEfficiency,
    level1Enabled,
    level2Enabled
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
    if (distinctAreas.length === 0) return []
    return distinctAreas.map(areaNo => ({
      key: `area-${areaNo}`,
      areaNo,
      title: `${level1Label} ${areaNo}`,
      stats: getAreaStats(areaNo)
    }))
  }, [areaDisplayByNumber, parcels, level1Label, getAreaStats])

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

  // Granularity settings (for autoNumber flag)
  const { data: granularityData } = useSWR(
    projectId ? `/api/project/granularity-settings?project_id=${projectId}` : null,
    fetcher
  )
  const autoNumber = Boolean((granularityData as Record<string, unknown>)?.autoNumber)

  // Project land use selections — try Django API first, fallback to parcel-derived data
  const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000'
  const { data: projectLandUseData } = useSWR(
    projectId ? `${DJANGO_URL}/api/landuse/project-land-use/by_project/${projectId}/` : null,
    async (url: string) => {
      const headers: Record<string, string> = {}
      try {
        const raw = localStorage.getItem('auth_tokens')
        if (raw) { const parsed = JSON.parse(raw); if (parsed?.access) headers.Authorization = `Bearer ${parsed.access}` }
      } catch { /* ignore */ }
      const r = await fetch(url, { headers })
      if (!r.ok) {
        console.warn(`[PlanningContent] Land use API ${r.status}: ${r.statusText}`)
        return null
      }
      return r.json()
    },
    { shouldRetryOnError: false, revalidateOnFocus: true }
  )

  // Flatten project land use config into selectable options
  interface PLUFamily { family_id: number; family_name: string; family_code: string }
  interface PLUType { type_id: number; type_name: string; type_code: string; family_id: number; family_code: string; is_active: boolean; product_selections?: PLUProduct[] }
  interface PLUProduct { product_id: number; product_code: string; lot_w_ft?: number; is_active: boolean }

  // Derive land use options from Django API or fallback to existing parcels
  const projectFamilies = useMemo<PLUFamily[]>(() => {
    // Try Django API data first
    if (projectLandUseData?.families?.length) {
      return projectLandUseData.families
        .filter((f: { types: PLUType[] }) => f.types?.some((t: PLUType) => t.is_active))
        .map((f: { family_id: number; family_name: string; family_code: string }) => ({ family_id: f.family_id, family_name: f.family_name, family_code: f.family_code }))
    }
    // Fallback: derive from existing parcels
    const seen = new Map<string, PLUFamily>()
    for (const p of parcels) {
      if (p.family_name && !seen.has(p.family_name)) {
        seen.set(p.family_name, { family_id: 0, family_name: p.family_name, family_code: p.family_name.substring(0, 3).toUpperCase() })
      }
    }
    return Array.from(seen.values())
  }, [projectLandUseData, parcels])

  const projectTypes = useMemo<PLUType[]>(() => {
    // Try Django API data first
    if (projectLandUseData?.families?.length) {
      const types: PLUType[] = []
      for (const f of projectLandUseData.families) {
        for (const t of (f.types || [])) {
          if (t.is_active) types.push({ ...t, family_id: f.family_id, family_code: f.family_code })
        }
      }
      return types
    }
    // Fallback: derive from existing parcels
    const seen = new Map<string, PLUType>()
    for (const p of parcels) {
      if (p.type_code && !seen.has(p.type_code)) {
        const familyCode = p.family_name ? p.family_name.substring(0, 3).toUpperCase() : ''
        seen.set(p.type_code, { type_id: 0, type_name: p.type_code, type_code: p.type_code, family_id: 0, family_code: familyCode, is_active: true })
      }
    }
    return Array.from(seen.values())
  }, [projectLandUseData, parcels])

  const projectProducts = useMemo<(PLUProduct & { type_code: string; family_code: string })[]>(() => {
    // Try Django API data first
    if (projectLandUseData?.families?.length) {
      const products: (PLUProduct & { type_code: string; family_code: string })[] = []
      for (const t of projectTypes) {
        for (const p of (t.product_selections || [])) {
          if (p.is_active) products.push({ ...p, type_code: t.type_code, family_code: t.family_code })
        }
      }
      return products
    }
    // Fallback: derive from existing parcels
    const seen = new Map<string, PLUProduct & { type_code: string; family_code: string }>()
    for (const p of parcels) {
      if (p.product_code && !seen.has(p.product_code)) {
        seen.set(p.product_code, { product_id: 0, product_code: p.product_code, is_active: true, type_code: p.type_code || '', family_code: '' })
      }
    }
    return Array.from(seen.values())
  }, [projectLandUseData, projectTypes, parcels])

  // Add Parcel inline row state
  const [showAddParcelRow, setShowAddParcelRow] = useState(false)
  const [addParcelAreaId, setAddParcelAreaId] = useState<number | string>('')
  const [addParcelAreaNo, setAddParcelAreaNo] = useState<string>('')  // area NUMBER (user types or selects)
  const [addParcelPhaseNo, setAddParcelPhaseNo] = useState<string>('')  // phase NUMBER (user types or selects)
  const [addParcelName, setAddParcelName] = useState<string>('')
  const [addParcelSaving, setAddParcelSaving] = useState(false)
  const [addParcelAcres, setAddParcelAcres] = useState<string>('')
  const [addParcelUnits, setAddParcelUnits] = useState<string>('')
  const [addParcelFamilyCode, setAddParcelFamilyCode] = useState<string>('')
  const [addParcelTypeCode, setAddParcelTypeCode] = useState<string>('')
  const [addParcelProductCode, setAddParcelProductCode] = useState<string>('')

  // Auto-populate when project has only one option at a level
  useEffect(() => {
    if (!showAddParcelRow) return
    if (projectFamilies.length === 1 && !addParcelFamilyCode) {
      setAddParcelFamilyCode(projectFamilies[0].family_code)
    }
  }, [showAddParcelRow, projectFamilies, addParcelFamilyCode])

  useEffect(() => {
    if (!showAddParcelRow || !addParcelFamilyCode) return
    const typesForFamily = projectTypes.filter(t => t.family_code === addParcelFamilyCode)
    if (typesForFamily.length === 1 && !addParcelTypeCode) {
      setAddParcelTypeCode(typesForFamily[0].type_code)
    }
  }, [showAddParcelRow, addParcelFamilyCode, projectTypes, addParcelTypeCode])

  useEffect(() => {
    if (!showAddParcelRow || !addParcelTypeCode) return
    const productsForType = projectProducts.filter(p => p.type_code === addParcelTypeCode)
    if (productsForType.length === 1 && !addParcelProductCode) {
      setAddParcelProductCode(productsForType[0].product_code)
    }
  }, [showAddParcelRow, addParcelTypeCode, projectProducts, addParcelProductCode])

  // Filtered options for dropdowns (scoped to project land use config)
  const typesForSelectedFamily = useMemo(() =>
    addParcelFamilyCode ? projectTypes.filter(t => t.family_code === addParcelFamilyCode) : projectTypes
  , [addParcelFamilyCode, projectTypes])

  const productsForSelectedType = useMemo(() =>
    addParcelTypeCode ? projectProducts.filter(p => p.type_code === addParcelTypeCode) : projectProducts
  , [addParcelTypeCode, projectProducts])

  // Legacy cascading loaders kept for EditableParcelRow compatibility
  const loadAddParcelTypes = async (familyId: string) => {
    try {
      const res = await fetch(`/api/landuse/types/${familyId}`)
      if (res.ok) {
        const data = await res.json()
        const normalized = Array.isArray(data) ? data.map((t: Record<string, unknown>) => ({
          type_id: String(t.type_id ?? t.subtype_id ?? ''),
          family_id: String(t.family_id ?? ''),
          name: String(t.type_name ?? t.name ?? ''),
          code: String(t.code ?? t.type_code ?? '')
        })).filter(t => t.type_id && t.name) : []
        void normalized // kept for EditableParcelRow
      }
    } catch { /* noop */ }
  }

  const loadAddParcelProducts = async (typeId: string) => {
    if (sharedLotProducts.has(typeId)) return
    try {
      const res = await fetch(`/api/landuse/lot-products/${typeId}`)
      if (res.ok) {
        const data = await res.json()
        const products = Array.isArray(data) ? data : []
        setSharedLotProducts(prev => new Map(prev).set(typeId, products))
      }
    } catch { /* noop */ }
  }

  // Derive area options from areas state (tbl_area) with parcel-based fallback
  const areaOptions = useMemo(() => {
    if (areas.length > 0) return areas
    // Fallback: derive from parcels
    const seen = new Map<number, Area>()
    for (const p of parcels) {
      if (p.area_id && !seen.has(p.area_id)) {
        seen.set(p.area_id, { area_id: p.area_id, area_no: p.area_no, area_name: `${level1Label} ${p.area_no}` })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.area_no - b.area_no)
  }, [areas, parcels, level1Label])

  // Derive phase options: prefer phases state, fallback to parcels
  const phaseOptions = useMemo(() => {
    if (phases.length > 0) return phases
    // Fallback: derive unique phase_id/phase_name from parcels
    const seen = new Map<number, Phase>()
    for (const p of parcels) {
      if (p.phase_id && !seen.has(p.phase_id)) {
        seen.set(p.phase_id, {
          phase_id: p.phase_id,
          area_no: p.area_no,
          area_id: p.area_id,
          phase_name: p.phase_name || `${p.area_no}.?`,
          gross_acres: 0, net_acres: 0, units_total: 0, start_date: null, status: 'Active'
        })
      }
    }
    return Array.from(seen.values())
  }, [phases, parcels])

  // Get phases for a given area_id (cascading from area selection)
  // When L1 is disabled, show ALL phases (no area filtering needed)
  const phasesForArea = useMemo(() => {
    if (!level1Enabled) return phaseOptions
    const areaNum = parseInt(addParcelAreaNo.trim(), 10)
    if (!addParcelAreaNo.trim() || isNaN(areaNum)) return []
    const matchedArea = areaOptions.find(a => a.area_no === areaNum)
    if (!matchedArea) return []
    return phaseOptions.filter(p => p.area_id === matchedArea.area_id)
  }, [phaseOptions, addParcelAreaNo, areaOptions, level1Enabled])

  // When L1 is disabled, transparently ensure a default area exists for phase/parcel creation
  const getOrCreateDefaultArea = async (): Promise<{ area_id: number; area_no: number } | null> => {
    if (!projectId) return null
    // Use first existing area if any
    if (areaOptions.length > 0) {
      return { area_id: areaOptions[0].area_id, area_no: areaOptions[0].area_no }
    }
    // Create a default area
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, area_name: 'Default' })
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      await mutateAreas()
      return { area_id: result.area_id, area_no: result.area_no }
    } catch (e) {
      console.error('Failed to create default area:', e)
      return null
    }
  }

  // Create area on the fly, returns area_id
  const getOrCreateArea = async (areaIdOrNew: number | string): Promise<number | null> => {
    if (areaIdOrNew !== '__new__') return Number(areaIdOrNew)
    if (!projectId) return null
    const areaName = prompt(`Enter new ${level1Label} name (optional):`)
    if (areaName === null) return null // cancelled
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, area_name: areaName || undefined })
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      await mutateAreas()
      await mutatePhases()
      return result.area_id
    } catch (e) {
      alert(`Failed to create ${level1Label}: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  // Create phase on the fly for a given area_no, returns phase_id
  const getOrCreatePhase = async (phaseIdOrNew: number | string, areaNo: number): Promise<number | null> => {
    if (phaseIdOrNew !== '__new__') return Number(phaseIdOrNew)
    if (!projectId) return null
    try {
      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, area_no: areaNo })
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      await mutatePhases()
      return result.phase_id
    } catch (e) {
      alert(`Failed to create ${level2Label}: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  // Add parcel using the inline row selections
  const addParcelFromRow = async () => {
    if (!projectId) return

    // Validate: L1 requires area number; L2 requires a phase number
    if (level1Enabled && !addParcelAreaNo.trim()) {
      alert(`Please enter a ${level1Label} number`)
      return
    }
    if (level2Enabled && !addParcelPhaseNo.trim()) {
      alert(`Please enter a ${level2Label} number`)
      return
    }

    setAddParcelSaving(true)
    try {
      // --- Resolve area by number ---
      let resolvedAreaId: number | null
      let areaNo: number

      if (level1Enabled) {
        const enteredAreaNo = parseInt(addParcelAreaNo.trim(), 10)
        // Try to find existing area with this number
        const existingArea = areaOptions.find(a => a.area_no === enteredAreaNo)
        if (existingArea) {
          resolvedAreaId = existingArea.area_id
          areaNo = existingArea.area_no
        } else {
          // Create new area with this number
          const newAreaName = `${level1Label} ${enteredAreaNo}`
          try {
            const res = await fetch('/api/areas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_id: projectId, area_name: newAreaName })
            })
            if (!res.ok) throw new Error(await res.text())
            const result = await res.json()
            await mutateAreas()
            resolvedAreaId = result.area_id
            areaNo = result.area_no
          } catch (e) {
            alert(`Failed to create ${level1Label}: ${e instanceof Error ? e.message : String(e)}`)
            setAddParcelSaving(false)
            return
          }
        }
      } else {
        const defaultArea = await getOrCreateDefaultArea()
        if (!defaultArea) { setAddParcelSaving(false); return }
        resolvedAreaId = defaultArea.area_id
        areaNo = defaultArea.area_no
      }

      // --- Resolve phase by number ---
      let resolvedPhaseId: number | null
      if (level2Enabled) {
        const enteredPhaseNo = parseInt(addParcelPhaseNo.trim(), 10)
        // Try to find existing phase with this number under the resolved area
        const existingPhase = phaseOptions.find(p =>
          p.area_id === resolvedAreaId && (p.phase_no === enteredPhaseNo || p.phase_name === `${areaNo}.${enteredPhaseNo}`)
        )
        if (existingPhase) {
          resolvedPhaseId = existingPhase.phase_id
        } else {
          // Create new phase — POST /api/phases auto-increments phase_no
          resolvedPhaseId = await getOrCreatePhase('__new__', areaNo)
        }
        if (!resolvedPhaseId) { setAddParcelSaving(false); return }
      } else {
        const existingPhase = phaseOptions.find(p => p.area_id === resolvedAreaId)
        if (existingPhase) {
          resolvedPhaseId = existingPhase.phase_id
        } else {
          resolvedPhaseId = await getOrCreatePhase('__new__', areaNo)
          if (!resolvedPhaseId) { setAddParcelSaving(false); return }
        }
      }

      // --- Resolve family/type from project land use config ---
      const familyCode = addParcelFamilyCode || projectFamilies[0]?.family_code || ''
      const familyName = projectFamilies.find(f => f.family_code === familyCode)?.family_name || 'Residential'
      const typeCode = addParcelTypeCode || typesForSelectedFamily[0]?.type_code || null

      // Create the parcel
      const res = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          area_id: resolvedAreaId,
          phase_id: resolvedPhaseId,
          parcel_code: !autoNumber && addParcelName.trim() ? addParcelName.trim() : null,
          family_name: familyName,
          type_code: typeCode,
          product_code: addParcelProductCode || productsForSelectedType[0]?.product_code || null,
          acres_gross: addParcelAcres ? parseFloat(addParcelAcres) : null,
          units_total: addParcelUnits ? parseInt(addParcelUnits, 10) : null
        })
      })
      if (!res.ok) throw new Error(await res.text())

      // Refresh and reset
      await mutateParcels()
      await mutatePhases()
      await mutateAreas()
      setShowAddParcelRow(false)
      setAddParcelAreaId('')
      setAddParcelAreaNo('')
      setAddParcelPhaseNo('')
      setAddParcelName('')
      setAddParcelAcres('')
      setAddParcelUnits('')
      setAddParcelFamilyCode('')
      setAddParcelTypeCode('')
      setAddParcelProductCode('')

      window.dispatchEvent(new CustomEvent('dataChanged', {
        detail: { entity: 'parcel', projectId }
      }))
    } catch (e) {
      alert(`Failed to add ${level3Label}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAddParcelSaving(false)
    }
  }

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

  const openDetailForParcel = (_p: Parcel) => {
    // PlanningWizard sidecard is archived; detail panel interaction removed.
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
        <div style={{ color: 'var(--cui-secondary-color)' }}>Loading planning data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planning Overview with Granularity Controls */}
      <PlanningOverviewControls projectId={projectId} projectIdStr={projectIdStr} />

      {/* Plan Areas and Phases Overview - Read-only rollups from Parcel Detail */}
      {(level1Enabled || level2Enabled) && (
      <div className={`grid gap-4 transition-all duration-300 ${
        !level1Enabled || !level2Enabled
          ? 'grid-cols-1'
          : isAnyPhaseEditing
            ? 'grid-cols-1 lg:grid-cols-[20%_1fr]'
            : 'grid-cols-1 lg:grid-cols-[40%_1fr]'
      }`}>
        {/* Level 1 summary - Wrapped with CollapsibleSection */}
        {level1Enabled && (
        <CollapsibleSection
          title={level1LabelPlural}
          itemCount={areaCards.length}
          defaultExpanded={areaCards.length > 0}
        >
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {areaCards.map(({ key, areaNo, title, stats }, idx) => {
                const tileColors = [
                  'var(--cui-primary)',
                  'var(--cui-success)',
                  'var(--cui-info)',
                  'var(--cui-warning)',
                  'var(--cui-danger)',
                  'var(--cui-primary)',
                ];
                const accentColor = tileColors[idx % tileColors.length];
                const isActive = selectedAreaFilters.includes(areaNo);
                return (
                  <div
                    key={key}
                    className={`planning-tile text-center ${isActive ? 'planning-tile-active' : ''}`}
                    style={{
                      padding: '0.875rem 1rem',
                      borderLeft: `3px solid ${accentColor}`,
                      position: 'relative',
                    }}
                    onClick={() => toggleAreaFilter(areaNo)}
                  >
                    <button
                      className="text-xs rounded-full"
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        width: '18px', height: '18px', lineHeight: '16px',
                        backgroundColor: 'var(--cui-danger)', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title={`Delete ${level1Label} ${areaNo}`}
                      onClick={async (e) => {
                        e.stopPropagation()
                        const hasChildren = stats.phases > 0 || stats.parcels > 0
                        const msg = hasChildren
                          ? `Delete ${level1Label} ${areaNo}? Its ${stats.phases} ${level2LabelPlural.toLowerCase()} and ${stats.parcels} ${level3LabelPlural.toLowerCase()} will remain but lose their ${level1Label.toLowerCase()} grouping.`
                          : `Delete ${level1Label} ${areaNo}?`
                        if (!confirm(msg)) return
                        const area = areaOptions.find(a => a.area_no === areaNo)
                        if (!area) return
                        try {
                          const res = await fetch(`/api/areas?area_id=${area.area_id}`, { method: 'DELETE' })
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}))
                            throw new Error(data.error || 'Delete failed')
                          }
                          await mutateAreas()
                          await mutateParcels()
                        } catch (err) {
                          alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`)
                        }
                      }}
                    >
                      ✕
                    </button>
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
                );
              })}
            </div>
          </div>
        </CollapsibleSection>
        )}

        {/* Level 2 summary - Wrapped with CollapsibleSection */}
        {level2Enabled && (
        <CollapsibleSection
          title={level2LabelPlural}
          itemCount={filteredPhases.length}
          defaultExpanded={true}
        >
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--surface-subheader)' }}>
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
        )}
      </div>
      )}

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
              Import Data
            </button>
            <button
              onClick={() => {
                setShowAddParcelRow(true); setAddParcelAreaId(''); setAddParcelAreaNo(''); setAddParcelPhaseNo('')
                // Pre-populate family/type/product when only one option exists
                const fam = projectFamilies.length === 1 ? projectFamilies[0].family_code : ''
                setAddParcelFamilyCode(fam)
                const types = fam ? projectTypes.filter(t => t.family_code === fam) : []
                const typ = types.length === 1 ? types[0].type_code : ''
                setAddParcelTypeCode(typ)
                const prods = typ ? projectProducts.filter(p => p.type_code === typ) : []
                setAddParcelProductCode(prods.length === 1 ? prods[0].product_code : '')
              }}
              className="px-2.5 py-1 text-xs text-white rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-success)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              + Add {level3Label}
            </button>
          </>
        }
      >
        <div className="p-3">
          <div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-subheader)', borderBottom: '1px solid var(--cui-border-color)' }}>
                {level1Enabled && <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>{level1Label}</th>}
                {level2Enabled && <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>{level2Label}</th>}
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Parcel</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Use Family</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Use Type</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Product</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Acres</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Units</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>DUA</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>FF/Acre</th>
                <th className="text-center px-2 py-2 font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add Parcel inline row — shown at top while entering */}
              {showAddParcelRow && (
                <tr style={{ backgroundColor: 'rgba(25, 135, 84, 0.08)', borderBottom: '1px solid var(--cui-border-color)' }}>
                  {level1Enabled && (
                  <td className="px-2 py-2 text-center" colSpan={1}>
                    {/* Area: select existing or type a new number */}
                    <input
                      type="text"
                      list="add-parcel-area-list"
                      className="w-full rounded px-2 py-1 text-xs"
                      style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid', maxWidth: '100px' }}
                      placeholder={`${level1Label} #`}
                      value={addParcelAreaNo}
                      onChange={e => { setAddParcelAreaNo(e.target.value); setAddParcelPhaseNo('') }}
                    />
                    <datalist id="add-parcel-area-list">
                      {areaOptions.map(a => (
                        <option key={a.area_id} value={String(a.area_no)}>{a.label || a.area_name || `${level1Label} ${a.area_no}`}</option>
                      ))}
                    </datalist>
                  </td>
                  )}
                  {level2Enabled && (
                  <td className="px-2 py-2 text-center" colSpan={1}>
                    {/* Phase: select existing or type a new number */}
                    <input
                      type="text"
                      list="add-parcel-phase-list"
                      className="w-full rounded px-2 py-1 text-xs"
                      style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid', maxWidth: '100px' }}
                      placeholder={`${level2Label} #`}
                      value={addParcelPhaseNo}
                      onChange={e => setAddParcelPhaseNo(e.target.value)}
                    />
                    <datalist id="add-parcel-phase-list">
                      {phasesForArea.map(p => (
                        <option key={p.phase_id} value={String(p.phase_no ?? p.phase_name?.split('.').pop() ?? '')}>{p.phase_name}</option>
                      ))}
                    </datalist>
                  </td>
                  )}
                  {/* Parcel # — auto-assigned or manual entry */}
                  <td className="px-2 py-2 text-center">
                    {autoNumber ? (
                      <span className="text-xs italic" style={{ color: 'var(--cui-secondary-color)' }}>Auto</span>
                    ) : (
                      <input
                        type="text"
                        className="w-full rounded px-1 py-1 text-xs text-center"
                        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid', maxWidth: '80px' }}
                        placeholder="#"
                        value={addParcelName}
                        onChange={e => setAddParcelName(e.target.value)}
                      />
                    )}
                  </td>
                  {/* Use Family — scoped to project land use config */}
                  <td className="px-2 py-2 text-center">
                    {projectFamilies.length <= 1 ? (
                      <span className="text-xs" style={{ color: 'var(--cui-body-color)' }}>{projectFamilies[0]?.family_name || '—'}</span>
                    ) : (
                      <select
                        className="w-full rounded px-1 py-1 text-xs"
                        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
                        value={addParcelFamilyCode}
                        onChange={e => { setAddParcelFamilyCode(e.target.value); setAddParcelTypeCode(''); setAddParcelProductCode('') }}
                      >
                        <option value="">Family</option>
                        {projectFamilies.map(f => (
                          <option key={f.family_id} value={f.family_code}>{f.family_name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* Use Type — scoped to selected family */}
                  <td className="px-2 py-2 text-center">
                    {typesForSelectedFamily.length <= 1 ? (
                      <span className="text-xs" style={{ color: 'var(--cui-body-color)' }}>{typesForSelectedFamily[0]?.type_name || '—'}</span>
                    ) : (
                      <select
                        className="w-full rounded px-1 py-1 text-xs"
                        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
                        value={addParcelTypeCode}
                        onChange={e => { setAddParcelTypeCode(e.target.value); setAddParcelProductCode('') }}
                      >
                        <option value="">Type</option>
                        {typesForSelectedFamily.map(t => (
                          <option key={t.type_id} value={t.type_code}>{t.type_name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* Product — scoped to selected type */}
                  <td className="px-2 py-2 text-center">
                    {productsForSelectedType.length <= 1 ? (
                      <span className="text-xs" style={{ color: 'var(--cui-body-color)' }}>{productsForSelectedType[0]?.product_code || '—'}</span>
                    ) : (
                      <select
                        className="w-full rounded px-1 py-1 text-xs"
                        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
                        value={addParcelProductCode}
                        onChange={e => setAddParcelProductCode(e.target.value)}
                      >
                        <option value="">Product</option>
                        {productsForSelectedType.map(p => (
                          <option key={p.product_id} value={p.product_code}>{p.product_code}{p.lot_w_ft ? ` (${p.lot_w_ft}')` : ''}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* Acres */}
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded px-1 py-1 text-xs text-center"
                      style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
                      placeholder="0.00"
                      value={addParcelAcres}
                      onChange={e => setAddParcelAcres(e.target.value)}
                    />
                  </td>
                  {/* Units */}
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      step="1"
                      className="w-full rounded px-1 py-1 text-xs text-center"
                      style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
                      placeholder="0"
                      value={addParcelUnits}
                      onChange={e => setAddParcelUnits(e.target.value)}
                    />
                  </td>
                  {/* DUA, FF/Acre — computed, not editable */}
                  <td className="px-2 py-2 text-center">
                    <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>—</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        className="px-2 py-1 text-xs text-white rounded transition-colors"
                        style={{ backgroundColor: 'var(--cui-success)', opacity: addParcelSaving ? 0.6 : 1 }}
                        disabled={addParcelSaving}
                        onClick={addParcelFromRow}
                      >
                        {addParcelSaving ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{ backgroundColor: 'var(--cui-secondary)', color: 'white' }}
                        onClick={() => { setShowAddParcelRow(false); setAddParcelAreaId(''); setAddParcelAreaNo(''); setAddParcelPhaseNo(''); setAddParcelName(''); setAddParcelAcres(''); setAddParcelUnits(''); setAddParcelFamilyCode(''); setAddParcelTypeCode(''); setAddParcelProductCode('') }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
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
                  areas={areaOptions}
                  allPhases={phaseOptions}
                  level1Label={level1Label}
                  level2Label={level2Label}
                  level1Enabled={level1Enabled}
                  level2Enabled={level2Enabled}
                  onAreaPhaseChanged={() => { mutateAreas(); mutatePhases(); mutateParcels() }}
                />
              ))}
            </tbody>
          </table>
          </div>
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
            style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', border: '1px solid' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--cui-body-color)' }}>
              Data Import - Coming Soon
            </h3>
            <p className="mb-6" style={{ color: 'var(--cui-body-color)' }}>
              Landscaper AI will soon extract parcel data from PDFs and spreadsheets (CSV, XLSX) automatically.
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
  areas?: Area[];
  allPhases?: Phase[];
  level1Label?: string;
  level2Label?: string;
  level1Enabled?: boolean;
  level2Enabled?: boolean;
  onAreaPhaseChanged?: () => void;
}> = ({ parcel, index, onSaved, onOpenDetail, onDelete, getFamilyName, formatParcelIdDisplay, projectId, sharedFamilies = [], sharedLotProducts = new Map(), setSharedLotProducts, planningEfficiency, areas = [], allPhases = [], level1Label = 'Area', level2Label = 'Phase', level1Enabled = true, level2Enabled = true, onAreaPhaseChanged }) => {
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

  // Area/Phase editing
  const [editAreaId, setEditAreaId] = useState<number | string>(parcel.area_id ?? '')
  const [editPhaseId, setEditPhaseId] = useState<number | string>(parcel.phase_id ?? '')

  const editPhasesForArea = useMemo(() => {
    if (!editAreaId || editAreaId === '__new__') return []
    return allPhases.filter(p => p.area_id === Number(editAreaId))
  }, [allPhases, editAreaId])

  // Reset area/phase selections when entering edit mode
  useEffect(() => {
    if (editing) {
      setEditAreaId(parcel.area_id ?? '')
      setEditPhaseId(parcel.phase_id ?? '')
    }
  }, [editing, parcel.area_id, parcel.phase_id])

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
    setEditAreaId(parcel.area_id ?? '')
    setEditPhaseId(parcel.phase_id ?? '')
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

      // Handle area/phase changes (may create new ones)
      let resolvedAreaId = parcel.area_id
      let resolvedPhaseId = parcel.phase_id
      const areaChanged = editAreaId !== (parcel.area_id ?? '') || editPhaseId !== (parcel.phase_id ?? '')

      if (areaChanged) {
        // Resolve area
        if (editAreaId === '__new__') {
          const areaName = prompt(`Enter new ${level1Label} name (optional):`)
          if (areaName === null) return
          const areaRes = await fetch('/api/areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, area_name: areaName || undefined })
          })
          if (!areaRes.ok) { alert(`Failed to create ${level1Label}`); return }
          const newArea = await areaRes.json()
          resolvedAreaId = newArea.area_id
          // Also need a phase in the new area
          const phaseRes = await fetch('/api/phases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, area_no: newArea.area_no })
          })
          if (!phaseRes.ok) { alert(`Failed to create ${level2Label} in new ${level1Label}`); return }
          const newPhase = await phaseRes.json()
          resolvedPhaseId = newPhase.phase_id
        } else {
          resolvedAreaId = Number(editAreaId)
          // Resolve phase
          if (editPhaseId === '__new__') {
            const area = areas.find(a => a.area_id === resolvedAreaId)
            if (!area) { alert(`${level1Label} not found`); return }
            const phaseRes = await fetch('/api/phases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_id: projectId, area_no: area.area_no })
            })
            if (!phaseRes.ok) { alert(`Failed to create ${level2Label}`); return }
            const newPhase = await phaseRes.json()
            resolvedPhaseId = newPhase.phase_id
          } else {
            resolvedPhaseId = Number(editPhaseId)
          }
        }
      }

      // Build payload with family/type/product if selected
      const payload: Record<string, unknown> = {
        acres: Number(draft.acres),
        frontfeet: Number(draft.frontfeet),
        lot_width: Number(draft.lot_width),
      }

      // Include area/phase if changed
      if (areaChanged) {
        payload.area_id = resolvedAreaId
        payload.phase_id = resolvedPhaseId
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
        if (areaChanged && onAreaPhaseChanged) {
          onAreaPhaseChanged()
        }
      } catch {}
    } catch (e) {
      console.error('Save parcel failed', e)
      alert('Failed to save parcel')
    }
  }

  return (
    <tr className={`border-b transition-colors ${!editing ? 'cursor-pointer' : ''}`} style={{
      borderColor: 'var(--cui-border-color)',
      backgroundColor: editing ? 'rgba(13, 110, 253, 0.08)' : 'var(--surface-bg)'
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
        e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
      }
    }}>
      {level1Enabled && (
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }} onClick={(e) => editing && e.stopPropagation()}>
        {editing ? (
          <select
            className="w-full rounded px-1 py-1 text-xs"
            style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
            value={editAreaId}
            onChange={e => { setEditAreaId(e.target.value); setEditPhaseId('') }}
          >
            <option value="">Select</option>
            {areas.map(a => (
              <option key={a.area_id} value={a.area_id}>{a.label || a.area_name || `${level1Label} ${a.area_no}`}</option>
            ))}
            <option value="__new__">＋ New {level1Label}</option>
          </select>
        ) : (
          parcel.area_no
        )}
      </td>
      )}
      {level2Enabled && (
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }} onClick={(e) => editing && e.stopPropagation()}>
        {editing ? (
          <select
            className="w-full rounded px-1 py-1 text-xs"
            style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', border: '1px solid' }}
            value={editPhaseId}
            onChange={e => setEditPhaseId(e.target.value)}
            disabled={!editAreaId || editAreaId === '__new__'}
          >
            <option value="">Select</option>
            {editPhasesForArea.map(p => (
              <option key={p.phase_id} value={p.phase_id}>{p.phase_name}</option>
            ))}
            <option value="__new__">＋ New {level2Label}</option>
          </select>
        ) : (
          parcel.phase_name
        )}
      </td>
      )}
      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{formatParcelIdDisplay(parcel.parcel_name)}</td>
      <td className="px-2 py-1.5 text-center" onClick={(e) => editing && e.stopPropagation()}>
        {editing ? (
          <select
            className="w-32 rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: 'var(--surface-bg)',
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
              backgroundColor: 'var(--surface-bg)',
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
          <span className={`${styles.badgeBase} ${
              parcel.family_name === 'Residential' ? styles.familyResidential :
              parcel.family_name === 'Commercial' ? styles.familyCommercial :
              parcel.family_name === 'Industrial' ? styles.familyIndustrial :
              styles.familyDefault
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
                backgroundColor: 'var(--surface-bg)',
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
              backgroundColor: 'var(--surface-bg)',
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
                  backgroundColor: 'var(--surface-bg)',
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
                setEditing(true);
              }}
            >
              Edit
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
          backgroundColor: isSelected ? 'var(--cui-primary)' : 'var(--surface-bg)',
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
            e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
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
              <span
                key={useCode}
                className={`${styles.badgeBase} ${
                  [styles.phaseBadgePrimary, styles.phaseBadgeSuccess, styles.phaseBadgeWarning, styles.phaseBadgeDanger, styles.phaseBadgeInfo, styles.phaseBadgeSecondary][idx % 6] || styles.phaseBadgeSecondary
                }`}
              >
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

            {/* Filter chip */}
            <button
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border-0 hover:opacity-80"
              style={{
                backgroundColor: 'var(--surface-bg)',
                color: 'var(--cui-secondary-color)',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFilter(phase.phase_name);
              }}
            >
              Filter
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded description row */}
      {expanded && (
        <tr style={{ backgroundColor: 'var(--surface-bg)' }}>
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
                  backgroundColor: 'var(--surface-bg)',
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
