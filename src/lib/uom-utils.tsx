// Utility functions for processing UOM (Unit of Measure) options

export type UOMOption = {
  code: string;
  label: string;
  sortOrder?: number;
};

export type ProcessedUOMOptions = {
  regular: UOMOption[];
  timeBased: UOMOption[];
  all: Array<UOMOption | { isDivider: true }>;
};

// Time-based UOM codes that should appear at the bottom
const TIME_BASED_UOMS = ['$/Yr', '$/Qtr', '$/Mo'];

/**
 * Processes UOM options to separate time-based items and add a divider
 * @param uomOptions Raw UOM options from API
 * @returns Processed options with regular items, time-based items, and combined array with divider
 */
export function processUOMOptions(uomOptions: UOMOption[]): ProcessedUOMOptions {
  const regular: UOMOption[] = [];
  const timeBased: UOMOption[] = [];

  // Separate time-based from regular UOMs
  uomOptions.forEach(option => {
    if (TIME_BASED_UOMS.includes(option.code)) {
      timeBased.push(option);
    } else {
      regular.push(option);
    }
  });

  // Sort time-based items in specific order
  timeBased.sort((a, b) => {
    const aIndex = TIME_BASED_UOMS.indexOf(a.code);
    const bIndex = TIME_BASED_UOMS.indexOf(b.code);
    return aIndex - bIndex;
  });

  // Create combined array with divider if there are time-based items
  const all: Array<UOMOption | { isDivider: true }> = [
    ...regular,
    ...(timeBased.length > 0 ? [{ isDivider: true }, ...timeBased] : [])
  ];

  return {
    regular,
    timeBased,
    all
  };
}

/**
 * Renders UOM options in a select element with proper dividers
 * @param options Processed UOM options from processUOMOptions
 * @param selectedValue Currently selected value
 * @param onChange Change handler
 * @param className Optional CSS class
 */
export function renderUOMSelect(
  options: ProcessedUOMOptions,
  selectedValue: string,
  onChange: (value: string) => void,
  className?: string
) {
  return (
    <select
      className={className}
      value={selectedValue}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.all.map((option, index) => {
        if ('isDivider' in option) {
          return (
            <option key={`divider-${index}`} disabled style={{
              borderTop: '1px solid #ccc',
              backgroundColor: '#f5f5f5',
              fontSize: '0.8em',
              fontStyle: 'italic'
            }}>
              ────── Time-based ──────
            </option>
          );
        }
        return (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        );
      })}
    </select>
  );
}