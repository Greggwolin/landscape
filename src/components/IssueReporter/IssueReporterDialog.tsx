'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { usePathname } from 'next/navigation'
import { IssueReporterDraft, IssueReporterIssueType } from './IssueReporterContext'

type IssueReporterDialogProps = {
  open: boolean
  draft: IssueReporterDraft | null
  onClose: () => void
  setDraft: (draft: IssueReporterDraft | null) => void
  setOpen: (open: boolean) => void
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

type Option = { value: IssueReporterIssueType; label: string }

const ISSUE_OPTIONS: Option[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'feedback', label: 'UX Feedback' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
]

const BRANCH =
  process.env.NEXT_PUBLIC_GIT_BRANCH ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
  ''
const COMMIT_SHA =
  process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  ''

const OFFLINE_QUEUE_KEY = 'devIssueOfflineQueue'

type OfflineIssueEntry = {
  issueId: number
  issueType: IssueReporterIssueType
  title: string | null
  description: string
  pagePath: string | null
  componentPath: string | null
  branch: string | null
  commitSha: string | null
  reporterName: string | null
  reporterEmail: string | null
  metadata: Record<string, unknown>
  createdAt: string
  resolvedAt: null
}

function enqueueOfflineIssue(entry: OfflineIssueEntry): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
    let queue: OfflineIssueEntry[] = []
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          queue = parsed as OfflineIssueEntry[]
        } else {
          console.warn('Offline issue queue was not an array; resetting.')
          window.localStorage.removeItem(OFFLINE_QUEUE_KEY)
        }
      } catch (parseError) {
        console.warn('Offline issue queue is corrupted; resetting.', parseError)
        window.localStorage.removeItem(OFFLINE_QUEUE_KEY)
      }
    }
    queue.unshift(entry)
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(0, 200)))
    return true
  } catch (error) {
    console.error('Failed to store offline issue entry', error)
    return false
  }
}

function extractServerErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const errorShape = (payload as { error?: unknown }).error
  if (!errorShape) return null
  if (typeof errorShape === 'string') {
    return errorShape
  }
  if (typeof errorShape !== 'object' || errorShape === null) {
    return null
  }
  const formErrors = Array.isArray((errorShape as { formErrors?: unknown }).formErrors)
    ? ((errorShape as { formErrors?: string[] }).formErrors ?? []).filter(Boolean)
    : []
  if (formErrors.length > 0) {
    return formErrors.join(', ')
  }
  const fieldErrors = (errorShape as { fieldErrors?: Record<string, unknown> }).fieldErrors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const value of Object.values(fieldErrors)) {
      if (Array.isArray(value) && value.length > 0) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).join(', ')
      }
    }
  }
  return null
}

