'use client';

import React from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface ModeToggleProps {
  currentMode: ComplexityTier;
  availableModes: ComplexityTier[];
  onChange: (mode: ComplexityTier) => void;
  onRestrictedClick?: (mode: ComplexityTier) => void;
  showFieldCounts?: boolean;
  fieldCounts?: {
    basic: number;
    standard: number;
    advanced: number;
  };
  size?: 'sm' | 'md' | 'lg';
  position?: 'inline' | 'floating';
  theme?: 'light' | 'dark';
}

export function ModeToggle({
  currentMode,
  availableModes,
  onChange,
  onRestrictedClick,
  showFieldCounts = false,
  fieldCounts,
  size = 'md',
  position = 'inline',
  theme = 'light'
}: ModeToggleProps) {

  const modes: ComplexityTier[] = ['basic', 'standard', 'advanced'];

  const handleModeClick = (mode: ComplexityTier) => {
    if (availableModes.includes(mode)) {
      onChange(mode);
    } else if (onRestrictedClick) {
      onRestrictedClick(mode);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const baseClass = sizeClasses[size];

  // Theme-specific classes
  const containerClass = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const activeClass = theme === 'dark'
    ? 'bg-gray-900 text-white shadow-lg'
    : 'bg-white text-blue-600 shadow-sm';
  const inactiveClass = theme === 'dark'
    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
    : 'text-gray-600 hover:text-gray-900';

  return (
    <div className={`mode-toggle ${position === 'floating' ? 'fixed bottom-4 right-4 z-50' : ''}`}>
      <div className={`flex items-center gap-1 ${containerClass} rounded-lg p-1`}>
        {modes.map((mode) => {
          const isActive = currentMode === mode;
          const isAvailable = availableModes.includes(mode);
          const count = fieldCounts?.[mode];

          return (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              disabled={!isAvailable && !onRestrictedClick}
              className={`
                ${baseClass}
                rounded-md font-medium transition-all
                ${isActive
                  ? activeClass
                  : isAvailable
                    ? inactiveClass
                    : 'text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <span className="capitalize">{mode}</span>
              {showFieldCounts && count && (
                <span className="ml-1 text-xs opacity-70">({count})</span>
              )}
              {!isAvailable && onRestrictedClick && (
                <span className="ml-1">🔒</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
