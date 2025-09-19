'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'

interface ProjectSummary {
  project_id: number
  project_name: string
  acres_gross: number
  location_lat?: number
  location_lon?: number
  start_date?: string
  jurisdiction_city?: string
  jurisdiction_county?: string
  jurisdiction_state?: string
}

interface ProjectContextValue {
  projects: ProjectSummary[]
  activeProjectId: number | null
  activeProject: ProjectSummary | null
  selectProject: (projectId: number | null) => void
  refreshProjects: () => void
  isLoading: boolean
  isReady: boolean
  error?: Error
}

const fetcher = (url: string) => fetchJson<ProjectSummary[]>(url)

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, isLoading, mutate } = useSWR<ProjectSummary[]>(
    '/api/projects',
    fetcher,
    { revalidateOnFocus: false }
  )
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && Array.isArray(data) && data.length > 0) {
      setActiveProjectId(prev => (prev == null ? data[0].project_id : prev))
    }
  }, [data, isLoading])

  const activeProject = useMemo(() => {
    if (!Array.isArray(data)) return null
    return data.find(project => project.project_id === activeProjectId) ?? null
  }, [data, activeProjectId])

  const selectProject = useCallback((projectId: number | null) => {
    setActiveProjectId(projectId)
  }, [])

  const refreshProjects = useCallback(() => {
    void mutate(undefined, { revalidate: true })
  }, [mutate])

  const value = useMemo<ProjectContextValue>(() => ({
    projects: Array.isArray(data) ? data : [],
    activeProjectId,
    activeProject,
    selectProject,
    refreshProjects,
    isLoading,
    isReady: !isLoading && !error,
    error: error as Error | undefined,
  }), [data, activeProjectId, activeProject, selectProject, refreshProjects, isLoading, error])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export const useProjectContext = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}

export type { ProjectSummary, ProjectContextValue }
