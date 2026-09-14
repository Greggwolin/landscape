// ============================================================================
// ASSUMPTION BASKET CONFIGURATIONS
// ============================================================================
// Export all basket configurations for progressive disclosure UI
// ============================================================================

export { basket1Config } from './basket1-the-deal';
export { basket2Config } from './basket2-revenue';
export { basket3Config } from './basket3-expenses';
export { basket4Config } from './basket4-financing';
export { basket5Config } from './basket5-equity';

import { basket1Config } from './basket1-the-deal';
import { basket2Config } from './basket2-revenue';
import { basket3Config } from './basket3-expenses';
import { basket4Config } from './basket4-financing';
import { basket5Config } from './basket5-equity';
import type { ProjectTypeCode } from '@/types/assumptions';

export const allBaskets = [
  basket1Config,
  basket2Config,
  basket3Config,
  basket4Config,
  basket5Config
];

const tierOrder = { napkin: 1, mid: 2, pro: 3 } as const;

/**
 * Does this field or group belong to this project type?
 *
 * No declared list means every type — the common case, and the reason adding
 * gating did not require touching four hundred field definitions. An UNKNOWN
 * project type shows everything rather than nothing: a person who can see a
 * field they do not need can ask about it; a person whose assumptions page is
 * silently empty cannot.
 */
function appliesToType(
  item: { propertyTypes?: ProjectTypeCode[] },
  projectType?: string | null,
): boolean {
  if (!item.propertyTypes || item.propertyTypes.length === 0) return true;
  if (!projectType) return true;
  return item.propertyTypes.includes(projectType.toUpperCase() as ProjectTypeCode);
}

// Helper function to get fields for a specific tier
export function getFieldsForTier(
  basketId: number,
  tier: 'napkin' | 'mid' | 'pro',
  projectType?: string | null,
) {
  const basket = allBaskets.find(b => b.basketId === basketId);
  if (!basket) return [];

  return basket.fields.filter(
    field => tierOrder[field.tier] <= tierOrder[tier] && appliesToType(field, projectType),
  );
}

// Helper function to get field groups for a specific tier
export function getGroupsForTier(
  basketId: number,
  tier: 'napkin' | 'mid' | 'pro',
  projectType?: string | null,
) {
  const basket = allBaskets.find(b => b.basketId === basketId);
  if (!basket) return [];

  const visibleFieldKeys = new Set(getFieldsForTier(basketId, tier, projectType).map(f => f.key));

  return basket.fieldGroups
    .filter(group => tierOrder[group.tier] <= tierOrder[tier] && appliesToType(group, projectType))
    // A group whose every field is gated away for this project type is not an
    // empty heading — it is not shown at all.
    .filter(group => group.fields.some(key => visibleFieldKeys.has(key)));
}
