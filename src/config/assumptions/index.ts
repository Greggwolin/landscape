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

export const allBaskets = [
  basket1Config,
  basket2Config,
  basket3Config,
  basket4Config,
  basket5Config
];

// Helper function to get fields for a specific tier
export function getFieldsForTier(basketId: number, tier: 'napkin' | 'mid' | 'pro') {
  const basket = allBaskets.find(b => b.basketId === basketId);
  if (!basket) return [];

  const tierOrder = { napkin: 1, mid: 2, pro: 3 };
  return basket.fields.filter(field => tierOrder[field.tier] <= tierOrder[tier]);
}

// Helper function to get field groups for a specific tier
export function getGroupsForTier(basketId: number, tier: 'napkin' | 'mid' | 'pro') {
  const basket = allBaskets.find(b => b.basketId === basketId);
  if (!basket) return [];

  const tierOrder = { napkin: 1, mid: 2, pro: 3 };
  return basket.fieldGroups.filter(group => tierOrder[group.tier] <= tierOrder[tier]);
}
