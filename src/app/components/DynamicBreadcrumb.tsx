'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useProjectContext } from '@/app/components/ProjectProvider'

export interface BreadcrumbItem {
 label: string
 href?: string
 containerId?: number
}

export interface DynamicBreadcrumbProps {
 items: BreadcrumbItem[]
 className?: string
}

/**
 * DynamicBreadcrumb Component
 *
 * Displays breadcrumb navigation with labels dynamically loaded from tbl_project_config.
 * Automatically adapts terminology based on project type:
 * - Land Development:"Plan Area > Phase > Parcel"
 * - Multifamily:"Property > Building > Unit"
 * - Office:"Campus > Building > Suite"
 *
 * @example
 * ```tsx
 * <DynamicBreadcrumb
 * items={[
 * { label: 'Project Name', href: '/projects/7' },
 * { label: 'Plan Area 1', href: '/projects/7/area/1' },
 * { label: 'Phase 1.1', href: '/projects/7/phase/5' },
 * { label: 'Parcel 42' }
 * ]}
 * />
 * ```
 */
export function DynamicBreadcrumb({ items, className = '' }: DynamicBreadcrumbProps) {
 const { activeProject } = useProjectContext()
 const { labels, isLoading } = useProjectConfig(activeProject?.project_id ?? null)

 if (isLoading) {
 return (
 <nav className={`flex items-center space-x-2 text-sm ${className}`}>
 <div className="h-4 w-32 bg-body animate-pulse rounded" />
 </nav>
 )
 }

 if (!items.length) {
 return null
 }

 return (
 <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
 <ol className="flex items-center space-x-2">
 {items.map((item, index) => {
 const isLast = index === items.length - 1

 return (
 <li key={index} className="flex items-center">
 {index > 0 && (
 <ChevronRight className="w-4 h-4 text-body-tertiary mx-2" aria-hidden="true" />
 )}
 {item.href && !isLast ? (
 <Link
 href={item.href}
 className="text-blue-400 hover:text-blue-300 transition-colors"
 >
 {item.label}
 </Link>
 ) : (
 <span className={isLast ? 'text-body-tertiary font-medium' : 'text-body-tertiary'}>
 {item.label}
 </span>
 )}
 </li>
 )
 })}
 </ol>
 </nav>
 )
}

/**
 * Helper function to build breadcrumb items from container hierarchy
 * Uses the project config labels for proper terminology
 */
export function buildContainerBreadcrumbs(
 projectName: string,
 level1Name?: string,
 level2Name?: string,
 level3Name?: string,
 options?: {
 projectHref?: string
 level1Href?: string
 level2Href?: string
 level3Href?: string
 }
): BreadcrumbItem[] {
 const items: BreadcrumbItem[] = [
 { label: projectName, href: options?.projectHref }
 ]

 if (level1Name) {
 items.push({ label: level1Name, href: options?.level1Href })
 }

 if (level2Name) {
 items.push({ label: level2Name, href: options?.level2Href })
 }

 if (level3Name) {
 items.push({ label: level3Name, href: options?.level3Href })
 }

 return items
}

export default DynamicBreadcrumb
