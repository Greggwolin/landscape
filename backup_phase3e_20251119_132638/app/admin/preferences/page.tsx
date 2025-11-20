'use client';

/**
 * System Preferences - Admin Page
 * Configure app-level taxonomy, categories, and default settings
 */

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import AdminNavBar from '@/app/components/AdminNavBar';
import { LandscapeButton } from '@/components/ui/landscape';

// Dynamically import TaxonomyPage to avoid SSR issues
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), {
  ssr: false,
});

// Dynamically import UnitCostCategoryManager to avoid SSR issues
const UnitCostCategoryManager = dynamic(
  () => import('./components/UnitCostCategoryManager'),
  { ssr: false }
);

// Preference categories
interface PreferenceCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
}

const PREFERENCE_CATEGORIES: PreferenceCategory[] = [
  {
    key: 'unit_cost_categories',
    label: 'Unit Cost Categories',
    description: 'Manage global cost categories across all lifecycle stages',
    icon: 'FolderTree'
  },
  {
    key: 'planning_standards',
    label: 'Planning Standards',
    description: 'Define default planning assumptions and standards',
    icon: 'Layout'
  },
  {
    key: 'land_use_taxonomy',
    label: 'Land Use Taxonomy Manager',
    description: 'Configure land use types, families, and product categories',
    icon: 'Map'
  }
];

export default function SystemPreferencesPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('unit_cost_categories');

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <AdminNavBar />
      <div className="p-4 space-y-4">
        <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border">
          {/* Header */}
          <div className="p-6" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center gap-3">
              <Settings size={24} style={{ color: 'var(--cui-primary)', flexShrink: 0 }} />
              <h1 className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--cui-body-color)' }}>System Preferences</h1>
              <span style={{ color: 'var(--cui-body-color)', fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>·</span>
              <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Configure app-level taxonomy, categories, and default settings
              </span>
            </div>
          </div>

          {/* Preference Categories Accordion */}
          <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
          {PREFERENCE_CATEGORIES.map(category => {
            const isExpanded = expandedCategory === category.key;

            return (
              <div key={category.key}>
                <LandscapeButton
                  onClick={() => toggleCategory(category.key)}
                  variant="ghost"
                  color="secondary"
                  className="flex w-full items-center justify-between px-6 py-4 transition-colors"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: isExpanded ? 'var(--surface-card-header)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-card-header)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center" style={{ flexShrink: 0 }}>
                      {isExpanded ? (
                        <ChevronDown size={20} style={{ color: 'var(--cui-secondary-color)' }} />
                      ) : (
                        <ChevronRight size={20} style={{ color: 'var(--cui-secondary-color)' }} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-medium whitespace-nowrap">{category.label}</span>
                      <span style={{ color: 'var(--cui-body-color)', fontSize: '1rem', fontWeight: 'bold', lineHeight: 1 }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                        {category.description}
                      </span>
                    </div>
                  </div>
                </LandscapeButton>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                    {category.key === 'land_use_taxonomy' ? (
                      <div className="px-6 py-4">
                        <TaxonomyPage />
                      </div>
                    ) : category.key === 'unit_cost_categories' ? (
                      <div style={{ minHeight: '600px' }}>
                        <UnitCostCategoryManager />
                      </div>
                    ) : category.key === 'planning_standards' ? (
                      <div className="px-6 py-4">
                        <PlanningStandardsPanel />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

type PlanningStandard = {
  standard_id: number
  default_planning_efficiency: number | null
  default_street_row_pct?: number | null
  default_park_dedication_pct?: number | null
  updated_at?: string
}

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function PlanningStandardsPanel() {
  const [standard, setStandard] = useState<PlanningStandard | null>(null)
  const [efficiencyInput, setEfficiencyInput] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadStandard = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)
      const response = await fetch('/api/planning-standards')
      if (!response.ok) {
        throw new Error('Unable to fetch planning standards')
      }
      const payload = await response.json()
      const current = payload?.standard ?? null
      setStandard(current)
      setEfficiencyInput(
        current?.default_planning_efficiency != null
          ? (current.default_planning_efficiency * 100).toFixed(1)
          : ''
      )
    } catch (error) {
      console.error('Failed to load planning standards', error)
      setStatusMessage({
        type: 'error',
        text: 'Failed to load planning standards.'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStandard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const percentValue = Number(efficiencyInput)
    if (!Number.isFinite(percentValue) || percentValue <= 0 || percentValue > 150) {
      setStatusMessage({
        type: 'error',
        text: 'Enter a valid efficiency between 0% and 150%.'
      })
      return
    }
    const value = percentValue / 100

    try {
      setSaving(true)
      setStatusMessage(null)
      const response = await fetch('/api/planning-standards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_planning_efficiency: value })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to update planning standards')
      }

      const payload = await response.json()
      const updated = payload?.standard ?? null
      setStandard(updated)
      setEfficiencyInput(
        updated?.default_planning_efficiency != null
          ? (updated.default_planning_efficiency * 100).toFixed(1)
          : ''
      )
      setStatusMessage({
        type: 'success',
        text: 'Planning efficiency updated.'
      })
    } catch (error) {
      console.error('Failed to update planning standards', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update planning standards.'
      })
    } finally {
      setSaving(false)
    }
  }

  const tileStyle: React.CSSProperties = {
    border: '1px solid var(--cui-border-color)',
    borderRadius: '16px',
    backgroundColor: 'var(--surface-card)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08)'
  }

  if (loading) {
    return (
      <div className="p-4 rounded border text-sm" style={{ borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}>
        Loading planning standards…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div
          className="px-3 py-2 rounded text-sm"
          style={{
            backgroundColor: statusMessage.type === 'success' ? 'var(--cui-success-bg)' : 'var(--cui-danger-bg)',
            border: `1px solid ${statusMessage.type === 'success' ? 'var(--cui-success)' : 'var(--cui-danger)'}`,
            color: statusMessage.type === 'success' ? 'var(--cui-success)' : 'var(--cui-danger)'
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="p-4 space-y-3" style={tileStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
            Planning Efficiency
          </h3>
          <p className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
            Global density multiplier used when calculating lot-product densities across projects.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={efficiencyInput}
                min={0}
                max={150}
                step={1}
                onChange={(event) => setEfficiencyInput(event.target.value)}
                className="h-9 w-20 rounded border px-2 text-sm text-center"
                style={{ borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)', backgroundColor: 'var(--cui-body-bg)' }}
                placeholder="75"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>%</span>
            </div>
            <LandscapeButton
              color="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </LandscapeButton>
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            Last updated:{' '}
            {standard?.updated_at
              ? new Date(standard.updated_at).toLocaleDateString()
              : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            Current value: {formatPercent(standard?.default_planning_efficiency ?? null)}
          </div>
        </section>

        <section className="p-4 space-y-3" style={tileStyle}>
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
            Guidance
          </h3>
          <p className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
            Planning efficiency scales density calculations for land use products. For example,
            a 6,000 SF lot with an efficiency of 0.75 results in roughly 5.4 units/acre.
          </p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--cui-secondary-color)' }}>
            <li>• Keep efficiency between 0 and 1.5</li>
            <li>• Applies by default to all projects unless overridden per product</li>
            <li>• Impacts density-per-acre fields in the Land Use taxonomy</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
