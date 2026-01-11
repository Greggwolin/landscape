'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ReadinessResult } from './types';

interface ModelReadinessDisplayProps {
  readiness: ReadinessResult;
  isDark?: boolean;
}

function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-amber-600 bg-amber-100';
    case 'low':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-red-600 bg-red-100';
  }
}

function getProgressColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-amber-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function ModelReadinessDisplay({
  readiness,
  isDark = false,
}: ModelReadinessDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidenceColors = getConfidenceColor(readiness.confidence_level);
  const progressColor = getProgressColor(readiness.readiness_score);

  return (
    <div className={`p-3 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
      {/* Compact view */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Score */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {Math.round(readiness.readiness_score)}%
            </span>
            <div className={`w-20 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(readiness.readiness_score, 100)}%` }}
              />
            </div>
          </div>

          {/* Confidence badge */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${confidenceColors}`}>
            {readiness.confidence_level}
          </span>

          {/* Can run indicator */}
          {readiness.can_run_model ? (
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}
        </div>

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronUp className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className={`mt-3 pt-3 border-t space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {/* Stats row */}
          <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>
              <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                {readiness.populated_count}
              </strong>{' '}
              of {readiness.total_input_fields} fields
            </span>
            {!readiness.can_run_model && (
              <span className="text-amber-600">
                Model requires all critical fields
              </span>
            )}
          </div>

          {/* Missing critical fields */}
          {readiness.missing_critical.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Missing Critical ({readiness.missing_critical.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {readiness.missing_critical.slice(0, 5).map((field) => (
                  <span
                    key={field.field_key}
                    className={`text-xs px-2 py-0.5 rounded ${
                      isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {field.label}
                  </span>
                ))}
                {readiness.missing_critical.length > 5 && (
                  <span className={`text-xs px-2 py-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    +{readiness.missing_critical.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Missing important fields */}
          {readiness.missing_important.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Missing Important ({readiness.missing_important.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {readiness.missing_important.slice(0, 5).map((field) => (
                  <span
                    key={field.field_key}
                    className={`text-xs px-2 py-0.5 rounded ${
                      isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {field.label}
                  </span>
                ))}
                {readiness.missing_important.length > 5 && (
                  <span className={`text-xs px-2 py-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    +{readiness.missing_important.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* All good state */}
          {readiness.missing_critical.length === 0 && readiness.missing_important.length === 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">All critical and important fields populated</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
