'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import ProjectCanvas from './ProjectCanvas'
import PhaseCanvas from './PhaseCanvas'
import { useProjectContext } from '../ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'

export type LandUseType = 'MDR' | 'HDR' | 'LDR' | 'MHDR' | 'C' | 'MU' | 'OS'

export interface Parcel {
  id: string
  name: string
  landUse: LandUseType
  acres: number
  units: number
  efficiency?: number
  frontage?: number
  ff_per_acre?: number
  density_gross?: number
  density_net?: number
  product?: string
  status?: string
  description?: string
  notes?: string
  dbId: number
  areaNo: number
  phaseNo: number
  landuseCode?: string
  familyName?: string
  subtypeName?: string
}

export interface Phase {
  id: string
  name: string
  parcels: Parcel[]
  phaseDbId: number
  areaId: string
  areaNo: number
  phaseNo: number
  description?: string | null
}

export interface Area {
  id: string
  name: string
  phases: Phase[]
  areaDbId: number
  areaNo: number
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

type ApiPhase = {
  phase_id: number
  area_id: number
  area_no: number
  phase_no: number
  phase_name: string
  description?: string | null
}

type ApiParcel = {
  parcel_id: number
  area_no: number
  phase_no: number
  phase_name: string
  parcel_name: string
  usecode: string | null
  acres: number | null
  units: number | null
  efficiency: number | null
  frontfeet: number | null
  product: string | null
  family_name?: string | null
  subtype_name?: string | null
}

const ALLOWED_LAND_USES: LandUseType[] = ['MDR', 'HDR', 'LDR', 'MHDR', 'C', 'MU', 'OS']

const normalizeLandUse = (code: string | null | undefined): LandUseType => {
  if (code && ALLOWED_LAND_USES.includes(code as LandUseType)) {
    return code as LandUseType
  }
  return 'MDR'
}

const PlanningWizard: React.FC = () => {
  const { activeProject, isLoading: projectLoading } = useProjectContext()
  const projectId = activeProject?.project_id ?? null

  const fetcher = useCallback((url: string) => fetchJson(url), [])
  const {
    data: phasesData,
    error: phasesError,
    isLoading: phasesLoading,
    mutate: mutatePhases,
  } = useSWR<ApiPhase[]>(projectId ? `/api/phases?project_id=${projectId}` : null, fetcher)
  const {
    data: parcelsData,
    error: parcelsError,
    isLoading: parcelsLoading,
    mutate: mutateParcels,
  } = useSWR<ApiParcel[]>(projectId ? `/api/parcels?project_id=${projectId}` : null, fetcher)

  const { labels, areaDisplayByNumber } = useProjectConfig(projectId ?? undefined)
  const {
    level1Label,
    level2Label,
    level1LabelPlural,
  } = labels

  const areaPluralLabel = level1LabelPlural || `${level1Label}s`

  const areas = useMemo<Area[]>(() => {
    if (!Array.isArray(phasesData) || phasesData.length === 0) return []

    const areaMap = new Map<string, Area>()
    const phaseIndex = new Map<string, Phase>()

    const getAreaName = (areaNo: number) =>
      areaDisplayByNumber.get(areaNo) ?? `${level1Label} ${areaNo}`

    phasesData.forEach((phase) => {
      const areaNo = Number(phase.area_no)
      const phaseNo = Number(phase.phase_no)
      if (!Number.isFinite(areaNo) || !Number.isFinite(phaseNo)) return

      const areaId = `area-${areaNo}`
      let area = areaMap.get(areaId)
      if (!area) {
        area = {
          id: areaId,
          name: getAreaName(areaNo),
          areaDbId: Number(phase.area_id ?? 0),
          areaNo,
          phases: [],
        }
        areaMap.set(areaId, area)
      }

      const phaseId = `phase-${areaNo}-${phaseNo}`
      const phaseName = `${level2Label} ${phase.phase_name ?? `${areaNo}.${phaseNo}`}`
      const phaseNode: Phase = {
        id: phaseId,
        name: phaseName,
        phaseDbId: Number(phase.phase_id ?? 0),
        areaId,
        areaNo,
        phaseNo,
        description: phase.description ?? null,
        parcels: [],
      }
      area.phases.push(phaseNode)
      phaseIndex.set(`${areaId}:${phaseId}`, phaseNode)
    })

    if (Array.isArray(parcelsData)) {
      parcelsData.forEach((parcel) => {
        const areaNo = Number(parcel.area_no)
        const phaseNo = Number(parcel.phase_no)
        if (!Number.isFinite(areaNo) || !Number.isFinite(phaseNo)) return

        const areaId = `area-${areaNo}`
        const phaseId = `phase-${areaNo}-${phaseNo}`
        const phaseRef = phaseIndex.get(`${areaId}:${phaseId}`)
        if (!phaseRef) return

        const acres = Number(parcel.acres ?? 0)
        const units = Number(parcel.units ?? 0)
        const frontage = Number(parcel.frontfeet ?? 0)
        const efficiency = Number(parcel.efficiency ?? 0)
        const densityGross = acres > 0 ? units / acres : 0
        const ffPerAcre = acres > 0 ? frontage / acres : 0

        const parcelNode: Parcel = {
          id: `parcel-db-${parcel.parcel_id}`,
          name: `Parcel: ${parcel.parcel_name}`,
          landUse: normalizeLandUse(parcel.usecode),
          acres,
          units,
          efficiency,
          frontage,
          ff_per_acre: ffPerAcre,
          density_gross: densityGross,
          product: parcel.product ?? '',
          dbId: parcel.parcel_id,
          areaNo,
          phaseNo,
          landuseCode: parcel.usecode ?? undefined,
          familyName: parcel.family_name ?? undefined,
          subtypeName: parcel.subtype_name ?? undefined,
        }

        phaseRef.parcels.push(parcelNode)
      })
    }

    const sortedAreas = Array.from(areaMap.values()).sort((a, b) => a.areaNo - b.areaNo)
    sortedAreas.forEach((area) => {
      area.phases.sort((a, b) => a.phaseNo - b.phaseNo)
      area.phases.forEach((phase) => {
        phase.parcels.sort((a, b) => a.name.localeCompare(b.name))
      })
    })

    return sortedAreas
  }, [phasesData, parcelsData, areaDisplayByNumber, level1Label, level2Label])

  const [viewContext, setViewContext] = useState<ViewContext>({ mode: 'project' })

  const currentArea = useMemo(() => {
    if (viewContext.mode !== 'phase' || !viewContext.areaId) return null
    return areas.find((area) => area.id === viewContext.areaId) ?? null
  }, [areas, viewContext])

  const currentPhase = useMemo(() => {
    if (viewContext.mode !== 'phase' || !viewContext.phaseId || !currentArea) return null
    return currentArea.phases.find((phase) => phase.id === viewContext.phaseId) ?? null
  }, [currentArea, viewContext])

  useEffect(() => {
    if (viewContext.mode === 'phase' && (!currentArea || !currentPhase)) {
      setViewContext({ mode: 'project' })
    }
  }, [viewContext.mode, currentArea, currentPhase])

  const openPhaseView = useCallback((areaId: string, phaseId: string) => {
    setViewContext({ mode: 'phase', areaId, phaseId })
  }, [])

  const backToProject = useCallback(() => {
    setViewContext({ mode: 'project' })
  }, [])

  useEffect(() => {
    const handler = () => {
      mutateParcels()
      mutatePhases()
    }
    window.addEventListener('dataChanged', handler as EventListener)
    return () => window.removeEventListener('dataChanged', handler as EventListener)
  }, [mutateParcels, mutatePhases])

  const isLoading = projectLoading || phasesLoading || parcelsLoading
  const loadError = phasesError || parcelsError

  if (!projectId && !projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
        Select a project to open the planning workspace.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
        Loading planning data…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-red-400">
        Failed to load planning data. Please refresh.
      </div>
    )
  }

