'use client'

import React, { useState, useEffect } from 'react'
import GISMap from '../MapLibre/GISMap'

interface PlanNavigationProps {
 projectId: number
 onParcelUpdate?: (parcelId: number, updates: Record<string, unknown>) => void
 className?: string
}

interface PlanParcel {
 parcel_id: number
 parcel_code: string
 landuse_code: string
 landuse_type: string
 acres_gross: number
 units_total?: number
 area_no?: number
 phase_no?: number
 parcel_no?: number
 confidence: number
 source_doc: string
 version: number
}

interface ParcelStats {
 total_parcels: number
 confidence_stats: {
 high: number
 medium: number
 low: number
 average: number
 }
}

const PlanNavigation: React.FC<PlanNavigationProps> = ({
 projectId,
 onParcelUpdate,
 className = ''
}) => {
 const [selectedParcel, setSelectedParcel] = useState<PlanParcel | null>(null)
 const [parcels, setParcels] = useState<PlanParcel[]>([])
 const [stats, setStats] = useState<ParcelStats | null>(null)
 const [groupedHierarchy, setGroupedHierarchy] = useState<Record<string, unknown>>({})
 const [isLoading, setIsLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [showContextPanel, setShowContextPanel] = useState(true)
 const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

 // Load plan parcels on component mount
 useEffect(() => {
 loadPlanParcels()
 }, [projectId])

 const loadPlanParcels = async () => {
 try {
 setIsLoading(true)
 setError(null)

 const minConfidence = confidenceFilter === 'high' ? 0.9 :
 confidenceFilter === 'medium' ? 0.7 :
 confidenceFilter === 'low' ? 0.0 : undefined

 const params = new URLSearchParams({
 project_id: projectId.toString(),
 include_geometry: 'false'
 })

 if (minConfidence !== undefined) {
 params.append('min_confidence', minConfidence.toString())
 }

 const response = await fetch(`/api/gis/plan-parcels?${params}`)

 if (!response.ok) {
 throw new Error('Failed to load plan parcels')
 }

 const data = await response.json()

 setParcels(data.parcels || [])
 setStats(data.statistics || null)
 setGroupedHierarchy(data.grouped_hierarchy || {})

 } catch (err) {
 console.error('Error loading plan parcels:', err)
 setError(err instanceof Error ? err.message : 'Failed to load plan parcels')
 } finally {
 setIsLoading(false)
 }
 }

 // Reload parcels when confidence filter changes
 useEffect(() => {
 loadPlanParcels()
 }, [confidenceFilter])

 const handleParcelClick = (parcel: PlanParcel) => {
 setSelectedParcel(parcel)
 }

 const getConfidenceLabel = (confidence: number) => {
 if (confidence >= 0.9) return { label: 'High', color: 'text-green-400', bg: 'bg-green-900/50' }
 if (confidence >= 0.7) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/50' }
 return { label: 'Low', color: 'text-red-400', bg: 'bg-red-900/50' }
 }

 const getConfidenceColor = (confidence: number) => {
 if (confidence >= 0.9) return 'text-green-400'
 if (confidence >= 0.7) return 'text-yellow-400'
 return 'text-red-400'
 }

 const updateParcelConfidence = async (parcelId: number, newConfidence: number) => {
 try {
 const response = await fetch('/api/gis/plan-parcels', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 parcel_id: parcelId,
 confidence: newConfidence
 })
 })

 if (!response.ok) {
 throw new Error('Failed to update parcel confidence')
 }

 // Reload parcels to reflect changes
 await loadPlanParcels()

 // Update selected parcel if it was the one being updated
 if (selectedParcel && selectedParcel.parcel_id === parcelId) {
 setSelectedParcel({ ...selectedParcel, confidence: newConfidence })
 }

 if (onParcelUpdate) {
 onParcelUpdate(parcelId, { confidence: newConfidence })
 }

 } catch (err) {
 console.error('Error updating parcel confidence:', err)
 alert('Failed to update parcel confidence')
 }
 }

 const renderBreadcrumbs = (parcel: PlanParcel) => {
 const breadcrumbs = ['Project']

 if (parcel.area_no) {
 breadcrumbs.push(`Area ${parcel.area_no}`)
 }

 if (parcel.phase_no) {
 breadcrumbs.push(`Phase ${parcel.phase_no}`)
 }

 breadcrumbs.push(`Parcel ${parcel.parcel_code}`)

 return breadcrumbs.map((item, index) => (
 <React.Fragment key={item}>
 <span className={index === breadcrumbs.length - 1 ? 'text-blue-400 font-medium' : 'text-body-tertiary'}>
 {item}
 </span>
 {index < breadcrumbs.length - 1 && (
 <svg className="w-3 h-3 text-body-tertiary" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
 </svg>
 )}
 </React.Fragment>
 ))
 }

 if (isLoading) {
 return (
 <div className={`flex items-center justify-center bg-body text-body ${className}`}>
 <div className="flex items-center gap-3">
 <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
 <span>Loading plan navigation...</span>
 </div>
 </div>
 )
 }

 if (error) {
 return (
 <div className={`flex items-center justify-center bg-body text-body ${className}`}>
 <div className="text-center">
 <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 <p className="text-red-300 mb-2">{error}</p>
 <button
 onClick={loadPlanParcels}
 className="text-blue-400 hover:text-blue-300 underline"
 >
 Retry
 </button>
 </div>
 </div>
 )
 }

 return (
 <div className={`flex h-full bg-body ${className}`}>
 {/* Map View */}
 <div className="flex-1 relative">
 <GISMap
 projectId={projectId}
 mode="navigation"
 onParcelClick={handleParcelClick}
 className="h-full"
 />

 {/* Map Controls */}
 <div className="absolute top-4 right-4 flex flex-col gap-2">
 <button
 onClick={() => setShowContextPanel(!showContextPanel)}
 className="bg-body border border rounded-lg p-2 text-body hover:bg-body shadow-lg"
 title="Toggle context panel"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
 d={showContextPanel ?"M13 5l7 7-7 7M5 5l7 7-7 7" :"M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
 </svg>
 </button>

 <select
 value={confidenceFilter}
 onChange={(e) => setConfidenceFilter(e.target.value as any)}
 className="bg-body border border rounded-lg px-3 py-2 text-sm text-body hover:bg-body shadow-lg"
 >
 <option value="all">All Confidence</option>
 <option value="high">High (≥90%)</option>
 <option value="medium">Medium (≥70%)</option>
 <option value="low">Low (&lt;70%)</option>
 </select>
 </div>

 {/* Stats Bar */}
 {stats && (
 <div className="absolute bottom-4 right-4 bg-body border border rounded-lg p-3 shadow-lg">
 <div className="text-body text-sm space-y-1">
 <div className="font-medium">Project Statistics</div>
 <div>Total Parcels: {stats.total_parcels}</div>
 <div className="text-xs text-body-tertiary space-y-0.5">
 <div>High Confidence: {stats.confidence_stats.high}</div>
 <div>Medium Confidence: {stats.confidence_stats.medium}</div>
 <div>Low Confidence: {stats.confidence_stats.low}</div>
 <div>Average: {(stats.confidence_stats.average * 100).toFixed(1)}%</div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Context Panel */}
 {showContextPanel && (
 <div className="w-96 bg-body border-l border flex flex-col">
 <div className="border-b border px-4 py-3">
 <h2 className="text-lg font-semibold text-body">Parcel Details</h2>
 </div>

 <div className="flex-1 overflow-y-auto">
 {selectedParcel ? (
 <div className="p-4 space-y-4">
 {/* Breadcrumbs */}
 <div className="flex items-center gap-2 text-sm">
 {renderBreadcrumbs(selectedParcel)}
 </div>

 {/* Parcel Information */}
 <div className="space-y-3">
 <div>
 <label className="text-xs text-body-tertiary uppercase tracking-wide">Parcel Code</label>
 <div className="text-body font-mono">{selectedParcel.parcel_code}</div>
 </div>

 <div>
 <label className="text-xs text-body-tertiary uppercase tracking-wide">Land Use</label>
 <div className="text-body">
 {selectedParcel.landuse_type} ({selectedParcel.landuse_code})
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs text-body-tertiary uppercase tracking-wide">Acres</label>
 <div className="text-body">{selectedParcel.acres_gross.toFixed(2)}</div>
 </div>

 {selectedParcel.units_total && (
 <div>
 <label className="text-xs text-body-tertiary uppercase tracking-wide">Units</label>
 <div className="text-body">{selectedParcel.units_total}</div>
 </div>
 )}
 </div>
 </div>

 {/* AI Confidence */}
 <div className="border-t border pt-4">
 <label className="text-xs text-body-tertiary uppercase tracking-wide block mb-2">
 AI Confidence
 </label>

 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceLabel(selectedParcel.confidence).bg} ${getConfidenceLabel(selectedParcel.confidence).color}`}>
 {getConfidenceLabel(selectedParcel.confidence).label}
 </div>
 <div className={`text-sm font-mono ${getConfidenceColor(selectedParcel.confidence)}`}>
 {(selectedParcel.confidence * 100).toFixed(1)}%
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-body-tertiary">Adjust Confidence:</label>
 <div className="flex gap-1">
 {[0.95, 0.85, 0.75, 0.65, 0.50].map(value => (
 <button
 key={value}
 onClick={() => updateParcelConfidence(selectedParcel.parcel_id, value)}
 className={`px-2 py-1 rounded text-xs ${
 Math.abs(selectedParcel.confidence - value) < 0.05
 ? 'bg-blue-600 text-body'
 : 'bg-body text-body-tertiary hover:bg-body'
 }`}
 >
 {(value * 100).toFixed(0)}%
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Source Document */}
 <div className="border-t border pt-4">
 <label className="text-xs text-body-tertiary uppercase tracking-wide block mb-2">
 Source Document
 </label>
 <div className="text-sm text-body bg-body rounded px-3 py-2 font-mono">
 {selectedParcel.source_doc}
 </div>
 </div>

 {/* Metadata */}
 <div className="border-t border pt-4">
 <label className="text-xs text-body-tertiary uppercase tracking-wide block mb-2">
 Metadata
 </label>
 <div className="space-y-1 text-xs">
 <div className="flex justify-between">
 <span className="text-body-tertiary">Parcel ID:</span>
 <span className="text-body font-mono">{selectedParcel.parcel_id}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-body-tertiary">Version:</span>
 <span className="text-body">{selectedParcel.version}</span>
 </div>
 {selectedParcel.area_no && (
 <div className="flex justify-between">
 <span className="text-body-tertiary">Area:</span>
 <span className="text-body">{selectedParcel.area_no}</span>
 </div>
 )}
 {selectedParcel.phase_no && (
 <div className="flex justify-between">
 <span className="text-body-tertiary">Phase:</span>
 <span className="text-body">{selectedParcel.phase_no}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 ) : (
 <div className="p-4 text-center text-body-tertiary">
 <svg className="w-12 h-12 mx-auto mb-3 text-body-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
 d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
 </svg>
 <p className="text-sm">Click on a parcel in the map to view its details and AI extraction metadata</p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 )
}

export default PlanNavigation