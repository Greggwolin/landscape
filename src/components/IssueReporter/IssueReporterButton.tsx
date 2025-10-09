'use client'

import { useEffect, useMemo, useState } from 'react'
import { useIssueReporter } from './IssueReporterContext'

const DEFAULT_SHORTCUT = { key: 'k', meta: true, shift: true }

export function IssueReporterButton() {
  const { openReporter } = useIssueReporter()
  const [isMounted, setIsMounted] = useState(false)
  const shortcutHint = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Shift⌘K'
    const isMac = navigator.platform.toLowerCase().includes('mac')
    return isMac ? 'Shift⌘K' : 'ShiftCtrlK'
  }, [])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    function handleKey(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === DEFAULT_SHORTCUT.key &&
        event.shiftKey === DEFAULT_SHORTCUT.shift &&
        ((DEFAULT_SHORTCUT.meta && event.metaKey) || (!DEFAULT_SHORTCUT.meta && event.ctrlKey))
      ) {
        event.preventDefault()
        openReporter()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openReporter])

  if (!isMounted) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col items-end space-y-2 sm:space-y-3">
      <button
        type="button"
        onClick={() => openReporter()}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
      >
        <span>Report Issue / Idea</span>
        <span className="hidden rounded bg-indigo-500/40 px-2 py-0.5 text-xs font-medium uppercase tracking-wide sm:inline">
          {shortcutHint}
        </span>
      </button>
    </div>
  )
}
