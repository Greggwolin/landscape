'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import StyleCatalogContent from '@/app/components/StyleCatalog/StyleCatalogContent';

// Heavy sub-managers — lazy loaded to avoid SSR issues + keep the shell fast
const TaxonomyPage = dynamic(() => import('@/app/settings/taxonomy/page'), { ssr: false });
const UnitCostCategoryManager = dynamic(
  () => import('@/app/admin/preferences/components/UnitCostCategoryManager'),
  { ssr: false }
);
const UnitOfMeasureManager = dynamic(
  () => import('@/app/admin/preferences/components/UnitOfMeasureManager'),
  { ssr: false }
);
const SystemPicklistsAccordion = dynamic(
  () => import('@/components/admin/SystemPicklistsAccordion').then((m) => m.SystemPicklistsAccordion),
  { ssr: false }
);

type CategoryKey =
  | 'unit_cost_categories'
  | 'land_use_taxonomy'
  | 'uom_manager'
  | 'system_picklists'
  | 'style_catalog';

interface Category {
  key: CategoryKey;
  label: string;
  description: string;
}

const CATEGORIES: Category[] = [
  {
    key: 'unit_cost_categories',
    label: 'Unit Cost Categories',
    description: 'Manage global cost categories across all lifecycle stages',
  },
  {
    key: 'land_use_taxonomy',
    label: 'Land Use Taxonomy',
    description: 'Configure land use types, families, and product categories',
  },
  {
    key: 'uom_manager',
    label: 'Units of Measure',
    description: 'Configure measurement units used throughout the application',
  },
  {
    key: 'system_picklists',
    label: 'System Picklists',
    description: 'Dropdown values (phase status, ownership, taxonomy, leases)',
  },
  {
    key: 'style_catalog',
    label: 'Canonical Styles',
    description: 'Read-only style catalog for governance and review',
  },
];

function renderCategory(key: CategoryKey) {
  switch (key) {
    case 'unit_cost_categories':
      return <UnitCostCategoryManager />;
    case 'land_use_taxonomy':
      return <TaxonomyPage />;
    case 'uom_manager':
      return <UnitOfMeasureManager />;
    case 'system_picklists':
      return <SystemPicklistsAccordion />;
    case 'style_catalog':
      return <StyleCatalogContent title="Canonical Styles" />;
    default:
      return null;
  }
}

export default function PreferencesPanelNew() {
  const [expanded, setExpanded] = useState<CategoryKey | null>(null);

  return (
    <div className="w-dms-admin">
      <div className="w-dms-admin-head">
        <div>
          <div className="w-admin-section-title" style={{ fontSize: 15 }}>System Preferences</div>
          <div className="w-admin-section-note" style={{ marginBottom: 0 }}>
            Configure app-level taxonomy, categories, and default settings
          </div>
        </div>
      </div>

      <div className="w-pref-accordion">
        {CATEGORIES.map((cat) => {
          const open = expanded === cat.key;
          return (
            <div key={cat.key} className={`w-pref-item${open ? ' is-open' : ''}`}>
              <button
                className="w-pref-item-head"
                onClick={() => setExpanded(open ? null : cat.key)}
                aria-expanded={open}
              >
                <span className="w-pref-item-chevron">{open ? '▾' : '▸'}</span>
                <span className="w-pref-item-label">{cat.label}</span>
                <span className="w-pref-item-desc">— {cat.description}</span>
              </button>
              {open && <div className="w-pref-item-body">{renderCategory(cat.key)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
