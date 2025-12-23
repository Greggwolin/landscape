'use client';

import React from 'react';
import { Building2, Wallet, MapPin, Calculator } from 'lucide-react';
import type { ChannelTab, FieldValue, ReadinessResult } from './types';
import {
  PROPERTY_SIMPLIFIED_FIELDS,
  BUDGET_SIMPLIFIED_FIELDS,
  MARKET_SIMPLIFIED_FIELDS,
  UNDERWRITER_SIMPLIFIED_FIELDS,
} from './types';
import SimplifiedChannelView from './SimplifiedChannelView';
import ModelReadinessDisplay from './ModelReadinessDisplay';

interface NewProjectChannelTabsProps {
  fields: Map<string, FieldValue>;
  activeTab: ChannelTab;
  onTabChange: (tab: ChannelTab) => void;
  readiness: ReadinessResult | null;
  isDark?: boolean;
  onFieldEdit?: (fieldKey: string, value: any) => void;
}

const TABS: Array<{ id: ChannelTab; label: string; icon: typeof Building2 }> = [
  { id: 'property', label: 'Property', icon: Building2 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'market', label: 'Market', icon: MapPin },
  { id: 'underwriter', label: 'Und.', icon: Calculator },
];

const TAB_FIELDS: Record<ChannelTab, string[]> = {
  property: PROPERTY_SIMPLIFIED_FIELDS,
  budget: BUDGET_SIMPLIFIED_FIELDS,
  market: MARKET_SIMPLIFIED_FIELDS,
  underwriter: UNDERWRITER_SIMPLIFIED_FIELDS,
};

export default function NewProjectChannelTabs({
  fields,
  activeTab,
  onTabChange,
  readiness,
  isDark = false,
  onFieldEdit,
}: NewProjectChannelTabsProps) {
  // Count populated fields per tab
  const getTabCount = (tab: ChannelTab): number => {
    const tabFields = TAB_FIELDS[tab];
    return tabFields.filter((key) => fields.has(key)).length;
  };

  // Get fields for current tab
  const currentTabFields = TAB_FIELDS[activeTab];
  const filteredFields = new Map<string, FieldValue>();
  currentTabFields.forEach((key) => {
    const field = fields.get(key);
    if (field) {
      filteredFields.set(key, field);
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = getTabCount(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition relative ${
                isActive
                  ? 'text-blue-600'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : isDark
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <SimplifiedChannelView
          channel={activeTab}
          fields={filteredFields}
          allFieldKeys={currentTabFields}
          isDark={isDark}
          onFieldEdit={onFieldEdit}
        />
      </div>

      {/* Model Readiness Display */}
      {readiness && (
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <ModelReadinessDisplay readiness={readiness} isDark={isDark} />
        </div>
      )}
    </div>
  );
}
