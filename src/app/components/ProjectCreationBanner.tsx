'use client'

import React from 'react'
import Link from 'next/link'
import { useProjectCreation, type CreationJob } from '@/hooks/useProjectCreation'

/**
 * ProjectCreationBanner
 *
 * Renders a slim banner below the nav bar for each in-flight project creation job.
 * States: pending (spinner + message), complete (success + View Project link), failed (error + Dismiss).
 *
 * Mounted inside NavigationLayout so it's globally visible.
 */
export default function ProjectCreationBanner() {
  const { jobs, dismissJob } = useProjectCreation()

  if (jobs.length === 0) return null

  return (
    <div className="project-creation-banner-container">
      {jobs.map((job) => (
        <BannerRow key={job.clientId} job={job} onDismiss={dismissJob} />
      ))}
    </div>
  )
}

function BannerRow({
  job,
  onDismiss,
}: {
  job: CreationJob
  onDismiss: (clientId: string) => void
}) {
  if (job.status === 'pending') {
    return (
      <div className="pcb-row pcb-pending">
        <span className="pcb-spinner" />
        <span className="pcb-text">
          Creating <strong>{job.projectName}</strong>&hellip;
        </span>
        <button
          type="button"
          className="pcb-dismiss"
          onClick={() => onDismiss(job.clientId)}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    )
  }

  if (job.status === 'complete') {
    return (
      <div className="pcb-row pcb-complete">
        <span className="pcb-check">&#10003;</span>
        <span className="pcb-text">
          <strong>{job.projectName}</strong> is ready.
        </span>
        {job.projectId && (
          <Link
            href={`/projects/${job.projectId}`}
            className="pcb-link"
            onClick={() => onDismiss(job.clientId)}
          >
            View Project
          </Link>
        )}
        <button
          type="button"
          className="pcb-dismiss"
          onClick={() => onDismiss(job.clientId)}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    )
  }

  // failed
  return (
    <div className="pcb-row pcb-failed">
      <span className="pcb-error-icon">!</span>
      <span className="pcb-text">
        Failed to create <strong>{job.projectName}</strong>
        {job.error ? `: ${job.error}` : '.'}
      </span>
      <button
        type="button"
        className="pcb-dismiss"
        onClick={() => onDismiss(job.clientId)}
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  )
}
