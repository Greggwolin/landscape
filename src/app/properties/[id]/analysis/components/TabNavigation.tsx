'use client';

// ============================================================================
// TAB NAVIGATION COMPONENT
// ============================================================================
// Purpose: Horizontal tab switcher with progress indicators
// ============================================================================

import { Tab, TabId, CalculationStatus } from '../types/analysis.types';

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  calculationStatus: CalculationStatus;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  calculationStatus,
}: TabNavigationProps) {
  const getTabStyle = (tab: Tab) => {
    const baseStyle =
      'relative px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer';

    if (tab.id === activeTab) {
      return `${baseStyle} border-blue-600 text-blue-600 bg-blue-900`;
    }

    if (tab.isLocked) {
      return `${baseStyle} border-transparent text-gray-400 cursor-not-allowed`;
    }

    return `${baseStyle} border-transparent text-gray-400 hover:text-white hover:border-gray-700`;
  };

  const getTabIcon = (tab: Tab) => {
    if (tab.hasErrors) {
      return '❌';
    }
    if (tab.isComplete) {
      return '✓';
    }
    if (!tab.isComplete && tab.type === 'input') {
      return '○';
    }
    if (tab.isLocked) {
      return '🔒';
    }
    return '';
  };

  const inputTabs = tabs.filter((t) => t.type === 'input');
  const computedTabs = tabs.filter((t) => t.type === 'computed');
  const completedInputs = inputTabs.filter((t) => t.isComplete).length;
  const completedComputed = computedTabs.filter((t) => t.isComplete).length;

  return (
    <div>
      {/* Progress Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-800 border-b border-gray-800">
        <div className="flex items-center gap-6 text-sm">
          {/* Input Progress */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Input Tabs:</span>
            <span className="font-medium">
              {completedInputs} / {inputTabs.length}
            </span>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{
                  width: `${(completedInputs / inputTabs.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Computed Progress */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Computed Tabs:</span>
            <span className="font-medium">
              {completedComputed} / {computedTabs.length}
            </span>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{
                  width: `${(completedComputed / computedTabs.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Calculation Status */}
        <div className="flex items-center gap-3">
          {calculationStatus.is_calculating && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span>Calculating...</span>
            </div>
          )}

          {calculationStatus.last_calculated && !calculationStatus.is_calculating && (
            <div className="text-sm text-gray-400">
              Last calculated:{' '}
              {new Date(calculationStatus.last_calculated).toLocaleTimeString()}
            </div>
          )}

          {calculationStatus.error_message && (
            <div className="text-sm text-red-100">
              ❌ {calculationStatus.error_message}
            </div>
          )}
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {tabs.map((tab, index) => (
          <div key={tab.id} className="flex items-center">
            {/* Separator between input and computed tabs */}
            {index === inputTabs.length && (
              <div className="h-10 w-px bg-gray-300 mx-2" />
            )}

            <button
              onClick={() => onTabChange(tab.id)}
              disabled={tab.isLocked}
              className={getTabStyle(tab)}
              title={tab.isLocked ? 'Complete input tabs and calculate first' : tab.description}
            >
              <div className="flex items-center gap-2">
                {/* Icon */}
                <span className="text-base">{getTabIcon(tab)}</span>

                {/* Label */}
                <span>{tab.label}</span>

                {/* Type Badge */}
                {tab.type === 'computed' && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-green-800 text-white">
                    Computed
                  </span>
                )}
              </div>

              {/* Active Indicator */}
              {tab.id === activeTab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}

              {/* Completion Indicator Dot */}
              {tab.isComplete && tab.id !== activeTab && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
              )}

              {/* Error Indicator Dot */}
              {tab.hasErrors && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Tab Description Bar */}
      <div className="px-6 py-2 bg-gray-800 text-sm text-gray-400">
        {tabs.find((t) => t.id === activeTab)?.description}
      </div>
    </div>
  );
}
