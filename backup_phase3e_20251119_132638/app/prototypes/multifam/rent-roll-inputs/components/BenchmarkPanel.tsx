'use client';

import React from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface BenchmarkAlert {
  category: string;
  type: string;
  severity: 'warning' | 'success' | 'info';
  message: string;
  userValue: number;
  marketMedian: number;
  recommendation: string;
}

interface BenchmarkPanelProps {
  mode: ComplexityTier;
  totalPerUnit: number;
  marketMedian: number;
  alerts: BenchmarkAlert[];
}

export function BenchmarkPanel({
  mode,
  totalPerUnit,
  marketMedian,
  alerts
}: BenchmarkPanelProps) {
  const variance = ((totalPerUnit - marketMedian) / marketMedian) * 100;
  const isWithinRange = Math.abs(variance) < 5;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-400">✨</span>
        <h3 className="text-lg font-semibold text-white">
          {mode === 'basic' ? 'Landscaper Analysis' : 'Benchmark Analysis'}
        </h3>
        <span className="text-xs text-gray-400">AI-Powered Insights</span>
      </div>

      {mode === 'basic' ? (
        /* BASIC MODE: Simple total comparison */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Your Total OpEx</span>
            <span className="text-xl font-bold text-white">
              ${totalPerUnit.toLocaleString()}/unit
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Phoenix Market Median</span>
            <span className="text-xl font-bold text-gray-400">
              ${marketMedian.toLocaleString()}/unit
            </span>
          </div>
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <span className={isWithinRange ? 'text-green-400' : 'text-orange-400'}>
                {isWithinRange ? '✓' : '⚠️'}
              </span>
              <span className="text-sm text-gray-300">
                {isWithinRange
                  ? `Your estimates are within ${Math.abs(variance).toFixed(1)}% of market median`
                  : `Your estimates are ${variance > 0 ? 'above' : 'below'} market by ${Math.abs(variance).toFixed(1)}%`
                }
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD/ADVANCED MODE: Category-level alerts */
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <div>
                  <div className="font-medium text-green-200">All categories within expected range</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Your operating expense assumptions align with Phoenix Class B market data
                  </div>
                </div>
              </div>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`rounded p-3 ${
                  alert.severity === 'warning'
                    ? 'bg-orange-900/30 border border-orange-700/50'
                    : alert.severity === 'success'
                    ? 'bg-green-900/20 border border-green-700/50'
                    : 'bg-blue-900/20 border border-blue-700/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 ${
                      alert.severity === 'warning'
                        ? 'text-orange-400'
                        : alert.severity === 'success'
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {alert.severity === 'warning' ? '⚠️' : alert.severity === 'success' ? '✓' : 'ℹ️'}
                  </span>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        alert.severity === 'warning'
                          ? 'text-orange-200'
                          : alert.severity === 'success'
                          ? 'text-green-200'
                          : 'text-blue-200'
                      }`}
                    >
                      {alert.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Your: ${alert.userValue.toLocaleString()}/unit • Median: $
                      {alert.marketMedian.toLocaleString()}/unit • Phoenix Class B
                    </div>
                    {alert.recommendation && (
                      <div className="text-xs text-gray-300 mt-1">{alert.recommendation}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {mode === 'standard' && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                Benchmarks based on 237 Phoenix Class B properties, 2024-2025 data
              </div>
            </div>
          )}

          {mode === 'advanced' && (
            <>
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Expense Ratio Breakdown</h4>
                <div className="space-y-2">
                  {/* Placeholder for expense ratio bars - will populate in Phase 3 */}
                  <div className="text-xs text-gray-500 text-center py-4">
                    Chart will show category distribution
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400">
                  Benchmarks: Phoenix Class B • 237 properties • 2024-2025 data
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
