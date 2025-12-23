/**
 * Picklist Display Format Helper
 * Controls how picklist values are displayed in different UI contexts
 */

export type DisplayFormat = 'code' | 'name' | 'code_name' | 'name_code';
export type DisplayContext = 'dropdown' | 'grid' | 'report' | 'export';

export interface PicklistItem {
  code: string;
  name: string;
}

// Cache display configs to avoid repeated API calls
const displayConfigCache: Map<string, Map<DisplayContext, DisplayFormat>> = new Map();
let cacheInitialized = false;

/**
 * Initialize the display config cache from API
 */
export async function initDisplayConfigCache(): Promise<void> {
  if (cacheInitialized) return;

  try {
    const response = await fetch('/api/admin/picklist-display');
    if (!response.ok) {
      console.warn('Failed to load display configs, using defaults');
      cacheInitialized = true;
      return;
    }

    const data = await response.json();
    const configs = data.configs as Record<string, Record<string, string>>;

    for (const [listCode, contextFormats] of Object.entries(configs)) {
      const contextMap = new Map<DisplayContext, DisplayFormat>();
      for (const [context, format] of Object.entries(contextFormats)) {
        contextMap.set(context as DisplayContext, format as DisplayFormat);
      }
      displayConfigCache.set(listCode, contextMap);
    }

    cacheInitialized = true;
  } catch (error) {
    console.warn('Error loading display configs:', error);
    cacheInitialized = true;
  }
}

/**
 * Get the display format for a picklist in a specific context
 */
export async function getDisplayFormat(
  listCode: string,
  context: DisplayContext
): Promise<DisplayFormat> {
  // Ensure cache is initialized
  if (!cacheInitialized) {
    await initDisplayConfigCache();
  }

  // Check cache
  const contextMap = displayConfigCache.get(listCode);
  if (contextMap) {
    const format = contextMap.get(context);
    if (format) return format;
  }

  // Default formats if not configured
  const defaults: Record<DisplayContext, DisplayFormat> = {
    dropdown: 'name',
    grid: 'name',
    report: 'name',
    export: 'code',
  };

  return defaults[context];
}

/**
 * Get display format synchronously (from cache only)
 * Use this when you need sync access and have already initialized the cache
 */
export function getDisplayFormatSync(
  listCode: string,
  context: DisplayContext
): DisplayFormat {
  const contextMap = displayConfigCache.get(listCode);
  if (contextMap) {
    const format = contextMap.get(context);
    if (format) return format;
  }

  // Default to 'name' for most contexts, 'code' for export
  return context === 'export' ? 'code' : 'name';
}

/**
 * Format a picklist value according to the specified format
 */
export function formatPicklistValue(
  item: PicklistItem | null | undefined,
  format: DisplayFormat
): string {
  if (!item) return '';

  switch (format) {
    case 'code':
      return item.code;
    case 'name':
      return item.name;
    case 'code_name':
      return `${item.code} - ${item.name}`;
    case 'name_code':
      return `${item.name} (${item.code})`;
    default:
      return item.name;
  }
}

/**
 * Format a picklist value for a specific context
 * Convenience function that combines getDisplayFormatSync and formatPicklistValue
 */
export function formatForContext(
  listCode: string,
  item: PicklistItem | null | undefined,
  context: DisplayContext
): string {
  const format = getDisplayFormatSync(listCode, context);
  return formatPicklistValue(item, format);
}

/**
 * Update display config cache with new value
 * Call this after updating a display format via API
 */
export function updateDisplayConfigCache(
  listCode: string,
  context: DisplayContext,
  format: DisplayFormat
): void {
  let contextMap = displayConfigCache.get(listCode);
  if (!contextMap) {
    contextMap = new Map();
    displayConfigCache.set(listCode, contextMap);
  }
  contextMap.set(context, format);
}

/**
 * Clear the display config cache
 * Useful when you need to force a refresh from the server
 */
export function clearDisplayConfigCache(): void {
  displayConfigCache.clear();
  cacheInitialized = false;
}

/**
 * React hook for using display formats
 * Returns a function to format values for the specified context
 */
export function usePicklistDisplay(listCode: string, context: DisplayContext) {
  const format = getDisplayFormatSync(listCode, context);

  return {
    format,
    formatValue: (item: PicklistItem | null | undefined) =>
      formatPicklistValue(item, format),
  };
}
