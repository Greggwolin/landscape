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
