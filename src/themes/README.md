# Theme Comparison Structure

This directory contains different theme implementations for easy comparison and switching.

## Structure

- `/current/` - Current active theme implementation (hybrid MUI + custom)
- `/mui-materio/` - Pure MUI Materio implementation
- `/alternatives/` - Other theme experiments and variations

## Usage

To switch themes, update the import in `/src/app/layout.tsx` or use the theme provider configuration.

## Theme Structure Best Practices

Each theme should contain:
- `index.ts` - Main theme export
- `colors.ts` - Color palette definitions
- `typography.ts` - Font and text styling
- `components.ts` - Component-specific styling
- `tokens.ts` - Design tokens and variables
- `types.ts` - TypeScript interfaces (if needed)

## Current Status

- **Current**: Hybrid implementation with MUI base + custom components
- **MUI Materio**: Clean MUI-only implementation (to be created)
- **Alternatives**: Space for future theme experiments