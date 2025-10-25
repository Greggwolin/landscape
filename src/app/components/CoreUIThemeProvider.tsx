'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const CoreUIThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('coreui-theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      // Default to light mode
      setThemeState('light');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light-theme', 'dark-theme');

    // Add the current theme class
    root.classList.add(`${theme}-theme`);

    // Set data attribute for CoreUI
    root.setAttribute('data-coreui-theme', theme);

    // Persist to localStorage
    localStorage.setItem('coreui-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    toggleTheme,
    setTheme
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within CoreUIThemeProvider');
  }
  return context;
};
