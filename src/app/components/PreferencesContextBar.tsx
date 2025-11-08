'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPreferencesTabs } from '@/lib/utils/preferencesTabs';

/**
 * PreferencesContextBar Component
 *
 * Displays "Global Preferences" label and horizontal tab navigation
 * Modeled after ProjectContextBar but with static label instead of project dropdown
 */
export default function PreferencesContextBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'unit-costs';
  const tabs = getPreferencesTabs();

  const handleTabChange = (tabId: string) => {
    router.push(`/preferences?tab=${tabId}`);
  };

  return (
    <div
      className="sticky flex items-center gap-8 px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
        top: '0px',
        zIndex: 40,
      }}
    >
      {/* Static Label - Left */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Global Preferences
        </span>
      </div>

      {/* Tabs - Right */}
      <div className="flex flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="px-5 py-4 text-sm transition-colors relative"
              style={{
                color: isActive ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                fontWeight: isActive ? 600 : 400,
                borderBottom: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
