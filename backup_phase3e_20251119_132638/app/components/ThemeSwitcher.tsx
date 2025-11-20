'use client';

import React, { useState, useEffect } from 'react';

const ThemeSwitcher: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check for MUI theme storage key first
    const muiStorageKey = 'landscape-mui-template-mode';
    const savedMuiMode = localStorage.getItem(muiStorageKey);

    // Fallback to generic theme key
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let mode: 'light' | 'dark' = 'light';

    if (savedMuiMode) {
      mode = savedMuiMode as 'light' | 'dark';
    } else if (savedTheme) {
      mode = savedTheme as 'light' | 'dark';
    } else {
      mode = systemPrefersDark ? 'dark' : 'light';
    }

    setCurrentMode(mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, []);

  const toggleTheme = () => {
    const newMode: 'light' | 'dark' = currentMode === 'light' ? 'dark' : 'light';
    setCurrentMode(newMode);

    // Save to both storage keys for compatibility
    localStorage.setItem('theme', newMode);
    localStorage.setItem('landscape-mui-template-mode', newMode);

    // Apply to document for Tailwind dark mode
    document.documentElement.classList.toggle('dark', newMode === 'dark');

    // Dispatch events for different theme systems
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { theme: newMode }
    }));

    // Trigger MUI color scheme change if available
    const colorSchemeMetaTag = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMetaTag) {
      colorSchemeMetaTag.setAttribute('content', newMode);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-full text-left px-6 py-2 text-sm flex items-center space-x-3 hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-300 dark:text-gray-200 hover:text-white"
      title={`Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="text-base">
        {currentMode === 'dark' ? '☀️' : '🌙'}
      </span>
      <span>
        {currentMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
};

export default ThemeSwitcher;