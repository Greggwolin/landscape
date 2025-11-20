'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const CoreUIThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark'); // Phase 1: Changed default to dark
  const [mounted, setMounted] = useState(false);
  const themeRef = useRef(theme);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('coreui-theme') as 'light' | 'dark' | null;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeState(storedTheme);
      return;
    }

    const domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme === 'light' || domTheme === 'dark') {
      setThemeState(domTheme);
      return;
    }

    // Phase 1: Default to dark mode
    setThemeState('dark');
  }, []);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light-theme', 'dark-theme');

    // Add the current theme class
    root.classList.add(`${theme}-theme`);

    // Set data attributes for tokens + CoreUI
    root.setAttribute('data-coreui-theme', theme);
    root.setAttribute('data-theme', theme);

    // Persist to localStorage
    localStorage.setItem('coreui-theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const attrTheme = root.getAttribute('data-theme');
      if ((attrTheme === 'light' || attrTheme === 'dark') && attrTheme !== themeRef.current) {
        setThemeState(attrTheme);
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [mounted]);

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
