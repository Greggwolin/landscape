// Budget UI refactor to Neon core_fin schema
import React, { useEffect, useMemo, useState } from 'react'

type Budget = { budget_id: number; name: string; as_of: string; status: string }
type Category = {
  category_id: number
  code: string
  kind: string
  class: string | null
  event: string | null
  scope: string | null
  detail: string | null
  uoms: { code: string; label: string }[]
}
type Line = {
  fact_id: number
  budget_id: number
  pe_level: string
  pe_id: string
  category_id: number
  category_code: string
  uom_code: string
  uom_name?: string
  qty: number | null
  rate: number | null
  amount: number | null
  amount_base?: number | null
  contingency_mode?: string | null
  confidence_code?: string | null
  line_contingency_pct?: number | null
  effective_contingency_pct?: number | null
  amount_with_contingency?: number | null
}

const currency = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n ?? 0))

type Props = { projectId?: number | null }
const BudgetContent: React.FC<Props> = ({ projectId = null }) => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [activeBudgetId, setActiveBudgetId] = useState<number | null>(null)
  const [peLevel, setPeLevel] = useState<'project'|'area'|'phase'|'parcel'|'lot'>('project')
  const [peId, setPeId] = useState<string>(projectId ? String(projectId) : '1')
  const [categories, setCategories] = useState<Category[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Init: load budgets then categories and lines
  useEffect(() => {
    (async () => {
      try {
        const b = await fetch('/api/fin/budgets').then(r => r.json())
        setBudgets(b)
        if (b?.[0]?.budget_id) setActiveBudgetId(b[0].budget_id)
      } catch (e) {
        console.error('Failed to load budgets', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Update default pe_id when incoming projectId changes and scope is project
  useEffect(() => {
    if (projectId && peLevel === 'project') setPeId(String(projectId))
  }, [projectId, peLevel])

  // Load categories whenever peLevel changes
  useEffect(() => {
    (async () => {
      try {
        const cats = await fetch(`/api/fin/categories?pe_level=${peLevel}`).then(r => r.json())
        setCategories(cats)
      } catch (e) {
        console.error('Failed to load categories', e)
      }
    })()
  }, [peLevel])

  // Load lines when budget/pe changes
  useEffect(() => {
    (async () => {
      if (!activeBudgetId) return
      try {
        const data = await fetch(`/api/fin/lines?budget_id=${activeBudgetId}&pe_level=${peLevel}&pe_id=${encodeURIComponent(peId)}`).then(r => r.json())
        setLines(Array.isArray(data) ? data : [])
      } catch (e) { console.error('Failed to load lines', e) }
    })()
  }, [activeBudgetId, peLevel, peId])

  const addLine = async () => {
    if (!activeBudgetId) return
    // pick first category in list as default
    const c = categories[0]
    if (!c) return
    const uom = c.uoms?.[0]?.code ?? '$$$'
    try {
      const res = await fetch('/api/fin/lines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget_id: activeBudgetId, pe_level: peLevel, pe_id: peId, category_id: c.category_id, uom_code: uom, qty: 1, rate: 0 })
      })
      const j = await res.json()
      if (j?.fact_id) {
        // reload
        const data = await fetch(`/api/fin/lines?budget_id=${activeBudgetId}&pe_level=${peLevel}&pe_id=${encodeURIComponent(peId)}`).then(r => r.json())
        setLines(Array.isArray(data) ? data : [])
      }
    } catch (e) { console.error('Add line failed', e) }
  }

  const updateLine = async (id: number, patch: any) => {
    setSaving(true)
    try {
      await fetch(`/api/fin/lines/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      // optimistic UI: merge change locally
      setLines(prev => prev.map(l => l.fact_id === id ? { ...l, ...patch } as any : l))
    } catch (e) {
      console.error('Update failed', e)
    } finally { setSaving(false) }
  }

  const deleteLine = async (id: number) => {
    try {
      await fetch(`/api/fin/lines/${id}`, { method: 'DELETE' })
      setLines(prev => prev.filter(l => l.fact_id !== id))
    } catch (e) { console.error('Delete failed', e) }
  }

  // Confidence policies and source badges
  const [confidencePolicies, setConfidencePolicies] = useState<{ confidence_code: string; name: string; default_contingency_pct: number | null }[]>([])
  const [sourceBadges, setSourceBadges] = useState<Record<number, { notes: number; docs: number; chip_state: number }>>({})
  const [openSourceFor, setOpenSourceFor] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const policies = await fetch('/api/fin/confidence').then(r => r.json())
        if (Array.isArray(policies)) setConfidencePolicies(policies)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const ids = (Array.isArray(lines) ? lines : []).map(l => l.fact_id)
      if (ids.length === 0) { setSourceBadges({}); return }
      try {
        const resp = await fetch(`/api/fin/lines/sources?fact_ids=${ids.join(',')}`)
        const data = await resp.json()
        const map: Record<number, any> = {}
        if (Array.isArray(data)) {
          for (const row of data) map[row.fact_id] = row
        }
        setSourceBadges(map as any)
      } catch {}
    })()
  }, [lines])

  const total = useMemo(() => (Array.isArray(lines) ? lines : []).reduce((s, l) => {
    const base = l.amount_with_contingency ?? l.amount ?? (Number(l.qty ?? 0) * Number(l.rate ?? 0))
    return s + Number(base)
  }, 0), [lines])

  const getChipClass = (state: number) => state === 3 ? 'bg-purple-700 hover:bg-purple-800' : state === 2 ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-700 hover:bg-gray-600'
  const getChipLabel = (row?: { notes: number; docs: number; chip_state: number }) => {
    if (!row) return 'Add source'
    return row.chip_state === 3 ? 'Docs' : row.chip_state === 2 ? 'Source' : 'Add source'
  }
  const toggleSourcePanel = (fid: number) => setOpenSourceFor(prev => prev === fid ? null : fid)

  const [lineVendors, setLineVendors] = useState<Record<number, { party_id: number; name: string; role: string | null; note_id: number | null; note: string | null }[]>>({})
  const [newVendor, setNewVendor] = useState<{ name: string; role: string; note: string }>({ name: '', role: '', note: '' })
  useEffect(() => {
    (async () => {
      if (openSourceFor) {
        try {
          const rows = await fetch(`/api/fin/lines/${openSourceFor}/vendors`).then(r => r.json())
          setLineVendors(prev => ({ ...prev, [openSourceFor]: Array.isArray(rows) ? rows : [] }))
        } catch {}
      }
    })()
  }, [openSourceFor])
  const addVendorToLine = async (fid: number) => {
    try {
      await fetch(`/api/fin/lines/${fid}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_name: newVendor.name, role: newVendor.role, note: newVendor.note }) })
      setNewVendor({ name: '', role: '', note: '' })
      const rows = await fetch(`/api/fin/lines/${fid}/vendors`).then(r => r.json())
      setLineVendors(prev => ({ ...prev, [fid]: Array.isArray(rows) ? rows : [] }))
      // refresh chips
      setSourceBadges({})
    } catch {}
  }
  const removeVendorFromLine = async (fid: number, partyId: number) => {
    try {
      await fetch(`/api/fin/lines/${fid}/vendors?party_id=${partyId}`, { method: 'DELETE' })
      const rows = await fetch(`/api/fin/lines/${fid}/vendors`).then(r => r.json())
      setLineVendors(prev => ({ ...prev, [fid]: Array.isArray(rows) ? rows : [] }))
      setSourceBadges({})
    } catch {}
  }

  if (loading) return (
    <div className="p-4 flex items-center justify-center"><div className="text-gray-400">Loading budget…</div></div>
  )

  return (
    <div className="p-4 space-y-4 bg-gray-950">
      <div className="bg-gray-800 rounded border border-gray-700 p-3 flex items-center gap-3 text-xs">
        <div className="text-gray-300">Budget</div>
        <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
          value={activeBudgetId ?? ''}
          onChange={e => setActiveBudgetId(Number(e.target.value))}
        >
          {(budgets ?? []).map(b => (
            <option key={b.budget_id} value={b.budget_id}>{b.name} · {b.as_of}</option>
          ))}
        </select>
        <div className="text-gray-300 ml-4">PE</div>
        <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white" value={peLevel} onChange={e => setPeLevel(e.target.value as any)}>
          <option value="project">project</option>
          <option value="area">area</option>
          <option value="phase">phase</option>
          <option value="parcel">parcel</option>
          <option value="lot">lot</option>
        </select>
        <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-28" value={peId} onChange={e => setPeId(e.target.value)} placeholder="pe_id" />
        <div className="flex-1" />
        <div className="text-gray-300">Total:</div>
        <div className="text-white font-medium">{currency(total)}</div>
        <button onClick={addLine} disabled={(categories ?? []).length === 0} className="ml-3 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Add Line</button>
      </div>

      <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
        <div className="bg-gray-900 px-3 py-2 text-xs text-gray-300 flex">
          <div className="w-2/6">Category</div>
          <div className="w-1/6 text-center">UoM</div>
          <div className="w-1/12 text-center">Qty</div>
          <div className="w-1/12 text-center">Rate</div>
          <div className="w-1/12 text-right">Amount</div>
          <div className="w-1/12 text-right">With Cont.</div>
          <div className="w-1/12 text-center">Mode</div>
          <div className="w-1/12 text-center">Conf</div>
          <div className="w-1/12 text-center">%</div>
          <div className="w-1/12 text-center">Source</div>
          <div className="w-1/12 text-center">Actions</div>
        </div>
        <div className="p-2 space-y-1">
          {(Array.isArray(categories) && categories.length === 0) && (
            <div className="text-xs text-gray-300 bg-gray-900 border border-gray-700 rounded p-3 flex items-center gap-3">
              <div>No categories found for this Entity. Seed starter categories or create your own in Admin.</div>
              <button className="px-2 py-1 rounded bg-blue-700 text-white" onClick={async () => {
                try {
                  await fetch('/api/fin/seed', { method: 'POST' })
                  const cats = await fetch(`/api/fin/categories?pe_level=${peLevel}`).then(r => r.json())
                  setCategories(Array.isArray(cats) ? cats : [])
                } catch (e) { console.error('Seed failed', e) }
              }}>Seed</button>
            </div>
          )}
          {(Array.isArray(lines) ? lines : []).map(line => {
            const cat = categories.find(c => c.category_id === line.category_id)
            const uoms = cat?.uoms ?? []
            const derivedAmount = line.amount ?? ((line.qty ?? 0) * (line.rate ?? 0))
            return (
              <>
              <div className="flex items-center text-xs gap-2">
                <div className="w-2/6">
                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    value={line.category_id}
                    onChange={e => {
                      const cid = Number(e.target.value)
                      const nc = categories.find(c => c.category_id === cid)
                      updateLine(line.fact_id, { category_id: cid, uom_code: (nc?.uoms?.[0]?.code ?? line.uom_code) })
                    }}
                  >
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.code} {c.detail ? `· ${c.detail}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/6">
                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    value={line.uom_code}
                    onChange={e => updateLine(line.fact_id, { uom_code: e.target.value })}
                  >
                    {uoms.map(u => (
                      <option key={u.code} value={u.code}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/12">
                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
                    value={line.qty ?? ''}
                    onChange={e => updateLine(line.fact_id, { qty: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="w-1/12">
                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
                    value={line.rate ?? ''}
                    onChange={e => updateLine(line.fact_id, { rate: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="w-1/12 text-right text-white">{derivedAmount ? currency(derivedAmount) : '-'}</div>
                <div className="w-1/12 text-right text-white">{line.amount_with_contingency ? currency(line.amount_with_contingency) : '-'}</div>
                <div className="w-1/12">
                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white"
                    value={line.contingency_mode ?? 'inherit'}
                    onChange={e => updateLine(line.fact_id, { contingency_mode: e.target.value })}
                  >
                    <option value="inherit">inherit</option>
                    <option value="policy">policy</option>
                    <option value="manual">manual</option>
                  </select>
                </div>
                <div className="w-1/12">
                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white"
                    value={line.confidence_code ?? ''}
                    onChange={e => updateLine(line.fact_id, { confidence_code: e.target.value || null })}
                  >
                    <option value="">--</option>
                    {(confidencePolicies ?? []).map(p => (
                      <option key={p.confidence_code} value={p.confidence_code}>{p.confidence_code}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/12">
                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
                    disabled={(line.contingency_mode ?? 'inherit') !== 'manual'}
                    value={line.line_contingency_pct ?? ''}
                    onChange={e => updateLine(line.fact_id, { contingency_pct: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="w-1/12 text-center">
                  <button className={`px-2 py-1 rounded text-white ${getChipClass(sourceBadges[line.fact_id]?.chip_state ?? 1)}`} onClick={() => toggleSourcePanel(line.fact_id)}>
                    {getChipLabel(sourceBadges[line.fact_id])}
                  </button>
                </div>
                <div className="w-1/12 text-center">
                  <button className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white" onClick={() => deleteLine(line.fact_id)}>Delete</button>
                </div>
              </div>
              {openSourceFor === line.fact_id && (
                <div className="w-full bg-gray-900/70 border border-gray-700 rounded p-2 ml-2 mr-2">
                  <div className="text-[11px] text-gray-300 mb-1">Sources & Vendors</div>
                  <div className="flex items-center gap-2 mb-2">
                    <input className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs" placeholder="Vendor name" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
                    <input className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs w-40" placeholder="Role (bidder/contractor)" value={newVendor.role} onChange={e => setNewVendor({ ...newVendor, role: e.target.value })} />
                    <input className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs flex-1" placeholder="Note (optional)" value={newVendor.note} onChange={e => setNewVendor({ ...newVendor, note: e.target.value })} />
                    <button className="px-2 py-1 rounded bg-blue-700 text-white" onClick={() => addVendorToLine(line.fact_id)}>Add</button>
                  </div>
                  <div className="space-y-1">
                    {(lineVendors[line.fact_id] ?? []).map(v => (
                      <div key={v.party_id} className="flex items-center justify-between text-xs text-gray-200 bg-gray-800 rounded px-2 py-1">
                        <div className="flex gap-3">
                          <span className="font-medium">{v.name}</span>
                          {v.role && <span className="text-gray-400">{v.role}</span>}
                          {v.note && <span className="text-gray-400">— {v.note}</span>}
                        </div>
                        <button className="px-2 py-0.5 rounded bg-red-700 text-white" onClick={() => removeVendorFromLine(line.fact_id, v.party_id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            )
          })}
          {(Array.isArray(lines) ? lines : []).length === 0 && (
            <div className="text-xs text-gray-400 px-1 py-2">No lines yet. Click Add Line to get started.</div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400">{saving ? 'Saving…' : ' '}</div>
    </div>
  )
}

export default BudgetContent
