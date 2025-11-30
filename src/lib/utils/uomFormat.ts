export type UOMContext = 'land_pricing' | 'budget_cost' | 'budget_qty' | 'absorption' | 'rate_factor';

export interface UOMFormatOptions {
  context: UOMContext;
  code: string;
  includeCode?: boolean;
}

const PREFIX_BY_CONTEXT: Record<UOMContext, string> = {
  land_pricing: '$/',
  budget_cost: '$/',
  budget_qty: '',
  absorption: '/',
  rate_factor: '',
};

export function getUOMPrefix(context: UOMContext): string {
  return PREFIX_BY_CONTEXT[context] ?? '';
}

export function formatUOM({ context, code, includeCode = true }: UOMFormatOptions): string {
  if (!code) return '';
  const prefix = getUOMPrefix(context);
  return includeCode ? `${prefix}${code}` : prefix;
}

export function formatUOMOption(code: string, name: string, context: UOMContext): string {
  // Keep dropdown labels currency-neutral; formatting should be applied where amounts are shown.
  return `${code} - ${name}`;
}
