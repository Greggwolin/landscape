'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getAuthHeaders } from '@/lib/authHeaders'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreationStatus = 'pending' | 'complete' | 'failed'

export interface CreationJob {
  /** Temporary client-side ID for tracking before project_id is known */
  clientId: string
  /** Becomes available once the POST /api/projects/minimal returns */
  projectId: number | null
  projectName: string
  status: CreationStatus
  /** Error message when status === 'failed' */
  error?: string
  /** Timestamp (ms) when the job was created */
  startedAt: number
}

// ---------------------------------------------------------------------------
// Module-level singleton store (survives component remounts)
// ---------------------------------------------------------------------------

let jobs: CreationJob[] = []
const listeners: Set<() => void> = new Set()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): CreationJob[] {
  return jobs
}

function setJobs(updater: (prev: CreationJob[]) => CreationJob[]) {
  jobs = updater(jobs)
  emitChange()
}


// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let nextClientId = 1

export function useProjectCreation() {
  const currentJobs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const queryClient = useQueryClient()

  // Ref to hold refreshProjects so the async work can call it
  const refreshProjectsRef = useRef<(() => Promise<unknown>) | null>(null)
  const queryClientRef = useRef<QueryClient>(queryClient)
  queryClientRef.current = queryClient

  /**
   * Register the ProjectProvider's refreshProjects so we can call it
   * when background work finishes.
   */
  const setRefreshProjects = useCallback((fn: () => Promise<unknown>) => {
    refreshProjectsRef.current = fn
  }, [])

  /**
   * Start a background creation job.
   *
   * The caller passes in everything needed so this hook doesn't depend on
   * form state or the modal.
   */
  const startCreation = useCallback(
    async (opts: {
      projectId: number
      projectName: string
      files: File[]
      extractionResultsCache?: Record<string, unknown>
      accessToken?: string | null
    }) => {
      const clientId = `creation-${nextClientId++}`
      const job: CreationJob = {
        clientId,
        projectId: opts.projectId,
        projectName: opts.projectName,
        status: 'pending',
        startedAt: Date.now(),
      }

      setJobs((prev) => [...prev, job])

      // Background work: upload documents
      try {
        if (opts.files.length > 0) {
          const uploadPromises = opts.files.map(async (doc) => {
            const dmsFormData = new FormData()
            dmsFormData.append('file', doc)
            dmsFormData.append('project_id', opts.projectId.toString())

            // Detect document type from filename
            const nameLower = doc.name.toLowerCase()
            let docType = 'Misc'
            if (nameLower.includes('rent') || nameLower.includes('roll')) {
              docType = 'Leases'
            } else if (nameLower.includes('offering') || nameLower.includes('om') || nameLower.includes('memorandum')) {
              docType = 'Offering'
            } else if (nameLower.includes('appraisal')) {
              docType = 'Property Data'
            } else if (nameLower.includes('financ') || nameLower.includes('operating') || nameLower.includes('income') || nameLower.includes('p&l') || nameLower.includes('expense')) {
              docType = 'Operations'
            } else if (nameLower.includes('survey') || nameLower.includes('plat') || nameLower.includes('title')) {
              docType = 'Title & Survey'
            } else if (nameLower.includes('market') || nameLower.includes('comp')) {
              docType = 'Market Data'
            } else if (nameLower.includes('agreement') || nameLower.includes('contract') || nameLower.includes('psa')) {
              docType = 'Agreements'
            }

            dmsFormData.append('doc_type', docType)
            dmsFormData.append('run_full_extraction', 'true')

            // Pass cached extraction results if available
            const cachedResults = opts.extractionResultsCache?.[doc.name]
            if (cachedResults) {
              dmsFormData.append('extraction_results', JSON.stringify(cachedResults))
            }

            const response = await fetch('/api/dms/upload', {
              method: 'POST',
              headers: { ...getAuthHeaders() },
              body: dmsFormData,
            })

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.status}`)
            }

            return response.json()
          })

          await Promise.allSettled(uploadPromises)
        }

        // Mark complete
        setJobs((prev) =>
          prev.map((j) =>
            j.clientId === clientId ? { ...j, status: 'complete' as const } : j
          )
        )

        // Refresh the project list so nav/dashboard sees the new project
        refreshProjectsRef.current?.()

        // Invalidate extraction staging cache so the nav indicator picks up
        // any staging rows created during background upload + extraction
        queryClientRef.current.invalidateQueries({
          queryKey: ['extraction-staging', opts.projectId],
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Background creation failed'
        setJobs((prev) =>
          prev.map((j) =>
            j.clientId === clientId
              ? { ...j, status: 'failed' as const, error: message }
              : j
          )
        )
      }

      return clientId
    },
    []
  )

  /**
   * Dismiss a completed or failed job from the banner.
   */
  const dismissJob = useCallback((clientId: string) => {
    setJobs((prev) => prev.filter((j) => j.clientId !== clientId))
  }, [])

  /**
   * Set of project IDs currently in-flight (pending status).
   * Used by dashboard/nav to filter out incomplete projects.
   */
  const pendingProjectIds = new Set(
    currentJobs
      .filter((j) => j.status === 'pending' && j.projectId !== null)
      .map((j) => j.projectId!)
  )

  return {
    jobs: currentJobs,
    startCreation,
    dismissJob,
    pendingProjectIds,
    setRefreshProjects,
  }
}
