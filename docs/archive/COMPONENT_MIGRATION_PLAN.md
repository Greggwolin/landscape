# Component Directory Consolidation Plan

## Current Structure Issues
- `/src/components/` - Shared components (DMS, UI)
- `/src/app/components/` - App-specific components (Admin, Budget, etc.)

## Recommended New Structure

```
/src/components/
├── ui/                 # Base UI components (buttons, inputs, etc.)
├── shared/            # Shared business components
├── layout/            # Layout components (Header, Navigation)
├── dms/              # Document Management System
├── admin/            # Admin-specific components
├── budget/           # Budget management
├── planning/         # Planning and land use
├── forms/            # Form components
└── charts/           # Data visualization
```

## Migration Steps

1. **Create new structure**: Set up clean directory organization
2. **Move UI components**: Consolidate base UI components
3. **Organize business components**: Group by feature/domain
4. **Update imports**: Use path mapping for cleaner imports
5. **Remove duplicates**: Clean up any duplicate components

## Benefits
- Clear separation of concerns
- Easier component discovery
- Better scalability
- Consistent import patterns