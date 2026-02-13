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
 const containerClass = theme === 'dark' ? 'bg-body' : 'bg-body-secondary';
 const activeClass = theme === 'dark'
 ? 'bg-body text-body shadow-lg'
 : 'bg-body text-blue-600 shadow-sm';
 const inactiveClass = theme === 'dark'
 ? 'text-body-tertiary hover:text-body-tertiary hover:bg-body'
 : 'text-body-secondary hover:text-body';

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
 : 'text-body-tertiary cursor-not-allowed'
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
