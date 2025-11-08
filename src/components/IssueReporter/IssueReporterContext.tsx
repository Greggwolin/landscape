'use client'

import { createContext, useContext } from 'react'

export type IssueReporterIssueType = 'bug' | 'feature' | 'feedback' | 'question' | 'other'

export type IssueReporterDraft = {
  issueType?: IssueReporterIssueType
  title?: string
  description?: string
  componentPath?: string
}

export type IssueReporterContextValue = {
  isOpen: boolean
  draft: IssueReporterDraft | null
  openReporter: (draft?: IssueReporterDraft) => void
  closeReporter: () => void
  setDraft: (draft: IssueReporterDraft | null) => void
  openReporterWithLatestTarget: (draft?: IssueReporterDraft) => boolean
  hasTargetContext: boolean
  lastTargetLabel: string | null
}

export const IssueReporterContext = createContext<IssueReporterContextValue | null>(null)

export function useIssueReporter() {
  const ctx = useContext(IssueReporterContext)
  if (!ctx) {
    throw new Error('useIssueReporter must be used within an IssueReporterProvider')
  }
  return ctx
}
