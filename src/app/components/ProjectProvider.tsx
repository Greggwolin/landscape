'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'

interface ProjectSummary {
  project_id: number
  project_name: string
  acres_gross: number | null
  acreage?: number | null
  location_lat?: number | null
  location_lon?: number | null
  latitude?: number | null
  longitude?: number | null
  start_date?: string | null
  jurisdiction_city?: string | null
  jurisdiction_county?: string | null
  jurisdiction_state?: string | null
  location_description?: string | null
  location?: string | null
  project_type_code?: string | null
  project_type?: string | null
  is_active?: boolean
  analysis_type?: string | null
  property_subtype?: string | null
  property_class?: string | null
  total_residential_units?: number | null
  total_commercial_sqft?: number | null
  updated_at?: string | null
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
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activeProjectId')
      return stored ? parseInt(stored, 10) : null
    }
    return null
  })

  // Persist to localStorage whenever activeProjectId changes
  useEffect(() => {
    if (activeProjectId !== null && typeof window !== 'undefined') {
      localStorage.setItem('activeProjectId', activeProjectId.toString())
      localStorage.setItem('activeProjectTimestamp', new Date().toISOString())
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!isLoading && Array.isArray(data) && data.length > 0) {
      setActiveProjectId(prev => {
        // If we have a stored project ID, verify it still exists in the projects list
        if (prev !== null && data.some(p => p.project_id === prev)) {
          return prev
        }
        // Otherwise default to first project
        return data[0].project_id
      })
    }
  }, [data, isLoading])

  const activeProject = useMemo(() => {
    if (!Array.isArray(data)) return null
    return data.find(project => project.project_id === activeProjectId) ?? null
  }, [data, activeProjectId])

  const selectProject = useCallback((projectId: number | null) => {
    setActiveProjectId(projectId)

    // Record access timestamp in localStorage
    if (projectId !== null && typeof window !== 'undefined') {
      const key = `project_${projectId}_last_accessed`;
      localStorage.setItem(key, Date.now().toString());
    }
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
