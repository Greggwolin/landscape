export type SemanticVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'dark';

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

export function resolveSemanticVariant(
  intent: string,
  value: string,
  interactive?: boolean
): SemanticVariant {
  const normalized = normalizeValue(value);

  if (intent === 'status') {
    if (normalized.startsWith('physical-complete-')) {
      if (normalized.endsWith('high')) return 'success';
      if (normalized.endsWith('medium')) return 'warning';
      return 'secondary';
    }
    return statusVariants[normalized] ?? 'secondary';
  }

  if (intent === 'confidence') {
    if (normalized.includes('high')) return 'success';
    if (normalized.includes('med')) return 'warning';
    if (normalized.includes('low')) return 'danger';
    return 'secondary';
  }

  if (intent === 'category') {
    return categoryVariants[normalized] ?? 'secondary';
  }

  if (intent === 'action-state') {
    return actionStateVariants[normalized] ?? (interactive ? 'primary' : 'secondary');
  }

  if (intent === 'navigation-meta') {
    return navMetaVariants[normalized] ?? 'secondary';
  }

  // Fallback to secondary for unknown intents
  return 'secondary';
}
