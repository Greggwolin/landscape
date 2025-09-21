'use client'
// FORCE RECOMPILE 2025-09-20-15:32

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Project } from './PlanningWizard'
import DropZone from './DropZone'

interface ProjectCanvasProps {
  project: Project
  onAddArea?: () => void
  onAddPhase?: (areaId: string) => void
  onOpenPhase?: (areaId: string, phaseId: string) => void
  onOpenArea?: (areaId: string) => void
  showPhaseForm?: { areaId: string; areaName: string } | null
  onRefresh?: () => Promise<void> | void
}

const ProjectCanvas: React.FC<ProjectCanvasProps> = ({
  project,
  onAddArea,
  onAddPhase,
  onOpenPhase,
  onOpenArea,
  showPhaseForm,
  onRefresh,
}) => {
  const projectIdFromId = (id: string): number | null => {
    const parts = id.split('-')
    const last = parts[parts.length - 1]
    const parsed = Number(last)
    return Number.isFinite(parsed) ? parsed : null
  }

  const [editing, setEditing] = useState<{ areaId: string; phaseId: string; parcelId: string } | null>(null)
  const [draft, setDraft] = useState({
    landuseCode: '',
    product: '',
    acres: 0,
    units: 0,
  })
  const [families, setFamilies] = useState<{ family_id: string; name: string; code?: string }[]>([])
  const [subtypes, setSubtypes] = useState<{ subtype_id: string; family_id: string; name: string }[]>([])
  const [codes, setCodes] = useState<{ landuse_code: string; name: string; family_id?: string; subtype_id?: string }[]>([])
  const [selectedFamily, setSelectedFamily] = useState('')
  const [selectedSubtype, setSelectedSubtype] = useState('')
  const [choicesLoaded, setChoicesLoaded] = useState(false)
  const [loadingChoices, setLoadingChoices] = useState(false)
  const [productOptions, setProductOptions] = useState<string[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const handlePhaseDrop = (areaId: string) => (item: { type: string }) => {
    if (item.type === 'phase') {
      onAddPhase?.(areaId)
    }
  }

  const getLandUseColor = (landUse?: string) => {
    if (!landUse) return 'bg-slate-600'
    switch (landUse) {
      case 'LDR': return 'bg-emerald-600'
      case 'MDR': return 'bg-green-600'
      case 'HDR': return 'bg-teal-600'
      case 'MHDR': return 'bg-cyan-600'
      case 'C': return 'bg-orange-600'
      case 'MU': return 'bg-amber-600'
      case 'OS': return 'bg-blue-600'
      default: return 'bg-slate-600'
    }
  }

  const getLandUseBorderColor = (landUse?: string) => {
    if (!landUse) return 'border-slate-500'
    switch (landUse) {
      case 'LDR': return 'border-emerald-500'
      case 'MDR': return 'border-green-500'
      case 'HDR': return 'border-teal-500'
      case 'MHDR': return 'border-cyan-500'
      case 'C': return 'border-orange-500'
      case 'MU': return 'border-amber-500'
      case 'OS': return 'border-blue-500'
      default: return 'border-slate-500'
    }
  }

  const findParcel = useCallback(
    (areaId: string, phaseId: string, parcelId: string) => {
      const areaRef = project.areas.find((a) => a.id === areaId)
      const phaseRef = areaRef?.phases.find((p) => p.id === phaseId)
      const parcelRef = phaseRef?.parcels.find((p) => p.id === parcelId)
      return { areaRef, phaseRef, parcelRef }
    },
    [project.areas],
  )

  const ensureChoicesLoaded = useCallback(async () => {
    if (choicesLoaded || loadingChoices) return
    setLoadingChoices(true)
    try {
      const [codesRes, famRes, subRes] = await Promise.all([
        fetch('/api/landuse/choices?type=codes'),
        fetch('/api/landuse/choices?type=families'),
        fetch('/api/landuse/choices?type=subtypes'),
      ])
      const [codesData, familiesData, subtypesData] = await Promise.all([
        codesRes.ok ? codesRes.json() : Promise.resolve([]),
        famRes.ok ? famRes.json() : Promise.resolve([]),
        subRes.ok ? subRes.json() : Promise.resolve([]),
      ])

      const normalizedCodes = Array.isArray(codesData)
        ? codesData
            .map((record: Record<string, unknown>) => {
              const codeValue = record.landuse_code ?? record.code
              if (typeof codeValue !== 'string') return null
              const nameValue = record.name ?? record.display_name ?? codeValue
              const familyVal = record.family_id
              const subtypeVal = record.subtype_id
              return {
                landuse_code: codeValue.trim(),
                name: typeof nameValue === 'string' ? nameValue : codeValue.trim(),
                family_id: familyVal != null ? String(familyVal) : undefined,
                subtype_id: subtypeVal != null ? String(subtypeVal) : undefined,
              }
            })
            .filter(Boolean) as typeof codes
        : []

      const normalizedFamilies = Array.isArray(familiesData)
        ? familiesData
            .map((record: Record<string, unknown>) => {
              const idValue = record.family_id ?? record.id
              const nameValue = record.name ?? record.family_name ?? record.code
              if (idValue == null || typeof nameValue !== 'string') return null
              return {
                family_id: String(idValue),
                name: nameValue.trim(),
                code: typeof record.code === 'string' ? record.code : undefined,
              }
            })
            .filter(Boolean) as typeof families
        : []

      const normalizedSubtypes = Array.isArray(subtypesData)
        ? subtypesData
            .map((record: Record<string, unknown>) => {
              const subtypeValue = record.subtype_id ?? record.id
              const familyValue = record.family_id ?? record.family
              const nameValue = record.name ?? record.subtype_name ?? record.code
              if (subtypeValue == null || familyValue == null || typeof nameValue !== 'string') return null
              return {
                subtype_id: String(subtypeValue),
                family_id: String(familyValue),
                name: nameValue.trim(),
              }
            })
            .filter(Boolean) as typeof subtypes
        : []

      setCodes(normalizedCodes)
      setFamilies(normalizedFamilies)
      setSubtypes(normalizedSubtypes)
      setChoicesLoaded(true)
    } catch (err) {
      console.error('Failed to load land use data', err)
    } finally {
      setLoadingChoices(false)
    }
  }, [choicesLoaded, loadingChoices])

  const startEditingParcel = useCallback(
    async (areaId: string, phaseId: string, parcelId: string) => {
      const { parcelRef } = findParcel(areaId, phaseId, parcelId)
      if (!parcelRef) return
      await ensureChoicesLoaded()
      setEditing({ areaId, phaseId, parcelId })
      setDraft({
        landuseCode: parcelRef.landuseCode ?? parcelRef.landUse ?? '',
        product: parcelRef.product ?? '',
        acres: Number(parcelRef.acres ?? 0),
        units: Number(parcelRef.units ?? 0),
      })

      const preferredFamilyName = parcelRef.familyName
      const preferredCode = parcelRef.landuseCode ?? parcelRef.landUse ?? ''
      const preferredSubtypeName = parcelRef.subtypeName

      let famId = ''
      let subtypeId = ''

      if (preferredCode) {
        const meta = codes.find((code) => code.landuse_code === preferredCode)
        if (meta) {
          famId = meta.family_id ?? ''
          subtypeId = meta.subtype_id ?? ''
        }
      }

      if (!famId && preferredFamilyName) {
        const match = families.find((f) => f.name === preferredFamilyName || f.code === preferredFamilyName)
        if (match) famId = match.family_id
      }

      if (!subtypeId && preferredSubtypeName) {
        const match = subtypes.find((s) => s.name === preferredSubtypeName)
        if (match) subtypeId = match.subtype_id
      }

      setSelectedFamily(famId)
      setSelectedSubtype(subtypeId)
    },
    [ensureChoicesLoaded, findParcel, codes, families, subtypes],
  )

  const cancelEdit = () => {
    setEditing(null)
    setDraft({
      landuseCode: '',
      product: '',
      acres: 0,
      units: 0,
    })
    setSelectedFamily('')
    setSelectedSubtype('')
  }

  const editingParcel = useMemo(() => {
    if (!editing) return null
    const { parcelRef } = findParcel(editing.areaId, editing.phaseId, editing.parcelId)
    return parcelRef ?? null
  }, [editing, findParcel])

  const editingProductCode = editingParcel?.product?.trim() ?? ''

  const filteredSubtypes = useMemo(
    () => subtypes.filter((s) => !selectedFamily || s.family_id === selectedFamily),
    [subtypes, selectedFamily],
  )

  const filteredCodes = useMemo(
    () =>
      codes.filter(
        (code) => (!selectedFamily || code.family_id === selectedFamily) && (!selectedSubtype || code.subtype_id === selectedSubtype),
      ),
    [codes, selectedFamily, selectedSubtype],
  )

  useEffect(() => {
    if (!editing || !choicesLoaded) return
    const { parcelRef } = findParcel(editing.areaId, editing.phaseId, editing.parcelId)
    if (!parcelRef) return

    const preferredCode = parcelRef.landuseCode ?? parcelRef.landUse ?? ''
    const preferredFamilyName = parcelRef.familyName
    const preferredSubtypeName = parcelRef.subtypeName

    let famId = selectedFamily
    let subtypeId = selectedSubtype

    if (!famId && preferredCode) {
      const meta = codes.find((c) => c.landuse_code === preferredCode)
      if (meta) {
        famId = meta.family_id ?? ''
        subtypeId = meta.subtype_id ?? ''
      }
    }

    if (!famId && preferredFamilyName) {
      const familyMatch = families.find((f) => f.name === preferredFamilyName || f.code === preferredFamilyName)
      if (familyMatch) famId = familyMatch.family_id
    }

    if (!subtypeId && preferredSubtypeName) {
      const subtypeMatch = subtypes.find((s) => s.name === preferredSubtypeName)
      if (subtypeMatch) subtypeId = subtypeMatch.subtype_id
    }

    if (famId !== selectedFamily) setSelectedFamily(famId)
    if (subtypeId !== selectedSubtype) setSelectedSubtype(subtypeId)
    if (!draft.landuseCode && preferredCode) {
      setDraft((prev) => ({ ...prev, landuseCode: preferredCode }))
    }
  }, [editing, choicesLoaded, codes, families, subtypes, selectedFamily, selectedSubtype, draft.landuseCode, findParcel])

  useEffect(() => {
    if (!editing) return

    // Auto-select landuse code when there's only one option
    if (!draft.landuseCode && filteredCodes.length === 1) {
      setDraft((prev) => ({ ...prev, landuseCode: filteredCodes[0].landuse_code }))
    }

    // Auto-select the first landuse code when subtype changes and there are multiple codes
    // This ensures Commercial/Retail gets a code automatically
    if (!draft.landuseCode && filteredCodes.length > 0 && selectedSubtype) {
      setDraft((prev) => ({ ...prev, landuseCode: filteredCodes[0].landuse_code }))
    }
  }, [editing, filteredCodes, draft.landuseCode, selectedSubtype])

  const isSingleFamilySubtype = useMemo(() => {
    if (selectedSubtype) {
      const subtype = filteredSubtypes.find((s) => s.subtype_id === selectedSubtype)
      if (subtype) {
        const name = subtype.name.toLowerCase()
        return name.includes('single family') || name.includes('single-family') || name.includes('sf')
      }
    }
    const fallback = editingParcel?.subtypeName ?? ''
    return fallback.toLowerCase().includes('single family') || fallback.toLowerCase().includes('single-family')
  }, [selectedSubtype, filteredSubtypes, editingParcel])

  useEffect(() => {
    if (!isSingleFamilySubtype) {
      setProductOptions([])
      setLoadingProducts(false)
      return
    }

    const subtypeParam = selectedSubtype?.trim()
    const familyParam = selectedFamily?.trim()

    if (!subtypeParam && !familyParam) {
      setProductOptions(editingProductCode ? [editingProductCode] : [])
      setLoadingProducts(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadProducts = async () => {
      setLoadingProducts(true)
      try {
        const queryParam = subtypeParam ? `subtype_id=${encodeURIComponent(subtypeParam)}` : `family_id=${encodeURIComponent(familyParam)}`
        const res = await fetch(`/api/landuse/products?${queryParam}`, { signal: controller.signal })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()

        if (cancelled) return

        const codes = Array.isArray(data)
          ? Array.from(
              new Set(
                data
                  .map((record: Record<string, unknown>) => {
                    const value = record.code
                    return typeof value === 'string' ? value.trim() : null
                  })
                  .filter((value): value is string => Boolean(value)),
              ),
            ).sort((a, b) => a.localeCompare(b))
          : []

        if (editingProductCode && !codes.includes(editingProductCode)) {
          codes.unshift(editingProductCode)
        }

        setProductOptions(codes)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load lot products', error)
        setProductOptions(editingProductCode ? [editingProductCode] : [])
      } finally {
        if (!cancelled) {
          setLoadingProducts(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSingleFamilySubtype, selectedSubtype, selectedFamily, editingProductCode])

  useEffect(() => {
    if (!isSingleFamilySubtype && draft.product) {
      setDraft((prev) => ({ ...prev, product: '' }))
    }
  }, [isSingleFamilySubtype, draft.product])

  useEffect(() => {
    if (!editing) return

    const forceControlStyling = () => {
      // Target all select elements in the document that might be related
      const allSelects = document.querySelectorAll<HTMLSelectElement>('select')
      allSelects.forEach((element) => {
        if (element.classList.contains('parcel-inline-select') || element.closest('.planning-wizard-content')) {
          // Force styles on the select element
          element.style.setProperty('color', '#000', 'important')
          element.style.setProperty('background-color', '#fff', 'important')
          element.style.setProperty('-webkit-text-fill-color', '#000', 'important')
          element.style.setProperty('color-scheme', 'light', 'important')
          element.style.setProperty('-webkit-appearance', 'menulist', 'important')
          element.style.setProperty('appearance', 'menulist', 'important')
          element.style.setProperty('border', '1px solid #6b7280', 'important')

          // Force option styling more aggressively
          const options = element.querySelectorAll('option')
          options.forEach((option) => {
            option.style.setProperty('color', '#000', 'important')
            option.style.setProperty('background-color', '#fff', 'important')
            option.style.setProperty('-webkit-text-fill-color', '#000', 'important')
            option.style.setProperty('background', '#fff', 'important')
          })
        }
      })

      // Also target all option elements globally
      const allOptions = document.querySelectorAll<HTMLOptionElement>('option')
      allOptions.forEach((option) => {
        if (option.closest('.planning-wizard-content')) {
          option.style.setProperty('color', '#000', 'important')
          option.style.setProperty('background-color', '#fff', 'important')
          option.style.setProperty('-webkit-text-fill-color', '#000', 'important')
          option.style.setProperty('background', '#fff', 'important')
        }
      })

      const inputs = document.querySelectorAll<HTMLInputElement>('.parcel-inline-input')
      inputs.forEach((element) => {
        element.style.setProperty('color', '#000', 'important')
        element.style.setProperty('background-color', '#fff', 'important')
        element.style.setProperty('-webkit-text-fill-color', '#000', 'important')
        element.style.setProperty('color-scheme', 'light', 'important')
      })
    }

    const raf = requestAnimationFrame(forceControlStyling)

    // Set up a persistent interval to ensure styling sticks
    const interval = setInterval(forceControlStyling, 100)

    // Set up a MutationObserver to watch for changes
    const observer = new MutationObserver(() => {
      forceControlStyling()
    })

    const container = document.querySelector('.planning-wizard-content')
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(interval)
      observer.disconnect()
    }
  }, [editing, draft, selectedFamily, selectedSubtype])

  const handleFamilyChange = (value: string) => {
    setSelectedFamily(value)
    setSelectedSubtype('')
    setDraft((prev) => ({ ...prev, landuseCode: '' }))
  }

  const handleSubtypeChange = (value: string) => {
    setSelectedSubtype(value)
    // Clear landuse code initially, but it will be auto-set by the useEffect below
    setDraft((prev) => ({ ...prev, landuseCode: '' }))
  }

  const handleUsecodeChange = (value: string) => {
    setDraft((prev) => ({ ...prev, landuseCode: value }))
  }

  const saveInlineEdit = async () => {
    if (!editing || !editingParcel?.dbId) return
    const landuseCode = (draft.landuseCode || '').trim()
    if (!landuseCode) {
      alert('Select a land use code before saving.')
      return
    }

    const productValue = (draft.product ?? '').trim()

    const payload: Record<string, unknown> = {
      landuse_code: landuseCode,
      product: isSingleFamilySubtype && productValue ? productValue : null,
      acres: Number(draft.acres),
      units: Number(draft.units),
    }

    console.log('Saving parcel with payload:', payload)
    console.log('Is single family subtype:', isSingleFamilySubtype)
    console.log('Selected family:', selectedFamily)
    console.log('Selected subtype:', selectedSubtype)
    console.log('Draft landuse code:', draft.landuseCode)

    try {
      const res = await fetch(`/api/parcels/${editingParcel.dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())

      // Cancel editing first to show default view
      cancelEdit()

      // Force multiple refresh attempts to ensure data updates
      try {
        await onRefresh?.()

        // Dispatch multiple events to ensure refresh
        window.dispatchEvent(new CustomEvent('dataChanged', {
          detail: {
            entity: 'parcel',
            id: editingParcel.dbId,
            projectId: projectIdFromId(project.id),
          },
        }))

        // Additional refresh events with delays
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('dataChanged'))
          onRefresh?.()
        }, 50)

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('dataChanged'))
        }, 200)

      } catch (refreshError) {
        console.error('Error during refresh:', refreshError)
      }
    } catch (err) {
      console.error('Failed to save parcel', err)
      alert('Failed to save parcel changes')
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 bg-gray-950">
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
          <div className="border-b border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">{project.name}</h2>
            <div className="flex gap-4">
              <button
                onClick={() => onAddArea?.()}
                disabled={!onAddArea}
                className={`px-4 py-2 border-2 border-solid rounded-lg font-medium transition-all duration-200 ${
                  onAddArea
                    ? 'bg-gray-600 border-gray-500 text-white hover:outline hover:outline-2'
                    : 'bg-gray-700/60 border-gray-600/60 text-gray-400 cursor-not-allowed'
                }`}
                style={onAddArea ? { outlineColor: 'rgb(33,88,226)' } : undefined}
              >
                Add Area
              </button>
            </div>
          </div>

          <div className="p-6 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
              {project.areas.map((area) => (
                <div key={area.id} className="min-h-[520px]">
                  <DropZone accepts={['phase']} onDrop={handlePhaseDrop(area.id)} className="min-h-full">
                    <div
                      className="min-h-full rounded-lg p-4 bg-slate-600 border-2 border-slate-400 border-solid transition-all duration-200 group"
                      onClick={(e) => {
                        if (!onOpenArea) return
                        e.stopPropagation()
                        onOpenArea(area.id)
                      }}
                    >
                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-white">{area.name}</h3>
                        {(area as any).description && (
                          <p className="text-xs text-gray-300 mt-1">{(area as any).description}</p>
                        )}
                      </div>

                      {area.phases.length === 0 ? (
                        <div className="text-center">
                          <button
                            onClick={(e) => {
                              if (!onAddPhase) return
                              e.stopPropagation()
                              onAddPhase(area.id)
                            }}
                            disabled={!onAddPhase}
                            className={`px-4 py-2 border-2 border-solid rounded-lg font-medium transition-all duration-200 ${
                              onAddPhase
                                ? 'bg-gray-600 border-gray-500 text-white hover:outline hover:outline-2'
                                : 'bg-gray-700/60 border-gray-600/60 text-gray-400 cursor-not-allowed'
                            }`}
                            style={onAddPhase ? { outlineColor: 'rgb(33,88,226)' } : undefined}
                          >
                            Add Phase
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col flex-1">
                          <div className="flex flex-col gap-2">
                            {area.phases.map((phase) => (
                              <div
                                key={phase.id}
                                onClick={(e) => {
                                  if (!onOpenPhase) return
                                  e.stopPropagation()
                                  onOpenPhase(area.id, phase.id)
                                }}
                                className={`bg-slate-700 rounded p-3 cursor-pointer border-2 ${
                                  showPhaseForm?.areaId === area.id
                                    ? 'border-dashed border-slate-400'
                                    : 'border-solid border-gray-500'
                                } hover:border-blue-400 transition-all duration-200`}
                              >
                                <div className="mb-2">
                                  <div className="mb-1">
                                    <div className="font-medium text-sm text-white">{phase.name}</div>
                                  </div>
                                  {(phase as any).description &&
                                   !phase.name.includes((phase as any).description) && (
                                    <p className="text-xs text-gray-300 text-left">{(phase as any).description}</p>
                                  )}
                                </div>
                                {phase.parcels.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 auto-rows-max">
                                    {phase.parcels.map((parcel) => {
                                      const isEditing =
                                        editing && editing.areaId === area.id && editing.phaseId === phase.id && editing.parcelId === parcel.id
                                      const tileColor = getLandUseColor(parcel.landUse)
                                      const borderColor = getLandUseBorderColor(parcel.landUse)
                                      const currentLanduseCode = codes.find(c => c.landuse_code === (parcel.landuseCode ?? parcel.landUse))
                                      const currentFamily = families.find(f => f.family_id === currentLanduseCode?.family_id)
                                      const tileDisplayCode = currentFamily?.code || parcel.landuseCode || parcel.landUse

                                      return (
                                        <div
                                          key={parcel.id}
                                          className={`${tileColor} ${borderColor} text-white rounded text-xs cursor-pointer border hover:outline hover:outline-2 transition-all duration-200 overflow-hidden ${isEditing ? 'col-span-2 p-2 min-h-48' : 'p-1.5'}`}
                                          style={{outlineColor: 'rgb(33,88,226)'}}
                                          onClick={(e) => {
                                            if (!isEditing) {
                                              e.stopPropagation()
                                              startEditingParcel(area.id, phase.id, parcel.id)
                                            }
                                          }}
                                        >
                                          {isEditing && (
                                            <div
                                              className="p-2 text-white min-h-48"
                                              onClick={(e) => e.stopPropagation()}
                                              onMouseDown={(e) => e.stopPropagation()}
                                            >
                                              <div className="flex items-center justify-between text-sm font-semibold mb-3">
                                                <span>Parcel {parcel.name.replace('Parcel: ', '')}</span>
                                                <span className="text-xs uppercase tracking-wide opacity-80">
                                                  {tileDisplayCode || '—'}
                                                </span>
                                              </div>

                                              {loadingChoices && !choicesLoaded ? (
                                                <div className="text-sm text-center py-4">Loading options…</div>
                                              ) : (
                                                <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-2 text-xs">
                                                  <label className="text-gray-200 font-medium self-center">Type</label>
                                                  <select
                                                    className="parcel-inline-select h-6 w-24 rounded border border-gray-500 bg-white px-1 text-xs text-black"
                                                    value={selectedFamily}
                                                    onChange={(e) => handleFamilyChange(e.target.value)}
                                                    style={{
                                                      color: '#000 !important',
                                                      backgroundColor: '#fff !important',
                                                      WebkitTextFillColor: '#000 !important'
                                                    }}
                                                  >
                                                    <option value="">Select</option>
                                                    {families.map((family) => (
                                                      <option key={family.family_id} value={family.family_id}>
                                                        {family.name}
                                                      </option>
                                                    ))}
                                                  </select>

                                                  <label className="text-gray-200 font-medium self-center">Use</label>
                                                  <select
                                                    className="parcel-inline-select h-6 w-24 rounded border border-gray-500 bg-white px-1 text-xs text-black"
                                                    value={selectedSubtype}
                                                    onChange={(e) => handleSubtypeChange(e.target.value)}
                                                    disabled={!selectedFamily}
                                                    style={{
                                                      color: '#000 !important',
                                                      backgroundColor: '#fff !important',
                                                      WebkitTextFillColor: '#000 !important'
                                                    }}
                                                  >
                                                    <option value="">All</option>
                                                    {filteredSubtypes.map((sub) => (
                                                      <option key={sub.subtype_id} value={sub.subtype_id}>
                                                        {sub.name}
                                                      </option>
                                                    ))}
                                                  </select>

                                                  {isSingleFamilySubtype && (
                                                    <>
                                                      <label className="text-gray-200 font-medium self-center">Product</label>
                                                      <select
                                                        className="parcel-inline-select h-6 w-20 rounded border border-gray-500 bg-white px-1 text-xs text-black"
                                                        value={draft.product}
                                                        onChange={(e) => setDraft((prev) => ({ ...prev, product: e.target.value }))}
                                                        disabled={loadingProducts || (!productOptions.length && !draft.product)}
                                                        style={{
                                                          color: '#000 !important',
                                                          backgroundColor: '#fff !important',
                                                          WebkitTextFillColor: '#000 !important'
                                                        }}
                                                      >
                                                        <option value="">{loadingProducts ? 'Loading…' : 'Select'}</option>
                                                        {productOptions.map((option) => (
                                                          <option key={option} value={option}>
                                                            {option}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    </>
                                                  )}

                                                  <label className="text-gray-200 font-medium self-center">Acres</label>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    className="h-6 w-12 rounded border border-gray-500 bg-white px-1 text-xs text-black text-right"
                                                    value={draft.acres}
                                                    onChange={(e) => setDraft((prev) => ({ ...prev, acres: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                  />

                                                  <label className="text-gray-200 font-medium self-center">Units</label>
                                                  <input
                                                    type="number"
                                                    step="1"
                                                    className="h-6 w-12 rounded border border-gray-500 bg-white px-1 text-xs text-black text-right"
                                                    value={draft.units}
                                                    onChange={(e) => setDraft((prev) => ({ ...prev, units: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                  />
                                                </div>
                                              )}

                                              <div className="flex justify-end gap-2 mt-4">
                                                <button
                                                  className="px-3 py-1 text-xs border border-gray-500 text-gray-200 rounded hover:bg-gray-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    cancelEdit()
                                                  }}
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    saveInlineEdit()
                                                  }}
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                          {!isEditing && (
                                            <>
                                              <div className="text-center mb-2">
                                                <div className="font-semibold text-xs leading-tight mb-0.5">
                                                  Parcel {parcel.name.replace('Parcel: ', '')}
                                                </div>
                                              </div>
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1 w-12">Type:</td>
                                                    <td className="font-medium w-16">{tileDisplayCode || parcel.landUse}</td>
                                                  </tr>
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1">Use:</td>
                                                    <td className="font-medium">{parcel.subtypeName || 'Unknown'}</td>
                                                  </tr>
                                                  <tr>
                                                    <td className="opacity-90 align-top pr-1">Acres:</td>
                                                    <td className="font-medium">{parcel.acres}</td>
                                                  </tr>
                                                  {parcel.product && parcel.subtypeName?.toLowerCase().includes('single family') && (
                                                    <tr>
                                                      <td className="opacity-90 align-top pr-1">Product:</td>
                                                      <td className="font-medium">{parcel.product}</td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                              <div className="text-center text-xs text-gray-300 opacity-70 mt-2">Click to edit</div>
                                            </>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DropZone>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}

export default ProjectCanvas
