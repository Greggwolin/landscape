/**
 * Operations Tab Components
 *
 * Unified P&L view for Multifamily Operations
 */

// Types
export * from './types';

// Base Components
export { InputCell } from './InputCell';
export type { InputCellVariant, InputCellFormat } from './InputCell';

export { ItemNameEditor } from './ItemNameEditor';

export { EvidenceCell } from './EvidenceCell';
export type { EvidenceCellFormat } from './EvidenceCell';

export { GrowthBadge, FeeBadge } from './GrowthBadge';
export type { GrowthBadgeType } from './GrowthBadge';

// Layout Components
export { SectionCard } from './SectionCard';
export { DetailSummaryToggle } from './DetailSummaryToggle';
export { ValueAddCard } from './ValueAddCard';
export { AddButton } from './AddButton';

// Section Components
export { RentalIncomeSection } from './RentalIncomeSection';
export { OperatingStatement } from './OperatingStatement';

// Summary Components
export { SummaryBar } from './SummaryBar';
export { OperationsHeader } from './OperationsHeader';

// Chart Components
export { IncomeTreemap } from './IncomeTreemap';
export { ExpenseTreemap } from './ExpenseTreemap';
