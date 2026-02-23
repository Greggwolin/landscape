/**
 * Location Analysis Data Snapshot
 *
 * Captures the current state of market data and project documents
 * so we can detect staleness on subsequent page loads.
 */

export interface DataSnapshot {
  /** Latest date per market series_code (e.g. { "PAYEMS": "2026-01-31" }) */
  market_data_latest_dates: Record<string, string>;
  /** Number of active documents in project DMS */
  document_count: number;
  /** ISO timestamp of most recently added document */
  document_latest_created_at: string | null;
  /** When this snapshot was captured */
  snapshot_timestamp: string;
}

interface SeriesLike {
  series_code: string;
  data: Array<{ date: string }>;
}

/**
 * Capture current data snapshot from in-memory series data + document API.
 *
 * @param seriesData - MarketSeries[] already loaded in LocationSubTab
 * @param projectId - Current project ID for document count lookup
 */
export async function captureDataSnapshot(
  seriesData: SeriesLike[],
  projectId: number | string,
): Promise<DataSnapshot> {
  // Extract latest date per series from in-memory data
  const marketDataLatestDates: Record<string, string> = {};
  for (const series of seriesData) {
    if (series.data.length > 0) {
      // Data is sorted chronologically; last entry is most recent
      const latestDate = series.data[series.data.length - 1].date;
      if (latestDate) {
        marketDataLatestDates[series.series_code] = latestDate;
      }
    }
  }

  // Fetch document metadata
  let documentCount = 0;
  let documentLatestCreatedAt: string | null = null;

  try {
    const res = await fetch(`/api/documents/count?project_id=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      documentCount = data.document_count || 0;
      documentLatestCreatedAt = data.latest_created_at || null;
    }
  } catch {
    // Non-critical — snapshot still usable without doc metadata
  }

  return {
    market_data_latest_dates: marketDataLatestDates,
    document_count: documentCount,
    document_latest_created_at: documentLatestCreatedAt,
    snapshot_timestamp: new Date().toISOString(),
  };
}

/**
 * Compare a saved snapshot against current data to detect staleness.
 *
 * @returns Object with is_stale flag and human-readable reasons
 */
export function checkSnapshotStaleness(
  saved: DataSnapshot | null | undefined,
  current: DataSnapshot,
): { is_stale: boolean; reasons: string[] } {
  if (!saved) {
    return { is_stale: false, reasons: [] };
  }

  const reasons: string[] = [];

  // Check for newer market data
  for (const [code, currentDate] of Object.entries(
    current.market_data_latest_dates,
  )) {
    const savedDate = saved.market_data_latest_dates?.[code];
    if (savedDate && currentDate > savedDate) {
      reasons.push(`Updated economic data (${code})`);
      break; // One reason is enough
    }
  }

  // Check for new documents
  if (current.document_count > (saved.document_count || 0)) {
    const newDocs = current.document_count - (saved.document_count || 0);
    reasons.push(
      `${newDocs} new document${newDocs !== 1 ? 's' : ''} added to project`,
    );
  } else if (
    current.document_latest_created_at &&
    saved.document_latest_created_at &&
    current.document_latest_created_at > saved.document_latest_created_at
  ) {
    reasons.push('Documents updated since last analysis');
  }

  return {
    is_stale: reasons.length > 0,
    reasons,
  };
}
