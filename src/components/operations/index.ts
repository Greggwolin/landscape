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
export { ValueAddToggle } from './ValueAddToggle';
export { ValueAddAccordion } from './ValueAddAccordion';
export { ValueAddCard } from './ValueAddCard';
export { AddButton } from './AddButton';

// Section Components
export { RentalIncomeSection } from './RentalIncomeSection';
export { VacancyDeductionsSection } from './VacancyDeductionsSection';
export { OtherIncomeSection } from './OtherIncomeSection';
export { OperatingExpensesSection } from './OperatingExpensesSection';
export { DraggableOpexSection } from './DraggableOpexSection';
export { OperatingIncomeCard } from './OperatingIncomeCard';
export { OperatingStatement } from './OperatingStatement';

// Summary Components
export { EGISubtotalBar } from './EGISubtotalBar';
export { NOITotalBar } from './NOITotalBar';
export { SummaryBar } from './SummaryBar';
export { OperationsHeader } from './OperationsHeader';

// Chart Components
export { IncomeTreemap } from './IncomeTreemap';
export { ExpenseTreemap } from './ExpenseTreemap';
