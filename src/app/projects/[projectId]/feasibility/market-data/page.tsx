'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import FeasibilitySubNav from '@/components/feasibility/FeasibilitySubNav';
import MarketDataContent from '@/components/feasibility/MarketDataContent';

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
      <ProjectContextBar projectId={projectId} />
      <FeasibilitySubNav projectId={projectId} />
      <MarketDataContent projectId={projectId} />
    </>
  );
}
