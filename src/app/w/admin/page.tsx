'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

// Legacy admin panels — full CRUD
const PreferencesPanel = dynamic(() => import('@/components/wrapper/admin/PreferencesPanelNew'), { ssr: false });
const BenchmarksPanel = dynamic(() => import('@/components/wrapper/admin/BenchmarksPanelNew'), { ssr: false });
const CostLibraryPanel = dynamic(() => import('@/components/admin/CostLibraryPanel'), { ssr: false });
const DMSAdminPanel = dynamic(() => import('@/components/wrapper/admin/DmsAdminPanelNew'), { ssr: false });
const UserManagementPanel = dynamic(() => import('@/components/wrapper/admin/UsersPanelNew'), { ssr: false });

type AdminTab = 'preferences' | 'benchmarks' | 'costlib' | 'dmsadmin' | 'users';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'preferences', label: 'Preferences' },
  { key: 'benchmarks', label: 'Benchmarks' },
  { key: 'costlib', label: 'Cost Library' },
  { key: 'dmsadmin', label: 'DMS Admin' },
  { key: 'users', label: 'Users' },
];

export default function WrapperAdminPage() {
  const [tab, setTab] = useState<AdminTab>('preferences');

  return (
    <RightContentPanel title="Admin">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="w-admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`w-admin-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-admin-body">
          {tab === 'preferences' && <PreferencesPanel />}
          {tab === 'benchmarks' && <BenchmarksPanel />}
          {tab === 'costlib' && <CostLibraryPanel />}
          {tab === 'dmsadmin' && <DMSAdminPanel />}
          {tab === 'users' && <UserManagementPanel />}
        </div>
      </div>
    </RightContentPanel>
  );
}
