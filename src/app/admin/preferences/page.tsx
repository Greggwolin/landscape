'use client';

/**
 * System Preferences - Admin Page
 * Configure app-level taxonomy, categories, and default settings
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import AdminNavBar from '@/app/components/AdminNavBar';

// Dynamically import TaxonomyPage to avoid SSR issues
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), {
  ssr: false,
});

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
    description: 'Define category taxonomy for all development phases',
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>('land_use_taxonomy');
  const [activeStageTab, setActiveStageTab] = useState<number>(1);

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
                <button
                  onClick={() => toggleCategory(category.key)}
                  className="flex w-full items-center justify-between px-6 py-4 transition-colors"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: isExpanded ? 'var(--cui-tertiary-bg)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
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
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                    {category.key === 'land_use_taxonomy' ? (
                      <div className="px-6 py-4">
                        <TaxonomyPage />
                      </div>
                    ) : category.key === 'unit_cost_categories' ? (
                      <div>
                        {/* Stage Tabs */}
                        <div className="flex border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}>
                          {[
                            { stage: 1, label: 'Stage 1: Entitlements' },
                            { stage: 2, label: 'Stage 2: Engineering' },
                            { stage: 3, label: 'Stage 3: Development' }
                          ].map(({ stage, label }) => (
                            <button
                              key={stage}
                              onClick={() => setActiveStageTab(stage)}
                              className="px-6 py-3 text-sm font-medium transition-colors"
                              style={{
                                color: activeStageTab === stage ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                                borderBottom: activeStageTab === stage ? '2px solid var(--cui-primary)' : '2px solid transparent',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (activeStageTab !== stage) {
                                  e.currentTarget.style.color = 'var(--cui-body-color)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (activeStageTab !== stage) {
                                  e.currentTarget.style.color = 'var(--cui-secondary-color)';
                                }
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Tab Content */}
                        <div className="px-6 py-4 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                          <div className="p-4 rounded border" style={{
                            backgroundColor: 'var(--cui-info-bg)',
                            borderColor: 'var(--cui-info)',
                            color: 'var(--cui-info)'
                          }}>
                            <p className="font-medium mb-2">Category Taxonomy Management - Stage {activeStageTab}</p>
                            <p className="text-xs mb-3">
                              This section manages the category definitions for {
                                activeStageTab === 1 ? 'Entitlements phase (e.g., "Planning Fees," "Legal," etc.)' :
                                activeStageTab === 2 ? 'Engineering phase (e.g., "Civil Engineering," "Surveys," etc.)' :
                                'Development phase (e.g., "Sewer," "Grading," "Landscaping," etc.)'
                              } and their properties (development stage, hard/soft classification, sort order).
                            </p>
                            <p className="text-xs">
                              <strong>Note:</strong> This does NOT manage the actual cost line items with pricing.
                              For benchmark cost data, use the <a href="/admin/benchmarks/cost-library" style={{ color: 'var(--cui-primary)', textDecoration: 'underline' }}>Cost Line Item Library</a>.
                            </p>
                          </div>
                          <div className="mt-4 p-4 rounded border" style={{ borderColor: 'var(--cui-border-color)' }}>
                            <p className="text-xs italic">Category taxonomy editor for Stage {activeStageTab} coming soon...</p>
                          </div>
                        </div>
                      </div>
                    ) : category.key === 'planning_standards' ? (
                      <div className="px-6 py-4 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                        <div className="p-4 rounded border" style={{ borderColor: 'var(--cui-border-color)' }}>
                          <p className="text-xs italic">Planning standards configuration interface coming soon...</p>
                        </div>
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
