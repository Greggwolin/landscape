'use client'

import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning'
type BadgeSize = 'sm' | 'md'

type BadgeProps = PropsWithChildren<{
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}>

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-blue-600/80 text-blue-100 border border-blue-500/70',
  secondary: 'bg-slate-700 text-slate-100 border border-slate-600',
  success: 'bg-emerald-600/80 text-emerald-50 border border-emerald-500',
  warning: 'bg-amber-600/80 text-amber-50 border border-amber-500'
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs font-medium',
  md: 'px-2.5 py-1 text-sm font-semibold'
}

const Badge = ({ children, variant = 'secondary', size = 'md', className }: BadgeProps) => (
  <span className={cn('inline-flex items-center rounded-full uppercase tracking-wide', variantClasses[variant], sizeClasses[size], className)}>
    {children}
  </span>
)

export default Badge
