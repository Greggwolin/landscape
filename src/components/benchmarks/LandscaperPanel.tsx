/**
 * Landscaper Assistant Panel
 * Shows AI suggestions, insights, and recent activity
 */

import React, { useState } from 'react';
import { AlertCircle, TrendingUp, CheckCircle, Info } from 'lucide-react';
import type { BenchmarkCategory, AISuggestion, LandscaperMode } from '@/types/benchmarks';
import AISuggestionsSection from './AISuggestionsSection';

interface Props {
  selectedCategory: BenchmarkCategory | null;
  aiSuggestions: AISuggestion[];
  mode: LandscaperMode;
  onRefresh: () => void;
}

export default function LandscaperPanel({
  selectedCategory,
  aiSuggestions,
  mode,
  onRefresh
}: Props) {
  // Silent mode - minimal UI
  if (mode === 'silent') {
    return (
      <div className="p-6 text-center text-slate-400">
        <div className="max-w-md mx-auto">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold mb-2 text-slate-300">Silent Mode Active</h3>
          <p className="mb-4">
            Landscaper suggestions are queued for later review
          </p>
          {aiSuggestions.length > 0 && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
            >
              Review {aiSuggestions.length} Queued Suggestion{aiSuggestions.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Context Header */}
      {selectedCategory && (
        <div className="pb-4 border-b border-slate-700">
          <h2 className="text-lg font-bold">{selectedCategory.label}</h2>
          <p className="text-sm text-slate-400">
            {aiSuggestions.length} pending suggestion{aiSuggestions.length !== 1 ? 's' : ''} from recent documents
          </p>
        </div>
      )}

      {/* AI Suggestions Section */}
      {aiSuggestions.length > 0 ? (
        <AISuggestionsSection
          suggestions={aiSuggestions}
          mode={mode}
          onRefresh={onRefresh}
        />
      ) : (
        <div className="p-8 text-center text-slate-400">
          <Info size={48} className="mx-auto mb-3 text-slate-500" />
          <p>No AI suggestions at this time</p>
          <p className="text-sm mt-2">
            Upload documents to extract benchmarks automatically
          </p>
        </div>
      )}

      {/* Insights Section */}
      <InsightsSection />

      {/* Recent Activity Section */}
      <RecentActivitySection />
    </div>
  );
}

// Insights Section
function InsightsSection() {
  // TODO: Replace with actual inflation analysis data
  const insights = [
    { type: 'warning' as const, message: '3 stale benchmarks need review (>24 months old)' },
    { type: 'info' as const, message: 'Grading costs trending +8% over last 6 months' },
    { type: 'info' as const, message: 'Phoenix absorption slowing - consider updating forecasts' },
  ];

  if (insights.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-700">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp size={16} className="text-yellow-400" />
        Insights
      </h3>

      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border text-sm ${
              insight.type === 'warning'
                ? 'bg-yellow-900/20 border-yellow-600 text-yellow-200'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            • {insight.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// Recent Activity Section
function RecentActivitySection() {
  // TODO: Replace with actual activity data from API
  const activities = [
    { time: '2h ago', description: 'Grading updated (clay soil variant added)' },
    { time: '1d ago', description: 'Phoenix absorption data refreshed' },
    { time: '3d ago', description: 'Commission structure changed 6% → 5.5%' },
  ];

  if (activities.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-700">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <CheckCircle size={16} className="text-green-400" />
        Recent Activity
      </h3>

      <div className="space-y-2 text-sm text-slate-300">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-slate-500 min-w-[60px]">{activity.time}</span>
            <span>{activity.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
