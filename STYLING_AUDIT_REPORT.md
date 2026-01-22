# Styling & Theme Audit Report

Date: January 20, 2026
Purpose: Comprehensive report on current styling architecture to inform StudioUI cleanup

---

## SECTION 1: GLOBAL CONFIGURATION

### 1.1 Tailwind Config

**File:** `tailwind.config.js`

```js
const withVar = (v) => `var(${v})`;

module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/styles/**/*.{css}',
  ],
  theme: {
    extend: {
      colors: {
        // Existing tokens (preserved for backward compatibility)
        surface: {
          bg: withVar('--surface-bg'),
          card: withVar('--surface-card'),
          tile: withVar('--surface-tile'),
        },
        text: {
          primary: withVar('--text-primary'),
          secondary: withVar('--text-secondary'),
          inverse: withVar('--text-inverse'),
        },
        line: {
          soft: withVar('--line-soft'),
          strong: withVar('--line-strong'),
        },
        brand: {
          primary: withVar('--brand-primary'),
          accent: withVar('--brand-accent'),
        },
        parcel: {
          residential: withVar('--parcel-residential'),
          commercial: withVar('--parcel-commercial'),
          other: withVar('--parcel-other'),
        },
        chip: {
          info: withVar('--chip-info'),
          success: withVar('--chip-success'),
          warning: withVar('--chip-warning'),
          error: withVar('--chip-error'),
          muted: withVar('--chip-muted'),
        },

        // CoreUI semantic colors (Phase 1 - v1.0)
        // Primary (actions, links, focus)
        primary: {
          DEFAULT: '#0ea5e9',  // brand-primary (sky-500)
          hover: '#0284c7',    // sky-600
          light: '#38bdf8',    // sky-400
          dark: '#0369a1',     // sky-700
        },

        // Success (positive states, complete)
        success: {
          DEFAULT: '#16a34a',  // green-600
          hover: '#15803d',    // green-700
          light: '#22c55e',    // green-500
          chip: '#dcfce7',     // green-100 (light mode)
          chipDark: '#14532d', // green-900 (dark mode)
        },

        // Warning (pending, alerts)
        warning: {
          DEFAULT: '#ca8a04',  // yellow-600
          hover: '#a16207',    // yellow-700
          light: '#eab308',    // yellow-500
          chip: '#fef3c7',     // yellow-100 (light mode)
          chipDark: '#713f12', // yellow-900 (dark mode)
        },

        // Danger (errors, delete)
        danger: {
          DEFAULT: '#dc2626',  // red-600
          hover: '#b91c1c',    // red-700
          light: '#ef4444',    // red-500
          chip: '#fee2e2',     // red-100 (light mode)
          chipDark: '#7f1d1d', // red-900 (dark mode)
        },

        // Secondary (cancel, neutral actions)
        secondary: {
          DEFAULT: '#64748b',  // slate-500
          hover: '#475569',    // slate-600
          light: '#94a3b8',    // slate-400
        },
      },
    },
  },
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
```

**Observations:**
- Custom color tokens are split between CSS variable-backed palettes (surface/text/line/brand/etc.) and hardcoded semantic colors (primary/success/warning/danger/secondary).
- Dark mode uses class or `[data-theme="dark"]`, allowing both approaches.

**Questions:**
- Should the semantic CoreUI colors in Tailwind be aligned with CSS variable tokens to avoid duplicate sources of truth?
- Is the `darkMode` strategy expected to rely on `[data-theme="dark"]` only, or should `.dark` be used consistently?

### 1.2 Global CSS

**File:** `src/app/globals.css`

```css
/* MapLibre GL CSS - must be first */
@import 'maplibre-gl/dist/maplibre-gl.css';
@import '../styles/tokens.css';
@import '../styles/component-patterns.css';

/* MapLibre popup styles */
.maplibregl-popup {
  z-index: 9999 !important;
}

.maplibregl-popup-content {
  background: #1f2937 !important;
  color: #f9fafb !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
  padding: 0 !important;
  border: 1px solid #374151 !important;
}

.maplibregl-popup-tip {
  border-top-color: #1f2937 !important;
}

.maplibregl-popup-close-button {
  color: #9ca3af !important;
  font-size: 18px !important;
  padding: 4px 8px !important;
}

.maplibregl-popup-close-button:hover {
  color: #f9fafb !important;
  background: transparent !important;
}

.map-marker-popup .maplibregl-popup-content {
  background: #1f2937 !important;
}

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Override planning-tile styles with maximum specificity */
@layer utilities {
  .planning-tile-active {
    color: var(--cui-body-color) !important;
  }

  .planning-tile-header {
    color: var(--cui-body-color) !important;
  }

  .planning-tile.planning-tile-active .planning-tile-header,
  .planning-tile-active .planning-tile-header,
  div.planning-tile-active .planning-tile-header,
  div.planning-tile-active > .planning-tile-header {
    color: var(--cui-body-color) !important;
  }

  /* Budget group rows - maintain background */
  tr.budget-group-row[data-group-row="true"],
  tr.budget-group-row[data-group-row="true"] td,
  tr[data-group-row="true"],
  tr[data-group-row="true"] td,
  .budget-group-row,
  .budget-group-row td {
    background-color: var(--surface-subheader) !important;
  }

  tr.budget-group-row[data-group-row="true"]:hover,
  tr.budget-group-row[data-group-row="true"]:hover td,
  tr[data-group-row="true"]:hover,
  tr[data-group-row="true"]:hover td,
  .budget-group-row:hover,
  .budget-group-row:hover td {
    background-color: var(--surface-subheader) !important;
    filter: brightness(0.97);
  }
}

/* Override ALL table headers globally - must be outside @layer to avoid Tailwind conflicts */
thead,
thead tr,
thead th {
  background-color: var(--surface-card-header) !important;
}

/* Nuclear option: Maximum specificity with element selectors */
div.planning-tile.planning-tile-active,
div.planning-tile.planning-tile-active *,
div.planning-tile-active,
div.planning-tile-active * {
  color: var(--cui-body-color) !important;
}

div.planning-tile-header,
div.planning-tile.planning-tile-active div.planning-tile-header,
.planning-tile-active > .planning-tile-header,
.planning-tile-active .planning-tile-header {
  color: var(--cui-body-color) !important;
}

:root {
  --background: var(--surface-bg);
  --foreground: var(--text-primary);
}

.dark {
  --background: var(--surface-bg);
  --foreground: var(--text-primary);
}

/* Universal spacing + layout helpers */
.app-shell {
  padding: var(--app-padding);
  display: flex;
  flex-direction: column;
  gap: var(--component-gap);
}

.app-page,
.app-content,
.app-stack {
  display: flex;
  flex-direction: column;
  gap: var(--component-gap);
}

.capitalization-panel {
  background-color: #ffffff !important;
  align-self: stretch;
  min-height: 100%;
}

.card,
.panel {
  margin-bottom: var(--component-gap);
}

.section-spacing {
  margin-bottom: var(--component-gap);
}

@theme inline {
  --color-background: var(--surface-bg);
  --color-foreground: var(--text-primary);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--surface-bg);
  color: var(--text-primary);
  font-family: Arial, Helvetica, sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Remove spinners from number inputs */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Force all dropdown and input styling */
.parcel-inline-select,
.parcel-inline-input,
select[class*='parcel-inline'],
input[class*='parcel-inline'] {
  color: var(--text-primary) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  background-color: var(--surface-card) !important;
  color-scheme: light !important;
  -webkit-appearance: menulist !important;
  appearance: menulist !important;
  border: 1px solid var(--line-strong) !important;
  line-height: 1.2 !important;
  padding: 2px 4px !important;
  font-size: 12px !important;
}

/* Target option elements with maximum specificity */
.parcel-inline-select option,
select.parcel-inline-select option,
select[class*='parcel-inline'] option,
option {
  color: var(--text-primary) !important;
  background-color: var(--surface-card) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  background: var(--surface-card) !important;
}

/* Force all states of select elements */
select.parcel-inline-select,
select.parcel-inline-select:focus,
select.parcel-inline-select:active,
select.parcel-inline-select:hover,
select.parcel-inline-select:visited,
select[class*='parcel-inline'] {
  color: var(--text-primary) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  background-color: var(--surface-card) !important;
  background: var(--surface-card) !important;
}

/* Override any inherited styles from parent containers */
.parcel-inline-select *,
select[class*='parcel-inline'] * {
  color: var(--text-primary) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}

/* Global option override for dropdown visibility */
div[class*='planning'] select option,
div[class*='wizard'] select option,
div[class*='parcel'] select option {
  color: var(--text-primary) !important;
  background-color: var(--surface-card) !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}

/* ===== ACCESSIBILITY: Focus Indicators (Phase 1 - v1.0) ===== */
/* WCAG 2.1 AA Compliance: Visible focus indicators on all interactive elements */

/* Primary focus style for all interactive elements */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[role="button"]:focus-visible,
[role="link"]:focus-visible,
[role="tab"]:focus-visible,
[tabindex]:not([tabindex="-1"]):focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
  transition: outline 0.1s ease-in-out;
}

/* Enhanced focus for form controls (additional ring for visibility) */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
}

/* Focus for CoreUI components (they inherit base styles automatically) */
.btn:focus-visible,
.form-control:focus-visible,
.form-select:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Remove default browser focus styles (we're replacing with custom) */
button:focus:not(:focus-visible),
a:focus:not(:focus-visible),
input:focus:not(:focus-visible),
select:focus:not(:focus-visible),
textarea:focus:not(:focus-visible) {
  outline: none;
}

/* Ensure keyboard navigation is visible in tables */
table tbody tr:focus-visible,
.table tbody tr:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: -2px;
}

/* Focus for custom interactive components */
[data-interactive="true"]:focus-visible,
.interactive:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
```

