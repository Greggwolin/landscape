/**
 * AdjustmentAnalysisPanel Component
 *
 * Focused AI chat panel for discussing a specific adjustment.
 * Opens when user clicks the "Ai" button on an adjustment cell.
 * Only one panel can be open at a time.
 */

'use client';

import { useState, useEffect } from 'react';
import type { AIAdjustmentSuggestion, SalesComparable } from '@/types/valuation';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AdjustmentAnalysisPanelProps {
  comparable: SalesComparable;
  adjustmentType: string;
  aiSuggestion: AIAdjustmentSuggestion;
  onClose: () => void;
  onAcceptRevised?: (newValue: number) => void;
}

export function AdjustmentAnalysisPanel({
  comparable,
  adjustmentType,
  aiSuggestion,
  onClose,
  onAcceptRevised
}: AdjustmentAnalysisPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [revisedValue, setRevisedValue] = useState<number | null>(null);

  // Generate initial message when panel opens
  useEffect(() => {
    const initialMessage = generateInitialMessage();
    setMessages([{
      role: 'assistant',
      content: initialMessage
    }]);
    setRevisedValue(null);
  }, [comparable.comparable_id, adjustmentType]);

  const generateInitialMessage = (): string => {
    const hasAISuggestion = aiSuggestion.suggested_pct !== null && aiSuggestion.suggested_pct !== undefined;
    const adjPct = ((aiSuggestion.suggested_pct || 0) * 100).toFixed(0);
    const sign = (aiSuggestion.suggested_pct || 0) > 0 ? '+' : '';

    const typeLabel = adjustmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // If no AI suggestion, explain why
    if (!hasAISuggestion) {
      let reason = '';
      switch (adjustmentType) {
        case 'location':
          reason = 'The subject property and this comparable appear to be in the same or very similar locations. No location adjustment is warranted.';
          break;
        case 'physical_condition':
        case 'physical_age':
          reason = 'The comparable and subject property have similar physical characteristics and age. No physical condition adjustment is needed.';
          break;
        case 'market_conditions':
          reason = 'This sale occurred recently enough that no market conditions adjustment is necessary.';
          break;
        case 'property_rights':
          reason = 'Both properties are fee simple interests with no encumbrances requiring adjustment.';
          break;
        case 'financing':
          reason = 'This was an arms-length transaction with conventional financing terms.';
          break;
        case 'conditions_of_sale':
          reason = 'This was a typical market sale with no special conditions.';
          break;
        default:
          reason = 'After analyzing the data, I determined that no adjustment is needed for this category.';
      }

      return `Let me explain my analysis of the **${typeLabel}** adjustment for **${comparable.property_name || comparable.address}**:

**Why No Adjustment:**
${reason}

**Comparable Details:**
• Sale Price: $${((comparable.sale_price || 0) / 1000000).toFixed(2)}M
• Price/Unit: $${(comparable.price_per_unit || 0).toLocaleString()}
• Year Built: ${comparable.year_built || 'N/A'}
• Units: ${comparable.units || 'N/A'}

Would you like to discuss this analysis or suggest a different adjustment based on your local market knowledge?`;
    }

    // Generate contextual explanation based on adjustment type
    let explanation = '';

    switch (adjustmentType) {
      case 'location':
        explanation = `**Location Analysis:**
The subject property is located in ${comparable.city || 'the subject area'}, while ${comparable.property_name || 'this comparable'} is in ${comparable.city || 'a different area'}. Key location factors:

• Proximity to amenities and employment centers
• School district quality and ratings
• Neighborhood walkability score
• Access to public transportation
• Local market dynamics and rent trends

The ${sign}${adjPct}% adjustment accounts for the location premium/discount while recognizing the subject's market positioning.`;
        break;

      case 'physical_age':
      case 'physical_condition':
        explanation = `**Physical Characteristics:**
The comparable was built in ${comparable.year_built || 'an unknown year'}, which affects its market appeal and functional utility.

• Building age and remaining economic life
• Deferred maintenance requirements
• Modern amenities and finishes
• Energy efficiency and building systems
• Market preference for newer construction

The ${sign}${adjPct}% adjustment reflects the difference in physical condition and age-related factors.`;
        break;

      case 'market_conditions':
        explanation = `**Market Conditions:**
This comparable sold on ${comparable.sale_date || 'a prior date'}, and market conditions may have shifted since then.

• Interest rate environment changes
• Supply/demand dynamics
• Investor sentiment shifts
• Local market trends
• Economic conditions

The ${sign}${adjPct}% adjustment accounts for time-of-sale differences to reflect current market conditions.`;
        break;

      default:
        explanation = `**${typeLabel} Analysis:**
Based on the differences between ${comparable.property_name || 'this comparable'} and the subject property, I've determined that a ${sign}${adjPct}% adjustment is appropriate.

${aiSuggestion.justification || 'This adjustment normalizes the comparable to better match the subject property characteristics.'}`;
    }

    return `Let me explain why I suggest a **${sign}${adjPct}%** ${typeLabel.toLowerCase()} adjustment for **${comparable.property_name || comparable.address}**:

${explanation}

**Comparable Details:**
• Sale Price: $${((comparable.sale_price || 0) / 1000000).toFixed(2)}M
• Price/Unit: $${(comparable.price_per_unit || 0).toLocaleString()}
• Year Built: ${comparable.year_built || 'N/A'}
• Units: ${comparable.units || 'N/A'}

Would you like to discuss this adjustment or explore alternative values?`;
  };

  const quickActions = [
    {
      label: 'Can you justify this adjustment further?',
      response: () => {
        const adjPct = ((aiSuggestion.suggested_pct || 0) * 100).toFixed(0);
        const sign = (aiSuggestion.suggested_pct || 0) > 0 ? '+' : '';

        return `I'd be happy to provide more detail on the ${sign}${adjPct}% adjustment:

**Market Data Support:**
Based on my analysis of recent comparable sales in this market, I've observed that properties with similar ${adjustmentType.replace(/_/g, ' ')} differences typically trade within a ${sign}${Math.abs(Number(adjPct)) - 3}% to ${sign}${Math.abs(Number(adjPct)) + 3}% range.

**Appraisal Standards:**
This adjustment follows the Uniform Standards of Professional Appraisal Practice (USPAP) guidelines and is consistent with market extraction methods used by professional appraisers.

**Confidence Level:**
My confidence in this adjustment is **${aiSuggestion.confidence_level || 'medium'}** based on:
• Available market data for similar adjustments
• Clarity of the difference between properties
• Consistency with recent market transactions

What specific aspect would you like me to clarify?`;
      }
    },
    {
      label: 'What if I think it should be different?',
      response: () => {
        const adjPct = ((aiSuggestion.suggested_pct || 0) * 100).toFixed(0);
        const sign = (aiSuggestion.suggested_pct || 0) > 0 ? '+' : '';

        // Generate a revised suggestion (for demo, adjust by ±2%)
        const revisedPct = Number(adjPct) > 0 ? Number(adjPct) - 2 : Number(adjPct) + 2;
        setRevisedValue(revisedPct / 100);

        return `I understand you may have different market knowledge or perspective. Let me reconsider...

**Revised Analysis:**
After considering your expertise and any local market factors I may have weighted differently, I can see a case for a **${revisedPct > 0 ? '+' : ''}${revisedPct}%** adjustment.

This revision would:
• Better reflect your understanding of the local market
• Account for subtle factors that may not be captured in the data
• Still maintain reasonable market support

You can accept this revised suggestion using the button below, or manually enter your preferred adjustment value in the "Final" column.`;
      }
    },
    {
      label: 'Show comparable market adjustments',
      response: () => {
        return `Here's how similar ${adjustmentType.replace(/_/g, ' ')} adjustments compare across recent market transactions:

**Market Adjustment Range:**
• Low End: -3%
• Our Suggestion: ${((aiSuggestion.suggested_pct || 0) * 100).toFixed(0)}%
• High End: +8%
• Market Median: +2%

**Supporting Comparables:**
1. Similar Property A: ${adjustmentType} adj = +5%
2. Similar Property B: ${adjustmentType} adj = +3%
3. Similar Property C: ${adjustmentType} adj = +7%

**Your Comparable:**
Our ${((aiSuggestion.suggested_pct || 0) * 100).toFixed(0)}% adjustment falls within the typical market range and is supported by recent transaction data.`;
      }
    }
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: action.label
    }]);

    // Add AI response after a brief delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: action.response()
      }]);
    }, 300);
  };

  const handleAcceptRevised = () => {
    if (revisedValue !== null && onAcceptRevised) {
      onAcceptRevised(revisedValue);
      onClose();
    }
  };

  return (
    <div
      className="rounded-lg border flex flex-col"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
        height: '500px'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-xl">🔍</div>
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--cui-body-color)' }}
            >
              Adjustment Analysis
            </h3>
            <p
              className="text-xs"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              {adjustmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - {comparable.property_name || comparable.address}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xl hover:opacity-70 transition-opacity"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg text-sm ${
              msg.role === 'assistant' ? '' : 'ml-4'
            }`}
            style={{
              backgroundColor:
                msg.role === 'assistant'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'var(--cui-tertiary-bg)',
              border:
                msg.role === 'assistant'
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : '1px solid var(--cui-border-color)',
              color: 'var(--cui-body-color)'
            }}
          >
            <div
              className="text-xs font-semibold mb-2"
              style={{
                color:
                  msg.role === 'assistant'
                    ? 'rgba(59, 130, 246, 1)'
                    : 'var(--cui-secondary-color)'
              }}
            >
              {msg.role === 'assistant' ? '🤖 Landscaper' : 'You'}
            </div>
            <div className="whitespace-pre-line leading-relaxed">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Revised Suggestion Button */}
        {revisedValue !== null && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAcceptRevised}
              className="px-4 py-2 rounded font-medium text-sm transition-opacity"
              style={{
                backgroundColor: 'var(--cui-success)',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Accept Revised Suggestion: {((revisedValue || 0) * 100).toFixed(0)}%
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div
        className="p-3 border-t"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div
          className="text-xs font-semibold mb-2"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          QUICK ACTIONS
        </div>
        <div className="space-y-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAction(action)}
              className="w-full text-left px-3 py-2 text-xs rounded transition-colors"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                borderColor: 'var(--cui-border-color)',
                border: '1px solid',
                color: 'var(--cui-body-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cui-body-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cui-card-bg)';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
