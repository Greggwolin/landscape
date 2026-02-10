const withVar = (v) => `var(${v})`;

module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/styles/**/*.css',
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
