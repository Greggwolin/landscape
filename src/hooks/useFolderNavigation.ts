/**
 * useFolderNavigation Hook
 *
 * Manages folder tab navigation state via URL search params.
 * Provides URL-driven state for folder tabs with browser history support.
 *
 * URL pattern: /projects/[projectId]?folder=valuation&tab=sales
 *
 * @version 2.0
 * @created 2026-01-23
 * @updated 2026-01-23 - Updated for 7-folder configuration
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  createFolderConfig,
  getDefaultFolderId,
  getDefaultSubTabId,
  getFolderById,
  isValidFolderTab,
  type AnalysisTypeTileConfig,
} from '@/lib/utils/folderTabConfig';

export interface UseFolderNavigationOptions {
  /** Property type code (e.g., 'MF', 'LAND') */
  propertyType?: string;
  /** Analysis type (e.g., 'Land Development', 'Income Property') - kept for compatibility */
  analysisType?: string;
  /** Tile visibility config resolved from tbl_analysis_type_config */
  tileConfig?: AnalysisTypeTileConfig | null;
}

export interface UseFolderNavigationReturn {
  /** Current folder ID from URL */
  currentFolder: string;
  /** Current tab ID from URL */
  currentTab: string;
  /** Navigate to a folder/tab combination */
  setFolderTab: (folder: string, tab?: string) => void;
  /** Navigate to a specific tab within the current folder */
  setTab: (tab: string) => void;
  /** Get the folder configuration for current property type */
  folderConfig: ReturnType<typeof createFolderConfig>;
  /** Check if a folder/tab combination is valid */
  isValid: (folder: string, tab: string) => boolean;
}

/**
 * Hook for managing folder tab navigation via URL search params
 *
 * @example
 * ```tsx
 * const { currentFolder, currentTab, setFolderTab } = useFolderNavigation({
 *   propertyType: project.project_type_code,
 * });
 *
 * // Navigate to valuation > sales comparison
 * setFolderTab('valuation', 'sales');
 *
 * // Navigate within current folder
 * setTab('income');
 * ```
 */
export function useFolderNavigation(
  options: UseFolderNavigationOptions = {}
): UseFolderNavigationReturn {
  const { propertyType, analysisType, tileConfig } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get folder configuration for this property type and analysis type
  const folderConfig = useMemo(
    () => createFolderConfig(propertyType, analysisType, tileConfig),
    [propertyType, analysisType, tileConfig]
  );

  // Get default values
  const defaultFolder = useMemo(() => getDefaultFolderId(), []);

  // Read current folder from URL, validate, and fallback to default
  const currentFolder = useMemo(() => {
    const urlFolder = searchParams.get('folder');

    if (!urlFolder) {
      return defaultFolder;
    }

    // Validate folder exists in config
    const folder = getFolderById(urlFolder, propertyType, analysisType, tileConfig);
    if (!folder) {
      return defaultFolder;
    }

    return urlFolder;
  }, [searchParams, defaultFolder, propertyType, analysisType, tileConfig]);

  // Get default tab for current folder
  const defaultTab = useMemo(
    () => getDefaultSubTabId(currentFolder, propertyType, analysisType, tileConfig),
    [currentFolder, propertyType, analysisType, tileConfig]
  );

  // Read current tab from URL, validate, and fallback to default
  const currentTab = useMemo(() => {
    const urlTab = searchParams.get('tab');

    if (!urlTab) {
      return defaultTab;
    }

    // Validate tab exists in current folder
    if (!isValidFolderTab(currentFolder, urlTab, propertyType, analysisType, tileConfig)) {
      return defaultTab;
    }

    return urlTab;
  }, [searchParams, currentFolder, defaultTab, propertyType, analysisType, tileConfig]);

  // Check if a folder/tab combination is valid
  const isValid = useCallback(
    (folder: string, tab: string) => isValidFolderTab(folder, tab, propertyType, analysisType, tileConfig),
    [propertyType, analysisType, tileConfig]
  );

  // Navigate to a folder/tab combination
  const setFolderTab = useCallback(
    (folder: string, tab?: string) => {
      // Validate folder
      const folderObj = getFolderById(folder, propertyType, analysisType, tileConfig);
      if (!folderObj) {
        console.warn(`Invalid folder: ${folder}`);
        return;
      }

      // If tab not provided, use default for this folder
      const targetTab = tab || getDefaultSubTabId(folder, propertyType, analysisType, tileConfig);

      // Validate tab
      if (!isValidFolderTab(folder, targetTab, propertyType, analysisType, tileConfig)) {
        console.warn(`Invalid tab: ${targetTab} for folder: ${folder}`);
        return;
      }

      // Build new URL with search params
      const params = new URLSearchParams();
      params.set('folder', folder);
      params.set('tab', targetTab);

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl);
    },
    [pathname, router, propertyType, analysisType, tileConfig]
  );

  // Navigate to a specific tab within the current folder
  const setTab = useCallback(
    (tab: string) => {
      setFolderTab(currentFolder, tab);
    },
    [currentFolder, setFolderTab]
  );

  return {
    currentFolder,
    currentTab,
    setFolderTab,
    setTab,
    folderConfig,
    isValid,
  };
}

export default useFolderNavigation;
