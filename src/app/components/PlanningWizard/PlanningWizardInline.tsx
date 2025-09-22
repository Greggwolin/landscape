'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ProjectCanvasInline from './ProjectCanvasInline'
import PhaseCanvasInline from './PhaseCanvasInline'
import ParcelDetailCard from './cards/ParcelDetailCard'
import AreaForm from './forms/AreaForm'
import PhaseForm from './forms/PhaseForm'

// Module-level flag to prevent duplicate hydrations
let hydrationInProgress = false
let hydrationComplete = false

export type LandUseType = 'MDR' | 'HDR' | 'LDR' | 'MHDR' | 'C' | 'MU' | 'OS'

export interface Parcel {
  id: string
  name: string
  landUse: LandUseType
  acres: number
  units: number
  // Additional fields from tbl_parcels
  efficiency?: number
  frontfeet?: number
  frontage?: number
  ff_per_acre?: number
  density_gross?: number
  density_net?: number
  product?: string
  status?: string
  description?: string
  notes?: string
  dbId?: number
  usecode?: string // The actual land use code from the database
  family_name?: string
  subtype_name?: string
  landuse_name?: string
}

export interface Phase {
  id: string
  name: string
  parcels: Parcel[]
  saved?: boolean
  dbId?: number // Database phase_id
  areaDbId?: number // Database area_id
  projectId?: number // Database project_id
}

export interface Area {
  id: string
  name: string
  phases: Phase[]
  saved?: boolean
  dbId?: number // Database area_id
  projectId?: number // Database project_id
}

export interface Project {
  id: string
  name: string
  areas: Area[]
}

type ViewMode = 'project' | 'phase'

interface ViewContext {
  mode: ViewMode
  areaId?: string
  phaseId?: string
}

// No detail cards or delete dialogs needed for inline version

