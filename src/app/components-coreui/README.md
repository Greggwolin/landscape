# CoreUI Prototype Components

This directory contains experimental CoreUI-based component implementations for comparison with the existing MUI-based components.

## Purpose

- Prototype alternative UI framework (CoreUI vs Material UI)
- Test component equivalents side-by-side
- Evaluate performance, accessibility, and developer experience
- Maintain isolation from production components

## Structure

Maintain parallel structure to `src/app/components/` for easy comparison:

```
components-coreui/
├── Layout/           # CoreUI layout components
├── Forms/            # CoreUI form components
├── Navigation/       # CoreUI navigation components
└── ...
```

## Usage

Components in this directory are experimental and should not be imported into production code paths. Use the `/coreui-demo` page for testing and evaluation.

## Migration Notes

If CoreUI components prove superior, they can be:
1. Merged into main component directory
2. Gradually replace MUI equivalents
3. Or coexist with feature flags for gradual rollout
