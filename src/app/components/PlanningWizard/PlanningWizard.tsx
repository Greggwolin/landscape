'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import ProjectCanvas from './ProjectCanvas'
import PhaseCanvas from './PhaseCanvas'
import { ContainerTreeView } from './ContainerTreeView'
import { useProjectContext } from '../ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
import { ContainerNode } from '@/types'
import {
  flattenContainers,
  getContainersByLevel,
  getChildren,
  hasContainerData,
  type FlatContainer,
} from '@/lib/containerHelpers'

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
  // New non-residential fields
  building_sf?: number
  site_coverage_pct?: number
  setback_front_ft?: number
  setback_side_ft?: number
  setback_rear_ft?: number
  // Taxonomy fields
  family_name?: string
  density_code?: string
  type_code?: string
  product_code?: string
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

type ViewMode = 'project' | 'phase' | 'containers'

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
  // Taxonomy fields
  density_code?: string | null
  type_code?: string | null
  product_code?: string | null
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

  // Fetch container data (new unified system)
  const {
    data: containersResponse,
    error: containersError,
    isLoading: containersLoading,
    mutate: mutateContainers,
  } = useSWR<{ containers: ContainerNode[] }>(
    projectId ? `/api/projects/${projectId}/containers` : null,
    fetcher
  )

  // Always call these hooks unconditionally (React Rules of Hooks)
  // We'll determine which data to use after all hooks are called
  const {
    data: phasesData,
    error: phasesError,
    isLoading: phasesLoading,
    mutate: mutatePhases,
  } = useSWR<ApiPhase[]>(
    projectId ? `/api/phases?project_id=${projectId}` : null,
    fetcher
  )
  const {
    data: parcelsData,
    error: parcelsError,
    isLoading: parcelsLoading,
    mutate: mutateParcels,
  } = useSWR<ApiParcel[]>(
    projectId ? `/api/parcels?project_id=${projectId}` : null,
    fetcher
  )

  const { labels, areaDisplayByNumber } = useProjectConfig(projectId ?? undefined)

  // Determine data source: use containers if data exists, otherwise fall back to legacy
  const useContainers = useMemo(() => {
    return hasContainerData(containersResponse?.containers)
  }, [containersResponse])
  const {
    level1Label,
    level2Label,
    level3Label,
    level1LabelPlural,
  } = labels

  const areaPluralLabel = level1LabelPlural || `${level1Label}s`

  // Build areas from container data (new system)
  const areasFromContainers = useMemo<Area[]>(() => {
    if (!containersResponse?.containers) return []

    const flatContainers = flattenContainers(containersResponse.containers)
    const level1Containers = getContainersByLevel(flatContainers, 1)
    const level2Containers = getContainersByLevel(flatContainers, 2)
    const level3Containers = getContainersByLevel(flatContainers, 3)

    const areas: Area[] = level1Containers.map((level1) => {
      const level2Children = getChildren(flatContainers, level1.division_id)

      const phases: Phase[] = level2Children.map((level2) => {
        const level3Children = getChildren(flatContainers, level2.division_id)

        const parcels: Parcel[] = level3Children.map((level3) => {
          // Extract parcel data from container attributes
          const attrs = level3.attributes || {}
          const acres = Number(attrs.acres ?? 0)
          const units = Number(attrs.units ?? 0)
          const frontage = Number(attrs.frontfeet ?? attrs.frontage ?? 0)
          const efficiency = Number(attrs.efficiency ?? 0)
          const densityGross = acres > 0 ? units / acres : 0
          const ffPerAcre = acres > 0 ? frontage / acres : 0

          return {
            id: `parcel-container-${level3.division_id}`,
            name: level3.display_name,
            landUse: normalizeLandUse(attrs.usecode as string),
            acres,
            units,
            efficiency,
            frontage,
            ff_per_acre: ffPerAcre,
            density_gross: densityGross,
            product: (attrs.product as string) ?? '',
            dbId: level3.division_id, // Use division_id as dbId
            areaNo: level1.sort_order ?? 0,
            phaseNo: level2.sort_order ?? 0,
            landuseCode: (attrs.usecode as string) ?? undefined,
            familyName: (attrs.family_name as string) ?? undefined,
            subtypeName: (attrs.subtype_name as string) ?? undefined,
            family_name: (attrs.family_name as string) ?? undefined,
            density_code: (attrs.density_code as string) ?? undefined,
            type_code: (attrs.type_code as string) ?? undefined,
            product_code: (attrs.product_code as string) ?? undefined,
          } as Parcel
        })

        return {
          id: `phase-container-${level2.division_id}`,
          name: level2.display_name,
          phaseDbId: level2.division_id,
          areaId: `area-container-${level1.division_id}`,
          areaNo: level1.sort_order ?? 0,
          phaseNo: level2.sort_order ?? 0,
          description: (level2.attributes?.description as string) ?? null,
          parcels,
        } as Phase
      })

      return {
        id: `area-container-${level1.division_id}`,
        name: level1.display_name,
        areaDbId: level1.division_id,
        areaNo: level1.sort_order ?? 0,
        phases,
      } as Area
    })

    return areas
  }, [containersResponse])

  // Build areas from legacy data (old system)
  const areasFromLegacy = useMemo<Area[]>(() => {
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
          // Taxonomy fields
          family_name: parcel.family_name ?? undefined,
          density_code: parcel.density_code ?? undefined,
          type_code: parcel.type_code ?? undefined,
          product_code: parcel.product_code ?? undefined,
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

  // Select the appropriate data source
  const areas = useContainers ? areasFromContainers : areasFromLegacy

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
      if (useContainers) {
        mutateContainers()
      } else {
        mutateParcels()
        mutatePhases()
      }
    }
    window.addEventListener('dataChanged', handler as EventListener)
    return () => window.removeEventListener('dataChanged', handler as EventListener)
  }, [useContainers, mutateParcels, mutatePhases, mutateContainers])

  // Define these callbacks BEFORE early returns (Rules of Hooks)
  const handleAddArea = useCallback(() => {
    setViewContext({ mode: 'containers' })
  }, [])

  const handleAddPhase = useCallback((areaLabel?: string) => {
    setViewContext({ mode: 'containers' })
  }, [])

  const isLoading = projectLoading || containersLoading || phasesLoading || parcelsLoading
  const loadError = containersError || phasesError || parcelsError

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-gray-950 planning-wizard-content">
        {/* View Mode Toggle */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewContext({ mode: 'project' })}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewContext.mode === 'project'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Canvas View
            </button>
            <button
              onClick={() => setViewContext({ mode: 'containers' })}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewContext.mode === 'containers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Manage Structure
            </button>
          </div>
        </div>

        {/* Container Tree View for CRUD operations */}
        {viewContext.mode === 'containers' && containersResponse?.containers && (
          <>
            {/* Show read-only message for multifamily projects */}
            {useContainers && (level1Label === 'Property' || level1Label === 'Building') && areas.length > 0 ? (
              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
                <div className="max-w-2xl text-center space-y-6">
                  <div className="text-6xl">📊</div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Multifamily Structure is Managed in Rent Roll
                  </h2>
                  <p className="text-gray-400 text-lg">
                    For multifamily projects, the hierarchy (floor plans and units) is derived from your rent roll data, not created manually.
                  </p>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left space-y-3">
                    <h3 className="text-white font-semibold mb-2">How it works:</h3>
                    <ol className="text-gray-300 space-y-2 text-sm">
                      <li>1. Import or enter units in the <span className="text-blue-400 font-semibold">Rent Roll</span> tab</li>
                      <li>2. Click <span className="text-blue-400 font-semibold">Analyze Rent Roll</span> to group units by characteristics</li>
                      <li>3. System creates floor plans (unit types) automatically</li>
                      <li>4. View the derived hierarchy here (read-only)</li>
                    </ol>
                  </div>
                  <a
                    href="/rent-roll"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Go to Rent Roll →
                  </a>
                  <p className="text-gray-500 text-sm mt-4">
                    This view shows the structure derived from your rent roll. All changes must be made in the Rent Roll tab.
                  </p>
                </div>
              </div>
            ) : (
              <ContainerTreeView
                projectId={projectId}
                containers={containersResponse.containers}
                labels={labels}
                onRefresh={async () => await mutateContainers()}
              />
            )}
          </>
        )}

        {viewContext.mode === 'project' && (
          <>
            {/* Show message for multifamily projects to use Manage Structure */}
            {useContainers && (level1Label === 'Property' || level1Label === 'Building') ? (
              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
                <div className="max-w-2xl text-center space-y-6">
                  <div className="text-6xl">🏢</div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Use Manage Structure for {level1Label} Projects
                  </h2>
                  <p className="text-gray-400 text-lg">
                    For {level1Label.toLowerCase()}-based projects, use the <span className="text-blue-400 font-semibold">Manage Structure</span> view
                    to manage your {level1LabelPlural.toLowerCase()}, {level2Label.toLowerCase()}s, and {level3Label.toLowerCase()}s.
                  </p>
                  <button
                    onClick={() => setViewContext({ mode: 'containers' })}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Go to Manage Structure →
                  </button>
                  <p className="text-gray-500 text-sm mt-4">
                    The canvas view is designed for land development projects with areas and parcels.
                  </p>
                </div>
              </div>
            ) : (
              <ProjectCanvas
                project={project}
                onAddArea={handleAddArea}
                onAddPhase={(areaId) => {
                  const areaLabel = project.areas.find((area) => area.id === areaId)?.name
                  handleAddPhase(areaLabel)
                }}
                onAddParcel={undefined}
                onOpenPhase={openPhaseView}
                onOpenArea={undefined}
                showPhaseForm={null}
                onRefresh={async () => {
                  if (useContainers) {
                    await mutateContainers()
                  } else {
                    await Promise.all([mutateParcels(), mutatePhases()])
                  }
                }}
              />
            )}
          </>
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
              if (useContainers) {
                await mutateContainers()
              } else {
                await Promise.all([mutateParcels(), mutatePhases()])
              }
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
