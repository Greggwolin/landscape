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

import React from 'react';
import { Database } from 'lucide-react';
import UnitCostsPanel from '@/components/benchmarks/unit-costs/UnitCostsPanel';
import AdminNavBar from '@/app/components/AdminNavBar';

export default function CostLibraryPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <AdminNavBar />
      <div className="p-4 space-y-4">
        <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border">
          {/* Header */}
          <div className="p-6" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center gap-3">
              <Database size={24} style={{ color: 'var(--cui-primary)', flexShrink: 0 }} />
              <h1 className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--cui-body-color)' }}>Cost Line Item Library</h1>
              <span style={{ color: 'var(--cui-body-color)', fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>·</span>
              <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Development cost templates and benchmark database
              </span>
            </div>
          </div>

          {/* Main Content - UnitCostsPanel */}
          <div>
            <UnitCostsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
