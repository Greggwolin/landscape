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
