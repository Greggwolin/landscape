'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CNav, CNavItem, CNavLink, CCard, CCardBody } from '@coreui/react';

/**
 * Studio Capitalization Page
 *
 * Has sub-tabs: Debt, Equity, Developer Operations
 * Matches existing /projects/[id]/capitalization/[tab] structure
 */
export default function StudioCapitalizationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);

  const activeTab = searchParams.get('tab') || 'debt';

  const handleTabChange = (tab: string) => {
    router.push(`/projects/${projectId}/studio/capitalization?tab=${tab}`);
  };

  return (
    <div className="p-6">
      {/* Sub-tabs */}
      <CNav variant="tabs" className="mb-4">
        <CNavItem>
          <CNavLink
            active={activeTab === 'debt'}
            onClick={() => handleTabChange('debt')}
            style={{
              cursor: 'pointer',
              color: activeTab === 'debt'
                ? 'var(--studio-primary)'
                : 'var(--studio-text-secondary)',
            }}
          >
            Debt
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'equity'}
            onClick={() => handleTabChange('equity')}
            style={{
              cursor: 'pointer',
              color: activeTab === 'equity'
                ? 'var(--studio-primary)'
                : 'var(--studio-text-secondary)',
            }}
          >
            Equity
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'operations'}
            onClick={() => handleTabChange('operations')}
            style={{
              cursor: 'pointer',
              color: activeTab === 'operations'
                ? 'var(--studio-primary)'
                : 'var(--studio-text-secondary)',
            }}
          >
            Developer Operations
          </CNavLink>
        </CNavItem>
      </CNav>

      {/* Tab Content */}
      <CCard
        style={{
          backgroundColor: 'var(--studio-surface-card)',
          borderColor: 'var(--studio-border-soft)',
        }}
      >
        <CCardBody>
          {activeTab === 'debt' && (
            <div>
              <h3 style={{ color: 'var(--studio-text-primary)' }}>Debt Structure</h3>
              <p style={{ color: 'var(--studio-text-muted)', marginTop: '8px' }}>
                Placeholder — will integrate existing Debt component
              </p>
            </div>
          )}
          {activeTab === 'equity' && (
            <div>
              <h3 style={{ color: 'var(--studio-text-primary)' }}>Equity Waterfall</h3>
              <p style={{ color: 'var(--studio-text-muted)', marginTop: '8px' }}>
                Placeholder — will integrate existing Equity component
              </p>
            </div>
          )}
          {activeTab === 'operations' && (
            <div>
              <h3 style={{ color: 'var(--studio-text-primary)' }}>Developer Operations</h3>
              <p style={{ color: 'var(--studio-text-muted)', marginTop: '8px' }}>
                Placeholder — will integrate existing Operations component
              </p>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  );
}
