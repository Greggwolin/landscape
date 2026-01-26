'use client';

import React from 'react';
import { CompletenessBar } from './CompletenessBar';

export interface CompletenessCategory {
  name: string;
  percentage: number;
  status: 'complete' | 'partial' | 'missing';
  details: string;
}

export interface CompletenessModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  overallPercentage: number;
  categories: CompletenessCategory[];
}

/**
 * Modal showing detailed completeness breakdown across 6 categories.
 */
export function CompletenessModal({
  isOpen,
  onClose,
  projectName,
  overallPercentage,
  categories,
}: CompletenessModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Complete
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Partial
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Missing
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'Property Data':
        return '📍';
      case 'Sources':
        return '💰';
      case 'Uses':
        return '📊';
      case 'Structure':
        return '🏗️';
      case 'Valuation':
        return '💎';
      case 'Documents':
        return '📄';
      default:
        return '📋';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-white shadow-2xl" style={{ borderRadius: 'var(--cui-card-border-radius)' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{projectName}</h2>
            <p className="text-sm text-muted">Analysis Readiness</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Overall Progress */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Completeness</span>
            <span
              className={`text-2xl font-bold ${
                overallPercentage < 30
                  ? 'text-red-600'
                  : overallPercentage < 70
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {overallPercentage}%
            </span>
          </div>
          <CompletenessBar percentage={overallPercentage} showLabel={false} size="md" />
        </div>

        {/* Categories List */}
        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          <h3 className="text-sm font-medium text-muted mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="rounded-lg border border-border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(category.name)}</span>
                    <span className="font-medium text-foreground">{category.name}</span>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
                <CompletenessBar percentage={category.percentage} size="sm" />
                <p className="mt-2 text-xs text-muted">{category.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompletenessModal;
