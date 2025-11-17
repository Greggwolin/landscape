/**
 * LandscaperChatPanel Component
 *
 * Chat interface for Landscaper AI with stubbed interactions for MVP
 * Supports both general valuation analysis and comp-specific analysis
 */

'use client';

import { useState } from 'react';
import type { SalesComparable } from '@/types/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface CompContext {
  compNumber: number;
  propertyName: string;
  comparable: SalesComparable;
}

interface LandscaperChatPanelProps {
  projectId: number;
  compContext?: CompContext;
  comparables?: SalesComparable[];
  subjectAskingPrice?: number;
  subjectUnits?: number;
}

export function LandscaperChatPanel({
  projectId,
  compContext,
  comparables = [],
  subjectAskingPrice = 47500000,
  subjectUnits = 113
}: LandscaperChatPanelProps) {
  // Generate context-aware initial message
  const getInitialMessage = (): string => {
    if (compContext) {
      const { comparable, propertyName } = compContext;
      return `I'm analyzing **${propertyName}** for you.

**Property Details:**
• Sale Price: $${(Number(comparable.sale_price) / 1000000).toFixed(2)}M
• Price/Unit: $${Number(comparable.price_per_unit).toLocaleString()}
• Cap Rate: ${(Number(comparable.cap_rate) * 100).toFixed(2)}%
• Year Built: ${comparable.year_built}
• Units: ${comparable.units}

**Adjustments Applied:**
${comparable.adjustments?.map(adj => `• ${adj.adjustment_type_display}: ${(Number(adj.adjustment_pct) * 100).toFixed(0)}%`).join('\n') || '• No adjustments'}

**Adjusted Price/Unit:** $${Number(comparable.adjusted_price_per_unit).toLocaleString()}

What aspect of this comparable would you like me to explain?`;
    }

    return `I've analyzed the uploaded Offering Memorandum and extracted 3 comparable sales:

• Reveal Playa Vista: $570,561/unit, 4.30% cap
• Cobalt: $501,481/unit, 5.30% cap
• Atlas: $386,719/unit (affordable housing)

The indicated value range is $399K-$411K per unit, with a weighted average of $406,486/unit. This suggests a total property value of approximately $45.9M.

Your asking price of $47.5M is 3.4% above the indicated market value. This premium may be justified by the significant 42% rental upside noted in the offering materials.

How would you like to proceed with the analysis?`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: getInitialMessage()
    }
  ]);

  // Generate comp-specific or general quick actions
  const getQuickActions = () => {
    if (compContext) {
      const { comparable, propertyName } = compContext;
      return [
        {
          label: `Why the ${comparable.adjustments?.find(a => a.adjustment_type === 'location') ? 'location' : 'physical'} adjustment?`,
          response: `The adjustments for **${propertyName}** are based on comparing it to the subject property:

${comparable.adjustments?.map(adj => {
  const pct = (Number(adj.adjustment_pct) * 100).toFixed(0);
  return `**${adj.adjustment_type_display} (${pct > 0 ? '+' : ''}${pct}%):**
${adj.justification || 'Standard market adjustment'}`;
}).join('\n\n') || 'No adjustments were applied to this comparable.'}

These adjustments help normalize the comparable to match the subject property's characteristics, providing a more accurate value indication.`
        },
        {
          label: 'How does this comp compare to the subject?',
          response: `Comparing **${propertyName}** to the subject property:

**Similarities:**
• Similar property type (multifamily)
• Same market area (Los Angeles)
• Comparable transaction timing

**Key Differences:**
• Year Built: ${comparable.year_built} vs Subject: 2016
• Price/Unit: $${Number(comparable.price_per_unit).toLocaleString()} vs Subject asking: $420,354
• Cap Rate: ${(Number(comparable.cap_rate) * 100).toFixed(2)}% (market indicator)

**After Adjustments:**
The adjusted price/unit of $${Number(comparable.adjusted_price_per_unit).toLocaleString()} provides a reliable value indication for the subject property.`
        },
        {
          label: 'Show detailed property metrics',
          response: `**Complete Analysis: ${propertyName}**

**Transaction Details:**
• Sale Date: ${comparable.sale_date}
• Sale Price: $${(Number(comparable.sale_price) / 1000000).toFixed(2)}M
• Price/Unit: $${Number(comparable.price_per_unit).toLocaleString()}
• Price/SF: $${comparable.price_per_sf}

**Property Physical:**
• Units: ${comparable.units}
• Building SF: ${Number(comparable.building_sf).toLocaleString()}
• Year Built: ${comparable.year_built}
• Average Unit Size: ${Math.round(Number(comparable.building_sf) / comparable.units)} SF

**Performance:**
• Cap Rate: ${(Number(comparable.cap_rate) * 100).toFixed(2)}%
• Distance from Subject: ${comparable.distance_from_subject}

**Adjusted Metrics:**
• Total Adjustment: ${(comparable.total_adjustment_pct * 100).toFixed(0)}%
• Adjusted Price/Unit: $${Number(comparable.adjusted_price_per_unit).toLocaleString()}`
        }
      ];
    }

    // General valuation quick actions
    return [
      {
        label: 'Explain adjustment methodology',
        response: `The adjustment methodology follows standard appraisal practices:

**Location Adjustments:**
- Playa Vista (-20%): Premium coastal-adjacent location commands higher prices
- Culver City (-15%): Strong rental market near major tech employers

**Physical Adjustments:**
- Age: Newer properties typically command premium (2019 vs 2016 = +2%)
- Older properties may need reserves (-5% for 2003 vintage)
- Unit Mix: Lack of 3BR units reduces appeal (-5%)

**Market Conditions:**
- All sales within 6 months = minimal time adjustment needed
- Current rising rate environment may warrant -2% to -5% adjustment

The goal is to make comparables "as similar as possible" to the subject property, adjusting their sale prices to reflect what they would have sold for if they had the subject's characteristics.`
      },
      {
        label: 'Why is Atlas priced differently?',
        response: `Great question! Atlas appears unusual because:

**1. Affordable Housing Designation**
   - Rent restrictions limit NOI potential
   - Lower price/unit reflects constrained income stream
   - Buyers pay less due to regulatory restrictions

**2. Efficient Micro-Unit Design**
   - 128 units in only 78,848 SF
   - Average unit size: 616 SF vs. subject's 1,055 SF
   - Higher price/SF reflects land efficiency
   - More units per dollar of land cost

**3. Newest Construction (2022)**
   - Premium materials and systems
   - Lower maintenance reserves needed
   - Meets latest energy efficiency standards

**Conclusion:** Atlas is included for reference but given **zero weight** in the reconciliation due to limited comparability with market-rate properties. The affordable housing restrictions make it a fundamentally different investment product.`
      },
      {
        label: 'Calculate exit cap rate',
        response: `Based on market analysis, here's the exit cap rate calculation:

**Going-In Cap Rate (Current):**
- Subject @ $47.5M with current NOI of $1.9M
- Going-in cap: 1.9M / 47.5M = 4.00%

**Stabilized Cap Rate (Proforma):**
- Subject @ $47.5M with stabilized NOI of $3.1M
- Stabilized cap: 3.1M / 47.5M = 6.54%

**Exit Cap Rate Recommendation: 5.75%**

**Rationale:**
- Market range from comps: 4.30% - 5.30%
- Add 50 basis points for:
  - Terminal risk (future uncertainty)
  - Age of property at exit (8-10 years old)
  - Potential increase in rates over hold period

**Exit Value Calculation:**
Year 5 Stabilized NOI: $3,250,000 (assuming 1% annual growth)
Exit Cap Rate: 5.75%
**Indicated Exit Value: $56,521,739**

This represents a 19% increase from purchase price, or 3.6% annualized appreciation.`
      },
      {
        label: 'Show cap rate sensitivity',
        response: `Here's a sensitivity analysis showing how property value changes with cap rate and NOI:

**Exit Value Sensitivity Matrix**
(Year 5 NOI × Exit Cap Rate)

                Exit Cap Rate
NOI        5.25%      5.50%      5.75%      6.00%      6.25%
───────────────────────────────────────────────────────────
$3.0M     $57.1M     $54.5M     $52.2M     $50.0M     $48.0M
$3.1M     $59.0M     $56.4M     $53.9M     $51.7M     $49.6M
$3.2M     $61.0M     $58.2M     $55.7M     $53.3M     $51.2M
$3.3M     $62.9M     $60.0M     $57.4M     $55.0M     $52.8M
$3.4M     $64.8M     $61.8M     $59.1M     $56.7M     $54.4M

**Key Insights:**
• Each 25 bps increase in exit cap = ~4.5% decrease in value
• Each $100K increase in NOI = ~$1.7M - $1.9M increase in value
• Break-even cap rate for positive returns: <6.25%

**Recommended Strategy:**
Focus on NOI growth through:
- Rent increases (42% upside identified)
- Expense reduction (target 25-27% expense ratio)
- Occupancy optimization (minimize vacancy)`
      }
    ];
  };

  const quickActions = getQuickActions();

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
        content: action.response
      }]);
    }, 300);
  };

  return (
    <div
      className="rounded-lg border h-full flex flex-col"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
        minHeight: '600px',
        maxHeight: '800px'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{
          backgroundColor: 'rgb(241, 242, 246)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="text-2xl">💬</div>
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Landscaper Ai - Valuation Assistant
          </h3>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          scrollbarWidth: 'thin'
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
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
            <div
              className="text-sm whitespace-pre-line leading-relaxed"
              style={{ color: 'var(--cui-body-color)' }}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div
        className="p-4 border-t"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          QUICK ACTIONS
        </div>
        <div className="space-y-2">
          {quickActions.map((action, idx) => (
            <LandscapeButton
              key={idx}
              variant="outline"
              color="secondary"
              size="sm"
              onClick={() => handleQuickAction(action)}
              className="w-full text-left px-3 py-2 text-sm"
            >
              {action.label}
            </LandscapeButton>
          ))}
        </div>

        {/* AI Insights */}
        {!compContext && comparables.length > 0 && (
          <div
            className="mt-4 p-3 rounded text-sm"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--cui-body-color)'
            }}
          >
            <div className="flex items-start gap-2">
              <div className="text-xl">🤖</div>
              <div>
                <div className="font-semibold mb-1">AI Insights</div>
                <ul className="text-xs space-y-1" style={{ color: 'var(--cui-secondary-color)' }}>
                  <li>• {comparables.length} sales comparables extracted from uploaded OM</li>
                  <li>• All sales within last 12 months (high reliability)</li>
                  <li>
                    • Subject priced {(() => {
                      const compsWithAdjusted = comparables.filter(c => c.adjusted_price_per_unit && c.adjusted_price_per_unit > 0);
                      if (compsWithAdjusted.length === 0) return 'N/A';
                      const sum = compsWithAdjusted.reduce((acc, comp) => acc + Number(comp.adjusted_price_per_unit), 0);
                      const weightedAvg = sum / compsWithAdjusted.length;
                      const indicatedValue = weightedAvg * subjectUnits;
                      const variance = ((subjectAskingPrice - indicatedValue) / indicatedValue) * 100;
                      return `${Math.abs(variance).toFixed(1)}% ${variance > 0 ? 'above' : 'below'}`;
                    })()} indicated market value
                  </li>
                  {(() => {
                    const compsWithAdjusted = comparables.filter(c => c.adjusted_price_per_unit && c.adjusted_price_per_unit > 0);
                    if (compsWithAdjusted.length === 0) return null;
                    const sum = compsWithAdjusted.reduce((acc, comp) => acc + Number(comp.adjusted_price_per_unit), 0);
                    const weightedAvg = sum / compsWithAdjusted.length;
                    const indicatedValue = weightedAvg * subjectUnits;
                    const variance = ((subjectAskingPrice - indicatedValue) / indicatedValue) * 100;
                    return variance > 0 && <li>• Premium may reflect rental upside opportunity</li>;
                  })()}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info Badge */}
        <div
          className="mt-4 p-2 rounded text-xs"
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: 'var(--cui-body-color)'
          }}
        >
          <strong>Note:</strong> AI responses are currently stubbed for MVP demonstration.
          Full integration coming in Phase 3.
        </div>
      </div>
    </div>
  );
}
