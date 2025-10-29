'use client';

import React from 'react';
import Link from 'next/link';

interface TabNavigationProps {
  activeTab: string;
  projectId: number;
  propertyType?: string;
}

interface Tab {
  id: string;
  label: string;
}

const getTabsForPropertyType = (propertyType: string): Tab[] => {
  const normalizedType = propertyType?.toUpperCase() || '';
  const isLandDev = normalizedType === 'MPC' || normalizedType === 'LAND DEVELOPMENT' ||
                    propertyType?.includes('Land Development');

  if (isLandDev) {
    // Land Development (MPC & Subdivision): 7 tabs
    return [
      { id: 'project', label: 'Project' },
      { id: 'planning', label: 'Planning' },
      { id: 'budget', label: 'Budget' },
      { id: 'sales', label: 'Sales & Absorption' },
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

export default function TabNavigation({ activeTab, projectId, propertyType = '' }: TabNavigationProps) {
  const tabs = getTabsForPropertyType(propertyType);
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
      </div>
    </div>
  );
}
