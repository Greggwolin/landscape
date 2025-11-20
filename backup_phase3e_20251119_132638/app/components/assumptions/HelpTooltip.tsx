'use client';

import { useState } from 'react';
import { FieldDefinition, ComplexityTier } from '@/types/assumptions';

interface HelpTooltipProps {
  field: FieldDefinition;
  currentMode: ComplexityTier;
}

export function HelpTooltip({ field, currentMode }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const helpText = field.helpText[currentMode];
  if (!helpText) return null;

  return (
    <div className="inline-block ml-2 relative">
      <button
        type="button"
        className="help-icon"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        ?
      </button>

      {isOpen && (
        <div className="tooltip">
          <div className="tooltip-content">
            {helpText}
          </div>
        </div>
      )}
    </div>
  );
}
