import React, { useEffect, useMemo, useState } from 'react'

type Category = {
  category_id: number
  code: string
  kind: 'Source' | 'Use'
  class: string | null
  event: string | null
  uoms: { code: string; label: string }[]
  pe_levels?: string[]
}

type Uom = { uom_code: string; name: string; uom_type: string }

const CategoryTree: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [uoms, setUoms] = useState<Uom[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<any>({ code: '', kind: 'Use', class: '', event: '', is_active: true, uoms: [], pe_levels: [] })
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    const [cats, u] = await Promise.all([
      fetch('/api/fin/categories').then(r => r.json()),
      fetch('/api/fin/uoms').then(r => r.json()),
    ])
    setCategories(Array.isArray(cats) ? cats : [])
    setUoms(Array.isArray(u) ? u : [])
  }

  useEffect(() => { reload() }, [])

  useEffect(() => {
    if (selectedId) {
      const c = categories.find(x => x.category_id === selectedId)
      if (c) setForm({
        code: c.code, kind: c.kind, class: c.class ?? '', event: c.event ?? '', is_active: true,
        uoms: (c.uoms ?? []).map(u => u.code), pe_levels: c.pe_levels ?? []
      })
    }
  }, [selectedId, categories])

  const flatLabel = (c: Category) => [c.kind, c.class, c.event].filter(Boolean).join(' · ')
  const sorted = useMemo(() => [...categories].sort((a, b) => flatLabel(a).localeCompare(flatLabel(b))), [categories])

  const onSave = async () => {
    setSaving(true)
    try {
      if (!selectedId) {
        const res = await fetch('/api/fin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error(await res.text())
        setSelectedId((await res.json()).category_id)
      } else {
        const res = await fetch(`/api/fin/categories/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error(await res.text())
      }
      await reload()
    } catch (e) { console.error('Save failed', e) } finally { setSaving(false) }
  }

  const onDelete = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await fetch(`/api/fin/categories/${selectedId}`, { method: 'DELETE' })
      setSelectedId(null)
      setForm({ code: '', kind: 'Use', class: '', event: '', is_active: true, uoms: [], pe_levels: [] })
      await reload()
    } catch (e) { console.error('Delete failed', e) } finally { setSaving(false) }
  }

  return (
    <div className="p-4">
      <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
        <div className="bg-gray-900 px-3 py-2 text-sm text-white">Admin · Category Tree</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 text-xs">
          <div className="md:col-span-1 border border-gray-700 rounded p-2 bg-gray-900 max-h-[60vh] overflow-auto">
            {(sorted ?? []).map(c => (
              <button key={c.category_id} className={`w-full text-left px-2 py-1 rounded ${selectedId === c.category_id ? 'bg-blue-900 text-white' : 'text-gray-300 hover:bg-gray-800'}`} onClick={() => setSelectedId(c.category_id)}>
                <div className="font-mono text-[11px] text-gray-400">{c.code}</div>
                <div>{flatLabel(c)}</div>
              </button>
            ))}
            <div className="mt-2">
              <button className="px-2 py-1 rounded bg-blue-700 text-white" onClick={() => { setSelectedId(null); setForm({ code: '', kind: 'Use', class: '', event: '', is_active: true, uoms: [], pe_levels: [] }) }}>New Category</button>
            </div>
          </div>
          <div className="md:col-span-2 border border-gray-700 rounded p-3 bg-gray-900 space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-gray-300">Code</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} />
            </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-300">Kind</label>
                <div className="flex items-center gap-4 text-gray-300">
                <label className="flex items-center gap-1"><input type="radio" name="kind" value="Use" checked={form.kind === 'Use'} onChange={() => setForm((f: any) => ({ ...f, kind: 'Use' }))} /> Use</label>
                <label className="flex items-center gap-1"><input type="radio" name="kind" value="Source" checked={form.kind === 'Source'} onChange={() => setForm((f: any) => ({ ...f, kind: 'Source' }))} /> Source</label>
                </div>
              </div>
            <div className="flex flex-col gap-2">
              <label className="text-gray-300">Class</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.class} onChange={e => setForm((f: any) => ({ ...f, class: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-gray-300">Event</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.event} onChange={e => setForm((f: any) => ({ ...f, event: e.target.value }))} />
            </div>
            <div className="border-t border-gray-700 pt-2">
              <div className="text-gray-300 mb-1">Allowed Units</div>
              <div className="grid grid-cols-3 gap-2">
                {uoms.map(u => (
                  <label key={u.uom_code} className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={form.uoms.includes(u.uom_code)} onChange={e => setForm((f: any) => ({ ...f, uoms: e.target.checked ? [...f.uoms, u.uom_code] : f.uoms.filter((x: string) => x !== u.uom_code) }))} />
                    <span>{u.uom_code} · {u.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2">
              <div className="text-gray-300 mb-1">Entity Applicability</div>
              <div className="grid grid-cols-5 gap-2 text-gray-300">
                {['project','area','phase','parcel','lot'].map(p => (
                  <label key={p} className="flex items-center gap-2">
                    <input type="checkbox" checked={form.pe_levels.includes(p)} onChange={e => setForm((f: any) => ({ ...f, pe_levels: e.target.checked ? [...f.pe_levels, p] : f.pe_levels.filter((x: string) => x !== p) }))} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="px-3 py-1 rounded bg-blue-700 text-white" onClick={onSave} disabled={saving}>Save</button>
              {selectedId && <button className="px-3 py-1 rounded bg-red-700 text-white" onClick={onDelete} disabled={saving}>Delete</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryTree
