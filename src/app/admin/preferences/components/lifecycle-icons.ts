import { cilDollar, cilTerrain, cilIndustry, cilHandshake, cilBank } from '@coreui/icons';
import type { LifecycleStage } from '@/types/benchmarks';

export const LIFECYCLE_STAGE_ICONS: Record<LifecycleStage, any> = {
  Acquisition: cilDollar,
  Development: cilTerrain,
  Operations: cilIndustry,
  Disposition: cilHandshake,
  Financing: cilBank,
};
