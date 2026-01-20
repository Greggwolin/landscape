'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { PhaseTransition } from '@/components/phases';
import { useIngestionData } from '@/hooks/useIngestionData';

// Chadron Terrace Garden Apartments project ID
const CHADRON_PROJECT_ID = 17;

function PhasesPageContent() {
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

  // Transform ingestion data to PhaseTransition format
  const phaseData = useMemo(() => {
    if (!summary || !project) return null;

    // Build checklist from milestones and data
    const hasRentRoll = milestones.find(m => m.id === 'rent_roll')?.status === 'complete';
    const hasT12 = milestones.find(m => m.id === 't12')?.status === 'complete';
    const hasMarketData = milestones.find(m => m.id === 'market_data')?.status === 'complete';

    // Unit mix summary
    const unitMixSummary = summary.unitMix.length > 0
      ? `${summary.unitMix[0]?.type || 'Studio'}-${summary.unitMix[summary.unitMix.length - 1]?.type || '3BR'}`
      : 'No data';

    const checklist = [
      {
        id: 'rent_roll',
        name: 'Rent Roll',
        detail: hasRentRoll
          ? `${summary.totalUnits} units · $${summary.averageRent?.toLocaleString() || 0} avg`
          : 'Not found in documents',
        status: hasRentRoll ? 'complete' as const : 'missing' as const,
      },
      {
        id: 't12',
        name: 'T12 / Operating Statement',
        detail: hasT12 && summary.noi
          ? `${formatCurrency(summary.noi)} NOI · ${summary.noi && summary.totalUnits ? Math.round((summary.noi / (summary.averageRent || 1) / summary.totalUnits / 12) * 100) : 42}% expense`
          : 'Not found in documents',
        status: hasT12 ? 'complete' as const : 'missing' as const,
      },
      {
        id: 'unit_mix',
        name: 'Unit Mix',
        detail: summary.unitMix.length > 0
          ? `${unitMixSummary} · ${summary.unitMix.length} types`
          : 'Not found in documents',
        status: summary.unitMix.length > 0 ? 'complete' as const : 'missing' as const,
      },
      {
        id: 'property_details',
        name: 'Property Details',
        detail: '1972 built · 2.1 acres', // Chadron specific
        status: 'complete' as const,
      },
      {
        id: 'cap_rate',
        name: 'Cap Rate',
        detail: summary.capRate
          ? `${summary.capRate.toFixed(1)}% confirmed`
          : 'Inferred 5.2% - needs confirmation',
        status: summary.capRate ? 'complete' as const : 'pending' as const,
      },
      {
        id: 'expense_review',
        name: 'Expense Review',
        detail: hasT12 ? 'T12 data loaded' : 'Awaiting T12 upload',
        status: hasT12 ? 'complete' as const : 'pending' as const,
      },
      {
        id: 'asking_price',
        name: 'Asking Price',
        detail: summary.pricePerUnit
          ? `$${(summary.pricePerUnit * (summary.totalUnits || 1)).toLocaleString()}`
          : 'Not found in documents',
        status: summary.pricePerUnit ? 'complete' as const : 'missing' as const,
      },
      {
        id: 'market_comps',
        name: 'Market Comps',
        detail: hasMarketData ? 'Comps loaded' : 'Optional - searching...',
        status: hasMarketData ? 'complete' as const : 'missing' as const,
      },
    ];

    // Count flags (pending items)
    const flagsCount = checklist.filter(c => c.status === 'pending').length;

    // Build pro forma rows with Chadron-appropriate values
    const monthlyRent = (summary.averageRent || 2266) * (summary.totalUnits || 113);
    const annualGPR = monthlyRent * 12;
    const occupancyRate = (summary.occupancy || 88) / 100;
    const vacancy = annualGPR * (1 - occupancyRate);
    const lossToLease = annualGPR * 0.04; // 4% estimated
    const otherIncome = annualGPR * 0.09; // 9% of GPR
    const egi = annualGPR - vacancy - lossToLease + otherIncome;
    const expenseRatio = 0.42; // 42%
    const opex = egi * expenseRatio;
    const noi = egi - opex;

    const proForma = [
      {
        label: 'Gross Potential Rent',
        t12: `$${Math.round(annualGPR * 0.96).toLocaleString()}`,
        year1: `$${Math.round(annualGPR).toLocaleString()}`,
        year2: `$${Math.round(annualGPR * 1.04).toLocaleString()}`,
        year3: `$${Math.round(annualGPR * 1.08).toLocaleString()}`,
        assumption: '4% annual growth',
      },
      {
        label: 'Loss to Lease',
        t12: `($${Math.round(lossToLease * 1.5).toLocaleString()})`,
        year1: `($${Math.round(lossToLease).toLocaleString()})`,
        year2: `($${Math.round(lossToLease * 0.5).toLocaleString()})`,
        year3: `($${Math.round(lossToLease * 0.25).toLocaleString()})`,
        assumption: 'Burn down 50%/yr',
        isNegative: true,
      },
      {
        label: 'Vacancy',
        t12: `($${Math.round(vacancy * 1.1).toLocaleString()})`,
        year1: `($${Math.round(vacancy).toLocaleString()})`,
        year2: `($${Math.round(vacancy * 1.04).toLocaleString()})`,
        year3: `($${Math.round(vacancy * 1.08).toLocaleString()})`,
        assumption: `${Math.round((1 - occupancyRate) * 100)}% stabilized`,
        isNegative: true,
      },
      {
        label: 'Other Income',
        t12: `$${Math.round(otherIncome * 0.97).toLocaleString()}`,
        year1: `$${Math.round(otherIncome).toLocaleString()}`,
        year2: `$${Math.round(otherIncome * 1.025).toLocaleString()}`,
        year3: `$${Math.round(otherIncome * 1.05).toLocaleString()}`,
        assumption: '2.5% growth',
      },
      {
        label: 'Effective Gross Income',
        t12: `$${Math.round(egi * 0.94).toLocaleString()}`,
        year1: `$${Math.round(egi).toLocaleString()}`,
        year2: `$${Math.round(egi * 1.05).toLocaleString()}`,
        year3: `$${Math.round(egi * 1.10).toLocaleString()}`,
        assumption: '',
        isTotal: true,
      },
      {
        label: 'Operating Expenses',
        t12: `($${Math.round(opex * 1.05).toLocaleString()})`,
        year1: `($${Math.round(opex).toLocaleString()})`,
        year2: `($${Math.round(opex * 1.03).toLocaleString()})`,
        year3: `($${Math.round(opex * 1.06).toLocaleString()})`,
        assumption: `${Math.round(expenseRatio * 100)}% ratio`,
        isNegative: true,
      },
      {
        label: 'Net Operating Income',
        t12: `$${Math.round(noi * 0.88).toLocaleString()}`,
        year1: `$${Math.round(noi).toLocaleString()}`,
        year2: `$${Math.round(noi * 1.06).toLocaleString()}`,
        year3: `$${Math.round(noi * 1.12).toLocaleString()}`,
        assumption: '',
        isTotal: true,
      },
    ];

    // Calculate purchase price from cap rate
    const capRate = summary.capRate || 5.2;
    const purchasePrice = noi / (capRate / 100);

    return {
      projectName: project.name,
      totalUnits: summary.totalUnits || 0,
      avgRent: summary.averageRent || 0,
      occupancy: summary.occupancy || 0,
      noi: noi,
      expenseRatio: Math.round(expenseRatio * 100),
      capRate: capRate,
      documentsCount: documents.length,
      flagsCount,
      checklist,
      aiMessage: "I've processed your documents. A few things need attention:",
      aiIssue1: hasT12 ? undefined : "Operating Data: No T12 found. Upload one for accurate expense projections.",
      aiIssue2: summary.capRate ? undefined : "Cap Rate: No asking price found, so I'm estimating 5.2% from LA market data. You can override this.",
      proForma,
      purchasePrice,
      cashOnCash: 6.8, // Placeholder
      irr5Year: 14.2, // Placeholder
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

  if (error || !phaseData) {
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
    <PhaseTransition
      data={phaseData}
      onProceedToAnalysis={() => {
        console.log('Proceeding to analysis for project:', projectId);
      }}
      onReviewIssues={() => {
        console.log('Review issues');
      }}
      onUploadDocument={() => {
        console.log('Upload document');
      }}
    />
  );
}

// Helper function
function formatCurrency(val: number) {
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(1)}M`;
  }
  if (val >= 1000) {
    return `$${Math.round(val / 1000)}K`;
  }
  return `$${val.toLocaleString()}`;
}

/**
 * Phase Transition Page (Iteration C)
 *
 * Two-phase pattern: Diligence intake → Analysis view
 * Exact visual fidelity to iteration_c_phase_transition.html wireframe.
 *
 * Usage:
 * /phases?projectId=17
 */
export default function PhasesPage() {
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
      <PhasesPageContent />
    </Suspense>
  );
}
