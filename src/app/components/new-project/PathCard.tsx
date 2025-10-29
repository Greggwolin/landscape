'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Badge from './Badge'

export interface PathCardProps {
  icon: ReactNode
  title: string
  description: string
  action: string
  onClick: () => void
  recommended?: boolean
  disabled?: boolean
  badge?: string
}

const PathCard = ({
  icon,
  title,
  description,
  action,
  onClick,
  recommended = false,
  disabled = false,
  badge
}: PathCardProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'relative flex h-full flex-col rounded-xl border-2 p-6 text-left transition-all',
      'bg-slate-800 border-slate-700 hover:border-blue-400 hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      disabled && 'cursor-not-allowed opacity-50 hover:border-slate-700 hover:bg-slate-800',
      recommended && !disabled && 'border-blue-500 bg-blue-900/20'
    )}
  >
    {recommended && (
      <Badge className="absolute right-4 top-4" variant="primary" size="sm">
        Recommended
      </Badge>
    )}

    <div className="mb-3 flex items-center gap-3">
      <div className="text-blue-400">{icon}</div>
      <h4 className="text-lg font-semibold text-slate-100">{title}</h4>
    </div>

    <p className="mb-4 min-h-[72px] text-sm text-slate-300">{description}</p>

    <div className="mt-auto flex items-center justify-between">
      <span className="text-sm font-medium text-blue-400">
        {action} →
      </span>
      {badge && (
        <Badge variant="secondary" size="sm">
          {badge}
        </Badge>
      )}
    </div>
  </button>
)

export default PathCard
