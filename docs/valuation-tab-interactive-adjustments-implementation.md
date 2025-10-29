# Valuation Tab - Interactive AI Adjustments Implementation Guide

## Project Context

This document provides complete context for continuing the implementation of the interactive AI adjustments feature for the Valuation Tab in the Landscape real estate analytics platform.

## Current Status: Database Ready, Frontend Redesign In Progress

### ✅ Completed Work

1. **Database Migration Applied Successfully**
   - File: `backend/migrations/015_ai_adjustment_suggestions.sql`
   - Created table: `landscape.tbl_ai_adjustment_suggestions`
   - Added columns to `landscape.tbl_sales_comp_adjustments`:
     - `user_adjustment_pct NUMERIC(7,4)` - User's final adjustment value
     - `ai_accepted BOOLEAN` - Whether user accepted AI suggestion
     - `user_notes TEXT` - User's notes about their decision
     - `last_modified_by VARCHAR(100)` - Tracking who made changes
   - Migration was run successfully on 2025-10-28

2. **Design Specifications Finalized**
   - User provided screenshot showing exact UI layout
   - All interaction patterns clarified through Q&A

### 🔄 In Progress / Not Started

**Backend:**
- [ ] Add `AIAdjustmentSuggestion` Django model to `models_valuation.py`
- [ ] Update `SalesCompAdjustment` model to include new fields
- [ ] Create serializers for AI suggestions
- [ ] Create API endpoints (viewsets)

**Frontend:**
- [ ] Add TypeScript types for AI suggestions
- [ ] Create `AdjustmentCell` component
- [ ] Redesign `ComparablesGrid` with 3-column layout
- [ ] Create `AdjustmentAnalysisPanel` component
- [ ] Implement state management for panel opening/closing
- [ ] Wire up all interactions

---

## Design Specification

### Table Structure

The comparables table should have this column structure for each comp:

```
| ID (label column) | Comp 1 (data) | AI | Final | Comp 2 (data) | AI | Final | Comp 3 (data) | AI | Final |
```

**Key Points:**
- For **property data rows** (Address, Date, Sale Price, etc.): The data spans across all 3 sub-columns (merged cells)
- For **adjustment rows**: 3 distinct columns:
  1. **Comp column**: Empty or shows `-`
  2. **AI column**: Shows `Ai` button + `✓` checkbox
  3. **Final column**: Editable input field for user's final value

### Visual Layout Example

Based on user-provided screenshot:

```
┌─────────────────────┬──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ ID                  │ Comp 1                                       │ Comp 2                                       │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Address             │ 5710 Crescent Park East                      │ 5710 Crescent Park East                      │
│                     │ Los Angeles, CA                              │ Los Angeles, CA                              │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Date                │ 4/23/24                                      │ 4/23/24                                      │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Sale Price          │ $122.10M                                     │ $122.10M                                     │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Adjustments         │          AI              Final               │          AI              Final               │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Transaction         │                                              │                                              │
│   Market Conditions │     +10%  [Ai] [✓]      +10%                │     +10%  [Ai] [✓]      +10%                │
│   Other             │      +5%  [Ai] [✓]       +5%                │      +5%  [Ai] [✓]       +5%                │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Property rights     │                                              │                                              │
│   Location          │      +5%  [Ai] [✓]       +5%                │      +5%  [Ai] [✓]       +5%                │
│   Physical Cond     │     -10%  [Ai] [✓]      -10%                │     -10%  [Ai] [✓]      -10%                │
└─────────────────────┴──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Interaction Patterns

#### 1. Checkbox Behavior
**When user clicks ✓ checkbox:**
- Copy the AI suggested value to the Final column
- Mark the adjustment as "AI accepted" (for tracking purposes)
- Checkbox becomes checked/highlighted

#### 2. Ai Button Behavior
**When user clicks `Ai` button:**
- Open/replace the Analysis panel for that specific adjustment
- Analysis panel shows comp-specific chat focused on explaining that ONE adjustment
- Initial message: "Let me explain why I suggest a [+5%] [location] adjustment for [Reveal Playa Vista]..."
- User can discuss/negotiate the adjustment value
- If AI revises suggestion, show "Accept Revised Suggestion" button
- Accepting revised suggestion updates the AI column value

**Important:** Only ONE analysis panel open at a time (clicking new `Ai` button closes previous, opens new)

#### 3. Manual Input Behavior
**When user manually types in Final column:**
- Value is saved as user's override
- AI suggestion remains unchanged in AI column
- System remembers user didn't accept AI suggestion (for future reconciliation narrative)

#### 4. Disabled State
**When AI has no suggestion** (confidence_level = 'none' or null):
- AI column shows `-`
- `Ai` button and checkbox are grayed out/disabled
- Final column is still editable (user can make their own adjustment)

**When user enters a value in Final column for a previously empty AI suggestion:**
- `Ai` button becomes enabled (user can now discuss their reasoning with Landscaper)

### Analysis Panel Content

**For comp-specific adjustment analysis:**

```typescript
// Example initial message when clicking Ai button for Location adjustment
"Let me explain why I suggest a +5% location adjustment for Reveal Playa Vista:

