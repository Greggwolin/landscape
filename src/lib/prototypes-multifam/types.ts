export type PrototypeStatus = 'wip' | 'stable' | 'archived';

type PrototypeTag =
  | 'units'
  | 'leases'
  | 'turns'
  | 'unit-types'
  | 'reports'
  | 'rent-roll'
  | 'occupancy'
  | 'renewals'
  | 'multifamily';

export interface MultiFamPrototypeMetadata {
  id: string;
  name: string;
  description: string;
  status: PrototypeStatus;
  frontendUrl: string;
  backendUrl: string;
  branch?: string;
  owners?: string[];
  tags?: PrototypeTag[];
  notes?: string;
}
