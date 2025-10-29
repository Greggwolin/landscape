import type { MultiFamPrototypeMetadata } from './types';

export const multiFamPrototypeRegistry: MultiFamPrototypeMetadata[] = [
  {
    id: 'multifam-rent-roll-inputs',
    name: 'Rent Roll & Unit Inputs',
    description: 'Comprehensive multifamily rent roll management with floor plan matrix, market comparables, and detailed unit-level inputs',
    status: 'wip',
    frontendUrl: '/prototypes/multifam/rent-roll-inputs',
    backendUrl: '/admin/multifamily/multifamilyunit/',
    owners: ['Dev Team'],
    tags: ['units', 'leases', 'rent-roll', 'multifamily'],
    notes: 'Three-panel layout inspired by Peoria Lakes: floor plans (upper left), comparables map (upper right), detailed rent roll table (bottom) with inline editing'
  }
];

export const getMultiFamPrototypeById = (id: string) =>
  multiFamPrototypeRegistry.find((prototype) => prototype.id === id);
