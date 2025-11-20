/**
 * ModeChip - Mode Indicator Component
 *
 * Displays a small, square chip showing the current granularity mode (Napkin/Standard/Detail)
 * Used in sub-navigation tabs to provide at-a-glance visibility of mode settings.
 *
 * Features:
 * - 20x20px square with rounded corners
 * - Color-coded using CoreUI variables (green/yellow/red)
 * - Tooltip on hover
 * - View-only (not clickable)
 * - Accessible with ARIA labels
 */

'use client';

import React from 'react';
import { CTooltip } from '@coreui/react';

export type ModeType = 'napkin' | 'standard' | 'detail';

interface ModeChipProps {
  mode: ModeType;
  className?: string;
}

const ModeChip: React.FC<ModeChipProps> = ({ mode, className = '' }) => {
  const modeConfig = {
    napkin: {
      label: 'N',
      colorVar: '--cui-success',
      tooltip: 'Napkin Mode',
      ariaLabel: 'Napkin mode active',
    },
    standard: {
      label: 'S',
      colorVar: '--cui-warning',
      tooltip: 'Standard Mode',
      ariaLabel: 'Standard mode active',
    },
    detail: {
      label: 'D',
      colorVar: '--cui-danger',
      tooltip: 'Detail Mode',
      ariaLabel: 'Detail mode active',
    },
  };

  const config = modeConfig[mode];

  return (
    <CTooltip content={config.tooltip} placement="bottom">
      <div
        role="status"
        aria-label={config.ariaLabel}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-white text-[10px] font-bold ml-1 cursor-default ${className}`}
        style={{
          backgroundColor: `var(${config.colorVar})`,
        }}
      >
        {config.label}
      </div>
    </CTooltip>
  );
};

export default ModeChip;
