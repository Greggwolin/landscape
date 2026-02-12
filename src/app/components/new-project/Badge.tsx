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
  primary: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
  secondary: 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
  success: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  warning: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
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
