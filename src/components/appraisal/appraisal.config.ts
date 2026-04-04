/**
 * Configuration for the Appraisal Conversational UI
 * Defines approach tabs, pill sets, and default views
 *
 * @version 1.0
 * @created 2026-04-04
 */

import type { ApproachTab, ApproachPillSet } from './appraisal.types';

export const APPROACH_TABS: ApproachTab[] = [
  { id: 'property', label: 'Property', status: 'green' },
  { id: 'market', label: 'Market', status: 'green' },
  { id: 'sales', label: 'Sales', status: 'yellow' },
  { id: 'income', label: 'Income', status: 'green' },
  { id: 'cost', label: 'Cost', status: 'gray' },
  { id: 'reconciliation', label: 'Reconciliation', status: 'gray' },
];

export const APPROACH_PILLS: ApproachPillSet[] = [
  {
    approachId: 'income',
    defaultPill: 'income-proforma',
    pills: [
      { id: 'income-proforma', label: 'Proforma' },
      { id: 'income-unitmix', label: 'Unit mix' },
      { id: 'income-expenses', label: 'Expenses' },
      { id: 'income-otherinc', label: 'Other income' },
      { id: 'income-dcf', label: 'DCF' },
      { id: 'income-rentroll', label: 'Rent roll', isFlyout: true },
    ],
  },
  {
    approachId: 'property',
    defaultPill: 'property-summary',
    pills: [
      { id: 'property-summary', label: 'Summary' },
      { id: 'property-site', label: 'Site' },
      { id: 'property-improvements', label: 'Improvements' },
      { id: 'property-fulldetail', label: 'Full detail', isFlyout: true },
    ],
  },
  {
    approachId: 'market',
    defaultPill: 'market-overview',
    pills: [
      { id: 'market-overview', label: 'Overview' },
      { id: 'market-supply', label: 'Supply / demand' },
      { id: 'market-econ', label: 'Economic' },
    ],
  },
  {
    approachId: 'sales',
    defaultPill: 'sales-comps',
    pills: [
      { id: 'sales-comps', label: 'Comps' },
      { id: 'sales-adjustments', label: 'Adjustments' },
      { id: 'sales-conclusion', label: 'Conclusion' },
      { id: 'sales-adjustgrid', label: 'Adjustment grid', isFlyout: true },
    ],
  },
  {
    approachId: 'cost',
    defaultPill: 'cost-summary',
    pills: [
      { id: 'cost-summary', label: 'Summary' },
      { id: 'cost-land', label: 'Land value' },
      { id: 'cost-replacement', label: 'Replacement' },
      { id: 'cost-depreciation', label: 'Depreciation' },
    ],
  },
  {
    approachId: 'reconciliation',
    defaultPill: 'reconciliation-summary',
    pills: [
      { id: 'reconciliation-summary', label: 'Summary' },
      { id: 'reconciliation-narrative', label: 'Narrative' },
    ],
  },
];

export const APPROACH_LABELS: Record<string, string> = {
  property: 'Property',
  market: 'Market',
  sales: 'Sales comparison',
  income: 'Income approach',
  cost: 'Cost approach',
  reconciliation: 'Reconciliation',
};

export function getPillsForApproach(approachId: string): ApproachPillSet | undefined {
  return APPROACH_PILLS.find((p) => p.approachId === approachId);
}