**Observations:**
- Global CSS uses extensive `!important` overrides and high specificity selectors, implying conflicts with Tailwind/CoreUI defaults.
- `.dark` is defined, but theme toggling uses `data-theme` and `light-theme`/`dark-theme` classes (see CoreUIThemeProvider). `.dark` may be unused.
- Global overrides for tables and planning tiles bypass Tailwind layering in multiple ways.

**Questions:**
- Should the `.dark` class be retained if the app relies on `[data-theme="dark"]` and custom theme classes?
- Is it intended for global table header styles to apply everywhere (including MUI/CoreUI tables)?

### 1.3 PostCSS Config

**File:** `postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Observations:**
- Standard Tailwind + Autoprefixer only.

**Questions:**
- None.

---

## SECTION 2: THEME SYSTEM

### 2.1 Theme Provider / Context / Hooks

**File:** `src/app/components/CoreUIThemeProvider.tsx`

```tsx
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
```

**File:** `src/app/components/ThemeToggle.tsx`

```tsx
'use client';

import React from 'react';
import { useTheme } from './CoreUIThemeProvider';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={className || ''}>
      <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
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
            className={theme === 'light' ? 'text-yellow-400' : 'text-gray-500'}
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
          <span className="text-xs text-gray-300 font-medium">
            {theme === 'light' ? 'Light' : 'Dark'} Mode
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors"
        >
          Switch to {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </div>
  );
};
```

**File:** `src/app/components/Providers.tsx`

```tsx
// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'

// Component Imports
import UpgradeToProButton from '@components/upgrade-to-pro-button'

// Util Imports
import { getMode, getSettingsFromCookie } from '@core/utils/serverHelpers'

type Props = ChildrenType & {
  direction: Direction
}

const Providers = (props: Props) => {
  // Props
  const { children, direction } = props

  // Vars
  const mode = getMode()
  const settingsCookie = getSettingsFromCookie()

  return (
    <VerticalNavProvider>
      <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
        <ThemeProvider direction={direction}>
          {children}
          <UpgradeToProButton />
        </ThemeProvider>
      </SettingsProvider>
    </VerticalNavProvider>
  )
}

export default Providers
```

**Observations:**
- Theme state is stored in `localStorage` (`coreui-theme`) and mirrored to `data-theme` and `data-coreui-theme` on `<html>`.
- Tailwind dark mode is configured to read `[data-theme="dark"]`, so it should work even without `.dark`.
- Multiple theme providers exist: CoreUIThemeProvider for global app, and MUI CssVarsProvider in `@components/theme` (see Section 2.2), suggesting overlapping theme systems.

**Questions:**
- Which theme provider is authoritative for the app shell: CoreUIThemeProvider or the MUI CssVarsProvider theme (or both)?
- Should the localStorage key be unified across theme systems (`coreui-theme` vs the MUI template key)?

### 2.2 MUI Theme / ThemeProvider Usage

**File:** `src/app/components/theme.ts`

```ts
// src/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7367F0" },
    secondary: { main: "#28C76F" },
    background: { default: "#F8F7FA", paper: "#FFFFFF" }
  },
  typography: {
    fontFamily: ["Public Sans", "Roboto", "Helvetica", "Arial", "sans-serif"].join(",")
  }
});

export default theme;
```

**File:** `src/app/components/theme/index.tsx`

```tsx
'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import { deepmerge } from '@mui/utils'
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  experimental_extendTheme as extendTheme,
  lighten,
  darken
} from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import type {} from '@mui/material/themeCssVarsAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build
import type {} from '@mui/lab/themeAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build

// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Component Imports
import ModeChanger from './ModeChanger'

// Config Imports
import themeConfig from '@configs/themeConfig'
import primaryColorConfig from '@configs/primaryColorConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Core Theme Imports
import defaultCoreTheme from '@core/theme'

type Props = ChildrenType & {
  direction: Direction
}

const ThemeProvider = (props: Props) => {
  // Props
  const { children, direction } = props

  // Hooks
  const { settings } = useSettings()

  // Merge the primary color scheme override with the core theme
  const theme = useMemo(() => {
    const newColorScheme = {
      colorSchemes: {
        light: {
          palette: {
            primary: {
              main: primaryColorConfig[0].main,
              light: lighten(primaryColorConfig[0].main as string, 0.2),
              dark: darken(primaryColorConfig[0].main as string, 0.1)
            }
          }
        },
        dark: {
          palette: {
            primary: {
              main: primaryColorConfig[0].main,
              light: lighten(primaryColorConfig[0].main as string, 0.2),
              dark: darken(primaryColorConfig[0].main as string, 0.1)
            }
          }
        }
      }
    }

    const coreTheme = deepmerge(defaultCoreTheme(settings.mode || 'light', direction), newColorScheme)

    return extendTheme(coreTheme)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode])

  return (
    <AppRouterCacheProvider options={{ prepend: true }}>
      <CssVarsProvider
        theme={theme}
        defaultMode={settings.mode}
        modeStorageKey={`${themeConfig.templateName.toLowerCase().split(' ').join('-')}-mui-template-mode`}
      >
        <>
          <ModeChanger />
          <CssBaseline />
          {children}
        </>
      </CssVarsProvider>
    </AppRouterCacheProvider>
  )
}

export default ThemeProvider
```

**File:** `src/app/components/ThemeRegistry.tsx`

```tsx
// src/app/components/ThemeRegistry.tsx
// v1.2 — fixes hydration by injecting Emotion styles during SSR

