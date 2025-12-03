'use client';

/**
 * Cost Line Item Library - Benchmarks Page
 * Development cost templates and benchmarks database
 *
 * This page displays the comprehensive cost line item library with:
 * - Stage-based cost categories (Entitlements, Engineering, Development)
 * - Cost type tabs (Hard, Soft, Deposits, Other)
 * - Inline editing and full CRUD operations
 * - Category filtering and search
 */

import React, { useState } from 'react';
import { Database } from 'lucide-react';
import UnitCostsPanel, { DEFAULT_PROJECT_TYPE } from '@/components/benchmarks/unit-costs/UnitCostsPanel';

const PROJECT_TYPE_OPTIONS = ['LAND'];

export default function CostLibraryPage() {
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>(DEFAULT_PROJECT_TYPE);

  return (
    <div className="min-h-screen bg-surface-card text-text-primary">
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-line-soft bg-surface-card shadow-sm">
          {/* Header */}
          <div className="border-b border-line-soft p-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <Database size={24} className="text-brand-primary" />
                  <h1 className="text-2xl font-bold whitespace-nowrap">Unit Cost Library</h1>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs uppercase tracking-wide text-text-secondary">Project Type</label>
                  <select
                    value={projectTypeFilter}
                    onChange={(event) => setProjectTypeFilter(event.target.value)}
                    className="rounded border border-line-soft bg-surface-bg px-3 py-1.5 text-sm text-text-primary shadow-sm focus:border-brand-primary focus:outline-none"
                  >
                    {PROJECT_TYPE_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                Development cost templates and benchmark database
              </p>
            </div>
          </div>

          {/* Main Content - UnitCostsPanel */}
          <UnitCostsPanel projectTypeFilter={projectTypeFilter} />
        </div>
      </div>
    </div>
  );
}
