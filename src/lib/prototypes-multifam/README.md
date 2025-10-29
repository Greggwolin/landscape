# MultiFam Prototypes - Quick Start Guide

## Overview
The MultiFam Prototypes page provides a dedicated workspace for testing and iterating on multifamily-specific features. Each prototype row contains two tiles:
- **Frontend Tile**: Links to the UI prototype page
- **Backend Tile**: Links to the Django admin interface

## Adding a New Prototype

Edit `/src/lib/prototypes-multifam/registry.ts` and add an entry:

```typescript
{
  id: 'multifam-units-input',
  name: 'Units Input',
  description: 'Multifamily unit management with tabbed interface for input and configuration',
  status: 'wip', // or 'stable' or 'archived'
  frontendUrl: '/prototypes/multifam/inputs1',
  backendUrl: '/admin/multifamily/multifamilyunit/',
  owners: ['Your Name'],
  tags: ['units', 'multifamily'],
  notes: 'Optional notes about this prototype'
}
```

## Available Tags
- `units` - Unit management
- `leases` - Lease tracking
- `turns` - Vacancy/turn management
- `unit-types` - Unit type configuration
- `reports` - Reporting dashboards
- `rent-roll` - Rent roll features
- `occupancy` - Occupancy tracking
- `renewals` - Lease renewals
- `multifamily` - General multifamily features

## Django Admin URLs
Standard Django admin URLs follow this pattern:
- Units: `/admin/multifamily/multifamilyunit/`
- Leases: `/admin/multifamily/multifamilylease/`
- Unit Types: `/admin/multifamily/multifamilyunittype/`
- Turns: `/admin/multifamily/multifamilyturn/`
- Reports: `/admin/multifamily/multifamilyreport/`

## Frontend Prototype Structure
Create your frontend prototypes under `/src/app/prototypes/multifam/` with descriptive names:
- `/prototypes/multifam/inputs1` - Main input forms
- `/prototypes/multifam/dashboard1` - Dashboard views
- `/prototypes/multifam/reports1` - Report interfaces

## Adding Notes
Notes can be added from within each prototype page by calling:
```typescript
await fetch('/api/prototypes/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prototypeId: 'multifam-units-input', // or 'multifam-units-input-admin' for backend tile
    note: 'Your feedback here'
  })
});
```

Notes are automatically stored in `docs/prototypes/notes.log` and displayed on each tile.
