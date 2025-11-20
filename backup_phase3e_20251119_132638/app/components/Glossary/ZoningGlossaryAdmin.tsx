"use client";
import React, { useEffect, useMemo, useState } from 'react'

type Row = {
  family_name?: string | null
  jurisdiction_city: string
  jurisdiction_county?: string | null
  jurisdiction_state: string
  jurisdiction_display: string
  local_code_raw: string
  local_code_canonical: string
  code_token_kind: 'published' | 'placeholder' | 'numeric' | 'mixed'
  code_token_confidence: number
  mapped_use: string
  allowance: 'P' | 'C' | 'X'
  purpose_text: string
  intent_text: string
  is_active?: boolean
}

const KIND_OPTIONS: Row['code_token_kind'][] = ['published','placeholder','numeric','mixed']
const ALLOWANCE_OPTIONS: Row['allowance'][] = ['P','C','X']
const FAMILY_OPTIONS = ['Residential','Commercial','Industrial','Institutional','Public','Mixed Use','Common Area']

export default function ZoningGlossaryAdmin() {
  const [jurisdiction, setJurisdiction] = useState({
    city: 'Peoria', county: 'Maricopa', state: 'AZ', display: 'Peoria, AZ'
  })
  const [rows, setRows] = useState<Row[]>([])
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [form, setForm] = useState<Row>({
    family_name: 'Residential',
    jurisdiction_city: jurisdiction.city,
    jurisdiction_county: jurisdiction.county,
    jurisdiction_state: jurisdiction.state,
    jurisdiction_display: jurisdiction.display,
    local_code_raw: '',
    local_code_canonical: '',
    code_token_kind: 'placeholder',
    code_token_confidence: 1,
    mapped_use: '',
    allowance: 'P',
    purpose_text: 'Lorem ipsum...',
    intent_text: 'Lorem ipsum...'
  })

  useEffect(() => {
    // Sync form jurisdiction when selector changes
    setForm(f => ({ ...f,
      jurisdiction_city: jurisdiction.city,
      jurisdiction_county: jurisdiction.county,
      jurisdiction_state: jurisdiction.state,
      jurisdiction_display: jurisdiction.display,
    }))
  }, [jurisdiction])

  const load = async () => {
    setLoading(true)
    try {
      const [rowsRes, countRes] = await Promise.all([
        fetch(`/api/glossary/zoning?jurisdiction_display=${encodeURIComponent(jurisdiction.display)}`),
        fetch(`/api/glossary/zoning?metrics=count&jurisdiction_display=${encodeURIComponent(jurisdiction.display)}`),
      ])
      const data = await rowsRes.json()
      const counts = await countRes.json()
      setRows(Array.isArray(data) ? data : [])
      setCount(counts?.rows?.[0]?.count ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/glossary/zoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mapped_use: form.mapped_use.toUpperCase() })
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
      // Reset only code fields
      setForm(f => ({ ...f, local_code_raw: '', local_code_canonical: '', mapped_use: '' }))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (jurisdiction_display: string, code: string) => {
    if (!confirm(`Delete ${jurisdiction_display} / ${code}?`)) return
    await fetch(`/api/glossary/zoning?jurisdiction_display=${encodeURIComponent(jurisdiction_display)}&code=${encodeURIComponent(code)}`, { method: 'DELETE' })
    await load()
  }

  const JurisdictionSelector = useMemo(() => (
    <div className="grid grid-cols-4 gap-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">City</label>
        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
          value={jurisdiction.city}
          onChange={e => setJurisdiction(j => ({ ...j, city: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">County</label>
        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
          value={jurisdiction.county}
          onChange={e => setJurisdiction(j => ({ ...j, county: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">State</label>
        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
          value={jurisdiction.state}
          onChange={e => setJurisdiction(j => ({ ...j, state: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Display</label>
        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
          value={jurisdiction.display}
          onChange={e => setJurisdiction(j => ({ ...j, display: e.target.value }))} />
      </div>
    </div>
  ), [jurisdiction])

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-sm">Zoning Glossary</div>
            <div className="text-white text-lg font-medium">land_v2.glossary_zoning</div>
          </div>
          <div className="text-gray-300 text-sm">Rows: {loading ? '…' : count}</div>
        </div>
        <div className="mt-3">{JurisdictionSelector}</div>
      </div>

      <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Family</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.family_name ?? ''}
              onChange={e => setForm(f => ({ ...f, family_name: e.target.value }))}
            >
              {FAMILY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Local Code (raw)</label>
            <input required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.local_code_raw}
              onChange={e => setForm(f => ({ ...f, local_code_raw: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Local Code (canonical)</label>
            <input required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.local_code_canonical}
              onChange={e => setForm(f => ({ ...f, local_code_canonical: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mapped Use (≤8 chars)</label>
            <input required maxLength={8} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.mapped_use}
              onChange={e => setForm(f => ({ ...f, mapped_use: e.target.value.toUpperCase() }))} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Token Kind</label>
            <select required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.code_token_kind}
              onChange={e => setForm(f => ({ ...f, code_token_kind: e.target.value as Row['code_token_kind'] }))}
            >
              {KIND_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Token Confidence</label>
            <input required type="number" step="0.01" className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.code_token_confidence}
              onChange={e => setForm(f => ({ ...f, code_token_confidence: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Allowance</label>
            <select required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.allowance}
              onChange={e => setForm(f => ({ ...f, allowance: e.target.value as Row['allowance'] }))}
            >
              {ALLOWANCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-center mt-5">
            <label className="inline-flex items-center text-sm text-gray-300">
              <input type="checkbox" className="mr-2" checked={form.is_active ?? true}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Purpose</label>
            <textarea required rows={3} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.purpose_text}
              onChange={e => setForm(f => ({ ...f, purpose_text: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Intent</label>
            <textarea required rows={3} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
              value={form.intent_text}
              onChange={e => setForm(f => ({ ...f, intent_text: e.target.value }))} />
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded">
            {saving ? 'Saving…' : 'Save / Upsert'}
          </button>
          <button type="button" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded"
            onClick={() => load()}>Refresh</button>
        </div>
      </form>

      <div className="bg-gray-800 border border-gray-700 rounded p-4">
        <div className="text-gray-300 text-sm mb-2">Existing Codes — {jurisdiction.display}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Canonical</th>
                <th className="text-left p-2">Kind</th>
                <th className="text-left p-2">Conf</th>
                <th className="text-left p-2">Mapped</th>
                <th className="text-left p-2">Allow</th>
                <th className="text-left p-2">Active</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {rows.map(r => (
                <tr key={`${r.jurisdiction_display}-${r.local_code_raw}`} className="border-t border-gray-700">
                  <td className="p-2">{r.local_code_raw}</td>
                  <td className="p-2">{r.local_code_canonical}</td>
                  <td className="p-2">{r.code_token_kind}</td>
                  <td className="p-2">{String(r.code_token_confidence)}</td>
                  <td className="p-2">{r.mapped_use}</td>
                  <td className="p-2">{r.allowance}</td>
                  <td className="p-2">{r.is_active ? 'Y' : 'N'}</td>
                  <td className="p-2 text-right">
                    <button className="text-red-400 hover:text-red-300" onClick={() => remove(r.jurisdiction_display, r.local_code_raw)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-400" colSpan={8}>No rows found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