"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";
import createCache from "@emotion/cache";
import type { EmotionCache } from '@emotion/cache'
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// Create a new Emotion cache with 'mui' key and prepend true
function createEmotionCache() {
  return createCache({ key: "mui", prepend: true });
}

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const cache = React.useMemo<EmotionCache>(() => createEmotionCache(), []);
  const inserted: string[] = [];

  // Monkey‑patch cache.insert to keep track of injected names
  type InsertFn = (selector: string, serialized: { name: string }, sheet?: unknown, shouldCache?: boolean) => void
  const prevInsert: InsertFn = (cache as unknown as { insert: InsertFn }).insert
  ;(cache as unknown as { insert: InsertFn }).insert = (
    selector: string,
    serialized: { name: string },
    sheet?: unknown,
    shouldCache?: boolean
  ) => {
    if (!(cache.inserted as Record<string, boolean | string>)[serialized.name]) {
      inserted.push(serialized.name)
    }
    prevInsert(selector, serialized, sheet, shouldCache)
  }

  // Push collected styles into the server HTML so client matches server
  useServerInsertedHTML(() => {
    const styles = inserted
      .map((name) => cache.inserted[name])
      .filter(Boolean)
      .join("");
    return (
      <style
        data-emotion={`${cache.key} ${inserted.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
```

**File:** `src/theme.ts`

```ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7367f0", // Materio purple
    },
    secondary: {
      main: "#28c76f", // Materio green
    },
    background: {
      default: "#f4f5fa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
  },
});

export default theme;
```

**File:** `src/theme/index.ts`

```ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

export default theme;
```

**File:** `src/theme/muiTheme.ts`

```ts
"use client";

import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#9155FD", // Materio purple
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#8A8D93", // neutral gray
    },
    background: {
      default: "#F8F7FA", // light gray background
      paper: "#FFFFFF",   // white cards/panels
    },
    text: {
      primary: "#2F2B3D",
      secondary: "#6F6B7D",
    },
    success: {
      main: "#56CA00",
    },
    error: {
      main: "#FF4C51",
    },
    warning: {
      main: "#FFB400",
    },
    info: {
      main: "#16B1FF",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h6: {
      fontWeight: 600,
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  shape: {
    borderRadius: 10, // rounded corners like Materio
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow:
            "0px 2px 4px rgba(47, 43, 61, 0.1), 0px 8px 16px rgba(47, 43, 61, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

export default muiTheme;
```

**File:** `src/themes/current/theme.ts`

```ts
// src/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7367F0" },
    secondary: { main: "#28C76F" },
    background: { default: "#F8F7FA", paper: "#FFFFFF" }
  },
  typography: {
    fontFamily: ["Public Sans", "Roboto", "Helvetica", "Arial", "sans-serif"].join(",")
  }
});

export default theme;
```

**File:** `src/themes/current/index.tsx`

```tsx
'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import { deepmerge } from '@mui/utils'
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  experimental_extendTheme as extendTheme,
  lighten,
  darken
} from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import type {} from '@mui/material/themeCssVarsAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build
import type {} from '@mui/lab/themeAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build

// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Component Imports
import ModeChanger from './ModeChanger'

// Config Imports
import themeConfig from '@configs/themeConfig'
import primaryColorConfig from '@configs/primaryColorConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Core Theme Imports
import defaultCoreTheme from '@core/theme'

type Props = ChildrenType & {
  direction: Direction
}

const ThemeProvider = (props: Props) => {
  // Props
  const { children, direction } = props

  // Hooks
  const { settings } = useSettings()

  // Merge the primary color scheme override with the core theme
  const theme = useMemo(() => {
    const newColorScheme = {
      colorSchemes: {
        light: {
          palette: {
            primary: {
              main: primaryColorConfig[0].main,
              light: lighten(primaryColorConfig[0].main as string, 0.2),
              dark: darken(primaryColorConfig[0].main as string, 0.1)
            }
          }
        },
        dark: {
          palette: {
            primary: {
              main: primaryColorConfig[0].main,
              light: lighten(primaryColorConfig[0].main as string, 0.2),
              dark: darken(primaryColorConfig[0].main as string, 0.1)
            }
          }
        }
      }
    }

    const coreTheme = deepmerge(defaultCoreTheme(settings.mode || 'light', direction), newColorScheme)

    return extendTheme(coreTheme)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode])

  return (
    <AppRouterCacheProvider options={{ prepend: true }}>
      <CssVarsProvider
        theme={theme}
        defaultMode={settings.mode}
        modeStorageKey={`${themeConfig.templateName.toLowerCase().split(' ').join('-')}-mui-template-mode`}
      >
        <>
          <ModeChanger />
          <CssBaseline />
          {children}
        </>
      </CssVarsProvider>
    </AppRouterCacheProvider>
  )
}

export default ThemeProvider
```

**File:** `src/themes/current/muiTheme.ts`

```ts
"use client";

import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#9155FD", // Materio purple
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#8A8D93", // neutral gray
    },
    background: {
      default: "#F8F7FA", // light gray background
      paper: "#FFFFFF",   // white cards/panels
    },
    text: {
      primary: "#2F2B3D",
      secondary: "#6F6B7D",
    },
    success: {
      main: "#56CA00",
    },
    error: {
      main: "#FF4C51",
    },
    warning: {
      main: "#FFB400",
    },
    info: {
      main: "#16B1FF",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h6: {
      fontWeight: 600,
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  shape: {
    borderRadius: 10, // rounded corners like Materio
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow:
            "0px 2px 4px rgba(47, 43, 61, 0.1), 0px 8px 16px rgba(47, 43, 61, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

export default muiTheme;
```

**File:** `src/themes/mui-materio/index.ts`

```ts
import { createTheme } from '@mui/material/styles';
import { materioColors } from './colors';
import { materioTypography } from './typography';
import { materioComponents } from './components';

export const muiMaterioTheme = createTheme({
  palette: {
    mode: 'light',
    ...materioColors,
  },
  typography: materioTypography,
  components: materioComponents,
  shape: {
    borderRadius: 6,
  },
  spacing: 4,
});

export default muiMaterioTheme;
```

**Observations:**
- Multiple MUI theme definitions exist with overlapping palettes and typography (src/theme*, src/themes/current*, src/themes/mui-materio, src/app/components/theme*).
- MUI theme providers are present both for classic ThemeProvider and CssVarsProvider (experimental) for mode switching.
- Theme mode in MUI CssVarsProvider uses `settings.mode` and stores mode with a `*-mui-template-mode` key; CoreUIThemeProvider uses `coreui-theme`.

**Questions:**
- Is there a single intended MUI theme source? If so, which directory is canonical?
- Should the MUI mode storage key be aligned with CoreUIThemeProvider or consolidated into one persisted theme state?

---

## SECTION 3: LAYOUT COMPONENTS

### 3.1 Root Layout

**File:** `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { ReactNode } from "react";
import './globals.css';
import '@/styles/coreui-theme.css';
import '@/styles/budget-color-audit.css';
import '@/styles/navigation.css';
import '@/styles/sales-transactions.css';
import { IssueReporterProvider } from "@/components/IssueReporter";
import { CoreUIThemeProvider } from "@/app/components/CoreUIThemeProvider";
import { ProjectProvider } from "@/app/components/ProjectProvider";
import { QueryProvider } from "@/app/components/QueryProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import NavigationLayout from "@/app/components/NavigationLayout";
// Theme imports - currently using hybrid theme
// import ThemeRegistry from "./components/ThemeRegistry";
// Alternative: import { ThemeProvider } from '@/themes/mui-materio';

export const metadata: Metadata = {
  title: "Landscape (Materio Skin)",
  description: "UI/UX-first prototype with MUI shell",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <CoreUIThemeProvider>
              <ToastProvider>
                <ProjectProvider>
                  <IssueReporterProvider>
                    <NavigationLayout>
                      {children}
                    </NavigationLayout>
                  </IssueReporterProvider>
                </ProjectProvider>
              </ToastProvider>
            </CoreUIThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Observations:**
- CoreUIThemeProvider is the active theme wrapper; MUI ThemeRegistry is commented out but present.
- Multiple global CSS files are loaded globally in addition to `globals.css`.

**Questions:**
- Is the intended direction to keep MUI theming commented out, or re-enable a single MUI theme wrapper?

### 3.2 Dashboard/App Layout

**File:** `src/app/components/NavigationLayout.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNavigationBar from './TopNavigationBar';
import { AdminModal } from '@/components/admin';

// Auth routes that should not show navigation
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * NavigationLayout
 *
 * Global layout wrapper that provides top navigation to all pages.
 * Automatically hides navigation on auth pages (/login, /register, etc.)
 * Manages AdminModal state for system administration.
 *
 * @param children - Page content to render
 * @param hideNavigation - Optional flag to hide navigation (for auth pages, etc.)
 */
interface NavigationLayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export default function NavigationLayout({
  children,
  hideNavigation = false,
}: NavigationLayoutProps) {
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const pathname = usePathname();

  // Auto-hide navigation on auth routes
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  if (hideNavigation || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigationBar onSettingsClick={() => setAdminModalOpen(true)} />
      <main className="flex-1 app-shell">{children}</main>

      {/* Admin Modal - Global Overlay */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </div>
  );
}
```

**File:** `src/components/dms/shared/DMSLayout.tsx`

```tsx
'use client';

import React from 'react';

interface DMSLayoutProps {
  sidebar?: React.ReactNode;
  main?: React.ReactNode;
  preview?: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
}

export default function DMSLayout({
  sidebar,
  main,
  preview,
  className = '',
  sidebarClassName = ''
}: DMSLayoutProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {sidebar && (
          <aside
            className={`w-[250px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto ${sidebarClassName}`}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0 overflow-hidden bg-white dark:bg-gray-900">
          {main}
        </main>
        {preview && (
          <aside className="w-full max-w-[350px] h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            {preview}
          </aside>
        )}
      </div>
    </div>
  );
}
```

**File:** `src/app/projects/[projectId]/ProjectLayoutClient.tsx`

```tsx
'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LandscaperPanel } from '@/components/landscaper';

interface ProjectLayoutClientProps {
  projectId: number;
  children: React.ReactNode;
}

/**
 * Map query param tab values to canonical Landscaper tab names.
 * Tab comes from ?tab=xxx query parameter (see page.tsx line 30).
 */
function mapTabToLandscaperContext(tab: string): string {
  const tabMap: Record<string, string> = {
    // Direct mappings
    'project': 'home',
    'property': 'property',
    'operations': 'operations',
    'feasibility': 'feasibility',
    'valuation': 'feasibility',      // Valuation is part of feasibility context
    'capitalization': 'capitalization',
    'reports': 'reports',
    'documents': 'documents',
    // Land dev tabs
    'planning': 'property',          // Planning relates to property/site
    'budget': 'operations',          // Budget relates to operations
    'sales': 'feasibility',          // Sales relates to feasibility
    // Legacy
    'overview': 'home',
    'sources': 'capitalization',
    'uses': 'capitalization',
    'gis': 'property',
  };

  return tabMap[tab] || 'home';
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab') || 'project';
  const activeTab = mapTabToLandscaperContext(queryTab);
  const isCapitalization = pathname?.includes('/capitalization/');

  // Debug: log when activeTab changes
  console.log('[ProjectLayoutClient] queryTab:', queryTab, '-> activeTab:', activeTab);

  return (
    <div className="flex flex-1 min-h-0 gap-2" style={{ alignItems: 'flex-start' }}>
      {/* Left Panel - Landscaper (30%) - sticky to stay visible while scrolling */}
      {/* Key forces re-mount when tab changes to ensure fresh state */}
      <div
        key={`landscaper-${activeTab}`}
        className="flex-shrink-0 sticky top-0"
        style={{
          width: '30%',
          minWidth: '350px',
          maxWidth: '450px',
          height: 'calc(100vh - 180px)', // Subtract header heights
        }}
      >
        <LandscaperPanel projectId={projectId} activeTab={activeTab} />
      </div>

      {/* Right Content - Tab Content (70%) */}
      <div
        className={`flex-1 min-w-0${isCapitalization ? ' capitalization-panel' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
```

**File:** `src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx`

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AgentSidebar as UnifiedSidebar } from './AgentSidebar';

interface ProjectLayoutClientProps {
  projectId: string;
  children: React.ReactNode;
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Persist collapse states to localStorage
  useEffect(() => {
    const savedSidebar = localStorage.getItem('landscape-sidebar-collapsed');
    if (savedSidebar) setSidebarCollapsed(savedSidebar === 'true');
  }, []);

  const toggleSidebar = () => {
    const newValue = !isSidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('landscape-sidebar-collapsed', String(newValue));
  };

  const sidebarWidth = isSidebarCollapsed ? '60px' : '240px';

  return (
    <div
      className="h-screen w-screen overflow-hidden grid"
      style={{
        gridTemplateColumns: `${sidebarWidth} 1fr`,
      }}
    >
      {/* Col 1: Unified Sidebar (dark theme, collapsible, shows agents on project pages) */}
      <UnifiedSidebar
        projectId={projectId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Col 2: Main Content Area (Content | Chat | Studio managed by children) */}
      <main
        className="overflow-hidden h-full"
        style={{ backgroundColor: 'var(--surface-page-bg)' }}
      >
        {children}
      </main>
    </div>
  );
}
```

**Observations:**
- Layout components mix Tailwind (`app-shell`, `gap-2`, `min-h-screen`) and inline styles (width/height calculations, CSS vars).
- Sidebar widths vary between fixed pixel widths and percent-based widths across layouts.
- Layouts use both class-based dark variants and CSS variables; consistency varies by component.

**Questions:**
- Should there be a single layout wrapper pattern for shell padding and content width, or is per-area layout intentionally bespoke?
- Are sidebar widths intended to be fixed tokens (e.g., 240px) or flexible per feature?

### 3.3 Sidebar Components

**File:** `src/app/components/Navigation.tsx`

```tsx
// app/components/Navigation.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectContext } from './ProjectProvider'
import { ThemeToggle } from './ThemeToggle'
import CIcon from '@coreui/icons-react';
import {
  cilChartPie,
  cilMoney,
  cilCash,
  cilHome,
  cilGraph,
  cilFolder,
  cilPaint,
  cilBeaker,
  cilFile,
  cilNotes,
  cilSpeedometer,
  cilSettings,
  cilDescription
} from '@coreui/icons';

// Icon map for dynamic icon lookup
const ICON_MAP: Record<string, any> = {
  cilChartPie,
  cilMoney,
  cilCash,
  cilHome,
  cilGraph,
  cilFolder,
  cilPaint,
  cilBeaker,
  cilFile,
  cilNotes,
  cilSpeedometer,
  cilSettings,
  cilDescription
};

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
  isCollapsible?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  target?: string;
  icon?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const { activeProject } = useProjectContext()
  const projectId = activeProject?.project_id
  const router = useRouter();
  const pathname = usePathname();

  // Reserved for future use - project config level2 label
  // const level2Label = _projectConfig?.level2_label ?? 'Phase';

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Home',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'cilSpeedometer' }
      ],
      isCollapsible: false
    },
    {
      title: 'Project',
      items: [
        { id: 'project-overview', label: 'Project', href: projectId ? `/projects/${projectId}` : '/projects/7', icon: 'cilChartPie' }
      ],
      isCollapsible: false
    },
    {
      title: 'Financial',
      items: [
        { id: 'opex', label: 'Operating Expenses', href: projectId ? `/projects/${projectId}/opex-accounts` : '/projects/11/opex-accounts', icon: 'cilCash' }
      ],
      isCollapsible: false
    },
    {
      title: 'Property Data',
      items: [
        { id: 'rent-roll', label: 'Rent Roll', href: '/rent-roll', icon: 'cilHome' }
      ],
      isCollapsible: false
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports', label: 'Financial Reports', href: '/reports', icon: 'cilDescription' }
      ],
      isCollapsible: false
    },
    {
      title: 'Documents',
      items: [
        { id: 'dms', label: 'Document Library', href: '/dms', icon: 'cilFolder' },
        { id: 'dms-admin', label: 'DMS Admin', href: '/admin/dms/templates', icon: 'cilSettings' }
      ],
      isCollapsible: false
    },
    {
      title: 'Admin',
      items: [
        { id: 'admin-preferences', label: 'Preferences', href: '/admin/preferences', icon: 'cilSettings' },
        { id: 'admin-benchmarks', label: 'Benchmarks', href: '/admin/benchmarks', icon: 'cilGraph' }
      ],
      isCollapsible: false
    }
  ], [projectId])

  const navigateToAnalysis = useCallback(async () => {
    if (analysisLoading) return;
    if (!projectId) {
      alert('Select a project to open financial analysis.');
      return;
    }

    setAnalysisLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/property`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (response.ok && data?.property_id) {
        router.push(`/properties/${data.property_id}/analysis`);
      } else {
        const message =
          data?.error ||
          'This project is not linked to a property record. Please complete property setup first.';
        alert(message);
      }
    } catch (error) {
      console.error('Failed to open financial analysis interface:', error);
      alert('Failed to open analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [analysisLoading, projectId, router]);

  // Legacy section - placed at bottom, separate from main navigation
  const legacySection: NavSection = useMemo(() => ({
    title: 'Legacy',
    items: [
      { id: 'assumptions', label: 'Assumptions & Factors', href: projectId ? `/projects/${projectId}/assumptions` : '/projects/17/assumptions', icon: 'cilSettings' },
      {
        id: 'financial-analysis',
        label: analysisLoading ? 'Opening Analysis...' : 'Financial Analysis',
        icon: 'cilChartPie',
        onClick: navigateToAnalysis,
        disabled: analysisLoading || !projectId
      },
      { id: 'market-intel-legacy', label: 'Market Intel (Old)', href: '/market', icon: 'cilGraph' },
      { id: 'project-overview-legacy', label: 'Project Overview (Old)', href: projectId ? `/projects/${projectId}/overview` : '/projects/11/overview', icon: 'cilFile' },
      { id: 'test-coreui', label: 'Theme Demo', href: '/test-coreui', icon: 'cilPaint' },
      { id: 'prototypes', label: 'Prototypes', href: '/prototypes', icon: 'cilBeaker' },
      { id: 'documentation', label: 'Documentation', href: '/documentation', icon: 'cilNotes' }
    ],
    isCollapsible: true
  }), [analysisLoading, navigateToAnalysis, projectId])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Helper function to render a navigation section
  const renderSection = (section: NavSection, addTopBorder = false) => (
    <div key={section.title} className={`mb-1 ${addTopBorder ? 'border-t pt-2' : ''}`} style={addTopBorder ? { borderColor: 'var(--nav-border)' } : undefined}>
      {section.isCollapsible ? (
        <button
          onClick={() => toggleSection(section.title)}
          className="w-full text-left px-4 py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-between transition-colors"
          style={{ color: 'var(--nav-text)' }}
        >
          <span>{section.title}</span>
          <svg
            className={`w-4 h-4 transition-transform ${collapsedSections[section.title] ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <div
          className="px-4 py-2 text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--nav-text)' }}
        >
          {section.title}
        </div>
      )}

      {(!section.isCollapsible || !collapsedSections[section.title]) && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = item.href ? pathname === item.href : activeView === item.id;
            const isDisabled = Boolean(item.disabled);
            const baseClasses = `w-full text-left px-6 py-2.5 text-base flex items-center gap-3 transition-colors no-underline`;
            const activeStyle = isActive ? {
              backgroundColor: 'var(--nav-active-bg)',
              color: 'var(--nav-brand)',
              borderRight: '2px solid var(--cui-primary)'
            } : {
              color: 'var(--nav-text)'
            };
            const hoverStyle = !isActive && !isDisabled ? { cursor: 'pointer' } : {};
            const disabledStyle = isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {};

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.target}
                  className={baseClasses}
                  style={{ ...activeStyle, ...hoverStyle, ...disabledStyle }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.icon ? (
                    <CIcon icon={ICON_MAP[item.icon]} size="sm" className="opacity-70" />
                  ) : (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            }

            const handleClick = () => {
              if (isDisabled) return;
              if (item.onClick) {
                void item.onClick();
                return;
              }
              if (pathname !== '/') {
                router.push('/');
                setTimeout(() => setActiveView(item.id), 100);
              } else {
                setActiveView(item.id);
              }
            };

            return (
              <button
                key={item.id}
                onClick={handleClick}
                disabled={isDisabled}
                className={baseClasses}
                style={{ ...activeStyle, ...hoverStyle, ...disabledStyle }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon ? (
                  <CIcon icon={ICON_MAP[item.icon]} size="sm" className="opacity-70" />
                ) : (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <nav
      className="w-64 border-r flex flex-col h-screen"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--nav-border)'
      }}
    >
      {/* Logo at very top */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--nav-border)' }}>
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/logo-invert.png"
            alt="Landscape Logo"
            width={150}
            height={32}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-2 overflow-y-auto">
        {/* Main navigation sections */}
        {navSections.map(section => renderSection(section))}

        {/* Spacer to push legacy section to bottom */}
        <div className="flex-grow min-h-4"></div>

        {/* Legacy section at bottom with separator */}
        {renderSection(legacySection, true)}
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--nav-border)' }}>
        <ThemeToggle className="mb-3" />
        <div className="text-xs space-y-1" style={{ color: 'var(--cui-tertiary-color)' }}>
          <div>Project ID: {activeProject?.project_id || 'None'}</div>
          <div>Last saved: Just now</div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
```

**File:** `src/app/components/layout/vertical/Navigation.tsx`

```tsx
'use client'

// React Imports
import { useRef } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import { styled, useTheme } from '@mui/material/styles'

// Component Imports
import VerticalNav, { NavHeader } from '@menu/vertical-menu'
import VerticalMenu from './VerticalMenu'
import Logo from '@components/layout/shared/Logo'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Style Imports
import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-default) 5%, rgb(var(--mui-palette-background-defaultChannel) / 0.85) 30%, rgb(var(--mui-palette-background-defaultChannel) / 0.5) 65%, rgb(var(--mui-palette-background-defaultChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': {
    opacity: 1
  }
}))

const Navigation = () => {
  // Hooks
  const theme = useTheme()
  const { isBreakpointReached, toggleVerticalNav } = useVerticalNav()

  // Refs
  const shadowRef = useRef<HTMLDivElement | null>(null)

  const scrollMenu = (
    container: { target?: { scrollTop?: number } } | { scrollTop?: number },
    isPerfectScrollbar: boolean
  ) => {
    const target = (isBreakpointReached || !isPerfectScrollbar)
      ? (container as { target?: { scrollTop?: number } }).target
      : (container as { scrollTop?: number })

    const scrollTop = (target && 'scrollTop' in target ? target.scrollTop : 0) ?? 0
    const el = shadowRef.current
    if (!el) return

    if (scrollTop > 0) {
      if (!el.classList.contains('scrolled')) el.classList.add('scrolled')
    } else {
      el.classList.remove('scrolled')
    }
  }

  return (
    // Sidebar Vertical Menu
    <VerticalNav customStyles={navigationCustomStyles(theme)}>
      {/* Nav Header including Logo & nav toggle icons  */}
      <NavHeader>
        <Link href='/dashboard'>
          <Logo />
        </Link>
        {isBreakpointReached && <i className='ri-close-line text-xl' onClick={() => toggleVerticalNav(false)} />}
      </NavHeader>
      <StyledBoxForShadow ref={shadowRef} />
      <VerticalMenu scrollMenu={scrollMenu} />
    </VerticalNav>
  )
}

export default Navigation
```

**File:** `src/app/components/PlanningWizard/Sidebar.tsx`

```tsx
'use client'

import React from 'react'
import DraggableTile from './DraggableTile'

interface SidebarProps {
  mode: 'project' | 'phase'
  onAddArea?: () => void
  onAddPhase?: (areaId: string) => void
  onAddParcel?: () => void
  currentAreaId?: string
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mode, 
  onAddArea, 
  onAddPhase, 
  onAddParcel,
  currentAreaId 
}) => {
  return (
    <div className="w-24 bg-gray-800 border-r border-gray-700 flex flex-col p-2 gap-2">
      {mode === 'project' && (
        <>
          <DraggableTile
            type="area"
            title="Areas"
            onClick={onAddArea}
          />
          <DraggableTile
            type="phase"
            title="Phases"
          />
        </>
      )}
      
      {mode === 'phase' && (
        <>
          <DraggableTile
            type="area"
            title="Add Area"
            onClick={onAddArea}
          />
          <DraggableTile
            type="phase"
            title="Add Phase"
            onClick={() => currentAreaId && onAddPhase?.(currentAreaId)}
          />
          <DraggableTile
            type="parcel"
            title="Add Parcel"
            onClick={onAddParcel}
          />
        </>
      )}
    </div>
  )
}

