'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TabNavigationProps {
  activeTab: string;
  projectId: number;
  propertyType?: string;
}

interface Tab {
  id: string;
  label: string;
}

const INCOME_PROPERTY_TYPES = ['MULTIFAMILY', 'OFFICE', 'RETAIL', 'INDUSTRIAL'];

const getTabsForPropertyType = (propertyType?: string): Tab[] => {
  const normalizedType = propertyType?.toUpperCase() ?? '';
  const isLandDev =
    normalizedType === 'MPC' ||
    normalizedType === 'LAND DEVELOPMENT' ||
    normalizedType.includes('LAND DEVELOPMENT');

  if (isLandDev) {
    // Land Development (MPC & Subdivision): 8 tabs
    return [
      { id: 'project', label: 'Project' },
      { id: 'planning', label: 'Planning' },
      { id: 'budget', label: 'Budget' },
      { id: 'sales', label: 'Sales & Absorption' },
      { id: 'feasibility', label: 'Feasibility' },
      { id: 'capitalization', label: 'Capitalization' },
      { id: 'reports', label: 'Reports' },
      { id: 'documents', label: 'Documents' }
    ];
  } else {
    // Income Properties (Multifamily, Office, Retail, etc.): 7 tabs
    return [
      { id: 'project', label: 'Project' },
      { id: 'property', label: 'Property' },
      { id: 'operations', label: 'Operations' },
      { id: 'valuation', label: 'Valuation' },
      { id: 'capitalization', label: 'Capitalization' },
      { id: 'reports', label: 'Reports' },
      { id: 'documents', label: 'Documents' }
    ];
  }
};

export default function TabNavigation({
  activeTab,
  projectId,
  propertyType = '',
}: TabNavigationProps) {
  const router = useRouter();
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const normalizedType = propertyType?.toUpperCase() ?? '';
  const normalizedTypeCompact = normalizedType.replace(/[^A-Z]/g, '');
  const tabs = useMemo(() => getTabsForPropertyType(propertyType), [propertyType]);
  const isIncomeProperty = INCOME_PROPERTY_TYPES.some(
    (type) => normalizedType.includes(type) || normalizedTypeCompact.includes(type)
  );

  const handleAnalysisClick = useCallback(async () => {
    if (analysisLoading) return;
    if (!projectId) {
      alert('Select a project to open financial analysis.');
      return;
    }

    setAnalysisLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/property`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (response.ok && data?.property_id) {
        router.push(`/properties/${data.property_id}/analysis`);
      } else {
        const message =
          data?.error ||
          'This project is not linked to a property record. Please complete property setup first.';
        alert(message);
      }
    } catch (error) {
      console.error('Failed to open financial analysis interface:', error);
      alert('Failed to load analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [analysisLoading, projectId, router]);

  return (
    <div
      className="border-b px-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/projects/${projectId}?tab=${tab.id}`}
              className="px-4 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: isActive ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                borderBottom: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent',
                textDecoration: 'none'
              }}
            >
              {tab.label}
            </Link>
          );
        })}
        {isIncomeProperty && (
          <button
            type="button"
            onClick={handleAnalysisClick}
            disabled={analysisLoading || !projectId}
            className="px-4 py-3 text-sm font-medium transition-colors relative"
            style={{
              color: 'var(--cui-secondary-color)',
              borderBottom: '2px solid transparent',
              textDecoration: 'none',
              opacity: analysisLoading || !projectId ? 0.65 : 1,
              cursor: analysisLoading || !projectId ? 'not-allowed' : 'pointer',
            }}
          >
            {analysisLoading ? 'Opening...' : 'Analysis'}
          </button>
        )}
      </div>
    </div>
  );
}
