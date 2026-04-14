'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/wrapper/PageShell';

// Dynamic imports to avoid SSR issues with admin panels
const PreferencesPanel = dynamic(() => import('@/components/admin/PreferencesPanel'), { ssr: false });
const BenchmarksPanel = dynamic(() => import('@/components/admin/BenchmarksPanel'), { ssr: false });
const CostLibraryPanel = dynamic(() => import('@/components/admin/CostLibraryPanel'), { ssr: false });
const DMSAdminPanel = dynamic(() => import('@/components/admin/DMSAdminPanel'), { ssr: false });
const ReportConfiguratorPanel = dynamic(() => import('@/components/admin/ReportConfiguratorPanel'), { ssr: false });
const UserManagementPanel = dynamic(() => import('@/components/admin/UserManagementPanel'), { ssr: false });

type AdminTab = 'preferences' | 'benchmarks' | 'cost-library' | 'dms-admin' | 'report-configurator' | 'users';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'preferences', label: 'Preferences' },
  { key: 'benchmarks', label: 'Benchmarks' },
  { key: 'cost-library', label: 'Cost Library' },
  { key: 'dms-admin', label: 'DMS Admin' },
  { key: 'report-configurator', label: 'Report Configurator' },
  { key: 'users', label: 'Users' },
];

export default function WrapperAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('preferences');

  return (
    <PageShell title="Admin">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="w-admin-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`w-admin-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="w-admin-body">
          {activeTab === 'preferences' && <PreferencesPanel />}
          {activeTab === 'benchmarks' && <BenchmarksPanel />}
          {activeTab === 'cost-library' && <CostLibraryPanel />}
          {activeTab === 'dms-admin' && <DMSAdminPanel />}
          {activeTab === 'report-configurator' && <ReportConfiguratorPanel />}
          {activeTab === 'users' && <UserManagementPanel />}
        </div>
      </div>
    </PageShell>
  );
}
