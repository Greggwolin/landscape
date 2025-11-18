/**
 * useTileStatus Hook
 *
 * Calculates completion status for navigation tiles based on project data.
 * Examines existing data to determine if a section is:
 * - complete: All required fields filled, has meaningful data
 * - in-progress: Some data entered, but incomplete
 * - not-started: No data or only defaults
 * - empty: Section not applicable or disabled
 *
 * Status logic is determined by examining the project object and checking
 * for presence of data in relevant fields (not by querying new database fields).
 *
 * @version 1.0
 * @date 2025-11-18
 */
'use client';

import { useMemo } from 'react';
import { type TileStatus } from '@/config/tile-hierarchy';

interface Project {
  project_id: number;
  project_name: string;
  acres_gross?: number | null;
  location_lat?: number | null;
  location_lon?: number | null;
  start_date?: string | null;
  jurisdiction_city?: string | null;
  jurisdiction_county?: string | null;
  jurisdiction_state?: string | null;
  project_type_code?: string | null;
  [key: string]: any;
}

export interface TileStatusMap {
  [tileId: string]: TileStatus;
}

/**
 * useTileStatus Hook
 *
 * Returns status indicators for all navigation tiles based on project data.
 */
export function useTileStatus(project?: Project | null): TileStatusMap {
  return useMemo(() => {
    if (!project) {
      return {};
    }

    const statusMap: TileStatusMap = {};

    // ============================================================================
    // PROPERTY TILE STATUSES
    // ============================================================================

    // Property Overview
    const hasProjectName = Boolean(project.project_name && project.project_name.trim() !== '');
    const hasProjectType = Boolean(project.project_type_code);
    statusMap['property-overview'] = hasProjectName && hasProjectType ? 'complete' : 'not-started';

    // Property Details
    const hasLocation = Boolean(project.location_lat && project.location_lon);
    const hasJurisdiction = Boolean(project.jurisdiction_city || project.jurisdiction_county);
    const hasAcres = Boolean(project.acres_gross && project.acres_gross > 0);
    const propertyDetailFields = [hasLocation, hasJurisdiction, hasAcres].filter(Boolean).length;

    if (propertyDetailFields === 3) {
      statusMap['property-details'] = 'complete';
    } else if (propertyDetailFields > 0) {
      statusMap['property-details'] = 'in-progress';
    } else {
      statusMap['property-details'] = 'not-started';
    }

    // Property Tile (parent) - aggregate of children
    const propertyComplete = statusMap['property-overview'] === 'complete' && statusMap['property-details'] === 'complete';
    const propertyInProgress = statusMap['property-overview'] === 'in-progress' || statusMap['property-details'] === 'in-progress';
    statusMap['property'] = propertyComplete ? 'complete' : (propertyInProgress ? 'in-progress' : 'not-started');

    // Assumptions & Settings - default to not-started (would need additional data checks)
    statusMap['property-assumptions'] = 'not-started';
    statusMap['property-settings'] = 'not-started';

    // ============================================================================
    // BUDGET TILE STATUSES
    // ============================================================================

    // For now, mark all budget tiles as not-started
    // TODO: Query budget line items, opex categories, etc. to determine actual status
    statusMap['budget-development'] = 'not-started';
    statusMap['budget-operations'] = 'not-started';
    statusMap['budget-feasibility'] = 'not-started';
    statusMap['budget-financing'] = 'not-started';
    statusMap['budget'] = 'not-started';

    // ============================================================================
    // PLANNING TILE STATUSES
    // ============================================================================

    // For now, mark planning tiles as not-started
    // TODO: Check for parcels, phases, sales data to determine status
    statusMap['planning-canvas'] = 'not-started';
    statusMap['planning-sales'] = 'not-started';
    statusMap['planning'] = 'not-started';

    // ============================================================================
    // MARKET TILE STATUSES
    // ============================================================================

    // For now, mark market tiles as not-started
    // TODO: Check for valuation data, reports, documents to determine status
    statusMap['market-valuation'] = 'not-started';
    statusMap['market-reports'] = 'not-started';
    statusMap['market-documents'] = 'not-started';
    statusMap['market'] = 'not-started';

    return statusMap;
  }, [project]);
}

/**
 * Helper: Get status for a specific tile ID
 */
export function getTileStatus(tileId: string, statusMap: TileStatusMap): TileStatus | undefined {
  return statusMap[tileId];
}

/**
 * Helper: Calculate aggregate status for parent tile based on children
 */
export function calculateParentStatus(childStatuses: TileStatus[]): TileStatus {
  if (childStatuses.length === 0) return 'empty';

  const allComplete = childStatuses.every((s) => s === 'complete');
  const anyInProgress = childStatuses.some((s) => s === 'in-progress');
  const anyStarted = childStatuses.some((s) => s === 'complete' || s === 'in-progress');

  if (allComplete) return 'complete';
  if (anyInProgress) return 'in-progress';
  if (anyStarted) return 'in-progress';
  return 'not-started';
}
