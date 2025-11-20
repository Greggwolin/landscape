'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LandscapeButton } from '@/components/ui/landscape';

// Dynamically import components to avoid SSR issues
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), {
  ssr: false,
});

const UnitCostCategoryManager = dynamic(
  () => import('@/app/admin/preferences/components/UnitCostCategoryManager'),
  { ssr: false }
);

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
    key: 'land_use_taxonomy',
    label: 'Land Use Taxonomy Manager',
    description: 'Configure land use types, families, and product categories',
    icon: 'Map'
  }
];

export default function PreferencesPanel() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('unit_cost_categories');

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  return (
    <div className="space-y-4">
      <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border">
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div className="d-flex align-items-center gap-3">
            <Settings size={20} style={{ color: 'var(--cui-primary)' }} />
            <h2 className="h5 mb-0" style={{ color: 'var(--cui-body-color)' }}>System Preferences</h2>
          </div>
          <p className="text-sm mb-0 mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            Configure app-level taxonomy, categories, and default settings
          </p>
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
                  className="d-flex w-100 align-items-center justify-content-between px-4 py-3"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: isExpanded ? 'var(--cui-tertiary-bg)' : 'transparent',
                    cursor: 'pointer',
                    borderRadius: 0
                  }}
                >
                  <div className="d-flex align-items-center gap-3 flex-grow-1">
                    <div className="d-flex flex-column align-items-start">
                      <span className="fw-semibold">{category.label}</span>
                      <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                        {category.description}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={20} style={{ color: 'var(--cui-body-color)' }} />
                  ) : (
                    <ChevronRight size={20} style={{ color: 'var(--cui-body-color)' }} />
                  )}
                </LandscapeButton>

                {isExpanded && (
                  <div className="p-4" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                    {category.key === 'unit_cost_categories' && <UnitCostCategoryManager />}
                    {category.key === 'land_use_taxonomy' && <TaxonomyPage />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
