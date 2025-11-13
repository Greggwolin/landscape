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
    <div className="min-h-screen bg-surface-card text-text-primary">
      <AdminNavBar />
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-line-soft bg-surface-card shadow-sm">
          {/* Header */}
          <div className="border-b border-line-soft p-6">
            <div className="flex items-center gap-3">
              <Database size={24} className="text-brand-primary" />
              <h1 className="text-2xl font-bold whitespace-nowrap">Cost Line Item Library</h1>
              <span className="text-xl font-bold leading-none text-text-secondary">·</span>
              <span className="text-sm text-text-secondary">
                Development cost templates and benchmark database
              </span>
            </div>
          </div>

          {/* Main Content - UnitCostsPanel */}
          <UnitCostsPanel />
        </div>
      </div>
    </div>
  );
}
