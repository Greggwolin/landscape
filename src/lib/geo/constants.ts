/**
 * Geographic constants: FIPS codes, state mappings, and geo hierarchy order.
 */

// State abbreviation -> 2-digit FIPS code
export const ABBR_TO_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06',
  CO: '08', CT: '09', DE: '10', DC: '11', FL: '12',
  GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23',
  MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33',
  NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44',
  SC: '45', SD: '46', TN: '47', TX: '48', UT: '49',
  VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56', PR: '72',
};

// Reverse: FIPS -> abbreviation
export const FIPS_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(ABBR_TO_FIPS).map(([k, v]) => [v, k]),
);

// FIPS -> Full state name
export const FIPS_TO_NAME: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
  '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
  '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
  '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
  '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
  '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
  '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
  '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
  '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
  '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
  '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming', '72': 'Puerto Rico',
};

// Full state name (lowercase) -> abbreviation
export const STATE_NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_NAME).map(([fips, name]) => [name.toLowerCase(), FIPS_TO_ABBR[fips]]),
);

/**
 * Normalize a state input (full name or abbreviation) to 2-letter USPS abbreviation.
 */
export function normalizeState(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_NAME_TO_ABBR[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Geo level hierarchy order. MICRO slots between MSA and STATE for
 * cities in Micropolitan Statistical Areas that don't belong to an MSA.
 */
export const GEO_LEVEL_ORDER = ['CITY', 'COUNTY', 'MSA', 'MICRO', 'STATE', 'US'] as const;
export type GeoLevel = (typeof GEO_LEVEL_ORDER)[number];
