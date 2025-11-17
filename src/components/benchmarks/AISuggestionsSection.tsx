/**
 * AI Suggestions Section Component
 * Displays AI-extracted benchmarks for user review
 */

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AISuggestion } from '@/types/benchmarks';

interface Props {
  suggestions: AISuggestion[];
  onRefresh: () => void;
}

export default function AISuggestionsSection({ suggestions, onRefresh }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setProcessing(true);
    try {
      // Approve each selected suggestion
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/benchmarks/ai-suggestions/${id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approved' })
          })
        )
      );

      setSelectedIds(new Set());
      onRefresh();
    } catch (error) {
      console.error('Error approving suggestions:', error);
      alert('Failed to approve suggestions');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismissAll = () => {
    if (!confirm('Dismiss all pending suggestions?')) return;
    // TODO: Implement dismiss all
    console.log('Dismiss all');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <AlertCircle size={16} className="text-blue-400" />
        Recent Extractions ({suggestions.length} pending)
      </h3>

      {suggestions.map(suggestion => (
        <AISuggestionCard
          key={suggestion.suggestion_id}
          suggestion={suggestion}
          isSelected={selectedIds.has(suggestion.suggestion_id)}
          onToggleSelect={() => toggleSelection(suggestion.suggestion_id)}
          onRefresh={onRefresh}
        />
      ))}

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleBulkApprove}
          disabled={selectedIds.size === 0 || processing}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-surface-card disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {processing
            ? 'Processing...'
            : `Approve Selected ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
          }
        </button>
        <button
          onClick={handleDismissAll}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-surface-card hover:bg-surface-card rounded text-sm font-medium transition-colors"
        >
          Dismiss All
        </button>
      </div>
    </div>
  );
}

// AI Suggestion Card
interface CardProps {
  suggestion: AISuggestion;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRefresh: () => void;
}

function AISuggestionCard({ suggestion, isSelected, onToggleSelect, onRefresh }: CardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleReview = async (action: 'approved' | 'variant' | 'rejected') => {
    let notes: string | undefined;
    let variantName: string | undefined;

    if (action === 'variant') {
      variantName = prompt('Enter variant name:', suggestion.suggested_name + ' (Variant)');
      if (!variantName) return;
    } else if (action === 'rejected') {
      notes = prompt('Reason for rejection (optional):') || undefined;
    }

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/benchmarks/ai-suggestions/${suggestion.suggestion_id}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, notes, variant_name: variantName })
        }
      );

      if (!response.ok) throw new Error('Failed to review suggestion');

      onRefresh();
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      alert('Failed to review suggestion');
    } finally {
      setProcessing(false);
    }
  };

  const confidenceColor = (suggestion.confidence_score || 0) >= 0.8
    ? 'bg-green-900 text-green-200'
    : (suggestion.confidence_score || 0) >= 0.5
    ? 'bg-blue-900 text-blue-200'
    : 'bg-yellow-900 text-yellow-200';

  return (
    <div className="p-4 bg-surface-card rounded border border-line-strong">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="rounded"
            />
            <span className="font-medium text-sm">{suggestion.suggested_name}</span>
            {suggestion.confidence_score && (
              <span className={`px-2 py-0.5 rounded text-xs ${confidenceColor}`}>
                {(suggestion.confidence_score * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
          <div className="text-sm text-text-secondary">
            {suggestion.suggested_value} {suggestion.suggested_uom}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Source: {suggestion.document_name}
            {suggestion.project_name && ` • ${suggestion.project_name}`}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {isExpanded ? 'Less' : 'More'}
        </button>
      </div>

      {/* Comparison */}
      {suggestion.inflation_adjusted_comparison && (
        <div className="mt-2 p-2 bg-surface-card rounded text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-text-secondary">vs Benchmark:</span>
            <span
              className={
                Math.abs(suggestion.inflation_adjusted_comparison.variance_percentage || 0) > 10
                  ? 'text-yellow-400'
                  : 'text-chip-success'
              }
            >
              {(suggestion.inflation_adjusted_comparison.variance_percentage || 0) > 0 ? '+' : ''}
              {(suggestion.inflation_adjusted_comparison.variance_percentage || 0).toFixed(1)}%
            </span>
          </div>
          {suggestion.inflation_adjusted_comparison.message && (
            <div className="text-text-secondary mt-1">
              {suggestion.inflation_adjusted_comparison.message}
            </div>
          )}
        </div>
      )}

      {/* Expanded Context */}
      {isExpanded && suggestion.extraction_context && (
        <div className="mt-3 pt-3 border-t border-line-strong space-y-2 text-xs">
          <div>
            <span className="text-text-secondary">Context: </span>
            <span className="text-text-secondary">
              {JSON.stringify(suggestion.extraction_context, null, 2)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => handleReview('approved')}
          disabled={processing}
          className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-surface-card rounded text-xs transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => handleReview('variant')}
          disabled={processing}
          className="flex-1 px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-surface-card rounded text-xs transition-colors"
        >
          Create Variant
        </button>
        <button
          onClick={() => handleReview('rejected')}
          disabled={processing}
          className="flex-1 px-3 py-1 bg-surface-card hover:bg-surface-card rounded text-xs transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
