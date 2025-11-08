'use client'

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { IssueReporterContext, type IssueReporterDraft } from './IssueReporterContext'
import { IssueReporterDialog } from './IssueReporterDialog'

type IssueReporterProviderProps = {
  children: ReactNode
}
const DESCRIPTOR_ATTRS = ['data-component-path', 'data-component', 'data-testid'] as const

function describeTarget(element: HTMLElement | null): string {
  if (!element) return ''
  for (const attr of DESCRIPTOR_ATTRS) {
    const value = element.getAttribute(attr)
    if (value) return value
  }
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''
  const classes =
    typeof element.className === 'string'
      ? element.className
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((cls) => `.${cls.replace(/[^a-zA-Z0-9_-]/g, '')}`)
          .join('')
      : ''
  const role = element.getAttribute('role')
  const aria = element.getAttribute('aria-label')
  let descriptor = `${tag}${id}${classes}`
  if (aria) {
    descriptor += `["${aria}"]`
  } else if (role) {
    descriptor += `[role=${role}]`
  }
  return descriptor
}

function extractLabel(element: HTMLElement): string | null {
  const aria = element.getAttribute('aria-label')
  if (aria) return aria
  const text = element.textContent?.trim()
  if (text) {
    return text.split(/\s+/).slice(0, 8).join(' ')
  }
  return element.tagName.toLowerCase()
}

function targetIsIgnored(element: HTMLElement | null): boolean {
  if (!element) return true
  const doc = typeof document !== 'undefined' ? document : null
  if (doc && (element === doc.body || element === doc.documentElement)) return true
  return Boolean(element.closest('[data-issue-reporter-ignore="true"]'))
}

export function IssueReporterProvider({ children }: IssueReporterProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<IssueReporterDraft | null>(null)
  const [lastTargetDescriptor, setLastTargetDescriptor] = useState<string | null>(null)
  const [lastTargetLabel, setLastTargetLabel] = useState<string | null>(null)

  const openReporter = useCallback((nextDraft?: IssueReporterDraft) => {
    setDraft(nextDraft ?? null)
    setIsOpen(true)
  }, [])

  const closeReporter = useCallback(() => {
    setIsOpen(false)
    setDraft(null)
  }, [])

  const openReporterWithLatestTarget = useCallback(
    (nextDraft?: IssueReporterDraft) => {
      if (!lastTargetDescriptor) {
        return false
      }
      openReporter({
        issueType: 'bug',
        ...nextDraft,
        componentPath: nextDraft?.componentPath ?? lastTargetDescriptor,
      })
      return true
    },
    [lastTargetDescriptor, openReporter]
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target || targetIsIgnored(target)) return
      const descriptor = describeTarget(target)
      if (!descriptor) return
      setLastTargetDescriptor(descriptor)
      setLastTargetLabel(extractLabel(target))
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      isOpen,
      draft,
      openReporter,
      closeReporter,
      setDraft,
      openReporterWithLatestTarget,
      hasTargetContext: Boolean(lastTargetDescriptor),
      lastTargetLabel: lastTargetLabel ?? null,
    }),
    [
      isOpen,
      draft,
      openReporter,
      closeReporter,
      openReporterWithLatestTarget,
      lastTargetDescriptor,
      lastTargetLabel,
    ]
  )

  return (
    <IssueReporterContext.Provider value={contextValue}>
      {children}
      <IssueReporterDialog
        open={isOpen}
        draft={draft}
        onClose={closeReporter}
        setDraft={setDraft}
        setOpen={setIsOpen}
      />
    </IssueReporterContext.Provider>
  )
}
