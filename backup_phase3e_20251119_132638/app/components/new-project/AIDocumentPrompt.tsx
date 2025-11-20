'use client'

import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type AIDocumentPromptProps = PropsWithChildren<{
  step: number
  final?: boolean
  className?: string
}>

const AIDocumentPrompt = ({ step, final = false, className, children }: AIDocumentPromptProps) => {
  return (
    <section
      aria-label={`Landscaper AI assistance for step ${step}${final ? ' (final)' : ''}`}
      className={cn('rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 backdrop-blur-sm', className)}
    >
      {children}
    </section>
  )
}

export default AIDocumentPrompt
