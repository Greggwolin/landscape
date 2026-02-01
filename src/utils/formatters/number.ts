// v1.0 · 2025-11-02 · Number formatting utilities per UI_STANDARDS_v1.0.md

export const formatNumber = (
  v: number | null | undefined,
  opts?: Intl.NumberFormatOptions
): string => {
  if (v == null) return '';
  if (v === 0) return '—'; // Render zero as dash
  return new Intl.NumberFormat(undefined, {
    useGrouping: true,
    maximumFractionDigits: 0,
    ...opts,
  }).format(v);
};

export const formatMoney = (
  v: number | null | undefined,
  optsOrDecimals?: Intl.NumberFormatOptions | number
): string => {
  if (v == null) return '';
  if (v === 0) return '—'; // Render zero as dash

  // Allow passing a number as shorthand for maximumFractionDigits
  const opts: Intl.NumberFormatOptions = typeof optsOrDecimals === 'number'
    ? { maximumFractionDigits: optsOrDecimals, minimumFractionDigits: optsOrDecimals }
    : optsOrDecimals || {};

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...opts,
  }).format(v);
};

export const formatPercent = (
  v: number | null | undefined,
  digits = 0
): string => {
  if (v == null) return '';
  if (v === 0) return '—'; // Render zero as dash
  return `${new Intl.NumberFormat(undefined, {
    useGrouping: true,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)}%`;
};
