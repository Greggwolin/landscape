'use client';

export type OpExMode = 'napkin' | 'standard' | 'detail';

interface OpExModeSelectorProps {
  mode: OpExMode;
  onChange: (mode: OpExMode) => void;
}

const MODE_CONFIG: Record<
  OpExMode,
  { label: string; fields: number; color: 'success' | 'warning' | 'danger'; cssVar: string }
> = {
  napkin: {
    label: 'Napkin',
    fields: 6,
    color: 'success',
    cssVar: '--cui-success'
  },
  standard: {
    label: 'Standard',
    fields: 12,
    color: 'warning',
    cssVar: '--cui-warning'
  },
  detail: {
    label: 'Detail',
    fields: 20,
    color: 'danger',
    cssVar: '--cui-danger'
  }
};

export function OpExModeSelector({ mode, onChange }: OpExModeSelectorProps) {
  const buttons = Object.entries(MODE_CONFIG) as [OpExMode, (typeof MODE_CONFIG)[OpExMode]][];

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {buttons.map(([key, config]) => {
        const isActive = mode === key;
        const textColor = isActive
          ? config.color === 'warning'
            ? '#000'
            : '#fff'
          : `var(${config.cssVar})`;

        return (
          <button
            key={key}
            type="button"
            className="budget-mode-badge"
            data-active={isActive}
            data-color={config.color}
            style={{
              background: isActive ? `var(${config.cssVar})` : 'transparent',
              borderColor: `var(${config.cssVar})`,
              color: textColor
            }}
            onClick={() => onChange(key)}
          >
            <span className="budget-mode-badge-text">
              {config.label} ({config.fields} fields)
            </span>
          </button>
        );
      })}
    </div>
  );
}
