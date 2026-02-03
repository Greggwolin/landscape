// v2.0 · 2025-01-16 · Badge/chip style mode selector
'use client';

import { SemanticButton } from '@/components/ui/landscape';

export type BudgetMode = 'napkin' | 'standard' | 'detail';

interface Props {
  activeMode: BudgetMode;
  onModeChange: (mode: BudgetMode) => void;
}

const MODE_CONFIG = {
  napkin: {
    label: 'Napkin',
    fields: 9,
    color: 'success',
    cssVar: '--cui-success'
  },
  standard: {
    label: 'Standard',
    fields: 28,
    color: 'warning',
    cssVar: '--cui-warning'
  },
  detail: {
    label: 'Detail',
    fields: 49,
    color: 'danger',
    cssVar: '--cui-danger'
  }
} as const;

export default function ModeSelector({ activeMode, onModeChange }: Props) {
  const modes = Object.entries(MODE_CONFIG) as [BudgetMode, typeof MODE_CONFIG[BudgetMode]][];

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {modes.map(([mode, config]) => {
        const isActive = activeMode === mode;
        const textColor = isActive ? (config.color === 'warning' ? '#000' : '#fff') : `var(${config.cssVar})`;
        return (
          <SemanticButton
            key={mode}
            type="button"
            intent="secondary-action"
            variant={isActive ? undefined : 'outline'}
            className="budget-mode-badge"
            data-active={isActive}
            data-color={config.color}
            style={{
              background: isActive ? `var(${config.cssVar})` : 'transparent',
              borderColor: `var(${config.cssVar})`,
              color: textColor,
            }}
            onClick={() => onModeChange(mode)}
          >
            <span className="budget-mode-badge-text">
              {config.label} ({config.fields} fields)
            </span>
          </SemanticButton>
        );
      })}
    </div>
  );
}