**Location Analysis:**
The subject property is located in [Subject Location], while Reveal Playa Vista
is in Playa Vista, a premium coastal-adjacent area. Key differences:

• Proximity to beaches: Playa Vista is 2 miles from ocean vs subject at 8 miles
• School district ratings: Playa Vista averages 9/10 vs subject at 7/10
• Retail/dining walkability: Higher in Playa Vista
• Employment centers: Both have good access to major employers

The +5% adjustment accounts for Playa Vista's premium location while recognizing
the subject's solid fundamentals.

Would you like to discuss this adjustment?"
```

**After user discusses and AI revises:**
```typescript
"You make a good point about the subject's recent neighborhood improvements.
Let me revise my suggestion to +3% to better reflect the narrowing location gap.

[Accept Revised Suggestion: +3%] button appears
```

### Confidence Level Visual Indicators

```typescript
type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

// Visual styling by confidence:
// High: Normal blue Ai button + blue checkbox
// Medium: Orange/amber Ai button + orange checkbox
// Low: Gray Ai button + gray checkbox, cell lightly shaded
// None: Disabled state, cell more heavily shaded
```

---

## Database Schema Reference

### Table: `tbl_ai_adjustment_suggestions`

```sql
CREATE TABLE landscape.tbl_ai_adjustment_suggestions (
    ai_suggestion_id SERIAL PRIMARY KEY,
    comparable_id INTEGER NOT NULL REFERENCES landscape.tbl_sales_comparables(comparable_id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,  -- 'location', 'physical_age', 'market_conditions', etc.
    suggested_pct NUMERIC(7,4),            -- AI's suggested adjustment percentage (e.g., 0.05 for +5%)
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low', 'none')),
    justification TEXT,                    -- AI's explanation for the suggestion
    model_version VARCHAR(50),             -- Track which AI model version generated this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comparable_id, adjustment_type)
);
```

### Updated Table: `tbl_sales_comp_adjustments`

**New columns added:**
```sql
ALTER TABLE landscape.tbl_sales_comp_adjustments
ADD COLUMN user_adjustment_pct NUMERIC(7,4),    -- User's final value (from Final column)
ADD COLUMN ai_accepted BOOLEAN DEFAULT FALSE,   -- TRUE if user clicked checkbox to accept AI
ADD COLUMN user_notes TEXT,                     -- User's notes about their decision
ADD COLUMN last_modified_by VARCHAR(100);       -- Tracking (future feature)
```

**Existing columns:**
- `adjustment_id` - Primary key
- `comparable_id` - Foreign key to comparable
- `adjustment_type` - Type of adjustment
- `adjustment_pct` - Current/original adjustment percentage
- `adjustment_amount` - Dollar amount (optional)
- `justification` - Original justification text
- `created_at` - Timestamp

---

## Implementation Steps

### Phase 1: Backend Django Models & API

#### Step 1.1: Add AIAdjustmentSuggestion Model

**File:** `backend/apps/financial/models_valuation.py`

Add this model after the `SalesCompAdjustment` class:

```python
class AIAdjustmentSuggestion(models.Model):
    """
    AI-generated adjustment suggestions for sales comparables.
    Maps to landscape.tbl_ai_adjustment_suggestions
    """

    CONFIDENCE_LEVELS = [
        ('high', 'High Confidence'),
        ('medium', 'Medium Confidence'),
        ('low', 'Low Confidence'),
        ('none', 'Insufficient Data'),
    ]

    ai_suggestion_id = models.AutoField(primary_key=True)
    comparable = models.ForeignKey(
        SalesComparable,
        on_delete=models.CASCADE,
        db_column='comparable_id',
        related_name='ai_suggestions'
    )
    adjustment_type = models.CharField(max_length=50)
    suggested_pct = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    confidence_level = models.CharField(
        max_length=20,
        choices=CONFIDENCE_LEVELS,
        null=True,
        blank=True
    )
    justification = models.TextField(null=True, blank=True)
    model_version = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_ai_adjustment_suggestions'
        unique_together = ['comparable', 'adjustment_type']
        ordering = ['comparable', 'adjustment_type']
        verbose_name = 'AI Adjustment Suggestion'
        verbose_name_plural = 'AI Adjustment Suggestions'

    def __str__(self):
        return f"AI: {self.adjustment_type} for {self.comparable}"