export default Sidebar
```

**File:** `src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx`

```tsx
/**
 * @deprecated This component is deprecated. Use UnifiedSidebar instead.
 * UnifiedSidebar provides a single sidebar that adapts based on route context
 * and shows agent navigation when on project pages.
 * This file will be removed in a future update.
 */
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilUser, cilSettings, cilChevronLeft, cilChevronRight } from '@coreui/icons';

interface AgentStatus {
  id: string;
  name: string;
  icon: string;
  path: string;
  status: 'complete' | 'partial' | 'blocked' | 'not-started';
  confidence?: 'high' | 'medium' | 'low';
  summary?: string;
}

const agents: AgentStatus[] = [
  {
    id: 'coo',
    name: 'Landscaper',
    icon: '🏗️',
    path: '',
    status: 'complete',
    summary: 'Project overview'
  },
  {
    id: 'market',
    name: 'Market Analyst',
    icon: '📊',
    path: '/market',
    status: 'complete',
    confidence: 'high',
    summary: 'Absorption, pricing, comps'
  },
  {
    id: 'budget',
    name: 'Budget Analyst',
    icon: '💰',
    path: '/budget',
    status: 'partial',
    confidence: 'medium',
    summary: 'Costs, phasing, contingencies'
  },
  {
    id: 'underwriting',
    name: 'Underwriter',
    icon: '📈',
    path: '/underwriting',
    status: 'blocked',
    summary: 'Feasibility, returns, sensitivity'
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: '📁',
    path: '/documents',
    status: 'partial',
    summary: 'Document management'
  },
];

