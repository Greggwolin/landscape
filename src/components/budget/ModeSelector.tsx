// v1.0 · 2025-11-02 · CoreUI-based mode selector
'use client';

import { CButton, CButtonGroup } from '@coreui/react';

export type BudgetMode = 'napkin' | 'standard' | 'detail';

interface Props {
  activeMode: BudgetMode;
  onModeChange: (mode: BudgetMode) => void;
}

export default function ModeSelector({ activeMode, onModeChange }: Props) {
  const renderButton = (mode: BudgetMode, label: string, color: 'success' | 'warning' | 'danger') => (
    <CButton
      key={mode}
      color={color}
      variant={activeMode === mode ? undefined : 'outline'}
      onClick={() => onModeChange(mode)}
      size="sm"
    >
      {label}
    </CButton>
  );

  return (
    <CButtonGroup role="group" className="mb-3">
      {renderButton('napkin', 'Napkin (7 fields)', 'success')}
      {renderButton('standard', 'Standard (11)', 'warning')}
      {renderButton('detail', 'Detail (15)', 'danger')}
    </CButtonGroup>
  );
}
