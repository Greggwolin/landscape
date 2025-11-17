/**
 * AdjustmentCell Component
 *
 * Renders the AI and Final columns for a single adjustment row.
 * Shows Ai button + checkbox for accepting AI suggestion.
 */

'use client';

import { useState } from 'react';
import type {
  AIAdjustmentSuggestion,
  SalesCompAdjustment,
  ConfidenceLevel
} from '@/types/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

interface AdjustmentCellProps {
  comparableId: number;
  adjustmentType: string;
  aiSuggestion: AIAdjustmentSuggestion | null;
  currentAdjustment: SalesCompAdjustment | null;
  onAiClick: (compId: number, adjType: string, suggestion: AIAdjustmentSuggestion) => void;
  onCheckboxClick: (compId: number, adjType: string, suggestedValue: number) => void;
  onFinalChange: (compId: number, adjType: string, value: number | null) => void;
}

export function AdjustmentCell({
  comparableId,
  adjustmentType,
  aiSuggestion,
  currentAdjustment,
  onAiClick,
  onCheckboxClick,
  onFinalChange
}: AdjustmentCellProps) {
  const [finalValue, setFinalValue] = useState<string>(
    currentAdjustment?.user_adjustment_pct
      ? (currentAdjustment.user_adjustment_pct * 100).toFixed(0)
      : ''
  );

  const hasAiSuggestion = aiSuggestion && aiSuggestion.suggested_pct !== null;
  const isDisabled = !hasAiSuggestion || aiSuggestion.confidence_level === 'none';
  const isAccepted = currentAdjustment?.ai_accepted || false;

  const getConfidenceStyle = (level: ConfidenceLevel | null) => {
    switch (level) {
      case 'high':
        return {
          buttonBg: 'var(--cui-primary)',
          checkColor: 'var(--cui-primary)',
          cellBg: 'transparent'
        };
      case 'medium':
        return {
          buttonBg: 'var(--cui-warning)',
          checkColor: 'var(--cui-warning)',
          cellBg: 'rgba(234, 179, 8, 0.05)'
        };
      case 'low':
      case 'none':
      default:
        return {
          buttonBg: 'var(--cui-secondary)',
          checkColor: 'var(--cui-secondary)',
          cellBg: 'rgba(108, 117, 125, 0.1)'
        };
    }
  };

  const style = getConfidenceStyle(aiSuggestion?.confidence_level || null);

  const handleCheckboxClick = () => {
    if (!hasAiSuggestion || isDisabled) return;
    const value = aiSuggestion.suggested_pct!;
    onCheckboxClick(comparableId, adjustmentType, value);
    setFinalValue((value * 100).toFixed(0));
  };

  const handleFinalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFinalValue(newValue);

    if (newValue === '' || newValue === '-') {
      onFinalChange(comparableId, adjustmentType, null);
    } else {
      const numValue = parseFloat(newValue) / 100;
      if (!isNaN(numValue)) {
        onFinalChange(comparableId, adjustmentType, numValue);
      }
    }
  };

  return (
    <>
      {/* AI Value Column - Shows AI suggested percentage */}
      <td
        className="py-1 px-1 text-center border-l"
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: style.cellBg,
          whiteSpace: 'nowrap'
        }}
      >
        <input
          type="text"
          value={hasAiSuggestion ? `${aiSuggestion.suggested_pct! > 0 ? '+' : ''}${(aiSuggestion.suggested_pct! * 100).toFixed(0)}%` : ''}
          readOnly
          placeholder="-"
          className="w-full px-1 py-0.5 text-xs text-center rounded border"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            color: hasAiSuggestion ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
            fontSize: '11px'
          }}
        />
      </td>

      {/* Icons Column - AI button and checkbox */}
      <td
        className="py-1 px-1 text-center"
        style={{
          borderColor: 'var(--cui-border-color)',
          whiteSpace: 'nowrap'
        }}
      >
        <div className="flex items-center justify-center gap-1">
          <LandscapeButton
            variant="ghost"
            color="secondary"
            size="sm"
            onClick={() => {
              // Always allow clicking AI button to open chat
              if (hasAiSuggestion) {
                onAiClick(comparableId, adjustmentType, aiSuggestion);
              } else {
                // Create a minimal suggestion object for context
                const contextSuggestion: AIAdjustmentSuggestion = {
                  ai_suggestion_id: 0,
                  comparable_id: comparableId,
                  adjustment_type: adjustmentType,
                  suggested_pct: null,
                  confidence_level: 'none',
                  reasoning: null,
                  data_points: null,
                  created_at: new Date().toISOString()
                };
                onAiClick(comparableId, adjustmentType, contextSuggestion);
              }
            }}
            className="text-xs font-semibold px-1 py-0.5"
            style={{
              backgroundColor: hasAiSuggestion ? style.buttonBg : 'var(--cui-secondary)',
              color: 'white',
              fontSize: '9px'
            }}
            title={hasAiSuggestion ? `AI suggests ${aiSuggestion.suggested_pct! > 0 ? '+' : ''}${(aiSuggestion.suggested_pct! * 100).toFixed(0)}% (${aiSuggestion.confidence_level} confidence)` : 'Click to discuss this adjustment with AI'}
          >
            Ai
          </LandscapeButton>
          <input
            type="checkbox"
            checked={isAccepted}
            onChange={handleCheckboxClick}
            disabled={!hasAiSuggestion || isDisabled}
            className="cursor-pointer"
            style={{
              accentColor: style.checkColor,
              width: '12px',
              height: '12px',
              opacity: (!hasAiSuggestion || isDisabled) ? 0.3 : 1
            }}
            title={hasAiSuggestion ? "Accept AI suggestion" : "No AI suggestion available"}
          />
        </div>
      </td>

      {/* Final Input Column - User override value */}
      <td
        className="py-1 px-1 text-center"
        style={{
          borderColor: 'var(--cui-border-color)',
          whiteSpace: 'nowrap'
        }}
      >
        <input
          type="text"
          value={finalValue}
          onChange={handleFinalInputChange}
          placeholder="-"
          className="w-full px-1 py-0.5 text-xs text-center rounded border"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)',
            fontSize: '11px'
          }}
        />
      </td>
    </>
  );
}
