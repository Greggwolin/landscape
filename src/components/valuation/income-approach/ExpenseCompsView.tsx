'use client';

/**
 * ExpenseCompsView Component
 *
 * Expense comparable benchmarking table within the Income Approach tab.
 * Shows subject F-12 expenses alongside project comps and platform knowledge
 * with accept/reject controls per line item.
 *
 * Session: QV17 — Income Approach Redesign
 * @created 2026-03-15
 */

import { useState, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformEstimate {
  lineItem: string;
  category: string;
  min: number;
  max: number;
  recommended: number;
}

interface ExpenseLineItem {
  name: string;
  category: string;
  subjectAmount: number; // Annual total from Operations tab
}

interface ProjectComp {
  projectName: string;
  unitCount: number;
  yearBuilt?: number;
  expenses: Record<string, number>; // lineItem name → annual amount
  totalUnits: number;
  totalSqft: number;
}

type DisplayMode = 'per_unit' | 'per_sf' | 'total';

interface ExpenseCompsViewProps {
  projectId: number;
  /** Subject property info */
  subjectName?: string;
  subjectUnitCount?: number;
  subjectYearBuilt?: number;
  subjectTotalSqft?: number;
  /** Operating expense items from the Operations tab */
  opexItems?: ExpenseLineItem[];
  /** Comparable projects from user's account (stub for now) */
  projectComps?: ProjectComp[];
  /** Platform knowledge estimates (stub for now) */
  platformEstimates?: PlatformEstimate[];
  /** Callback when recommendations are applied */
  onApplyRecommendations?: (items: { lineItem: string; value: number }[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard MF expense categories
// ─────────────────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: { category: string; items: string[] }[] = [
  {
    category: 'Taxes & Insurance',
    items: ['Real Estate Taxes', 'Property Insurance'],
  },
  {
    category: 'Utilities',
    items: ['Electricity', 'Water/Sewer', 'Trash', 'Gas'],
  },
  {
    category: 'Repairs & Maintenance',
    items: ['General R&M', 'Elevator', 'Janitorial', 'Pest Control', 'Landscaping'],
  },
  {
    category: 'Administrative',
    items: ['Management Fee', 'Payroll', 'Marketing'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Stub data for initial implementation
// ─────────────────────────────────────────────────────────────────────────────

const STUB_SUBJECT_EXPENSES: ExpenseLineItem[] = [
  { name: 'Real Estate Taxes', category: 'Taxes & Insurance', subjectAmount: 285000 },
  { name: 'Property Insurance', category: 'Taxes & Insurance', subjectAmount: 78000 },
  { name: 'Electricity', category: 'Utilities', subjectAmount: 42000 },
  { name: 'Water/Sewer', category: 'Utilities', subjectAmount: 67000 },
  { name: 'Trash', category: 'Utilities', subjectAmount: 18000 },
  { name: 'Gas', category: 'Utilities', subjectAmount: 24000 },
  { name: 'General R&M', category: 'Repairs & Maintenance', subjectAmount: 95000 },
  { name: 'Elevator', category: 'Repairs & Maintenance', subjectAmount: 12000 },
  { name: 'Janitorial', category: 'Repairs & Maintenance', subjectAmount: 34000 },
  { name: 'Pest Control', category: 'Repairs & Maintenance', subjectAmount: 8500 },
  { name: 'Landscaping', category: 'Repairs & Maintenance', subjectAmount: 22000 },
  { name: 'Management Fee', category: 'Administrative', subjectAmount: 112000 },
  { name: 'Payroll', category: 'Administrative', subjectAmount: 185000 },
  { name: 'Marketing', category: 'Administrative', subjectAmount: 28000 },
];

const STUB_PLATFORM_ESTIMATES: PlatformEstimate[] = [
  { lineItem: 'Real Estate Taxes', category: 'Taxes & Insurance', min: 2180, max: 2612, recommended: 2410 },
  { lineItem: 'Property Insurance', category: 'Taxes & Insurance', min: 580, max: 820, recommended: 690 },
  { lineItem: 'Electricity', category: 'Utilities', min: 280, max: 420, recommended: 350 },
  { lineItem: 'Water/Sewer', category: 'Utilities', min: 480, max: 680, recommended: 560 },
  { lineItem: 'Trash', category: 'Utilities', min: 120, max: 200, recommended: 155 },
  { lineItem: 'Gas', category: 'Utilities', min: 150, max: 280, recommended: 210 },
  { lineItem: 'General R&M', category: 'Repairs & Maintenance', min: 650, max: 950, recommended: 800 },
  { lineItem: 'Elevator', category: 'Repairs & Maintenance', min: 80, max: 150, recommended: 110 },
  { lineItem: 'Janitorial', category: 'Repairs & Maintenance', min: 200, max: 380, recommended: 280 },
  { lineItem: 'Pest Control', category: 'Repairs & Maintenance', min: 50, max: 100, recommended: 72 },
  { lineItem: 'Landscaping', category: 'Repairs & Maintenance', min: 140, max: 260, recommended: 190 },
  { lineItem: 'Management Fee', category: 'Administrative', min: 780, max: 1100, recommended: 920 },
  { lineItem: 'Payroll', category: 'Administrative', min: 1200, max: 1800, recommended: 1520 },
  { lineItem: 'Marketing', category: 'Administrative', min: 180, max: 320, recommended: 240 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format values
// ─────────────────────────────────────────────────────────────────────────────

function formatExpenseValue(
  amount: number,
  mode: DisplayMode,
  unitCount: number,
  totalSqft: number
): string {
  let value: number;
  switch (mode) {
    case 'per_unit':
      value = unitCount > 0 ? amount / unitCount : 0;
      break;
    case 'per_sf':
      value = totalSqft > 0 ? amount / totalSqft : 0;
      break;
    case 'total':
    default:
      value = amount;
      break;
  }
  if (mode === 'per_sf') {
    return `$${value.toFixed(2)}`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPlatformValue(
  perUnit: number,
  mode: DisplayMode,
  unitCount: number,
  totalSqft: number
): string {
  // Platform estimates are always in $/unit — convert if needed
  let value: number;
  switch (mode) {
    case 'per_unit':
      value = perUnit;
      break;
    case 'per_sf':
      value = totalSqft > 0 ? (perUnit * unitCount) / totalSqft : 0;
      break;
    case 'total':
      value = perUnit * unitCount;
      break;
    default:
      value = perUnit;
  }
  if (mode === 'per_sf') {
    return `$${value.toFixed(2)}`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ExpenseCompsView({
  projectId,
  subjectName = 'Subject Property',
  subjectUnitCount = 120,
  subjectYearBuilt,
  subjectTotalSqft = 96000,
  opexItems,
  projectComps = [],
  platformEstimates,
  onApplyRecommendations,
}: ExpenseCompsViewProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('per_unit');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Use stubs when no real data provided
  const expenses = opexItems && opexItems.length > 0 ? opexItems : STUB_SUBJECT_EXPENSES;
  const platformData = platformEstimates && platformEstimates.length > 0 ? platformEstimates : STUB_PLATFORM_ESTIMATES;

  // Build a lookup for platform estimates
  const platformLookup = useMemo(() => {
    const map = new Map<string, PlatformEstimate>();
    platformData.forEach((e) => map.set(e.lineItem, e));
    return map;
  }, [platformData]);

  // Build expense lookup
  const expenseLookup = useMemo(() => {
    const map = new Map<string, ExpenseLineItem>();
    expenses.forEach((e) => map.set(e.name, e));
    return map;
  }, [expenses]);

  // Calculate totals
  const subjectTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.subjectAmount, 0),
    [expenses]
  );

  const platformTotal = useMemo(
    () => platformData.reduce((sum, e) => sum + e.recommended * subjectUnitCount, 0),
    [platformData, subjectUnitCount]
  );

  const toggleItem = useCallback((name: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const items = Array.from(selectedItems).map((name) => {
      const est = platformLookup.get(name);
      return {
        lineItem: name,
        value: est ? est.recommended * subjectUnitCount : 0,
      };
    });
    if (onApplyRecommendations) {
      onApplyRecommendations(items);
    } else {
      console.log('Apply recommendations:', items);
    }
  }, [selectedItems, platformLookup, subjectUnitCount, onApplyRecommendations]);

  const subjectExpenseRatio = subjectTotal > 0 ? ((subjectTotal / (subjectTotal * 2.2)) * 100).toFixed(1) : '—';
  const platformExpenseRatio = platformTotal > 0 ? ((platformTotal / (platformTotal * 2.2)) * 100).toFixed(1) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Benchmarking Table */}
      <div
        style={{
          border: '1px solid var(--cui-border-color)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          backgroundColor: 'var(--cui-card-bg)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  ...thStyle,
                  textAlign: 'left',
                  minWidth: '160px',
                }}
              >
                Expense Line Item
              </th>
              <th style={{ ...thStyle, ...subjectHighlight, textAlign: 'right', whiteSpace: 'normal' }}>
                Subject F-12
              </th>
              {projectComps.map((comp) => (
                <th
                  key={comp.projectName}
                  style={{ ...thStyle, textAlign: 'right', whiteSpace: 'normal' }}
                >
                  {comp.projectName}
                </th>
              ))}
              <th
                style={{
                  ...thStyle,
                  ...platformHighlight,
                  textAlign: 'right',
                  whiteSpace: 'normal',
                  minWidth: '180px',
                }}
              >
                Platform Knowledge
              </th>
              <th style={{ ...thStyle, width: '36px', textAlign: 'center' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSE_CATEGORIES.map((cat) => (
              <CategoryGroup
                key={cat.category}
                category={cat.category}
                items={cat.items}
                expenseLookup={expenseLookup}
                platformLookup={platformLookup}
                projectComps={projectComps}
                displayMode={displayMode}
                unitCount={subjectUnitCount}
                totalSqft={subjectTotalSqft}
                selectedItems={selectedItems}
                onToggleItem={toggleItem}
              />
            ))}

            {/* Total OpEx Row */}
            <tr style={{ borderTop: '2px solid var(--cui-border-color)' }}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total OpEx</td>
              <td style={{ ...tdStyle, ...subjectHighlight, textAlign: 'right', fontWeight: 700 }}>
                {formatExpenseValue(subjectTotal, displayMode, subjectUnitCount, subjectTotalSqft)}
              </td>
              {projectComps.map((comp) => {
                const compTotal = Object.values(comp.expenses).reduce((s, v) => s + v, 0);
                return (
                  <td key={comp.projectName} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                    {formatExpenseValue(compTotal, displayMode, comp.totalUnits, comp.totalSqft)}
                  </td>
                );
              })}
              <td style={{ ...tdStyle, ...platformHighlight, textAlign: 'right', fontWeight: 700 }}>
                {formatPlatformValue(
                  platformData.reduce((s, e) => s + e.recommended, 0),
                  displayMode,
                  subjectUnitCount,
                  subjectTotalSqft
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }} />
            </tr>

            {/* Expense Ratio Row */}
            <tr>
              <td style={{ ...tdStyle, color: 'var(--cui-secondary-color)', fontStyle: 'italic' }}>
                Expense Ratio
              </td>
              <td style={{ ...tdStyle, ...subjectHighlight, textAlign: 'right', color: 'var(--cui-secondary-color)' }}>
                {subjectExpenseRatio}%
              </td>
              {projectComps.map((comp) => (
                <td key={comp.projectName} style={{ ...tdStyle, textAlign: 'right', color: 'var(--cui-secondary-color)' }}>
                  —
                </td>
              ))}
              <td style={{ ...tdStyle, ...platformHighlight, textAlign: 'right', color: 'var(--cui-secondary-color)' }}>
                {platformExpenseRatio}%
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Apply Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleApply}
          disabled={selectedItems.size === 0}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            border: 'none',
            cursor: selectedItems.size > 0 ? 'pointer' : 'not-allowed',
            backgroundColor: selectedItems.size > 0 ? 'var(--cui-primary)' : 'var(--cui-secondary-bg)',
            color: selectedItems.size > 0 ? 'white' : 'var(--cui-secondary-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          Apply {selectedItems.size > 0 ? `${selectedItems.size} ` : ''}recommendation{selectedItems.size !== 1 ? 's' : ''} to pro forma
          {selectedItems.size > 0 && (
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: '9999px',
                padding: '0.125rem 0.5rem',
                fontSize: '0.75rem',
              }}
            >
              {selectedItems.size}
            </span>
          )}
        </button>
      </div>

      {/* Landscaper Analysis Placeholder */}
      <div
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--cui-body-color)',
            marginBottom: '0.5rem',
          }}
        >
          Landscaper analysis
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--cui-secondary-color)',
            lineHeight: 1.6,
          }}
        >
          Expense benchmarking analysis will appear here. Landscaper will compare the subject&apos;s F-12 operating
          expenses against platform knowledge and highlight line items where the subject deviates significantly
          from market norms. Ask Landscaper for a detailed expense analysis.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Group Sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category: string;
  items: string[];
  expenseLookup: Map<string, ExpenseLineItem>;
  platformLookup: Map<string, PlatformEstimate>;
  projectComps: ProjectComp[];
  displayMode: DisplayMode;
  unitCount: number;
  totalSqft: number;
  selectedItems: Set<string>;
  onToggleItem: (name: string) => void;
}

function CategoryGroup({
  category,
  items,
  expenseLookup,
  platformLookup,
  projectComps,
  displayMode,
  unitCount,
  totalSqft,
  selectedItems,
  onToggleItem,
}: CategoryGroupProps) {
  return (
    <>
      {/* Category Header Row */}
      <tr>
        <td
          colSpan={3 + projectComps.length}
          style={{
            padding: '0.5rem 0.75rem 0.25rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--cui-secondary-color)',
            borderTop: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--cui-tertiary-bg)',
          }}
        >
          {category}
        </td>
      </tr>

      {/* Line Items */}
      {items.map((itemName) => {
        const expense = expenseLookup.get(itemName);
        const platform = platformLookup.get(itemName);
        const isSelected = selectedItems.has(itemName);

        return (
          <tr key={itemName}>
            <td style={{ ...tdStyle, paddingLeft: '1.25rem' }}>{itemName}</td>

            {/* Subject F-12 */}
            <td style={{ ...tdStyle, ...subjectHighlight, textAlign: 'right' }}>
              {expense
                ? formatExpenseValue(expense.subjectAmount, displayMode, unitCount, totalSqft)
                : '—'}
            </td>

            {/* Project Comps */}
            {projectComps.map((comp) => {
              const compAmount = comp.expenses[itemName];
              return (
                <td key={comp.projectName} style={{ ...tdStyle, textAlign: 'right' }}>
                  {compAmount != null
                    ? formatExpenseValue(compAmount, displayMode, comp.totalUnits, comp.totalSqft)
                    : '—'}
                </td>
              );
            })}

            {/* Platform Knowledge */}
            <td style={{ ...tdStyle, ...platformHighlight, textAlign: 'right' }}>
              {platform ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--cui-secondary-color)' }}>
                    {formatPlatformValue(platform.min, displayMode, unitCount, totalSqft)} –{' '}
                    {formatPlatformValue(platform.max, displayMode, unitCount, totalSqft)}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.0625rem 0.375rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(var(--cui-success-rgb), 0.15)',
                      color: 'var(--cui-success)',
                    }}
                  >
                    [{formatPlatformValue(platform.recommended, displayMode, unitCount, totalSqft)}]
                  </span>
                </div>
              ) : (
                '—'
              )}
            </td>

            {/* Accept/Reject Checkbox */}
            <td style={{ ...tdStyle, textAlign: 'center' }}>
              {platform && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleItem(itemName)}
                  style={{
                    width: '14px',
                    height: '14px',
                    cursor: 'pointer',
                    accentColor: 'var(--cui-success)',
                  }}
                  title={`Use Landscaper's recommended value for ${itemName}`}
                />
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  borderBottom: '2px solid var(--cui-border-color)',
  color: 'var(--cui-body-color)',
  backgroundColor: 'var(--cui-card-header-bg)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.3125rem 0.75rem',
  fontSize: '0.8125rem',
  color: 'var(--cui-body-color)',
  borderBottom: '1px solid var(--cui-border-color-translucent)',
  whiteSpace: 'nowrap',
};

const subjectHighlight: React.CSSProperties = {
  backgroundColor: 'var(--cui-expense-subject-bg)',
};

const platformHighlight: React.CSSProperties = {
  backgroundColor: 'var(--cui-expense-platform-bg)',
};

export default ExpenseCompsView;