  const project: Project = {
    id: projectId ? `project-${projectId}` : 'project-0',
    name: activeProject?.project_name ?? 'Project',
    areas,
  }

  const handleAddArea = useCallback(() => {
    alert('Creating new areas from the Planning Wizard will be available once the database APIs are ready.')
  }, [])

  const handleAddPhase = useCallback((areaLabel?: string) => {
    alert(
      `Creating new phases${areaLabel ? ` for ${areaLabel}` : ''} from the Planning Wizard will be available once the database APIs are ready.`,
    )
  }, [])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-gray-950 planning-wizard-content">
        {viewContext.mode === 'project' && (
          <ProjectCanvas
            project={project}
            onAddArea={handleAddArea}
            onAddPhase={(areaId) => {
              const areaLabel = project.areas.find((area) => area.id === areaId)?.name
              handleAddPhase(areaLabel)
            }}
            onOpenPhase={openPhaseView}
            onOpenArea={undefined}
            showPhaseForm={null}
            onRefresh={async () => {
              await Promise.all([mutateParcels(), mutatePhases()])
            }}
          />
        )}

        {viewContext.mode === 'phase' && currentArea && currentPhase && (
          <PhaseCanvas
            project={project}
            area={currentArea}
            phase={currentPhase}
            onOpenPhase={openPhaseView}
            onBack={backToProject}
            onNavigateToArea={() => backToProject()}
            onAddPhase={undefined}
            onRefresh={async () => {
              await Promise.all([mutateParcels(), mutatePhases()])
            }}
          />
        )}

        {viewContext.mode === 'project' && project.areas.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No {areaPluralLabel.toLowerCase()} found for this project.
          </div>
        )}
      </div>
    </DndProvider>
  )
}

export default PlanningWizard
