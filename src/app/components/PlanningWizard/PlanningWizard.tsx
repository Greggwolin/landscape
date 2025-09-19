'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ProjectCanvas from './ProjectCanvas'
import PhaseCanvas from './PhaseCanvas'
import AreaDetailCard from './cards/AreaDetailCard'
import PhaseDetailCard from './cards/PhaseDetailCard'
import ParcelDetailCard from './cards/ParcelDetailCard'
import ConfirmDeleteDialog from './ConfirmDeleteDialog'
import AreaForm from './forms/AreaForm'
import PhaseForm from './forms/PhaseForm'

export type LandUseType = 'MDR' | 'HDR' | 'LDR' | 'MHDR' | 'C' | 'MU' | 'OS'

export interface Parcel {
  id: string
  name: string
  landUse: LandUseType
  acres: number
  units: number
  // Additional fields from tbl_parcels
  efficiency?: number
  frontage?: number
  ff_per_acre?: number
  density_gross?: number
  density_net?: number
  product?: string
  status?: string
  description?: string
  notes?: string
  dbId?: number
}

export interface Phase {
  id: string
  name: string
  parcels: Parcel[]
  saved?: boolean
}

export interface Area {
  id: string
  name: string
  phases: Phase[]
  saved?: boolean
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

interface DetailCardState {
  type: 'area' | 'phase' | 'parcel' | null
  isOpen: boolean
  entityId?: string
  areaId?: string
  phaseId?: string
}

interface DeleteDialogState {
  isOpen: boolean
  type: 'area' | 'phase' | 'parcel' | null
  entityId?: string
  areaId?: string
  phaseId?: string
  title: string
  message: string
  warningItems: string[]
}

const PlanningWizard: React.FC = () => {
  const [project, setProject] = useState<Project>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedProject = localStorage.getItem('planningWizard-project')
      if (savedProject) {
        try {
          return JSON.parse(savedProject)
        } catch (error) {
          console.error('Error loading saved project:', error)
        }
      }
    }
    // Default project if no saved data
    return {
      id: 'project-1',
      name: 'Peoria Lakes',
      areas: []
    }
  })

  const [viewContext, setViewContext] = useState<ViewContext>({
    mode: 'project'
  })

  const [detailCard, setDetailCard] = useState<DetailCardState>({
    type: null,
    isOpen: false
  })

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
    warningItems: []
  })

  const [showAreaForm, setShowAreaForm] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState<{ areaId: string; areaName: string } | null>(null)

  // Save project to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('planningWizard-project', JSON.stringify(project))
        console.log('Project saved to localStorage:', project.name, 'Areas:', project.areas.length)
      } catch (error) {
        console.error('Error saving project to localStorage:', error)
      }
    }
  }, [project])

  // Hydrate from Neon (areas, phases, parcels)
  useEffect(() => {
    (async () => {
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

        // Build areas -> phases -> parcels
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
          const [aStr, pStr] = phaseName.split('.')
          const phaseNo = Number(pStr)
          const areaId = `area-${areaNo}`
          const phaseId = `phase-${areaNo}-${phaseNo}`
          const areaRef = areasMap.get(areaNo)
          if (!areaRef) continue
          const phaseRef = areaRef.phases.find(p => p.id === phaseId)
          if (!phaseRef) continue
          const lu: LandUseType = (['MDR','HDR','LDR','MHDR','C','MU','OS'] as LandUseType[]).includes(pr.usecode) ? pr.usecode : 'MDR'
          const parcel: Parcel = {
            id: `parcel-db-${pr.parcel_id}`,
            name: `Parcel: ${pr.parcel_name}`,
            landUse: lu,
            acres: Number(pr.acres ?? 0),
            units: Number(pr.units ?? 0),
            product: pr.product ?? undefined,
            efficiency: Number(pr.efficiency ?? 0),
            dbId: Number(pr.parcel_id)
          }
          phaseRef.parcels.push(parcel)
        }
        const areas = Array.from(areasMap.values()).sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))
        setProject({ id: `project-${projectId}`, name: projects[0]?.project_name ?? `Project ${projectId}`, areas })

        // If asked to open a parcel from Overview, do it now
        const openId = typeof window !== 'undefined' ? localStorage.getItem('planningWizard-open-parcel-id') : null
        if (openId) {
          for (const a of areas) {
            for (const ph of a.phases) {
              const match = ph.parcels.find(px => px.dbId && String(px.dbId) === openId)
              if (match) {
                openParcelDetail(a.id, ph.id, match.id)
                break
              }
            }
          }
          try { localStorage.removeItem('planningWizard-open-parcel-id') } catch {}
        }
      } catch (e) {
        console.error('Wizard hydration failed', e)
      }
    })()
  }, [])

  // Refresh on external data changes (e.g., Overview edits)
  useEffect(() => {
    const refresh = () => {
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
            const lu: LandUseType = (['MDR','HDR','LDR','MHDR','C','MU','OS'] as LandUseType[]).includes(pr.usecode) ? pr.usecode : 'MDR'
            const parcel: Parcel = {
              id: `parcel-db-${pr.parcel_id}`,
              name: `Parcel: ${pr.parcel_name}`,
              landUse: lu,
              acres: Number(pr.acres ?? 0),
              units: Number(pr.units ?? 0),
              product: pr.product ?? undefined,
              efficiency: Number(pr.efficiency ?? 0),
              dbId: Number(pr.parcel_id)
            }
            phaseRef.parcels.push(parcel)
          }
          const areas = Array.from(areasMap.values()).sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))
          setProject(prev => ({ ...prev, areas }))
        } catch {}
      })()
    }
    window.addEventListener('dataChanged', refresh as EventListener)
    return () => window.removeEventListener('dataChanged', refresh as EventListener)
  }, [])

  // Utility function to clear saved data (useful for testing)
  const clearSavedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('planningWizard-project')
      setProject({
        id: 'project-1',
        name: 'Peoria Lakes',
        areas: []
      })
      console.log('Saved data cleared')
    }
  }, [])

  // Add to window for easy access in browser console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearPlanningData = clearSavedData
    }
  }, [clearSavedData])

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
    // For now, just go back to project view since we don't have a dedicated area view
    // In the future, you could implement a dedicated area view
    setViewContext({
      mode: 'project'
    })
  }, [])

  // Detail card functions
  const closeDetailCard = useCallback(() => {
    // If closing an unsaved area (newly created), remove it from the project
    if (detailCard.type === 'area' && detailCard.entityId) {
      const area = project.areas.find(a => a.id === detailCard.entityId)
      if (area && !area.saved) {
        setProject(prev => ({
          ...prev,
          areas: prev.areas.filter(a => a.id !== detailCard.entityId)
        }))
      }
    }
    
    // If closing an unsaved phase, remove it
    if (detailCard.type === 'phase' && detailCard.areaId && detailCard.entityId) {
      const area = project.areas.find(a => a.id === detailCard.areaId)
      const phase = area?.phases.find(p => p.id === detailCard.entityId)
      if (phase && !(phase as any).saved) {
        setProject(prev => ({
          ...prev,
          areas: prev.areas.map(a => 
            a.id === detailCard.areaId 
              ? { ...a, phases: a.phases.filter(p => p.id !== detailCard.entityId) }
              : a
          )
        }))
      }
    }
    
    setDetailCard({ type: null, isOpen: false })
  }, [detailCard, project.areas])

  const saveAreaDetails = useCallback((areaId: string, updates: { name: string; description: string }) => {
    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId 
          ? { ...area, name: updates.name, description: updates.description, saved: true } as Area & { description: string }
          : area
      )
    }))
  }, [])

  const savePhaseDetails = useCallback((areaId: string, phaseId: string, updates: { name: string; description: string }) => {
    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId
          ? {
              ...area,
              phases: area.phases.map(phase =>
                phase.id === phaseId
                  ? { ...phase, name: updates.name, description: updates.description, saved: true } as Phase & { description: string }
                  : phase
              )
            }
          : area
      )
    }))
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
    }
  ) => {
    setProject(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId
          ? {
              ...area,
              phases: area.phases.map(phase =>
                phase.id === phaseId
                  ? {
                      ...phase,
                      parcels: phase.parcels.map(parcel =>
                        parcel.id === parcelId
                          ? { 
                              ...parcel, 
                              ...updates,
                              landuse_code_id: updates.landuse_code_id
                            } as Parcel & { description: string; landuse_code_id?: number }
                          : parcel
                      )
                    }
                  : phase
              )
            }
          : area
      )
    }))
    // Persist to Neon when possible
    try {
      const a = project.areas.find(a => a.id === areaId)
      const ph = a?.phases.find(p => p.id === phaseId)
      const pr = ph?.parcels.find(px => px.id === parcelId)
      if (pr?.dbId) {
        fetch(`/api/parcels/${pr.dbId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usecode: updates.landUse,
            acres: updates.acres,
            units: updates.units,
            product: pr.product ?? null
          })
        }).catch(() => {})
      }
    } catch {}
  }, [])

  const openParcelDetail = useCallback((areaId: string, phaseId: string, parcelId: string) => {
    setDetailCard({
      type: 'parcel',
      isOpen: true,
      entityId: parcelId,
      areaId: areaId,
      phaseId: phaseId
    })
  }, [])

  const openAreaDetail = useCallback((areaId: string) => {
    setDetailCard({
      type: 'area',
      isOpen: true,
      entityId: areaId
    })
  }, [])

  const openPhaseDetail = useCallback((areaId: string, phaseId: string) => {
    setDetailCard({
      type: 'phase',
      isOpen: true,
      entityId: phaseId,
      areaId: areaId
    })
  }, [])

  // Delete functions
  const confirmDeleteArea = useCallback((areaId: string) => {
    const area = project.areas.find(a => a.id === areaId)
    if (!area) return

    const totalPhases = area.phases.length
    const totalParcels = area.phases.reduce((sum, phase) => sum + phase.parcels.length, 0)
    
    const warningItems: string[] = []
    if (totalPhases > 0) {
      warningItems.push(`${totalPhases} phase${totalPhases === 1 ? '' : 's'}`)
    }
    if (totalParcels > 0) {
      warningItems.push(`${totalParcels} parcel${totalParcels === 1 ? '' : 's'}`)
    }

    setDeleteDialog({
      isOpen: true,
      type: 'area',
      entityId: areaId,
      title: 'Delete Area',
      message: `Are you sure you want to delete "${area.name}"?`,
      warningItems
    })
  }, [project.areas])

  const confirmDeletePhase = useCallback((areaId: string, phaseId: string) => {
    const area = project.areas.find(a => a.id === areaId)
    const phase = area?.phases.find(p => p.id === phaseId)
    if (!area || !phase) return

    const totalParcels = phase.parcels.length
    const warningItems: string[] = []
    if (totalParcels > 0) {
      warningItems.push(`${totalParcels} parcel${totalParcels === 1 ? '' : 's'}`)
    }

    setDeleteDialog({
      isOpen: true,
      type: 'phase',
      entityId: phaseId,
      areaId: areaId,
      title: 'Delete Phase',
      message: `Are you sure you want to delete "${phase.name}"?`,
      warningItems
    })
  }, [project.areas])

  const confirmDeleteParcel = useCallback((areaId: string, phaseId: string, parcelId: string) => {
    const area = project.areas.find(a => a.id === areaId)
    const phase = area?.phases.find(p => p.id === phaseId)
    const parcel = phase?.parcels.find(p => p.id === parcelId)
    if (!area || !phase || !parcel) return

    setDeleteDialog({
      isOpen: true,
      type: 'parcel',
      entityId: parcelId,
      areaId: areaId,
      phaseId: phaseId,
      title: 'Delete Parcel',
      message: `Are you sure you want to delete "${parcel.name}"?`,
      warningItems: []
    })
  }, [project.areas])

  const executeDelete = useCallback(() => {
    if (!deleteDialog.type || !deleteDialog.entityId) return

    switch (deleteDialog.type) {
      case 'area':
        setProject(prev => ({
          ...prev,
          areas: prev.areas.filter(area => area.id !== deleteDialog.entityId)
        }))
        break

      case 'phase':
        if (!deleteDialog.areaId) return
        setProject(prev => ({
          ...prev,
          areas: prev.areas.map(area => 
            area.id === deleteDialog.areaId
              ? { ...area, phases: area.phases.filter(phase => phase.id !== deleteDialog.entityId) }
              : area
          )
        }))
        break

      case 'parcel':
        if (!deleteDialog.areaId || !deleteDialog.phaseId) return
        setProject(prev => ({
          ...prev,
          areas: prev.areas.map(area => 
            area.id === deleteDialog.areaId
              ? {
                  ...area,
                  phases: area.phases.map(phase =>
                    phase.id === deleteDialog.phaseId
                      ? { ...phase, parcels: phase.parcels.filter(parcel => parcel.id !== deleteDialog.entityId) }
                      : phase
                  )
                }
              : area
          )
        }))
        break
    }

    setDeleteDialog({
      isOpen: false,
      type: null,
      title: '',
      message: '',
      warningItems: []
    })
    setDetailCard({ type: null, isOpen: false })
  }, [deleteDialog])

  const cancelDelete = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      type: null,
      title: '',
      message: '',
      warningItems: []
    })
  }, [])

  // Get current area and phase for phase view
  const currentArea = viewContext.areaId 
    ? project.areas.find(a => a.id === viewContext.areaId)
    : null

  const currentPhase = viewContext.phaseId && currentArea
    ? currentArea.phases.find(p => p.id === viewContext.phaseId)
    : null

  // Get entities for detail cards
  const detailArea = detailCard.entityId ? project.areas.find(a => a.id === detailCard.entityId) || null : null
  const detailPhase = detailCard.areaId && detailCard.entityId 
    ? project.areas.find(a => a.id === detailCard.areaId)?.phases.find(p => p.id === detailCard.entityId) || null
    : null
  const detailParcel = detailCard.areaId && detailCard.phaseId && detailCard.entityId
    ? project.areas.find(a => a.id === detailCard.areaId)?.phases.find(p => p.id === detailCard.phaseId)?.parcels.find(pr => pr.id === detailCard.entityId) || null
    : null
  const detailParcelArea = detailCard.areaId ? project.areas.find(a => a.id === detailCard.areaId) || null : null
  const detailParcelPhase = detailCard.areaId && detailCard.phaseId 
    ? project.areas.find(a => a.id === detailCard.areaId)?.phases.find(p => p.id === detailCard.phaseId) || null
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
          <ProjectCanvas
            project={project}
            onAddArea={addArea}
            onAddPhase={addPhase}
            onOpenPhase={openPhaseView}
            onOpenArea={openAreaDetail}
            onOpenParcel={openParcelDetail}
            showAreaForm={showAreaForm}
            showPhaseForm={showPhaseForm}
            openDetailCard={detailCard.isOpen ? { type: detailCard.type, entityId: detailCard.areaId || detailCard.phaseId } : null}
          />
        )}
        
        {viewContext.mode === 'phase' && currentArea && currentPhase && (
          <PhaseCanvas
            project={project}
            area={currentArea}
            phase={currentPhase}
            onAddParcel={addParcel}
            onOpenParcel={openParcelDetail}
            onOpenPhase={openPhaseDetail}
            onBack={backToProject}
            onNavigateToArea={navigateToArea}
            onAddPhase={addPhase}
          />
        )}

        {/* Detail Cards */}
        <AreaDetailCard
          area={detailCard.type === 'area' ? detailArea : null}
          isOpen={detailCard.type === 'area' && detailCard.isOpen}
          onSave={saveAreaDetails}
          onClose={closeDetailCard}
          onDelete={confirmDeleteArea}
        />

        <PhaseDetailCard
          phase={detailCard.type === 'phase' ? detailPhase : null}
          area={detailCard.type === 'phase' ? (detailCard.areaId ? project.areas.find(a => a.id === detailCard.areaId) || null : null) : null}
          isOpen={detailCard.type === 'phase' && detailCard.isOpen}
          onSave={savePhaseDetails}
          onClose={closeDetailCard}
          onDelete={confirmDeletePhase}
        />

        <ParcelDetailCard
          parcel={detailCard.type === 'parcel' ? detailParcel : null}
          phase={detailCard.type === 'parcel' ? detailParcelPhase : null}
          area={detailCard.type === 'parcel' ? detailParcelArea : null}
          isOpen={detailCard.type === 'parcel' && detailCard.isOpen}
          projectId={(() => { const parts = String(project.id).split('-'); const n = Number(parts[1]); return Number.isFinite(n) && n > 0 ? n : null })()}
          onSave={saveParcelDetails}
          onClose={closeDetailCard}
          onDelete={confirmDeleteParcel}
          onAddParcel={() => {
            const area = detailCard.type === 'parcel' ? detailParcelArea : null
            const phase = detailCard.type === 'parcel' ? detailParcelPhase : null
            if (area && phase) {
              setViewContext({ mode: 'phase', areaId: area.id, phaseId: phase.id })
            }
          }}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          isOpen={deleteDialog.isOpen}
          title={deleteDialog.title}
          message={deleteDialog.message}
          warningItems={deleteDialog.warningItems}
          onConfirm={executeDelete}
          onCancel={cancelDelete}
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

export default PlanningWizard
