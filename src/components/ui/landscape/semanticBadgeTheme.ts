export type SemanticVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'dark';

export type SemanticIntent =
  | 'status'
  | 'confidence'
  | 'category'
  | 'action-state'
  | 'navigation-meta'
  | 'user-tag';

const normalizeValue = (value: string) => value?.toLowerCase().trim() ?? '';

const statusVariants: Record<string, SemanticVariant> = {
  complete: 'success',
  partial: 'warning',
  pending: 'warning',
  validated: 'info',
  rejected: 'danger',
  applied: 'success',
  occupied: 'success',
  vacant: 'secondary',
  notice: 'warning',
  'month-to-month': 'info',
  selling: 'success',
  active: 'success',
  sold_out: 'secondary',
  planned: 'info',
};

const categoryVariants: Record<string, SemanticVariant> = {
  'land development': 'primary',
  multifamily: 'info',
  commercial: 'secondary',
  office: 'dark',
  retail: 'secondary',
  industrial: 'dark',
  hotel: 'dark',
  'mixed use': 'info',
  'master planned community': 'primary',
  person: 'primary',
  company: 'dark',
  entity: 'secondary',
  fund: 'info',
  government: 'dark',
  other: 'secondary',
  rent_roll: 'primary',
  unit_type: 'secondary',
  land_pricing: 'primary',
  budget_cost: 'info',
  budget_qty: 'secondary',
  absorption: 'dark',
  rate_factor: 'info',
  area: 'secondary',
  linear: 'secondary',
  volume: 'secondary',
  count: 'secondary',
  time: 'secondary',
  currency: 'secondary',
  zonda: 'info',
  manual: 'warning',
  landscaper_ai: 'info',
  'lot-dimensions': 'info',
};

const actionStateVariants: Record<string, SemanticVariant> = {
  yes: 'primary',
  no: 'secondary',
  conditional: 'warning',
  firm: 'secondary',
};

const navMetaVariants: Record<string, SemanticVariant> = {
  active: 'light',
  inactive: 'secondary',
  subdivisions: 'light',
  count: 'light',
};

type ResolverFn = (normalizedValue: string, interactive?: boolean) => SemanticVariant | undefined;

const dynamicResolvers: Partial<Record<SemanticIntent, ResolverFn>> = {
  status: (normalized) => {
    if (normalized.startsWith('physical-complete-')) {
      if (normalized.endsWith('high')) return 'success';
      if (normalized.endsWith('medium')) return 'warning';
      return 'secondary';
    }
    return undefined;
  },
  confidence: (normalized) => {
    if (normalized.includes('high')) return 'success';
    if (normalized.includes('med')) return 'warning';
    if (normalized.includes('low')) return 'danger';
    return undefined;
  },
  'action-state': (_normalized, interactive) => (interactive ? 'primary' : undefined),
};

const staticMappings: Record<SemanticIntent, Record<string, SemanticVariant>> = {
  status: statusVariants,
  confidence: {},
  category: categoryVariants,
  'action-state': actionStateVariants,
  'navigation-meta': navMetaVariants,
  'user-tag': {},
};

const fallbackVariants: Record<SemanticIntent, SemanticVariant> = {
  status: 'secondary',
  confidence: 'secondary',
  category: 'secondary',
  'action-state': 'secondary',
  'navigation-meta': 'secondary',
  'user-tag': 'light',
};

export function resolveSemanticVariant(
  intent: SemanticIntent,
  value: string,
  interactive?: boolean
): SemanticVariant {
  const normalized = normalizeValue(value);
  const dynamicVariant = dynamicResolvers[intent]?.(normalized, interactive);
  if (dynamicVariant) return dynamicVariant;

  const staticVariant = staticMappings[intent]?.[normalized];
  if (staticVariant) return staticVariant;

  if (intent === 'action-state' && interactive) return 'primary';

  return fallbackVariants[intent] ?? 'secondary';
}
