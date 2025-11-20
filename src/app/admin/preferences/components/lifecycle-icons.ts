import { cilDollar, cilPencil, cilTerrain, cilIndustry, cilHandshake, cilBank } from '@coreui/icons';
import type { Activity } from '@/types/benchmarks';

export const LIFECYCLE_STAGE_ICONS: Record<Activity, any> = {
  Acquisition: cilDollar,
  'Planning & Engineering': cilPencil,
  Development: cilTerrain,
  Operations: cilIndustry,
  Disposition: cilHandshake,
  Financing: cilBank,
};
