export type AddressLines = {
  line1: string;
  line2: string;
};

export const escapeHtml = (value: unknown): string => {
  const str = typeof value === 'string' ? value : value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const splitAddressLines = (address?: string | null): AddressLines | null => {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const line1 = parts[0];
  if (!line1) return null;

  if (parts.length === 1) {
    return { line1, line2: '' };
  }

  const remainder = parts.slice(1).join(' ').trim();
  if (!remainder) {
    return { line1, line2: '' };
  }

  const tokens = remainder.split(/\s+/).filter(Boolean);
  let stateIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (/^[A-Za-z]{2}$/.test(tokens[i])) {
      stateIndex = i;
      break;
    }
  }

  if (stateIndex >= 0) {
    const city = tokens.slice(0, stateIndex).join(' ').replace(/,$/, '');
    const state = tokens[stateIndex].toUpperCase();
    const line2 = city ? `${city}, ${state}` : state;
    return { line1, line2 };
  }

  return { line1, line2: remainder };
};
