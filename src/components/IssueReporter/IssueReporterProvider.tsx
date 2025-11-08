'use client'

import { ReactNode, useCallback, useMemo, useState } from 'react'
import { IssueReporterContext, type IssueReporterDraft } from './IssueReporterContext'
import { IssueReporterButton } from './IssueReporterButton'
import { IssueReporterDialog } from './IssueReporterDialog'

type IssueReporterProviderProps = {
  children: ReactNode
}

export function IssueReporterProvider({ children }: IssueReporterProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<IssueReporterDraft | null>(null)

  const openReporter = useCallback((nextDraft?: IssueReporterDraft) => {
    setDraft(nextDraft ?? null)
    setIsOpen(true)
  }, [])

  const closeReporter = useCallback(() => {
    setIsOpen(false)
    setDraft(null)
  }, [])

  const contextValue = useMemo(
    () => ({
      isOpen,
      draft,
      openReporter,
      closeReporter,
      setDraft,
    }),
    [isOpen, draft, openReporter, closeReporter]
  )

  return (
    <IssueReporterContext.Provider value={contextValue}>
      {children}
      <IssueReporterButton />
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
