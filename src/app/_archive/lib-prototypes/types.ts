export type PrototypeStatus = 'wip' | 'stable' | 'archived';

type PrototypeTag =
  | 'mui'
  | 'coreui'
  | 'tailwind'
  | 'glide'
  | 'layout'
  | 'data'
  | 'navigation';

export interface PrototypeMetadata {
  id: string;
  name: string;
  description: string;
  status: PrototypeStatus;
  branch?: string;
  owners?: string[];
  tags?: PrototypeTag[];
  notes?: string;
}
