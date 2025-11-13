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
      <div className="p-6 text-center text-text-secondary">
        <div className="max-w-md mx-auto">
          <AlertCircle size={48} className="mx-auto mb-4 text-text-secondary" />
          <h3 className="text-lg font-semibold mb-2 text-text-secondary">Silent Mode Active</h3>
          <p className="mb-4">
            Landscaper suggestions are queued for later review
          </p>
          {aiSuggestions.length > 0 && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-brand-primary text-text-inverse hover:bg-brand-primary/90 rounded font-medium"
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
        <div className="pb-4 border-b border-line-strong">
          <h2 className="text-lg font-bold">{selectedCategory.label}</h2>
          <p className="text-sm text-text-secondary">
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
        <div className="p-8 text-center text-text-secondary">
          <Info size={48} className="mx-auto mb-3 text-text-secondary" />
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
    <div className="space-y-4 pt-4 border-t border-line-strong">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp size={16} className="text-chip-warning" />
        Insights
      </h3>

      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border text-sm ${
              insight.type === 'warning'
                ? 'bg-chip-warning/15 border-chip-warning text-chip-warning'
                : 'bg-surface-card border-line-strong text-text-secondary'
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
    <div className="space-y-4 pt-4 border-t border-line-strong">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <CheckCircle size={16} className="text-chip-success" />
        Recent Activity
      </h3>

      <div className="space-y-2 text-sm text-text-secondary">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-text-secondary min-w-[60px]">{activity.time}</span>
            <span>{activity.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
