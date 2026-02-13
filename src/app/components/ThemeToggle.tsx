'use client';

import React from 'react';
import { useTheme } from './CoreUIThemeProvider';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
 const { theme, toggleTheme } = useTheme();

 return (
 <div className={className || ''}>
 <div className="flex items-center justify-between p-3 bg-body rounded-lg border border">
 <div className="flex items-center gap-2">
 <svg
 width="18"
 height="18"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 className={theme === 'light' ? 'text-yellow-400' : 'text-body-tertiary'}
 >
 <circle cx="12" cy="12" r="5"/>
 <line x1="12" y1="1" x2="12" y2="3"/>
 <line x1="12" y1="21" x2="12" y2="23"/>
 <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
 <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
 <line x1="1" y1="12" x2="3" y2="12"/>
 <line x1="21" y1="12" x2="23" y2="12"/>
 <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
 <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
 </svg>
 <span className="text-xs text-body-tertiary font-medium">
 {theme === 'light' ? 'Light' : 'Dark'} Mode
 </span>
 </div>
 <button
 onClick={toggleTheme}
 className="px-3 py-1 text-xs font-medium rounded bg-body hover:bg-body text-body transition-colors"
 >
 Switch to {theme === 'light' ? 'Dark' : 'Light'}
 </button>
 </div>
 </div>
 );
};