export function IssueReporterDialog({
  open,
  draft,
  onClose,
  setDraft,
  setOpen,
}: IssueReporterDialogProps) {
  const pathname = usePathname()
  const [issueType, setIssueType] = useState<IssueReporterIssueType>(draft?.issueType ?? 'bug')
  const [title, setTitle] = useState(draft?.title ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [componentPath, setComponentPath] = useState(draft?.componentPath ?? '')
  const [reporterName, setReporterName] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setIssueType(draft?.issueType ?? 'bug')
      setTitle(draft?.title ?? '')
      setDescription(draft?.description ?? '')
      setComponentPath(draft?.componentPath ?? '')
      setSubmissionState('idle')
      setErrorMessage(null)
      setSuccessMessage(null)
    } else {
      setDraft(null)
      setTitle('')
      setDescription('')
      setComponentPath('')
      setReporterName('')
      setReporterEmail('')
      setSuccessMessage(null)
    }
  }, [open, draft, setDraft])

  const placeholder = useMemo(() => {
    switch (issueType) {
      case 'bug':
        return 'Describe what went wrong, what you expected, and any steps to reproduce...'
      case 'feature':
        return 'Outline the new functionality or enhancement you would like to see...'
      case 'feedback':
        return 'Share ideas that would improve the experience on this page...'
      case 'question':
        return 'Ask a question about this screen or workflow...'
      default:
        return 'Drop any notes for the team...'
    }
  }, [issueType])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) {
      setErrorMessage('Description is required.')
      return
    }

    setSubmissionState('submitting')
    setErrorMessage(null)

    const payload = {
      issueType,
      title: title.trim() || undefined,
      description: description.trim(),
      pagePath: pathname,
      componentPath: componentPath.trim() || undefined,
      branch: BRANCH || undefined,
      commitSha: COMMIT_SHA || undefined,
      reporterName: reporterName.trim() || undefined,
      reporterEmail: reporterEmail.trim() || undefined,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        viewport:
          typeof window !== 'undefined'
            ? { width: window.innerWidth, height: window.innerHeight }
            : undefined,
      },
    }

    try {
      const response = await fetch('/api/dev-status/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message = extractServerErrorMessage(data) ?? 'Could not submit your report.'
        throw new Error(message)
      }

      setSubmissionState('success')
      setSuccessMessage('Thanks! We captured your note and sent it to the Dev Status dashboard.')
      setTimeout(() => {
        setOpen(false)
        onClose()
      }, 1200)
    } catch (error) {
      console.error('Failed to submit issue report', error)
      const fallbackMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unexpected error occurred.'
      const offlineSaved = enqueueOfflineIssue({
        issueId: Date.now(),
        issueType,
        title: payload.title ?? null,
        description: payload.description,
        pagePath: payload.pagePath ?? null,
        componentPath: payload.componentPath ?? null,
        branch: payload.branch ?? null,
        commitSha: payload.commitSha ?? null,
        reporterName: payload.reporterName ?? null,
        reporterEmail: payload.reporterEmail ?? null,
        metadata: {
          ...(payload.metadata ?? {}),
          source: 'offline-cache',
        },
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      })

      if (offlineSaved) {
        setSubmissionState('success')
        setErrorMessage(null)
        setSuccessMessage('Saved offline. We will sync it once the issue service is available.')
        setTimeout(() => {
          setOpen(false)
          onClose()
        }, 1400)
        return
      }

      setSubmissionState('error')
      setErrorMessage(fallbackMessage)
      setSuccessMessage(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-issue-reporter-ignore="true"
          className="fixed inset-0 z-[190] bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-fade-in"
        />
        <Dialog.Content
          data-issue-reporter-ignore="true"
          className="fixed inset-x-4 bottom-12 z-[200] mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl transition data-[state=open]:animate-slide-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Report an Issue / Idea</Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <form className="space-y-4 px-5 py-4" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">
              {ISSUE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIssueType(option.value)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                    issueType === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="issue-title" className="text-sm font-medium text-slate-700">
                Title <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="issue-title"
                type="text"
                placeholder="Short summary"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="issue-description" className="text-sm font-medium text-slate-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="issue-description"
                required
                placeholder={placeholder}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="issue-component" className="text-sm font-medium text-slate-700">
                  Component reference <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="issue-component"
                  type="text"
                  placeholder="e.g., src/app/components/Planning/PlanningContent.tsx"
                  value={componentPath}
                  onChange={(event) => setComponentPath(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="issue-contact" className="text-sm font-medium text-slate-700">
                  Contact <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="issue-contact"
                  type="email"
                  placeholder="you@example.com"
                  value={reporterEmail}
                  onChange={(event) => setReporterEmail(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="issue-name" className="text-sm font-medium text-slate-700">
                Your name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="issue-name"
                type="text"
                placeholder="Helps us follow up"
                value={reporterName}
                onChange={(event) => setReporterName(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {submissionState === 'success' && successMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                Page: <span className="font-medium text-slate-500">{pathname}</span>
              </p>
              <div className="flex gap-2">
                <Dialog.Close
                  type="button"
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  onClick={onClose}
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submissionState === 'submitting' || !description.trim()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                >
                  {submissionState === 'submitting' ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
