import type { PrototypeMetadata } from './types';

export const prototypeRegistry: PrototypeMetadata[] = [
  {
    id: 'coreui-lease-input',
    name: 'CoreUI Lease Input Page',
    description: 'ARGUS-style lease input form rendered via static CoreUI HTML.',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['coreui', 'layout', 'data'],
    notes: 'Source HTML stored under Documentation/lease-input-page.html and mirrored to public/prototypes.'
  },
  {
    id: 'coreui-lease-react',
    name: 'Lease Workspace (React)',
    description: 'Full Next.js conversion of the ARGUS-style lease workflow with mock API.',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['coreui', 'layout', 'data'],
    notes: 'Loads /lease/101 using the in-memory API defined under app/api/lease.'
  },
  {
    id: 'coreui-shell',
    name: 'CoreUI Shell (remote branch)',
    description:
      'Full CoreUI navigation experience. Lives on feature/coreui-prototype until merged.',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['coreui', 'layout', 'navigation'],
    branch: 'feature/coreui-prototype',
    notes: 'Checkout the feature/coreui-prototype branch to load this experiment locally.'
  },
  {
    id: 'gis-test',
    name: 'GIS Test Page',
    description: 'GIS/mapping functionality test page with MapLibre integration',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['gis', 'maps', 'testing'],
    notes: 'Testing MapLibre GL JS integration and GIS features'
  },
  {
    id: 'gis-simple-test',
    name: 'GIS Simple Test',
    description: 'Simplified GIS test page for basic mapping features',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['gis', 'maps', 'testing'],
    notes: 'Lightweight GIS testing without full feature set'
  },
  {
    id: 'map-debug',
    name: 'Map Debug Console',
    description: 'Debug console for map rendering and layer inspection',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['maps', 'debug', 'testing'],
    notes: 'Debugging tool for MapLibre layers, sources, and events'
  },
  {
    id: 'db-schema',
    name: 'Database Schema Viewer',
    description: 'Interactive database schema browser and introspection tool',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['database', 'schema', 'admin'],
    notes: 'View tables, columns, relationships in landscape schema'
  },
  {
    id: 'ai-document-review',
    name: 'AI Document Review',
    description: 'AI-powered document analysis and extraction workflow',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['ai', 'documents', 'extraction'],
    notes: 'Claude AI document review and field extraction interface'
  },
  {
    id: 'budget-grid',
    name: 'Budget Grid (Original)',
    description: 'Original budget grid implementation (legacy)',
    status: 'archived',
    owners: ['Dev Team'],
    tags: ['budget', 'grid', 'legacy'],
    notes: 'Replaced by budget-grid-dark and budget-grid-light in main nav'
  },
  {
    id: 'budget-grid-v2',
    name: 'Budget Grid v2',
    description: 'Second iteration of budget grid component',
    status: 'wip',
    owners: ['Dev Team'],
    tags: ['budget', 'grid', 'data'],
    notes: 'Alternative budget grid implementation - compare with main versions'
  }
];

export const getPrototypeById = (id: string) =>
  prototypeRegistry.find((prototype) => prototype.id === id);
