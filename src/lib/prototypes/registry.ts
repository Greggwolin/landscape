import type { PrototypeMetadata } from './types';

export const prototypeRegistry: PrototypeMetadata[] = [
  {
    id: 'mui-budget-dashboard',
    name: 'MUI Budget Dashboard',
    description:
      'Explores a card-based overview for budget metrics using Material UI components.',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['mui', 'data', 'layout'],
    notes: 'Derived from existing budget grid work; compare against CoreUI approach.'
  },
  {
    id: 'tailwind-landing',
    name: 'Tailwind Landing Page',
    description:
      'Lightweight marketing-style landing page, useful for testing typography and dark mode.',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['tailwind', 'layout', 'navigation'],
    notes: 'Great place to trial hero layouts or CTA variations without touching main app.'
  },
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
    id: 'glide-parcel-grid',
    name: 'Glide Data Grid - Parcel Table',
    description:
      'High-performance canvas-based data grid for parcel overview with many columns',
    status: 'wip',
    owners: ['Gregg'],
    tags: ['glide', 'data', 'layout'],
    notes: 'Testing Glide Data Grid from https://github.com/glideapps/glide-data-grid for Planning Overview parcel table. Uses legacy-peer-deps with React 19.'
  }
];

export const getPrototypeById = (id: string) =>
  prototypeRegistry.find((prototype) => prototype.id === id);