```

#### Step 1.2: Update SalesCompAdjustment Model

**File:** `backend/apps/financial/models_valuation.py`

Add these fields to the existing `SalesCompAdjustment` class:

```python
class SalesCompAdjustment(models.Model):
    # ... existing fields ...

    # NEW FIELDS (add these after justification field)
    user_adjustment_pct = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="User's final adjustment value (from Final column)"
    )
    ai_accepted = models.BooleanField(
        default=False,
        help_text="TRUE if user accepted AI suggestion via checkbox"
    )
    user_notes = models.TextField(
        null=True,
        blank=True,
        help_text="User's notes about their adjustment decision"
    )
    last_modified_by = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    # ... rest of existing model ...
```

#### Step 1.3: Create Serializers

**File:** `backend/apps/financial/serializers_valuation.py`

Add this new serializer:

```python
class AIAdjustmentSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for AI adjustment suggestions"""

    adjustment_type_display = serializers.CharField(
        source='get_adjustment_type_display',
        read_only=True
    )

    class Meta:
        model = AIAdjustmentSuggestion
        fields = [
            'ai_suggestion_id',
            'comparable_id',
            'adjustment_type',
            'adjustment_type_display',
            'suggested_pct',
            'confidence_level',
            'justification',
            'model_version',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['ai_suggestion_id', 'created_at', 'updated_at']
```

Update the existing `SalesCompAdjustmentSerializer` to include new fields:

```python
class SalesCompAdjustmentSerializer(serializers.ModelSerializer):
    adjustment_type_display = serializers.CharField(
        source='get_adjustment_type_display',
        read_only=True
    )

    class Meta:
        model = SalesCompAdjustment
        fields = [
            'adjustment_id',
            'comparable_id',
            'adjustment_type',
            'adjustment_type_display',
            'adjustment_pct',
            'adjustment_amount',
            'justification',
            'user_adjustment_pct',    # NEW
            'ai_accepted',            # NEW
            'user_notes',             # NEW
            'last_modified_by',       # NEW
            'created_at'
        ]
        read_only_fields = ['adjustment_id', 'created_at']
```

Update `SalesComparableSerializer` to include AI suggestions:

```python
class SalesComparableSerializer(serializers.ModelSerializer):
    adjustments = SalesCompAdjustmentSerializer(many=True, read_only=True)
    ai_suggestions = AIAdjustmentSuggestionSerializer(many=True, read_only=True)  # NEW
    adjusted_price_per_unit = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_adjustment_pct = serializers.SerializerMethodField()

    class Meta:
        model = SalesComparable
        fields = [
            'comparable_id',
            'project_id',
            'comp_number',
            'property_name',
            'address',
            'city',
            'state',
            'zip',
            'sale_date',
            'sale_price',
            'price_per_unit',
            'price_per_sf',
            'year_built',
            'units',
            'building_sf',
            'cap_rate',
            'grm',
            'distance_from_subject',
            'unit_mix',
            'notes',
            'adjustments',
            'ai_suggestions',           # NEW
            'adjusted_price_per_unit',
            'total_adjustment_pct',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['comparable_id', 'created_at', 'updated_at']

    def get_total_adjustment_pct(self, obj):
        # Use user adjustments if available, otherwise use original adjustments
        total = 0
        for adj in obj.adjustments.all():
            if adj.user_adjustment_pct is not None:
                total += float(adj.user_adjustment_pct)
            elif adj.adjustment_pct is not None:
                total += float(adj.adjustment_pct)
        return total
```

#### Step 1.4: Create API ViewSets

**File:** `backend/apps/financial/views_valuation.py`

Add this new viewset:

```python
class AIAdjustmentSuggestionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for AI adjustment suggestions.

    Endpoints:
    - GET /api/valuation/ai-suggestions/ - List all
    - GET /api/valuation/ai-suggestions/{id}/ - Retrieve one
    - GET /api/valuation/ai-suggestions/by_comp/{comp_id}/ - Get suggestions for a comparable
    - POST /api/valuation/ai-suggestions/ - Create suggestion
    - PATCH /api/valuation/ai-suggestions/{id}/ - Update suggestion
    - DELETE /api/valuation/ai-suggestions/{id}/ - Delete suggestion
    """
    queryset = AIAdjustmentSuggestion.objects.all()
    serializer_class = AIAdjustmentSuggestionSerializer

    @action(detail=False, methods=['get'], url_path='by_comp/(?P<comp_id>[0-9]+)')
    def by_comp(self, request, comp_id=None):
        """Get all AI suggestions for a specific comparable"""
        suggestions = self.queryset.filter(comparable_id=comp_id)
        serializer = self.get_serializer(suggestions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept an AI suggestion and copy to user adjustment.
        This creates/updates the corresponding SalesCompAdjustment record.
        """
        suggestion = self.get_object()

        # Get or create the corresponding adjustment
        adjustment, created = SalesCompAdjustment.objects.get_or_create(
            comparable_id=suggestion.comparable_id,
            adjustment_type=suggestion.adjustment_type,
            defaults={
                'adjustment_pct': suggestion.suggested_pct,
                'user_adjustment_pct': suggestion.suggested_pct,
                'ai_accepted': True,
                'justification': suggestion.justification
            }
        )

        if not created:
            # Update existing adjustment
            adjustment.user_adjustment_pct = suggestion.suggested_pct
            adjustment.ai_accepted = True
            adjustment.save()

        return Response({
            'message': 'AI suggestion accepted',
            'adjustment_id': adjustment.adjustment_id
        })
```

Add to URL router in `backend/apps/financial/urls.py`:

```python
router.register(r'valuation/ai-suggestions', AIAdjustmentSuggestionViewSet, basename='ai-suggestions')
```

---

### Phase 2: Frontend TypeScript Types

**File:** `src/types/valuation.ts`

Add these new interfaces:

```typescript
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface AIAdjustmentSuggestion {
  ai_suggestion_id: number;
  comparable_id: number;
  adjustment_type: string;
  adjustment_type_display: string;
  suggested_pct: number | null;
  confidence_level: ConfidenceLevel | null;
  justification: string | null;
  model_version: string | null;
  created_at: string;
  updated_at: string;
}

// Update existing SalesCompAdjustment interface to include new fields
export interface SalesCompAdjustment {
  adjustment_id: number;
  comparable_id: number;
  adjustment_type: string;
  adjustment_type_display: string;
  adjustment_pct: number | null;
  adjustment_amount: number | null;
  justification: string | null;
  user_adjustment_pct: number | null;      // NEW
  ai_accepted: boolean;                    // NEW
  user_notes: string | null;               // NEW
  last_modified_by: string | null;         // NEW
  created_at: string;
}

// Update SalesComparable to include AI suggestions
export interface SalesComparable {
  comparable_id: number;
  project_id: number;
  comp_number: number | null;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sale_date: string | null;
  sale_price: number | null;
  price_per_unit: number | null;
  price_per_sf: number | null;
  year_built: number | null;
  units: number | null;
  building_sf: number | null;
  cap_rate: number | null;
  grm: number | null;
  distance_from_subject: string | null;
  unit_mix: Record<string, any> | null;
  notes: string | null;
  adjustments: SalesCompAdjustment[];
  ai_suggestions: AIAdjustmentSuggestion[];  // NEW
  adjusted_price_per_unit: number | null;
  total_adjustment_pct: number;
  created_at: string;
  updated_at: string;
}
```

---

### Phase 3: Frontend Components

#### Component 1: AdjustmentCell

**File:** `src/app/projects/[projectId]/valuation/components/AdjustmentCell.tsx`

```typescript
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
      {/* AI Column */}
      <td
        className="py-2 px-2 text-center border-l"
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: style.cellBg
        }}
      >
        {hasAiSuggestion ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
              {aiSuggestion.suggested_pct! > 0 ? '+' : ''}
              {(aiSuggestion.suggested_pct! * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => onAiClick(comparableId, adjustmentType, aiSuggestion)}
              disabled={isDisabled}
              className="text-xs px-2 py-1 rounded font-medium transition-opacity"
              style={{
                backgroundColor: isDisabled ? 'var(--cui-secondary)' : style.buttonBg,
                color: 'white',
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.opacity = '1';
              }}
            >
              Ai
            </button>
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={handleCheckboxClick}
              disabled={isDisabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: style.checkColor,
                cursor: isDisabled ? 'not-allowed' : 'pointer'
              }}
            />
          </div>
        ) : (
          <span style={{ color: 'var(--cui-secondary-color)' }}>-</span>
        )}
      </td>

      {/* Final Column */}
      <td
        className="py-2 px-2 text-center"
        style={{ borderColor: 'var(--cui-border-color)' }}
      >
        <input
          type="text"
          value={finalValue}
          onChange={handleFinalInputChange}
          placeholder="-"
          className="w-20 px-2 py-1 text-sm text-center rounded border"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)'
          }}
        />
      </td>
    </>
  );
}
```

---

## Next Steps for Continuation

When you continue this implementation in a new conversation, start with:

1. **Create the AdjustmentAnalysisPanel component** - This is the focused chat panel that opens when clicking the `Ai` button
2. **Redesign ComparablesGrid** - Implement the 3-column layout structure
3. **Wire up state management** - Track which analysis panel is open, handle data flow
4. **Test the interaction flow** - Ensure all buttons, checkboxes, and inputs work correctly
5. **Add API integration** - Connect to the Django endpoints for saving user adjustments

## Key Files to Reference

**Backend:**
- `backend/migrations/015_ai_adjustment_suggestions.sql` ✅ Created
- `backend/apps/financial/models_valuation.py` - Need to add AIAdjustmentSuggestion model
- `backend/apps/financial/serializers_valuation.py` - Need to create serializers
- `backend/apps/financial/views_valuation.py` - Need to create viewsets

**Frontend:**
- `src/types/valuation.ts` - Add new TypeScript types
- `src/app/projects/[projectId]/valuation/components/AdjustmentCell.tsx` - Component spec provided above
- `src/app/projects/[projectId]/valuation/components/ComparablesGrid.tsx` - Needs redesign
- `src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx` - Needs creation

## Testing Data

Current database has Project ID 17 (Chadron) with 3 sales comparables already loaded. You can use this for testing the new features.

---

**Document Created:** 2025-10-28
**Database Migration Status:** Applied successfully
**Ready for:** Backend Django model implementation → Frontend component development → Integration testing
