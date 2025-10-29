'use client';

import React from 'react';

interface TabBarProps {
  activeTab: 'rent-roll' | 'opex' | 'market-rates' | 'capitalization';
  onTabChange: (tab: 'rent-roll' | 'opex' | 'market-rates' | 'capitalization') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'rent-roll' as const, label: 'Rent Roll & Unit Mix' },
    { id: 'opex' as const, label: 'Operating Expenses' },
    { id: 'market-rates' as const, label: 'Market Rates' },
    { id: 'capitalization' as const, label: 'Capitalization' }
  ];

  return (
    <div className="flex items-center gap-1 border-b border-gray-700 bg-gray-900 px-8">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-6 py-3 text-sm font-medium transition-all relative
            ${activeTab === tab.id
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
            }
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
      ))}
    </div>
  );
}