interface AgentSidebarProps {
  projectId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AgentSidebar({ projectId, isCollapsed = false, onToggleCollapse }: AgentSidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Collapsed view - icons only
  if (isCollapsed) {
    return (
      <aside
        className="h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          width: '60px',
        }}
      >
        {/* Collapsed Logo - Plant Icon */}
        <div
          className="flex items-center justify-center py-3"
          style={{ borderBottom: '1px solid var(--nav-border)' }}
        >
          <Link href="/" className="text-2xl">
            🌿
          </Link>
        </div>

        {/* Expand Button */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center py-2 transition-colors"
          style={{ color: 'var(--nav-text)' }}
        >
          <CIcon icon={cilChevronRight} size="sm" />
        </button>

        {/* Dashboard Link (collapsed) */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center py-2 mx-2 rounded-lg mb-1 transition-colors"
          style={{
            color: 'var(--nav-text)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Dashboard"
        >
          <span className="text-lg">📋</span>
        </Link>

        <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--nav-border)' }} />

        {/* Agent Icons */}
        <nav className="flex-1 overflow-y-auto py-2">
          {agents.map((agent) => {
            const fullPath = `${basePath}${agent.path}`;
            const isActive = pathname === fullPath;

            return (
              <Link
                key={agent.id}
                href={fullPath}
                className="flex items-center justify-center py-2 mx-2 rounded-lg mb-1 transition-colors relative"
                style={{
                  backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title={agent.name}
              >
                <span className="text-lg">{agent.icon}</span>
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Icons */}
        <div
          className="py-2 flex flex-col items-center gap-2"
          style={{ borderTop: '1px solid var(--nav-border)' }}
        >
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--nav-text)' }}
            title="User"
          >
            <CIcon icon={cilUser} size="lg" />
          </button>
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--nav-text)' }}
            title="Settings"
          >
            <CIcon icon={cilSettings} size="lg" />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded view - full sidebar
  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderRight: '1px solid var(--nav-border)',
      }}
    >
      {/* Logo */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--nav-border)' }}
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-invert.png"
            alt="Landscape"
            width={140}
            height={32}
            priority
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--nav-text)' }}
          aria-label="Collapse sidebar"
        >
          <CIcon icon={cilChevronLeft} size="sm" />
        </button>
      </div>

      {/* Dashboard Link (expanded) */}
      <div className="px-2 pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-lg">📋</span>
          <span className="font-medium">Dashboard</span>
        </Link>
      </div>

      {/* Agent List */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div
          className="text-xs uppercase tracking-wider px-3 py-2"
          style={{ color: 'var(--nav-text)', opacity: 0.7 }}
        >
          Agents
        </div>

        {agents.map((agent) => {
          const fullPath = `${basePath}${agent.path}`;
          const isActive = pathname === fullPath;

          return (
            <Link
              key={agent.id}
              href={fullPath}
              className="flex items-start gap-3 px-3 py-2 rounded-lg mb-1 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--nav-text)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--nav-text)', opacity: 0.6 }}
                >
                  {agent.summary}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3" style={{ borderTop: '1px solid var(--nav-border)' }} />

        {/* Traditional View */}
        <Link
          href={`${basePath}/detail`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)', opacity: 0.7 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.opacity = '0.7';
          }}
        >
          <span>⚙️</span>
          <span className="text-sm">Traditional View</span>
        </Link>
      </nav>

      {/* Bottom: User & Settings */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--nav-border)' }}
      >
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <CIcon icon={cilUser} size="lg" />
          <span className="text-sm">User</span>
        </button>
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Settings"
        >
          <CIcon icon={cilSettings} size="lg" />
        </button>
      </div>
    </aside>
  );
}
```

**File:** `src/components/sales/FilterSidebar.tsx`

```tsx
'use client';

import React, { useMemo } from 'react';
import type { SaleTransaction } from '@/utils/sales/salesAggregation';

interface FilterSidebarProps {
  sales: SaleTransaction[];
  activeFilter: 'all' | 'phase' | 'use';
  selectedPhase: string | null;
  selectedUseType: string | null;
  onFilterChange: (filter: 'all' | 'phase' | 'use') => void;
  onPhaseSelect: (phase: string | null) => void;
  onUseTypeSelect: (useType: string | null) => void;
}

export default function FilterSidebar({
  sales,
  activeFilter,
  selectedPhase,
  selectedUseType,
  onFilterChange,
  onPhaseSelect,
  onUseTypeSelect,
}: FilterSidebarProps) {
  // Calculate counts by phase
  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.parcels.forEach(parcel => {
        const phaseName = parcel.phase_name || 'Unassigned';
        counts[phaseName] = (counts[phaseName] || 0) + 1;
      });
    });
    return counts;
  }, [sales]);

  // Calculate counts by use type
  const useTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.parcels.forEach(parcel => {
        const useType = parcel.type_code || 'Unknown';
        counts[useType] = (counts[useType] || 0) + 1;
      });
    });
    return counts;
  }, [sales]);

  return (
    <div
      className="filter-sidebar"
      style={{
        width: '20%',
        minWidth: '180px',
        background: 'var(--cui-card-bg)',
        padding: '1rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      {/* All Sales */}
      <button
        className={`btn w-100 text-start mb-2 ${
          activeFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('all');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Show all sales"
      >
        📊 All Sales
      </button>

      {/* By Phase */}
      <button
        className={`btn w-100 text-start mb-1 ${
          activeFilter === 'phase' && !selectedPhase ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('phase');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by phase"
      >
        📍 By Phase
      </button>
      {activeFilter === 'phase' && Object.keys(phaseCounts).length > 0 && (
        <div className="ps-3 mb-2">
          {Object.entries(phaseCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([phase, count]) => (
              <button
                key={phase}
                className={`btn btn-sm w-100 text-start mb-1 ${
                  selectedPhase === phase ? 'btn-primary' : 'btn-ghost-secondary'
                }`}
                onClick={() => onPhaseSelect(phase)}
                aria-label={`Filter to ${phase}`}
              >
                {phase} ({count})
              </button>
            ))}
        </div>
      )}

      {/* By Use Type */}
      <button
        className={`btn w-100 text-start mb-1 ${
          activeFilter === 'use' && !selectedUseType ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('use');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by use type"
      >
        🏘️ By Use Type
      </button>
      {activeFilter === 'use' && Object.keys(useTypeCounts).length > 0 && (
        <div className="ps-3">
          {Object.entries(useTypeCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([useType, count]) => (
              <button
                key={useType}
                className={`btn btn-sm w-100 text-start mb-1 ${
                  selectedUseType === useType ? 'btn-primary' : 'btn-ghost-secondary'
                }`}
                onClick={() => onUseTypeSelect(useType)}
                aria-label={`Filter to ${useType} parcels`}
              >
                {useType} ({count})
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

**File:** `src/app/lease/[id]/components/LeaseSidebar.tsx`

```tsx
'use client';

interface LeaseTabItem {
  id: string;
  label: string;
}

interface LeaseTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const tabs: LeaseTabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'rental', label: 'Rental Income' },
  { id: 'cpi', label: 'CPI' },
  { id: 'percentage', label: 'Percentage Rent' },
  { id: 'recoveries', label: 'Recoveries' },
  { id: 'misc', label: 'Miscellaneous' },
  { id: 'leasing', label: 'Leasing Costs' },
  { id: 'security', label: 'Security Deposits' },
  { id: 'market', label: 'Market Leasing' },
  { id: 'notes', label: 'Notes' }
];

const LeaseSidebar: React.FC<LeaseTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="lease-card">
      <div className="lease-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lease-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default LeaseSidebar;
```

**File:** `src/app/property/components/PropertySidebar.tsx`

```tsx
import React from 'react';
import type { Tab, PropertyData } from '../types';
import { getDisabledTabTooltip } from '../utils/validation';

interface PropertySidebarProps {
  activeTab: string;
  visibleTabs: Tab[];
  enabledTabs: string[];
  propertyData: PropertyData | null;
  onTabChange: (tabId: string) => void;
}

const PropertySidebar: React.FC<PropertySidebarProps> = ({
  activeTab,
  visibleTabs,
  enabledTabs,
  propertyData,
  onTabChange
}) => {
  const handleTabClick = (tabId: string) => {
    if (enabledTabs.includes(tabId)) {
      onTabChange(tabId);
    }
  };

  return (
    <div className="property-sidebar">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isEnabled = enabledTabs.includes(tab.id);
        const tooltip = !isEnabled ? getDisabledTabTooltip(tab.id, propertyData) : '';

        return (
          <div
            key={tab.id}
            className={`tab-item ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            data-tooltip={tooltip}
            title={!isEnabled ? tooltip : ''}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PropertySidebar;
```

**Observations:**
- Sidebar widths vary: `w-64`, `w-24`, `60px/240px`, `20%` + `minWidth: 180px`, and CSS class-based widths in external stylesheets.
- Dark mode approach varies: some sidebars use Tailwind `dark:` classes (DMSLayout), others rely entirely on CSS variables.
- Multiple navigation systems exist: a CoreUI-themed custom nav (`src/app/components/Navigation.tsx`) and MUI vertical menu nav (`src/app/components/layout/vertical/Navigation.tsx`).

**Questions:**
- Which sidebar is the primary standard for new work: Tailwind + CSS variables, or MUI vertical menu?
- Should sidebar widths be tokenized (e.g., `--sidebar-width`) for consistency?

### 3.4 Header Components

**File:** `src/app/components/TopNavigationBar.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useIssueReporter } from '@/components/IssueReporter';
import { GLOBAL_NAV_LINKS } from './navigation/constants';
import SandboxDropdown from './navigation/SandboxDropdown';
import UserMenuDropdown from './navigation/UserMenuDropdown';
import LandscaperChatModal from './LandscaperChatModal';
import CIcon from '@coreui/icons-react';
import { cilBug, cilSettings, cilMoon, cilSun } from '@coreui/icons';

/**
 * TopNavigationBar - Tier 1 Global Navigation
 *
 * Renders the primary navigation bar with:
 * - Logo (left)
 * - Global links: Dashboard, Documents (right-aligned)
 * - Landscaper AI button
 * - Sandbox dropdown
 * - User menu
 * - Settings button (opens AdminModal)
 * - Theme toggle
 *
 * Height: 58px
 * Background: var(--nav-bg)
 * Position: Sticky top
 */
interface TopNavigationBarProps {
  onSettingsClick?: () => void;
}

export default function TopNavigationBar({ onSettingsClick }: TopNavigationBarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { openReporterWithLatestTarget, hasTargetContext, lastTargetLabel } = useIssueReporter();
  const [isLandscaperOpen, setLandscaperOpen] = useState(false);
  const [showBugHint, setShowBugHint] = useState(false);
  const [mode, setMode] = useState<'analyst' | 'developer'>('analyst');
  const logoSrc = '/logo-invert.png';

  const toggleMode = () => {
    setMode(prev => prev === 'analyst' ? 'developer' : 'analyst');
    // TODO: Persist mode preference to localStorage or user settings
  };

  const navHoverHandlers = (isActive = false) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = isActive
        ? 'var(--nav-active-bg)'
        : 'var(--nav-hover-bg)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = isActive
        ? 'var(--nav-active-bg)'
        : 'transparent';
    },
  });

  const handleBugButtonClick = () => {
    const opened = openReporterWithLatestTarget({ issueType: 'bug' });
    if (!opened) {
      setShowBugHint(true);
      window.setTimeout(() => setShowBugHint(false), 2500);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 border-b"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--nav-border)',
          color: 'var(--nav-text)',
          zIndex: 50,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ height: '58px', padding: '0 var(--app-padding)' }}
        >
          {/* Logo - Left */}
          <Link href="/" className="flex items-center">
            <Image
              src={logoSrc}
              alt="Landscape"
              width={176}
              height={40}
              priority
              className="object-contain"
              sizes="176px"
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>

          {/* Navigation Items - Right */}
          <div className="flex items-center gap-3">
            {/* Global Navigation Links */}
            {GLOBAL_NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm transition-colors"
                style={{
                  color: pathname === link.href ? 'var(--nav-brand)' : 'var(--nav-text)',
                  backgroundColor:
                    pathname === link.href ? 'var(--nav-active-bg)' : 'transparent',
                  fontWeight: pathname === link.href ? '600' : '400',
                }}
                {...navHoverHandlers(pathname === link.href)}
              >
                {link.label}
              </Link>
            ))}

            {/* Landscaper AI Button */}
            <button
              type="button"
              onClick={() => setLandscaperOpen(true)}
              className="rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--nav-text)' }}
              {...navHoverHandlers()}
            >
              Landscaper AI
            </button>

            {/* Dropdowns */}
            <SandboxDropdown />
            <UserMenuDropdown />

            {/* Mode Toggle (Analyst/Developer) */}
            <button
              type="button"
              onClick={toggleMode}
              className="rounded-full px-3 py-2 text-sm font-medium transition-colors"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label="Toggle Analyst/Developer mode"
              title={`Switch to ${mode === 'analyst' ? 'Developer' : 'Analyst'} mode`}
            >
              {mode === 'analyst' ? 'Analyst' : 'Developer'}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onSettingsClick}
              className="rounded-full p-2 transition-colors"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label="Open settings"
            >
              <CIcon icon={cilSettings} size="lg" />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full px-3 py-2 text-sm font-medium transition-colors d-flex align-items-center gap-2"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <CIcon icon={theme === 'light' ? cilMoon : cilSun} size="sm" />
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>

            {/* Bug/Issues Icon Button */}
            <div className="relative flex flex-col items-end">
              <button
                type="button"
                data-issue-reporter-ignore="true"
                onClick={handleBugButtonClick}
                className="rounded-full p-2 transition-colors"
                style={{ color: hasTargetContext ? 'var(--nav-text)' : 'var(--nav-border)' }}
                {...navHoverHandlers()}
                aria-label={
                  hasTargetContext
                    ? `Report a bug for ${lastTargetLabel ?? 'the selected element'}`
                    : 'Click any UI element first, then tap the bug icon'
                }
                title={
                  hasTargetContext
                    ? 'Report a bug for the last element you interacted with'
                    : 'Click the target element first, then tap this icon'
                }
              >
                <CIcon icon={cilBug} size="lg" />
              </button>
              {!hasTargetContext && showBugHint && (
                <div
                  data-issue-reporter-ignore="true"
                  className="absolute right-0 top-full mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white shadow-lg"
                >
                  Click a UI element first, then tap the bug icon.
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Landscaper AI Modal */}
      <LandscaperChatModal
        isOpen={isLandscaperOpen}
        onClose={() => setLandscaperOpen(false)}
      />
    </>
  );
}
```

**File:** `src/app/components/Header.tsx`

```tsx
// Restored Header wrapper combining global and project navigation.
'use client';

import { useMemo } from 'react';
import TopNavigationBar from './TopNavigationBar';
import ProjectContextBar from './ProjectContextBar';
import { useProjectContext } from './ProjectProvider';

export default function Header() {
  const { activeProject } = useProjectContext();
  const projectId = useMemo(() => activeProject?.project_id, [activeProject]);

  return (
    <div className="flex flex-col w-full">
      <TopNavigationBar />
      {projectId ? <ProjectContextBar projectId={projectId} /> : null}
    </div>
  );
}
```

**File:** `src/components/ui/PageHeader.tsx`

```tsx
// v1.0 · 2025-11-02 · Standardized page header with breadcrumbs
'use client';

import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div
      className="d-flex justify-content-between align-items-center mb-4 pb-3"
      style={{
        borderBottom: '1px solid var(--cui-border-color)',
      }}
    >
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-0">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li
                key={index}
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    style={{ color: 'var(--cui-primary)', textDecoration: 'none' }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span style={{ color: isLast ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)' }}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Actions */}
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
}
```

**File:** `src/app/lease/[id]/components/LeaseHeader.tsx`

```tsx
'use client';

import type { Lease } from '../../types';

interface LeaseHeaderProps {
  lease: Lease;
  saving: boolean;
}

const LeaseHeader: React.FC<LeaseHeaderProps> = ({ lease, saving }) => {
  return (
    <header className="page-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div>
          <h1>Lease Input</h1>
          <p>
            Property: Office Building – Suite {lease.suite_number ?? 'N/A'}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-outline-secondary">
            ◂ Back to Rent Roll
          </button>
          <button type="button" className="btn btn-primary">
            💾 Save
          </button>
          <button type="button" className="btn btn-success">
            ✅ {saving ? 'Saving…' : 'Save & Close'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default LeaseHeader;
```

**Observations:**
- Top nav uses CSS vars for colors and inline styles for hover, height, and padding.
- Header components vary widely: CoreUI class-based (`PageHeader`), plain HTML with CSS classes (`LeaseHeader`), Tailwind + inline styles (`TopNavigationBar`).

**Questions:**
- Should headers standardize on one approach (CoreUI classes vs Tailwind vs CSS vars), or is hybrid expected?

---

## SECTION 4: SPACING & SIZING PATTERNS

### 4.1 Common Spacing Values (src/components)

Command outputs:

```
# p-[0-9]
924

# px-[0-9]
775

# py-[0-9]
972

# m-[0-9]
27

# gap-[0-9]
577

# space-[xy]-[0-9]
165
```

Hardcoded pixel values (head 20):

```
src/components/ui/toast.tsx:        gap: '10px'
src/components/ui/toast.tsx:              padding: '12px 20px',
src/components/landscaper/LandscaperChat.tsx:          padding: '0.5rem 1rem',
src/components/landscaper/ExtractionFieldRow.tsx:                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
src/components/landscaper/ExtractionFieldRow.tsx:                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
src/components/landscaper/ExtractionFieldRow.tsx:              style={{ width: '28px', height: '28px', padding: 0 }}
src/components/landscaper/ExtractionFieldRow.tsx:              style={{ width: '28px', height: '28px', padding: 0 }}
src/components/landscaper/ExtractionFieldRow.tsx:                style={{ width: '28px', height: '28px', padding: 0 }}
src/components/landscaper/ExtractionFieldRow.tsx:                style={{ width: '28px', height: '28px', padding: 0 }}
src/components/landscaper/ExtractionFieldRow.tsx:            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
src/components/landscaper/ActivityFeed.tsx:          padding: '0.5rem 1rem',
src/components/ingestion/DocumentIngestion.tsx:                padding: '6px 16px',
src/components/ingestion/DocumentCard.tsx:              style={{ fontSize: '11px', padding: '4px 10px' }}
src/components/ingestion/DocumentCard.tsx:              style={{ fontSize: '11px', padding: '4px 10px' }}
src/components/ingestion/DocumentCard.tsx:              style={{ fontSize: '11px', padding: '4px 10px' }}
src/components/ingestion/PropertyOverview.tsx:                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
src/components/ingestion/PropertyOverview.tsx:                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
src/components/ingestion/PropertyOverview.tsx:                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
src/components/ingestion/PropertyOverview.tsx:                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
src/components/analysis/cashflow/CashFlowPhaseTable.tsx:    padding: '2px 6px',
```

**Observations:**
- Tailwind spacing utilities are heavily used; there is a high volume of `py-*` and `p-*` classes.
- Inline styles for padding/gap exist in multiple components, indicating bypass of Tailwind spacing scale.

**Questions:**
- Should inline padding/gap values be converted into Tailwind tokens or CSS variables for consistency?

### 4.2 Inconsistent Patterns

Examples:
- Card padding varies: `src/components/projects/contacts/ContactCard.tsx` uses `p-4` for card containers while `src/components/project/ProjectLandUseLabels.tsx` uses `p-6` and additional nested `p-4` blocks.
- Sidebar width patterns vary widely: `w-64` in `src/app/components/Navigation.tsx`, `w-24` in `src/app/components/PlanningWizard/Sidebar.tsx`, `60px/240px` in `src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx`, and `20%` + `minWidth: 180px` in `src/components/sales/FilterSidebar.tsx`.
- Page container widths differ: `src/app/documentation/page.tsx` wraps content in `max-w-7xl mx-auto`, `src/app/reports/page.tsx` has no max width, and `src/app/page.tsx` uses full-screen centering with no content width constraint.

**Questions:**
- Is there a canonical card padding and page container width that should be enforced?

---

## SECTION 5: DARK MODE IMPLEMENTATION

### 5.1 Dark Mode Toggle

**File:** `src/app/components/CoreUIThemeProvider.tsx`

```tsx
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
```

**File:** `src/app/components/ThemeToggle.tsx`

```tsx
'use client';

import React from 'react';
import { useTheme } from './CoreUIThemeProvider';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={className || ''}>
      <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
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
            className={theme === 'light' ? 'text-yellow-400' : 'text-gray-500'}
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
          <span className="text-xs text-gray-300 font-medium">
            {theme === 'light' ? 'Light' : 'Dark'} Mode
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors"
        >
          Switch to {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </div>
  );
};
```

**Observations:**
- Dark mode is toggled via `CoreUIThemeProvider` and persisted to `localStorage` under `coreui-theme`.
- Theme is applied via `data-theme` and `data-coreui-theme` attributes, and via `light-theme` / `dark-theme` classes.

**Questions:**
- Are `light-theme` / `dark-theme` classes used anywhere else, or should `data-theme` be the single source for dark-mode styling?

### 5.2 Dark Mode Class Usage

Counts:

```
# Tailwind dark: prefix usage
770
```

Top unique `dark:` patterns:

```
 194 dark:text-gray-400
 124 dark:text-gray-100
  82 dark:text-gray-300
  80 dark:border-gray-700
  71 dark:border-gray-600
  55 dark:bg-gray-800
  53 dark:bg-gray-700
  41 dark:border-gray-800
  36 dark:bg-gray-900
  26 dark:bg-blue-900
  22 dark:text-white
  22 dark:text-blue-400
  15 dark:text-red-400
  11 dark:bg-red-900
  10 dark:text-gray-200
   9 dark:bg-green-900
   8 dark:text-gray-600
   8 dark:text-gray-500
   8 dark:bg-yellow-900
   7 dark:text-green-400
```

### 5.3 Components Missing Dark Mode

Examples (background/text without matching `dark:`):

```
src/components/sales/SaleDetailForm.tsx:    <div className="rounded-lg border border-blue-200 bg-white shadow-sm">
src/components/projects/contacts/ContactCard.tsx:    <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-white hover:border-gray-300 transition-colors">
src/components/projects/contacts/AddContactModal.tsx:      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
src/components/projects/onboarding/NewProjectChat.tsx:                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
src/components/projects/onboarding/NewProjectChat.tsx:                  : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
src/components/projects/onboarding/NewProjectOnboardingModal.tsx:            : 'border-slate-200 bg-white text-slate-900'
src/components/IssueReporter/IssueReporterDialog.tsx:          className="fixed inset-x-4 bottom-12 z-[200] mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl transition data-[state=open]:animate-slide-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
src/components/shared/ModeToggle.tsx:    : 'bg-white text-blue-600 shadow-sm';
src/components/project/ProjectLandUseLabels.tsx:      <div className="p-6 bg-white rounded-lg shadow">
src/components/project/ProjectLandUseLabels.tsx:    <div className="p-6 bg-white rounded-lg shadow">
```

```
src/components/sales/SaleDetailForm.tsx:    <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">{label}</div>
src/components/sales/SaleDetailForm.tsx:    <div className="text-sm text-gray-900 space-y-1">{children}</div>
src/components/sales/SaleDetailForm.tsx:          <span className="font-mono text-xs text-gray-500">{parcel.sale_date}</span>
src/components/sales/SaleDetailForm.tsx:            <div className="text-xs text-gray-500">Auto-filled from sale phase</div>
src/components/sales/SaleDetailForm.tsx:            <div className="font-mono text-lg text-gray-900">{formatMoney(grossValue)}</div>
src/components/sales/SaleDetailForm.tsx:            <div className="text-xs text-gray-500">{formatNumber(parcel.units)} units</div>
src/components/sales/SaleDetailForm.tsx:            <div className="text-xs text-gray-500">{formatMoney(onsiteCalculated)}</div>
src/components/sales/SaleDetailForm.tsx:            <div className="font-mono text-lg text-gray-900">
src/components/sales/SaleDetailForm.tsx:            <div className="text-xs text-gray-500">Gross - Onsites</div>
src/components/sales/SaleDetailForm.tsx:            <div className="text-xs text-gray-500">{formatMoney(commissionCalculated)}</div>
```

**Observations:**
- There is wide Tailwind `dark:` usage, but many components still use fixed `bg-white` / `text-gray-*` without dark variants.

**Questions:**
- Should missing dark-mode variants be addressed via CSS variables instead of individual `dark:` classes?

---

## SECTION 6: COMPONENT LIBRARY USAGE

### 6.1 UI Library Identification (package.json)

Installed UI libraries:
- MUI: `@mui/material`, `@mui/icons-material`, `@mui/x-*`, `@mui/lab`, `@mui/material-nextjs`.
- CoreUI: `@coreui/coreui`, `@coreui/react`, `@coreui/icons`, `@coreui/icons-react`.
- Radix UI: multiple `@radix-ui/*` packages (dialog, popover, tabs, etc.).
- Tailwind: `tailwindcss`, `tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography`.
- Other UI helpers: `@emotion/react`, `@emotion/styled`, `class-variance-authority`, `tailwind-merge`, `vaul`.

Not found:
- `@headlessui/react`
- `chakra-ui`
- `antd`
- shadcn UI packages (no `@shadcn/ui` or similar).

### 6.2 Mixed Usage Concerns

**Observations:**
- The codebase mixes Tailwind, CoreUI classes, and MUI components/themes simultaneously.
- Radix UI is present, implying additional styling patterns for primitives.

**Questions:**
- Is the long-term direction to consolidate on one component library (CoreUI vs MUI vs Radix + Tailwind)?
- If hybrid, should there be clear boundaries (e.g., MUI for data-heavy views, CoreUI for admin, Tailwind for bespoke)?

---

## SECTION 7: REPRESENTATIVE SAMPLES

### 7.1 Well-Formatted Component

**File:** `src/components/dms/shared/DMSLayout.tsx`

```tsx
'use client';

import React from 'react';

interface DMSLayoutProps {
  sidebar?: React.ReactNode;
  main?: React.ReactNode;
  preview?: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
}

export default function DMSLayout({
  sidebar,
  main,
  preview,
  className = '',
  sidebarClassName = ''
}: DMSLayoutProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {sidebar && (
          <aside
            className={`w-[250px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto ${sidebarClassName}`}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0 overflow-hidden bg-white dark:bg-gray-900">
          {main}
        </main>
        {preview && (
          <aside className="w-full max-w-[350px] h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            {preview}
          </aside>
        )}
      </div>
    </div>
  );
}
```

**Why it’s consistent:**
- Uses a clear layout grid, consistent dark mode variants, and fixed widths with explicit purpose.

### 7.2 Problematic Component

**File:** `src/components/projects/contacts/ContactCard.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Mail, Phone, Building2, User, StickyNote, Edit2, Trash2 } from 'lucide-react';
import { ProjectContact } from '@/types/contacts';

interface ContactCardProps {
  contact: ProjectContact;
  projectId: number;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function ContactCard({
  contact,
  projectId,
  onUpdated,
  onDeleted
}: ContactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(contact);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contacts/${contact.contact_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        setIsEditing(false);
        onUpdated();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/contacts/${contact.contact_id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onDeleted();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleCancel = () => {
    setFormData(contact);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          type="text"
          placeholder="Company"
          value={formData.company || ''}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Direct Phone"
            value={formData.phone_direct || ''}
            onChange={(e) => setFormData({ ...formData, phone_direct: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Mobile Phone"
            value={formData.phone_mobile || ''}
            onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <textarea
          placeholder="Notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="btn btn-outline-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-white hover:border-gray-300 transition-colors">
      {/* Name and Title */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{contact.name}</span>
            {contact.title && (
              <span className="text-sm text-gray-500">- {contact.title}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-sm btn-ghost-primary d-flex align-items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-sm btn-ghost-danger d-flex align-items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span>{contact.company}</span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <a
            href={`mailto:${contact.email}`}
            className="text-blue-600 hover:underline"
          >
            {contact.email}
          </a>
        </div>
      )}

      {/* Phones */}
      {(contact.phone_direct || contact.phone_mobile) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" />
          <div className="flex gap-3">
            {contact.phone_direct && (
              <span>D: {contact.phone_direct}</span>
            )}
            {contact.phone_mobile && (
              <span>M: {contact.phone_mobile}</span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="flex items-start gap-2 text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
          <StickyNote className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="text-xs">{contact.notes}</span>
        </div>
      )}
    </div>
  );
}
```

**Problems observed:**
- No `dark:` variants on background or text colors; relies on `bg-white` and `text-gray-*`.
- Mixes Tailwind and CoreUI button classes in the same component.
- Uses fixed gray palette rather than CSS variables, which can clash with theming.

### 7.3 Page Container Patterns

**File:** `src/app/page.tsx`

```tsx
// app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)' }}>
      <div style={{ color: 'var(--cui-secondary-color)' }}>Redirecting to dashboard...</div>
    </div>
  );
}
```

**File:** `src/app/documentation/page.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { FileText, Book, Code, Database, Map, DollarSign, ExternalLink, Search } from 'lucide-react';
import MarkdownViewer from '../components/Documentation/MarkdownViewer';
import Navigation from '../components/Navigation';
import { ProjectProvider } from '../components/ProjectProvider';

interface DocItem {
  title: string;
  path: string;
  category: 'Status' | 'Architecture' | 'Migration' | 'Component' | 'Technical' | 'AI';
  description: string;
  icon: React.ReactNode;
  lastModified: string;
}

const DocumentationIndex: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; title: string } | null>(null);

  const documents: DocItem[] = [
    // ...snip...
  ];

  return (
    <ProjectProvider>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
        <Navigation activeView="documentation" setActiveView={() => {}} />
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <div className="max-w-7xl mx-auto">
            {/* content */}
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
};

export default DocumentationIndex;
```

**File:** `src/app/reports/page.tsx`

```tsx
'use client';

import { PropertySummaryView } from '@/components/reports/PropertySummaryView';
import { useState } from 'react';
import { CButton, CButtonGroup, CCard, CCardBody } from '@coreui/react';

export default function ReportsPage() {
  const [scenario, setScenario] = useState<'current' | 'proforma'>('current');
  const propertyId = '17'; // 14105 Chadron Ave

  return (
    <div className="p-4">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-semibold mb-2">Financial Reports</h1>
        <p className="text-body-secondary">
          Professional property analysis and reporting for 14105 Chadron Avenue
        </p>
      </div>

      {/* Scenario Selector Card */}
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex align-items-center gap-3">
            <label className="mb-0 fw-medium">Scenario:</label>
            <CButtonGroup role="group">
              <CButton
                color="primary"
                variant={scenario === 'current' ? 'outline' : 'ghost'}
                active={scenario === 'current'}
                onClick={() => setScenario('current')}
              >
                Current
              </CButton>
              <CButton
                color="primary"
                variant={scenario === 'proforma' ? 'outline' : 'ghost'}
                active={scenario === 'proforma'}
                onClick={() => setScenario('proforma')}
              >
                Proforma
              </CButton>
            </CButtonGroup>
          </div>
        </CCardBody>
      </CCard>

      {/* Report Content */}
      <PropertySummaryView propertyId={propertyId} scenario={scenario} />
    </div>
  );
}
```

**Inconsistencies noted:**
- Documentation page uses a full-height split layout with a sidebar, while reports uses simple `p-4` container and no max width.
- Home page uses full-screen centering and no shared layout wrapper.

---

## SECTION 8: CSS-IN-JS OR STYLED COMPONENTS

Search results:

```
# styled(
src/app/components/GrowthRates.tsx:const CompactTable = styled(TableContainer)(({ theme }) => ({
src/app/components/layout/shared/UserDropdown.tsx:const BadgeContentSpan = styled('span')({
src/app/components/layout/vertical/Navigation.tsx:const StyledBoxForShadow = styled('div')(({ theme }) => ({
src/app/components/Illustrations.tsx:const MaskImg = styled('img')({
src/app/components/MarketAssumptionsNative.tsx:const CompactTable = styled(TableContainer)(({ theme }) => ({

# makeStyles
(no matches)

# sx={{
src/app/components/MarketAssumptionsComparison.tsx:    <Box sx={{ p: 2, minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
src/app/components/MarketAssumptionsComparison.tsx:      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
src/app/components/MarketAssumptionsComparison.tsx:      <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
src/app/components/MarketAssumptionsComparison.tsx:          <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
src/app/components/MarketAssumptionsComparison.tsx:            <Box sx={{ p: 2, backgroundColor: '#1976d2', color: 'white' }}>

# style={{
src/app/settings/taxonomy/page.tsx:      <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
src/app/settings/taxonomy/page.tsx:      <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
src/app/settings/contact-roles/page.tsx:                  <CTableHeaderCell style={{ width: '100px' }}>Order</CTableHeaderCell>
src/app/settings/contact-roles/page.tsx:                  <CTableHeaderCell style={{ width: '120px' }}>Actions</CTableHeaderCell>
src/app/settings/contact-roles/page.tsx:                        style={{ width: 'fit-content' }}
src/app/settings/budget-categories/page.tsx:            <CFormLabel className="mb-0" style={{ minWidth: '100px' }}>
src/app/settings/budget-categories/page.tsx:              style={{ maxWidth: '400px' }}
src/app/settings/budget-categories/page.tsx:                style={{ cursor: 'pointer' }}
src/app/settings/budget-categories/page.tsx:                style={{ cursor: 'pointer' }}
src/app/documentation/page.tsx:      <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
```

**Observations:**
- CSS-in-JS appears mainly in MUI areas (`styled`, `sx`), while Tailwind is used elsewhere.
- Inline `style={{ ... }}` is used across multiple pages for background colors and sizing overrides.

**Questions:**
- Should CSS-in-JS be limited to MUI-specific areas, with Tailwind handling the rest?

---

## SECTION 9: SUMMARY

### 9.1 Current State Summary
- Primary styling approach: Hybrid of Tailwind utilities, CoreUI classes, and MUI theming/styling.
- Theme system: Multiple theme providers and MUI themes; CoreUIThemeProvider is active globally and persists `coreui-theme` to localStorage.
- Dark mode: Implemented via `data-theme` with Tailwind `dark:` usage; coverage is incomplete across components.

### 9.2 Identified Issues
1. Multiple overlapping theme definitions (`src/theme.ts`, `src/theme/muiTheme.ts`, `src/themes/current/*`, `src/themes/mui-materio/*`, `src/app/components/theme*`) with no clear single source of truth.
2. Dark mode gaps where components use `bg-white`/`text-gray-*` without `dark:` or CSS variable equivalents (e.g., `src/components/projects/contacts/ContactCard.tsx`).
3. Layout/spacing inconsistencies: multiple sidebar widths and container paddings (e.g., `src/app/components/Navigation.tsx`, `src/app/components/PlanningWizard/Sidebar.tsx`, `src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx`).

### 9.3 Inconsistency Patterns
- Spacing inconsistencies: card padding and layout gaps vary (p-4 vs p-6 vs inline padding).
- Color inconsistencies: mix of CSS variables, Tailwind palette, and hardcoded hex colors.
- Dark mode gaps: many components lack `dark:` variants or variable-based colors.
- Layout structure variations: different page wrappers and max-width patterns across pages.

### 9.4 Recommended Focus Areas
- Consolidate theming into a single, canonical theme source for MUI + CoreUI + Tailwind integration.
- Establish layout tokens (sidebar width, page padding, max width) and enforce via shared wrappers.
- Prioritize dark mode coverage by migrating fixed colors to CSS variables or standard dark classes.
- Reduce inline style usage in favor of shared tokens/utilities where possible.

