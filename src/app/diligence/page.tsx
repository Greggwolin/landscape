'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { DiligenceBlocks } from '@/components/diligence';
import { useIngestionData } from '@/hooks/useIngestionData';

// Chadron Terrace Garden Apartments project ID
const CHADRON_PROJECT_ID = 17;

function DiligencePageContent() {
  const searchParams = useSearchParams();
  const rawProjectId = searchParams.get('projectId');
  const projectId = rawProjectId ? parseInt(rawProjectId, 10) : CHADRON_PROJECT_ID;

  const {
    project,
    summary,
    documents,
    milestones,
    isLoading,
    error,
  } = useIngestionData(projectId);

  // Transform ingestion data to DiligenceBlocks format
  const diligenceData = useMemo(() => {
    if (!summary || !project) return null;

    // Find document sources
    const rentRollDoc = documents.find(d =>
      d.doc_type === 'rent_roll' ||
      d.doc_name?.toLowerCase().includes('rent')
    );
    const t12Doc = documents.find(d =>
      d.doc_type === 't12' ||
      d.doc_name?.toLowerCase().includes('t12') ||
      d.doc_name?.toLowerCase().includes('income') ||
      d.doc_name?.toLowerCase().includes('operating')
    );
    const omDoc = documents.find(d =>
      d.doc_type === 'om' ||
      d.doc_name?.toLowerCase().includes('om') ||
      d.doc_name?.toLowerCase().includes('offering') ||
      d.doc_name?.toLowerCase().includes('memo')
    );

    // Check milestone statuses
    const hasRentRoll = milestones.find(m => m.id === 'rent_roll')?.status === 'complete';
    const hasT12 = milestones.find(m => m.id === 't12')?.status === 'complete';
    const hasMarketData = milestones.find(m => m.id === 'market_data')?.status === 'complete';

    // Transform unit mix
    const unitMix = summary.unitMix.map(um => ({
      type: um.type,
      count: um.count,
      avgRent: um.avgRent,
      sqft: undefined, // Not available in current data
    }));

    return {
      projectName: project.name,
      totalUnits: summary.totalUnits || 0,
      avgRent: summary.averageRent || 0,
      occupancy: summary.occupancy || 0,
      belowMarketUnits: undefined, // Would need additional analysis
      noi: summary.noi || undefined,
      grossRevenue: undefined, // Would come from T12
      expenses: undefined, // Would come from T12
      expenseRatio: undefined, // Would come from T12
      capRate: summary.capRate || undefined,
      capRateRange: summary.capRate ? { min: 4.5, max: 5.5 } : undefined, // Market estimate
      compsAvg: undefined,
      unitMix,
      askingPrice: summary.pricePerUnit && summary.totalUnits
        ? summary.pricePerUnit * summary.totalUnits
        : undefined,
      yearBuilt: 1972, // Chadron specific - would come from property details
      buildingSF: 85000, // Chadron specific
      landArea: '2.1 acres', // Chadron specific
      stories: 3, // Chadron specific
      parking: 180, // Chadron specific
      rentRollSource: rentRollDoc?.doc_name,
      t12Source: t12Doc?.doc_name,
      omSource: omDoc?.doc_name,
      // Status flags
      hasRentRoll: !!hasRentRoll,
      hasT12: !!hasT12,
      hasCapRate: !!summary.capRate,
      hasAskingPrice: !!summary.pricePerUnit,
      hasMarketComps: !!hasMarketData,
      hasPropertyDetails: true, // Chadron has details
      // Alert - example
      t12Alert: hasT12 ? undefined : undefined,
    };
  }, [project, summary, documents, milestones]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🌿</div>
          <div>Loading property data...</div>
        </div>
      </div>
    );
  }

  if (error || !diligenceData) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0f172a',
          color: '#ef4444',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p>Error loading property data</p>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DiligenceBlocks
      data={diligenceData}
      onConfirm={(blockId) => {
        console.log('Confirm:', blockId);
      }}
      onEdit={(blockId) => {
        console.log('Edit:', blockId);
      }}
      onAddValue={(blockId, value) => {
        console.log('Add value:', blockId, value);
      }}
      onAnalyze={() => {
        console.log('Analyze project:', projectId);
      }}
    />
  );
}

/**
 * Diligence Blocks Page (Iteration B)
 *
 * Dynamic blocks pattern for multifamily document diligence.
 * Exact visual fidelity to iteration_b_dynamic_blocks.html wireframe.
 *
 * Usage:
 * /diligence?projectId=17
 */
export default function DiligencePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#0f172a',
            color: '#e2e8f0',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>🌿</div>
            <div>Loading...</div>
          </div>
        </div>
      }
    >
      <DiligencePageContent />
    </Suspense>
  );
}
