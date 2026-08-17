'use client';

import React, { useCallback, useEffect, useState } from 'react';

export interface SfCompsFilters {
  radiusMiles: number;
  soldWithinDays: number;
  minYearBuilt?: number;
}

export const SF_COMPS_DEFAULT_FILTERS: SfCompsFilters = {
  radiusMiles: 3,
  soldWithinDays: 180,
  minYearBuilt: undefined,
};

interface Props {
  filters: SfCompsFilters;
  onFiltersChange: (next: SfCompsFilters) => void;
  /** Optional trailing content — the comp count, a spinner, etc. */
  trailing?: React.ReactNode;
  /** Stack vertically for a narrow rail instead of the tile's wide row. */
  compact?: boolean;
}

/**
 * Radius / minimum year built / sold-within-days — ONE implementation, shared
 * by the classic Market tab's SfCompsTile and the map's Comparable Unit Sales
 * layer (MK28 §2).
 *
 * Extracted rather than reimplemented on purpose. MarketTab carries a comment
 * saying its filter state is shared between the SFD list and the Recent Sales
 * map layer "so the two always agree" — that comment exists because the two
 * counts drifted apart once. A second set of controls with their own
 * validation would break the same guarantee a third time.
 *
 * DRAFT-THEN-COMMIT is the behaviour worth preserving: the inputs hold a
 * string while you type and only commit on blur or Enter, so a half-typed "1"
 * on the way to "180" never fires a refetch. Invalid entries snap back to the
 * committed value rather than propagating.
 *
 * STATE IS NOT SHARED, deliberately. The classic Market tab and the /w/ map
 * panel are different surfaces with no common parent, and lifting this into a
 * context to keep two independently-opened screens in lockstep would be a
 * bigger change than the problem justifies. What is shared is the controls and
 * their defaults, so the two cannot drift in convention — only in what the
 * user has deliberately set on each surface.
 */
export function SfCompsFilterControls({ filters, onFiltersChange, trailing, compact }: Props) {
  const currentYear = new Date().getFullYear();

  const [draftRadius, setDraftRadius] = useState(String(filters.radiusMiles));
  const [draftDays, setDraftDays] = useState(String(filters.soldWithinDays));
  const [draftMinYear, setDraftMinYear] = useState(
    filters.minYearBuilt ? String(filters.minYearBuilt) : ''
  );

  // Re-sync when the committed filters change from outside.
  useEffect(() => {
    setDraftRadius(String(filters.radiusMiles));
    setDraftDays(String(filters.soldWithinDays));
    setDraftMinYear(filters.minYearBuilt ? String(filters.minYearBuilt) : '');
  }, [filters.radiusMiles, filters.soldWithinDays, filters.minYearBuilt]);

  const commitRadius = useCallback(() => {
    const value = parseFloat(draftRadius);
    if (Number.isFinite(value) && value >= 0.5) {
      onFiltersChange({ ...filters, radiusMiles: value });
    } else {
      setDraftRadius(String(filters.radiusMiles));
    }
  }, [draftRadius, filters, onFiltersChange]);

  const commitDays = useCallback(() => {
    const value = parseInt(draftDays, 10);
    if (Number.isFinite(value) && value >= 30) {
      onFiltersChange({ ...filters, soldWithinDays: value });
    } else {
      setDraftDays(String(filters.soldWithinDays));
    }
  }, [draftDays, filters, onFiltersChange]);

  const commitMinYear = useCallback(() => {
    const trimmed = draftMinYear.trim();
    if (trimmed.length === 0) {
      onFiltersChange({ ...filters, minYearBuilt: undefined });
      return;
    }
    const value = parseInt(trimmed, 10);
    if (Number.isFinite(value) && value >= 1900 && value <= currentYear) {
      onFiltersChange({ ...filters, minYearBuilt: value });
    } else {
      setDraftMinYear(filters.minYearBuilt ? String(filters.minYearBuilt) : '');
    }
  }, [draftMinYear, filters, currentYear, onFiltersChange]);

  const onEnter = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div
      className={
        compact
          ? 'd-flex flex-column gap-2'
          : 'd-flex flex-wrap gap-3 align-items-end mb-3'
      }
    >
      <div>
        <label className="text-muted small d-block mb-1">Radius (mi)</label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={draftRadius}
          onChange={(e) => setDraftRadius(e.target.value)}
          onBlur={commitRadius}
          onKeyDown={onEnter(commitRadius)}
          className="form-control form-control-sm"
          style={{ width: compact ? '100%' : 70 }}
        />
      </div>
      <div>
        <label className="text-muted small d-block mb-1">Min Year Built</label>
        <input
          type="number"
          min={1900}
          max={currentYear}
          placeholder="YYYY"
          value={draftMinYear}
          onChange={(e) => setDraftMinYear(e.target.value)}
          onBlur={commitMinYear}
          onKeyDown={onEnter(commitMinYear)}
          className="form-control form-control-sm"
          style={{ width: compact ? '100%' : 90 }}
        />
      </div>
      <div>
        <label className="text-muted small d-block mb-1">Days</label>
        <input
          type="number"
          min={30}
          max={365}
          step={30}
          value={draftDays}
          onChange={(e) => setDraftDays(e.target.value)}
          onBlur={commitDays}
          onKeyDown={onEnter(commitDays)}
          className="form-control form-control-sm"
          style={{ width: compact ? '100%' : 70 }}
        />
      </div>
      {trailing ? (
        <div className="d-flex align-items-center gap-2" style={{ paddingBottom: compact ? 0 : 6 }}>
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
