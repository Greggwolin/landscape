'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import FeasibilitySubNav from '@/components/feasibility/FeasibilitySubNav';
import MarketDataContent from '@/components/feasibility/MarketDataContent';
import { ExportButton } from '@/components/admin';

/**
 * Market Data Page
 *
 * Phase 4: Feasibility/Valuation Tab - Market Data subtab
 *
 * Route: /projects/[projectId]/feasibility/market-data
 *
 * Features:
 * - Comparable Land Sales table
 * - Housing Price Comparables table
 * - Absorption Rate Comparables table
 * - Add/Edit/Delete functionality for each type
 */
export default function MarketDataPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <FeasibilitySubNav projectId={projectId} />
      <div className="app-content">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Feasibility</h5>
          <ExportButton tabName="Feasibility" projectId={projectId.toString()} />
        </div>
        <MarketDataContent projectId={projectId} />
      </div>
    </>
  );
}
