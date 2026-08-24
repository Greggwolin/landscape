'use client';

/* An artifact asking the panel for room.
 *
 * The artifacts panel decides its own width from a viewport share, a takeover
 * rule, and the user's drag. None of those know how many columns the thing
 * inside is trying to draw, so a seventeen-column budget got the same 25% as a
 * two-line summary and the user was left scrolling sideways for columns that
 * had nowhere to go.
 *
 * This is the channel back. An artifact that knows its own content width says
 * so; the panel grows to meet it, up to a ceiling that always leaves the chat
 * usable, and never over a width the user has dragged for himself.
 *
 * WHY A CONTEXT AND NOT THE EXISTING SEAM. `preferredShareForArtifact` in
 * ProjectArtifactsPanel takes an artifact id and returns a viewport share. It
 * cannot answer this: the width depends on which columns are on screen RIGHT
 * NOW — the detail rung, the chips the user has added, the constant-drop rule —
 * and all of that lives inside the artifact and changes without the artifact id
 * changing. A share computed from an id would be stale the moment a chip was
 * toggled.
 *
 * The request is a REQUEST. The panel is free to ignore it, and does whenever
 * the user has sized the panel himself.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ArtifactWidthRequestValue {
  /** The width the mounted artifact would like, in pixels. null = no opinion. */
  requestedWidth: number | null;
  /** Ask for a width. Pass null to withdraw the request (on unmount, or when
   *  the content no longer needs the room). */
  requestWidth: (px: number | null) => void;
}

const ArtifactWidthRequestContext = createContext<ArtifactWidthRequestValue>({
  requestedWidth: null,
  requestWidth: () => {},
});

export function ArtifactWidthRequestProvider({ children }: { children: React.ReactNode }) {
  const [requestedWidth, setRequestedWidth] = useState<number | null>(null);

  // Identity-stable so an artifact can call this from an effect keyed on its
  // own column list without the callback itself retriggering the effect.
  const requestWidth = useCallback((px: number | null) => {
    setRequestedWidth((prev) => (prev === px ? prev : px));
  }, []);

  const value = useMemo(
    () => ({ requestedWidth, requestWidth }),
    [requestedWidth, requestWidth]
  );

  return (
    <ArtifactWidthRequestContext.Provider value={value}>
      {children}
    </ArtifactWidthRequestContext.Provider>
  );
}

/** Read the current request. For the panel. */
export function useArtifactWidthRequest(): ArtifactWidthRequestValue {
  return useContext(ArtifactWidthRequestContext);
}

/* ── The width model ─────────────────────────────────────────────────────
 *
 * What one column needs before its content starts wrapping or truncating.
 * These are MINIMUMS to read by, not the widths the browser will settle on —
 * the table is `table-layout: auto`, so the browser distributes any surplus
 * itself. Their only job is to answer "how much room does this set of columns
 * want in total".
 *
 * Keyed by column key first, then by kind, then a floor. Column keys win
 * because a date is not a date: `start` is a period number in two or three
 * characters, `start_date` is a formatted calendar date.
 */
const WIDTH_BY_KEY: Record<string, number> = {
  // The hierarchy column, inserted by ScheduleArtifact rather than the spec.
  __hier: 128,
  category: 150,
  stage: 112,
  description: 220,
  division: 132,
  vendor: 140,
  notes: 180,
  uom: 74,
  rate: 92,
  amount: 112,
  qty: 84,
  pct: 72,
  group: 190,
  start: 62,
  duration: 62,
  start_date: 108,
  end_date: 108,
  timing_method: 112,
  curve_profile: 104,
  curve_steepness: 74,
  escalation: 140,
  escalation_method: 116,
};

const WIDTH_BY_KIND: Record<string, number> = {
  text: 150,
  picklist: 120,
  reference: 132,
  date: 108,
  boolean: 80,
  number: 88,
  computed: 108,
};

const FLOOR_COLUMN_WIDTH = 90;

/** Chrome around the table itself: panel padding, the row-action gutter, and
 *  the scrollbar that appears the moment the table is one pixel too wide. */
const TABLE_CHROME = 72;

/**
 * The width a set of columns wants, in pixels.
 *
 * Exported for the artifact to call and for tests. Deliberately pure — no
 * measurement, no window — so it produces the same answer on the server and in
 * the browser and cannot cause a hydration mismatch.
 */
export function widthForColumns(
  columns: Array<{ key: string; kind?: string }>
): number {
  if (columns.length === 0) return 0;
  const sum = columns.reduce((total, column) => {
    const byKey = WIDTH_BY_KEY[column.key];
    if (byKey != null) return total + byKey;
    const byKind = column.kind ? WIDTH_BY_KIND[column.kind] : undefined;
    return total + (byKind ?? FLOOR_COLUMN_WIDTH);
  }, 0);
  return sum + TABLE_CHROME;
}