const PlanningWizardInline: React.FC = () => {
  console.log('🔄 PlanningWizardInline component loaded')

  // Reset hydration on component mount to allow fresh hydration
  useEffect(() => {
    hydrationInProgress = false
    hydrationComplete = false
  }, [])

  const [project, setProject] = useState<Project>({
    id: 'project-1',
    name: 'Peoria Lakes (Inline)',
    areas: []
  })

  const [isHydrating, setIsHydrating] = useState(!hydrationComplete)

  const [viewContext, setViewContext] = useState<ViewContext>({
    mode: 'project'
  })

  const [detailCard, setDetailCard] = useState<{ areaId: string | null; phaseId: string | null; parcelId: string | null; isOpen: boolean }>({
    areaId: null,
    phaseId: null,
    parcelId: null,
    isOpen: false
  })

  // No detail cards needed for inline version

  const [showAreaForm, setShowAreaForm] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState<{ areaId: string; areaName: string } | null>(null)

  const projectNumericId = useMemo(() => {
    const parts = String(project.id ?? '').split('-')
    const candidate = Number(parts[parts.length - 1])
    return Number.isFinite(candidate) ? candidate : null
  }, [project.id])

  // Note: localStorage removed - using Neon database as single source of truth

  // Reset hydration flags on component mount to allow fresh hydration
  useEffect(() => {
    hydrationInProgress = false
    hydrationComplete = false
  }, [])

  // Hydrate from Neon (areas, phases, parcels)
  useEffect(() => {
    if (hydrationInProgress || hydrationComplete) {
      console.log('⏭️ Hydration already in progress or complete, skipping...')
      if (hydrationComplete) setIsHydrating(false)
      return
    }

    hydrationInProgress = true
    console.log('🚀 Starting hydration...')
    ;(async () => {
      try {
        console.log('📡 Fetching projects...')
        const projRes = await fetch('/api/projects', { cache: 'no-store' })
        const projects = await projRes.json().catch(() => [])
        console.log('📡 Projects response:', projects)
        const projectId = Array.isArray(projects) && projects[0]?.project_id ? Number(projects[0].project_id) : null
        console.log('📡 Project ID:', projectId)
        if (!projectId) {
          console.log('❌ No project ID found, aborting hydration')
          setIsHydrating(false)
          return
        }
        const [parcelsRes, phasesRes] = await Promise.all([
          fetch(`/api/parcels?project_id=${projectId}&t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          }),
          fetch(`/api/phases?project_id=${projectId}&t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
        ])
        console.log('📡 Fetching parcels and phases...')
        const parcels = await parcelsRes.json().catch(() => [])
        const phases = await phasesRes.json().catch(() => [])
        console.log('📡 Parcels:', parcels.length, 'Phases:', phases.length)
        console.log('📊 Sample parcel family/subtype data:', parcels.slice(0, 3).map(p => ({
          parcel_id: p.parcel_id,
          family_name: p.family_name,
          subtype_name: p.subtype_name,
          landuse_name: p.landuse_name,
          usecode: p.usecode,
          raw_family: typeof p.family_name,
          raw_subtype: typeof p.subtype_name,
          family_trimmed: p.family_name && p.family_name.trim ? p.family_name.trim() : 'NO_TRIM_METHOD'
        })))
        console.log('📊 First parcel full object:', parcels[0])

        // Build areas -> phases -> parcels
        console.log('🔧 Building areas map...')
        const areasMap = new Map<number, Area>()
        for (const ph of phases) {
          const areaNo = Number(ph.area_no)
          const phaseNo = Number(ph.phase_no)
          const areaId = `area-${areaNo}`
          const phaseId = `phase-${areaNo}-${phaseNo}`
          if (!areasMap.has(areaNo)) {
            areasMap.set(areaNo, {
              id: areaId,
              name: `Area ${areaNo}`,
              phases: [],
              saved: true,
              dbId: ph.area_id, // Store database area_id
              projectId: projectId // Store project_id for new parcels
            })
          }
          const areaRef = areasMap.get(areaNo)!
          if (!areaRef.phases.find(p => p.id === phaseId)) {
            areaRef.phases.push({
              id: phaseId,
              name: `Phase ${areaNo}.${phaseNo}`,
              parcels: [],
              saved: true,
              dbId: ph.phase_id, // Store database phase_id
              areaDbId: ph.area_id, // Store database area_id for convenience
              projectId: projectId // Store project_id for new parcels
            })
          }
        }

        console.log('🔧 Areas map built, processing parcels...')
        for (const pr of parcels) {
          const areaNo = Number(pr.area_no)
          const phaseName = String(pr.phase_name)
          const [aStr, pStr] = phaseName.split('.')
          const phaseNo = Number(pStr)
          const phaseId = `phase-${areaNo}-${phaseNo}`
          const areaRef = areasMap.get(areaNo)
          if (!areaRef) continue
          const phaseRef = areaRef.phases.find(p => p.id === phaseId)
          if (!phaseRef) continue
          // Map usecode to a valid LandUseType for visual styling, but preserve the actual usecode
          let lu: LandUseType = 'MDR' // default
          const uc = pr.usecode?.toUpperCase() || ''
          if (['MDR','HDR','LDR','MHDR','C','MU','OS'].includes(uc)) {
            lu = uc as LandUseType
          } else if (uc.includes('SFD') || uc.includes('R1-') || uc.includes('SF')) {
            lu = 'LDR'
          } else if (uc.includes('MF') || uc.includes('RM-')) {
            lu = 'HDR'
          } else if (uc.includes('RET') || uc.includes('COM') || uc.includes('C-')) {
            lu = 'C'
          } else if (uc.includes('MU') || uc.includes('MX') || uc.includes('PUD')) {
            lu = 'MU'
          } else if (uc.includes('OS') || uc.includes('PARK') || uc.includes('AG')) {
            lu = 'OS'
          }
          const parcel: Parcel = {
            id: `parcel-db-${pr.parcel_id}`,
            name: `Parcel: ${pr.parcel_name}`,
            landUse: lu,
            acres: Number(pr.acres ?? 0),
            units: Number(pr.units ?? 0),
            product: pr.product ?? undefined,
            efficiency: Number(pr.efficiency ?? 0),
            dbId: Number(pr.parcel_id),
            usecode: pr.usecode ?? undefined, // Preserve the original land use code
            family_name: pr.family_name && pr.family_name.trim() ? pr.family_name : undefined,
            subtype_name: pr.subtype_name && pr.subtype_name.trim() ? pr.subtype_name : undefined,
            landuse_name: pr.landuse_name && pr.landuse_name.trim() ? pr.landuse_name : undefined
          }
          phaseRef.parcels.push(parcel)
        }
        const areas = Array.from(areasMap.values()).sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))
        setProject({ id: `project-${projectId}`, name: `${projects[0]?.project_name ?? `Project ${projectId}`} (Inline)`, areas })

      } catch (e) {
        console.error('Inline Wizard hydration failed', e)
      }
    })()
  }, [])

  // Refresh on external data changes (e.g., Overview edits)
  useEffect(() => {
    const refresh = () => {
      console.log('🔄 Refresh function called - starting data refresh...')
      // Re-run the hydration by forcing a minimal change
      ;(async () => {
        try {
          const projRes = await fetch('/api/projects', { cache: 'no-store' })
          const projects = await projRes.json().catch(() => [])
          const projectId = Array.isArray(projects) && projects[0]?.project_id ? Number(projects[0].project_id) : null
          if (!projectId) return
          const [parcelsRes, phasesRes] = await Promise.all([
            fetch(`/api/parcels?project_id=${projectId}`, { cache: 'no-store' }),
            fetch(`/api/phases?project_id=${projectId}`, { cache: 'no-store' })
          ])
          const parcels = await parcelsRes.json().catch(() => [])
          const phases = await phasesRes.json().catch(() => [])
          const areasMap = new Map<number, Area>()
          for (const ph of phases) {
            const areaNo = Number(ph.area_no)
            const phaseNo = Number(ph.phase_no)
            const areaId = `area-${areaNo}`
            const phaseId = `phase-${areaNo}-${phaseNo}`
            if (!areasMap.has(areaNo)) {
              areasMap.set(areaNo, { id: areaId, name: `Area ${areaNo}`, phases: [], saved: true })
            }
            const areaRef = areasMap.get(areaNo)!
            if (!areaRef.phases.find(p => p.id === phaseId)) {
              areaRef.phases.push({ id: phaseId, name: `Phase ${areaNo}.${phaseNo}`, parcels: [], saved: true })
            }
          }
          for (const pr of parcels) {
            const areaNo = Number(pr.area_no)
            const phaseName = String(pr.phase_name)
            const [, pStr] = phaseName.split('.')
            const phaseNo = Number(pStr)
            const phaseId = `phase-${areaNo}-${phaseNo}`
            const areaRef = areasMap.get(areaNo)
            if (!areaRef) continue
            const phaseRef = areaRef.phases.find(p => p.id === phaseId)
            if (!phaseRef) continue
            // Map usecode to a valid LandUseType for visual styling, but preserve the actual usecode
            let lu: LandUseType = 'MDR' // default
            const uc = pr.usecode?.toUpperCase() || ''

            // Enhanced mapping to match ProjectCanvasInline.tsx logic
            // Note: LandUseType is restricted to 'MDR' | 'HDR' | 'LDR' | 'MHDR' | 'C' | 'MU' | 'OS'
            switch (uc) {
              // Residential
              case 'SFD': lu = 'LDR'; break; // Single Family Detached -> Low Density Residential
              case 'LDR': lu = 'LDR'; break;
              case 'MDR': lu = 'MDR'; break;
              case 'HDR': lu = 'HDR'; break;
              case 'MHDR': lu = 'MHDR'; break;
              case 'MF': lu = 'HDR'; break; // Multi-Family -> High Density Residential
              case 'MLDR': lu = 'LDR'; break; // Medium-Low Density -> Low Density
              case 'BTR': lu = 'LDR'; break; // Build-to-Rent -> Low Density
              case 'TH': lu = 'MDR'; break; // Townhouse -> Medium Density
              case 'CONDO': lu = 'MDR'; break; // Condo -> Medium Density

              // Commercial
              case 'C': lu = 'C'; break;
              case 'RET': lu = 'C'; break; // Retail -> Commercial
              case 'OFF': lu = 'C'; break; // Office -> Commercial

              // Mixed Use & Other
              case 'MU': lu = 'MU'; break;

              // Open Space & Recreation
              case 'OS': lu = 'OS'; break;
              case 'GOLF': lu = 'OS'; break; // Golf -> Open Space

              default:
                // Fallback logic for partial matches
                if (uc.includes('SFD') || uc.includes('R1-') || uc.includes('SF')) {
                  lu = 'LDR'
                } else if (uc.includes('MF') || uc.includes('RM-')) {
                  lu = 'HDR'
                } else if (uc.includes('RET') || uc.includes('COM') || uc.includes('C-')) {
                  lu = 'C'
                } else if (uc.includes('MU') || uc.includes('MX') || uc.includes('PUD')) {
                  lu = 'MU'
                } else if (uc.includes('OS') || uc.includes('PARK') || uc.includes('AG')) {
                  lu = 'OS'
                }
                break;
            }
            const parcel: Parcel = {
              id: `parcel-db-${pr.parcel_id}`,
              name: `Parcel: ${pr.parcel_name}`,
              landUse: lu,
              acres: Number(pr.acres ?? 0),
              units: Number(pr.units ?? 0),
              product: pr.product ?? undefined,
              efficiency: Number(pr.efficiency ?? 0),
              frontfeet: Number(pr.frontfeet ?? 0),
              dbId: Number(pr.parcel_id),
              usecode: pr.usecode ?? undefined, // Preserve the original land use code
              family_name: pr.family_name && pr.family_name.trim() ? pr.family_name : undefined,
              subtype_name: pr.subtype_name && pr.subtype_name.trim() ? pr.subtype_name : undefined,
              landuse_name: pr.landuse_name && pr.landuse_name.trim() ? pr.landuse_name : undefined
            }

            // Debug logging for parcels 11 and 12
            if (pr.parcel_id === 11 || pr.parcel_id === 12) {
              console.log(`🏠 DEBUG: Building parcel ${pr.parcel_id} in refresh:`, {
                id: parcel.id,
                family_name: parcel.family_name,
                subtype_name: parcel.subtype_name,
                product: parcel.product,
                units: parcel.units,
                api_product: pr.product,
                api_units: pr.units,
                api_family: pr.family_name
              })
            }

            phaseRef.parcels.push(parcel)

            // Debug first few parcels in current processing
            if (phaseRef.parcels.length <= 3) {
              console.log(`📊 Mapped parcel ${phaseRef.parcels.length}:`, {
                id: parcel.id,
                name: parcel.name,
                family_name: parcel.family_name,
                subtype_name: parcel.subtype_name,
                landuse_name: parcel.landuse_name,
                usecode: parcel.usecode
              })
            }
          }
          const areas = Array.from(areasMap.values()).sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))

          console.log('🔄 About to update project state with refreshed data...')
          setProject(prev => ({ ...prev, areas }))
          setIsHydrating(false)
          hydrationInProgress = false
          hydrationComplete = true
          console.log('✅ API Hydration complete - component ready', areas.length, 'areas loaded')
          console.log('✅ Project state updated with fresh data')
        } catch (error) {
          console.error('❌ Hydration failed:', error)
          setIsHydrating(false)
          hydrationInProgress = false
        }
      })()
    }
    window.addEventListener('dataChanged', refresh as EventListener)
    return () => window.removeEventListener('dataChanged', refresh as EventListener)
  }, [])

  // localStorage removed - using Neon database as single source of truth

  // Auto-generate unique IDs
  const generateAreaId = useCallback(() => {
    const timestamp = Date.now()
    return `area-${project.areas.length + 1}-${timestamp}`
  }, [project.areas.length])

  const generatePhaseId = useCallback((areaIndex: number) => {
    const area = project.areas[areaIndex]
    const timestamp = Date.now()
    return `phase-${areaIndex + 1}-${(area?.phases.length || 0) + 1}-${timestamp}`
  }, [project.areas])

  // Generate suggested names based on sequence
  const getSuggestedAreaName = useCallback(() => {
    return `Area ${project.areas.length + 1}`
  }, [project.areas.length])

  const getSuggestedPhaseName = useCallback((areaId: string) => {
    const area = project.areas.find(a => a.id === areaId)
    if (!area) return 'Phase 1.1'
    const areaIndex = project.areas.findIndex(a => a.id === areaId)
    const areaNumber = areaIndex + 1
    const phaseNumber = area.phases.length + 1
    return `Phase ${areaNumber}.${phaseNumber}`
  }, [project.areas])

  const generateParcelId = useCallback((areaIndex: number, phaseIndex: number) => {
    const phase = project.areas[areaIndex]?.phases[phaseIndex]
    const parcelNumber = (phase?.parcels.length || 0) + 1
    const timestamp = Date.now()
    return `parcel-${areaIndex + 1}-${phaseIndex + 1}-${parcelNumber.toString().padStart(2, '0')}-${timestamp}`
  }, [project.areas])

  // Add new area
  const addArea = useCallback(() => {
    setShowAreaForm(true)
  }, [])

  // Add new phase to area
  const addPhase = useCallback((areaId: string) => {
    const area = project.areas.find(a => a.id === areaId)
    if (area) {
      setShowPhaseForm({ areaId, areaName: area.name })
    }
  }, [project.areas])

  // Add new parcel to phase
  const addParcel = useCallback((areaId: string, phaseId: string, parcelData: Omit<Parcel, 'id'>) => {
    const areaIndex = project.areas.findIndex(a => a.id === areaId)
    const phaseIndex = project.areas[areaIndex]?.phases.findIndex(p => p.id === phaseId)

    if (areaIndex === -1 || phaseIndex === -1) return

    const parcelId = generateParcelId(areaIndex, phaseIndex)
    const parcelName = `Parcel: ${areaIndex + 1}.${phaseIndex + 1}${(project.areas[areaIndex].phases[phaseIndex].parcels.length + 1).toString().padStart(2, '0')}`

    const newParcel: Parcel = {
      ...parcelData,
      id: parcelId,
      name: parcelName
    }

    setProject(prev => ({
      ...prev,
      areas: prev.areas.map((area, aIndex) =>
        aIndex === areaIndex
          ? {
              ...area,
              phases: area.phases.map((phase, pIndex) =>
                pIndex === phaseIndex
                  ? { ...phase, parcels: [...phase.parcels, newParcel] }
                  : phase
              )
            }
          : area
      )
    }))
  }, [project.areas, generateParcelId])

  // Navigate to phase view
  const openPhaseView = useCallback((areaId: string, phaseId: string) => {
    setViewContext({
      mode: 'phase',
      areaId,
      phaseId
    })
  }, [])

  // Navigate back to project view
  const backToProject = useCallback(() => {
    setViewContext({
      mode: 'project'
    })
  }, [])

  // Navigate to area view
  const navigateToArea = useCallback((_areaId: string) => {
    setViewContext({
      mode: 'project'
    })
  }, [])

  const openParcelDetail = useCallback((areaId: string, phaseId: string, parcelId: string) => {
    setDetailCard({ areaId, phaseId, parcelId, isOpen: true })
  }, [])

  const closeParcelDetail = useCallback(() => {
    setDetailCard({ areaId: null, phaseId: null, parcelId: null, isOpen: false })
  }, [])

  const saveParcelDetails = useCallback((
    areaId: string,
    phaseId: string,
    parcelId: string,
    updates: {
      name: string
      landUse: LandUseType
      acres: number
      units: number
      description: string
      landuse_code_id?: number
      frontage?: number
      product?: string
      notes?: string
      efficiency?: number
    }
  ) => {
    let dbId: number | undefined

    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area => {
        if (area.id !== areaId) return area
        return {
          ...area,
          phases: area.phases.map(phase => {
            if (phase.id !== phaseId) return phase
            return {
              ...phase,
              parcels: phase.parcels.map(parcel => {
                if (parcel.id !== parcelId) return parcel
                dbId = parcel.dbId
                return {
                  ...parcel,
                  name: updates.name,
                  landUse: updates.landUse,
                  acres: updates.acres,
                  units: updates.units,
                  product: updates.product ?? parcel.product,
                  efficiency: updates.efficiency ?? parcel.efficiency,
                  frontage: updates.frontage ?? parcel.frontage,
                  frontfeet: updates.frontage ?? parcel.frontfeet,
                  description: updates.description,
                  notes: updates.notes ?? parcel.notes,
                  usecode: updates.landUse ?? parcel.usecode
                }
              })
            }
          })
        }
      })
    }))

    setDetailCard({ areaId: null, phaseId: null, parcelId: null, isOpen: false })

    if (dbId) {
      const payload: Record<string, unknown> = {
        acres: updates.acres,
        units: updates.units,
        frontfeet: updates.frontage ?? null,
        lot_product: updates.product ?? null,
        usecode: updates.landUse
      }

      fetch(`/api/parcels/${dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (res.ok && projectNumericId != null) {
            window.dispatchEvent(new CustomEvent('dataChanged', {
              detail: { entity: 'parcel', id: dbId, projectId: projectNumericId }
            }))
          }
          if (!res.ok) {
            return res.text().then(text => {
              console.error('Failed to persist parcel updates (inline):', text)
            })
          }
          return undefined
        })
        .catch(err => {
          console.error('Inline parcel save failed', err)
        })
    }
  }, [projectNumericId])

  // Update handlers for inline editing
  const updateArea = useCallback((areaId: string, updates: { name: string; description: string }) => {
    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area =>
        area.id === areaId
          ? { ...area, name: updates.name, description: updates.description } as Area & { description: string }
          : area
      )
    }))
  }, [])

  const updatePhase = useCallback((areaId: string, phaseId: string, updates: { name: string; description: string }) => {
    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area =>
        area.id === areaId
          ? {
              ...area,
              phases: area.phases.map(phase =>
                phase.id === phaseId
                  ? { ...phase, name: updates.name, description: updates.description } as Phase & { description: string }
                  : phase
              )
            }
          : area
      )
    }))
  }, [])

  // Get current area and phase for phase view
  const currentArea = viewContext.areaId
    ? project.areas.find(a => a.id === viewContext.areaId)
    : null

  const currentPhase = viewContext.phaseId && currentArea
    ? currentArea.phases.find(p => p.id === viewContext.phaseId)
    : null

  const detailArea = detailCard.areaId ? project.areas.find(a => a.id === detailCard.areaId) || null : null
  const detailPhase = detailCard.areaId && detailCard.phaseId
    ? detailArea?.phases.find(p => p.id === detailCard.phaseId) || null
    : null
  const detailParcel = detailCard.areaId && detailCard.phaseId && detailCard.parcelId
    ? detailPhase?.parcels.find(pr => pr.id === detailCard.parcelId) || null
    : null

  // Form submission handlers
  const handleAreaFormSubmit = useCallback((areaData: { name: string; description: string }) => {
    const areaId = generateAreaId()
    const newArea: Area = {
      id: areaId,
      name: areaData.name,
      phases: [],
      saved: true
    }

    // Add description as an extended property
    const areaWithDescription = { ...newArea, description: areaData.description } as Area & { description: string }

    setProject(prev => ({
      ...prev,
      areas: [...prev.areas, areaWithDescription]
    }))

    setShowAreaForm(false)
  }, [generateAreaId])

  const handlePhaseFormSubmit = useCallback((phaseData: { name: string; description: string }) => {
    if (!showPhaseForm) return

    const areaIndex = project.areas.findIndex(a => a.id === showPhaseForm.areaId)
    if (areaIndex === -1) return

    const phaseId = generatePhaseId(areaIndex)
    const newPhase: Phase = {
      id: phaseId,
      name: phaseData.name,
      parcels: [],
      saved: true
    }

    // Add description as an extended property
    const phaseWithDescription = { ...newPhase, description: phaseData.description } as Phase & { description: string }

    setProject(prev => ({
      ...prev,
      areas: prev.areas.map((area, index) =>
        index === areaIndex
          ? { ...area, phases: [...area.phases, phaseWithDescription] }
          : area
      )
    }))

    setShowPhaseForm(null)
  }, [showPhaseForm, project.areas, generatePhaseId])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-gray-950">
        {viewContext.mode === 'project' && (
          <ProjectCanvasInline
            project={project}
            onAddArea={addArea}
            onAddPhase={addPhase}
            onOpenPhase={openPhaseView}
            onUpdateArea={updateArea}
            onUpdatePhase={updatePhase}
          />
        )}

        {viewContext.mode === 'phase' && currentArea && currentPhase && (
          <PhaseCanvasInline
            project={project}
            area={currentArea}
            phase={currentPhase}
            onAddParcel={addParcel}
            onBack={backToProject}
            onNavigateToArea={navigateToArea}
            onAddPhase={addPhase}
            onOpenParcel={openParcelDetail}
          />
        )}

        <ParcelDetailCard
          parcel={detailCard.isOpen ? detailParcel : null}
          phase={detailCard.isOpen ? detailPhase : null}
          area={detailCard.isOpen ? detailArea : null}
          isOpen={detailCard.isOpen && Boolean(detailArea && detailPhase && detailParcel)}
          projectId={projectNumericId}
          onSave={saveParcelDetails}
          onClose={closeParcelDetail}
        />

        {/* Area Form */}
        {showAreaForm && (
          <AreaForm
            onSubmit={handleAreaFormSubmit}
            onCancel={() => setShowAreaForm(false)}
            suggestedName={getSuggestedAreaName()}
          />
        )}

        {/* Phase Form */}
        {showPhaseForm && (
          <PhaseForm
            areaName={showPhaseForm.areaName}
            onSubmit={handlePhaseFormSubmit}
            onCancel={() => setShowPhaseForm(null)}
            suggestedName={getSuggestedPhaseName(showPhaseForm.areaId)}
          />
        )}
      </div>
    </DndProvider>
  )
}

export default PlanningWizardInline
