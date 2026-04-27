'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Viewport width below which the artifacts panel auto-collapses. */
const ARTIFACTS_COLLAPSE_BREAKPOINT = 1200;

/** Map artifact config returned by generate_map_artifact tool. */
export interface MapArtifactConfig {
  title: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  basemap: 'satellite' | 'terrain' | 'roadmap';
  markers: Array<{
    id: string;
    coordinates: [number, number];
    label?: string;
    color?: string;
    variant?: 'pin' | 'dot' | 'numbered';
    popup?: string;
  }>;
  project_name?: string;
  location?: string;
  /** When 'input', map opens in pin-placement mode (no coords on project). */
  mode?: 'display' | 'input';
  /** Project ID — needed for input mode to save coordinates back. */
  project_id?: number;
}

/** Census ACS tier — state / county / city. */
export interface CensusTier {
  population?: number | null;
  median_hh_income?: number | null;
  median_home_value?: number | null;
  median_gross_rent?: number | null;
  median_age?: number | null;
  owner_occ_pct?: number | null;
  vintage?: string;
  data_as_of?: string;
  tier?: 'state' | 'county' | 'place';
  tier_label?: string;
  fips?: string;
}

/** Location Brief artifact config returned by generate_location_brief tool. */
export interface LocationBriefArtifactConfig {
  title: string;
  location_display: string;
  property_type: string;
  property_type_label: string;
  depth: 'condensed' | 'standard' | 'comprehensive';
  center?: [number, number] | null; // [lng, lat]
  geo_hierarchy: {
    city?: string;
    state?: string;
    state_abbrev?: string;
    county?: string;
    cbsa_code?: string;
    cbsa_name?: string;
    fips?: {
      state?: string;
      county?: string;
      place?: string;
    };
  };
  summary: string;
  sections: Array<{ title: string; content: string }>;
  indicators: {
    fred?: Record<string, {
      series_id: string;
      value: number | null;
      date?: string;
      yoy_pct?: number | null;
      next_release?: string | null;
    }>;
    census?: CensusTier;
    census_tiers?: {
      state?: CensusTier;
      county?: CensusTier;
      city?: CensusTier;
    };
  };
  data_as_of: string;
  cached: boolean;
  cached_at?: string;
  /** True when we have enough info (city+state+property_type) to offer a "Create Project" CTA. */
  project_ready: boolean;
}

/**
 * Excel Audit artifact config — accumulates results across the 5 audit tools.
 * Each tool fills in its own optional section; the renderer shows whichever
 * sections are populated. Setter merges (vs. replaces) so a sequence of tool
 * calls (classify → structural → integrity → assumptions → waterfall) builds
 * up a single artifact rather than replacing it 5 times.
 */
export interface ExcelAuditArtifactConfig {
  doc_id: number;
  doc_name?: string;
  /** Phase 0 — classify_excel_file */
  classification?: {
    tier: 'flat' | 'assumption_heavy' | 'full_model' | string;
    sheet_count: number;
    formula_count: number;
    full_model_hits: string[];
    assumption_hits: string[];
    rationale: string;
  };
  /** Phase 1 — run_structural_scan */
  structural?: {
    sheets: Array<{ name: string; dimensions: string; max_row: number; max_col: number; merged_ranges: number; hidden: boolean }>;
    sheet_count: number;
    hidden_sheet_count: number;
    named_ranges: Array<{ name: string; value: string | null }>;
    named_range_count: number;
    external_links: string[];
    external_link_count: number;
  };
  /** Phase 2 — run_formula_integrity (incl. 2f impact tracer annotations) */
  integrity?: {
    findings: Array<Record<string, unknown>>;
    impact_summary?: {
      errors_reaching_headline: number;
      errors_quarantined: number;
      total_traced: number;
      note?: string;
      verdict?: 'ALL_QUARANTINED' | 'ALL_REACH_OUTPUTS' | 'MIXED' | 'NONE' | 'UNTRACED';
      verdict_text?: string;
    };
    tier?: string;
  };
  /** Phase 3 — extract_assumptions */
  assumptions?: {
    extractions?: Array<Record<string, unknown>>;
    staged_count?: number;
    project_id?: number | null;
  };
  /** Phase 4 — classify_waterfall */
  waterfall?: {
    waterfall_type: string;
    tier_count: number;
    sheet_name: string | null;
    tiers: Array<Record<string, unknown>>;
    pref_rate: number | null;
    pref_compounding: string | null;
    hurdle_type: string | null;
    sponsor_coinvest_pct: number | null;
    source_cells: Record<string, string>;
    findings: Array<Record<string, unknown>>;
    rationale: string;
  };
  /** Phase 6 — run_sources_uses */
  sources_uses?: {
    sources: Array<{ label: string; value: number; sheet_cell: string }>;
    uses: Array<{ label: string; value: number; sheet_cell: string }>;
    sources_total: number | null;
    sources_total_cell: string | null;
    uses_total: number | null;
    uses_total_cell: string | null;
    delta: number | null;
    balanced: boolean;
    sheet_name: string | null;
    findings: Array<Record<string, unknown>>;
    rationale: string;
  };
  /** Phase 7 — compute_trust_score */
  trust_score?: {
    trust_score: number;
    components: Record<string, { weight: number; raw_score: number; contribution: number }>;
    profile: 'standard' | 'land_dev' | 'valuation' | string;
    phase_5_status: 'not_run' | 'completed' | 'failed';
    rationale: string;
    headline_status: 'verified' | 'partial' | 'cannot_verify';
  };
  /** Most recently updated phase (for highlighting in the renderer). */
  last_updated_phase?:
    | 'classification'
    | 'structural'
    | 'integrity'
    | 'assumptions'
    | 'waterfall'
    | 'sources_uses'
    | 'trust_score';
}

interface WrapperUIContextValue {
  chatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  /** When true, <main> shrinks to fit its content (e.g. 320px artifacts sidebar). */
  rightPanelNarrow: boolean;
  setRightPanelNarrow: (v: boolean) => void;
  /** Whether the artifacts right panel is expanded (true) or collapsed to strip (false). */
  artifactsOpen: boolean;
  toggleArtifacts: () => void;
  /** Active map artifact — set by Landscaper tool result, rendered in artifacts panel. */
  activeMapArtifact: MapArtifactConfig | null;
  setActiveMapArtifact: (config: MapArtifactConfig | null) => void;
  /** Active location brief artifact — set by generate_location_brief tool. */
  activeLocationBrief: LocationBriefArtifactConfig | null;
  setActiveLocationBrief: (config: LocationBriefArtifactConfig | null) => void;
  /** Active Excel audit artifact — set by audit tool returns; merge-update. */
  activeExcelAudit: ExcelAuditArtifactConfig | null;
  setActiveExcelAudit: (config: ExcelAuditArtifactConfig | null) => void;
  mergeActiveExcelAudit: (partial: Partial<ExcelAuditArtifactConfig>) => void;
  /** Chat search overlay state. */
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  /** Content domain derived from the last modal opened — enriches page context for Landscaper. */
  activeContentContext: string | null;
  setActiveContentContext: (ctx: string | null) => void;
}

const WrapperUIContext = createContext<WrapperUIContextValue | null>(null);

/**
 * Global UI state for the /w/ wrapper shell.
 * - chatOpen: center Landscaper panel visibility (default: true).
 * - artifactsOpen: right artifacts panel visibility (auto-collapses on narrow viewports).
 */
export function WrapperUIProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(true);
  const [rightPanelNarrow, setRightPanelNarrow] = useState(false);
  const [activeMapArtifact, setActiveMapArtifact] = useState<MapArtifactConfig | null>(null);
  const [activeLocationBrief, setActiveLocationBrief] = useState<LocationBriefArtifactConfig | null>(null);
  const [activeExcelAudit, setActiveExcelAudit] = useState<ExcelAuditArtifactConfig | null>(null);
  // Merge setter: combines partial updates into current config keyed by doc_id.
  // If the partial references a different doc_id, replaces (audit context switched).
  const mergeActiveExcelAudit = useCallback((partial: Partial<ExcelAuditArtifactConfig>) => {
    setActiveExcelAudit((prev) => {
      const incomingDocId = partial.doc_id;
      if (prev && incomingDocId && prev.doc_id !== incomingDocId) {
        // Different doc — replace rather than merge cross-doc state
        return { ...partial, doc_id: incomingDocId } as ExcelAuditArtifactConfig;
      }
      const base = prev ?? ({ doc_id: incomingDocId ?? 0 } as ExcelAuditArtifactConfig);
      return { ...base, ...partial } as ExcelAuditArtifactConfig;
    });
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeContentContext, setActiveContentContext] = useState<string | null>(null);
  // Server-safe default: always start expanded to avoid SSR/client hydration mismatch.
  // Actual viewport-based value is applied in the useEffect below after mount.
  const [artifactsOpen, setArtifactsOpen] = useState(true);

  // Sync to viewport after mount + auto-collapse/expand on resize
  useEffect(() => {
    const syncToViewport = () => {
      setArtifactsOpen(window.innerWidth >= ARTIFACTS_COLLAPSE_BREAKPOINT);
    };
    syncToViewport();
    window.addEventListener('resize', syncToViewport);
    return () => window.removeEventListener('resize', syncToViewport);
  }, []);

  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const toggleArtifacts = useCallback(() => setArtifactsOpen((v) => !v), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <WrapperUIContext.Provider value={{
      chatOpen, toggleChat, openChat, closeChat,
      rightPanelNarrow, setRightPanelNarrow,
      artifactsOpen, toggleArtifacts,
      activeMapArtifact, setActiveMapArtifact,
      activeLocationBrief, setActiveLocationBrief,
      activeExcelAudit, setActiveExcelAudit, mergeActiveExcelAudit,
      searchOpen, openSearch, closeSearch,
      activeContentContext, setActiveContentContext,
    }}>
      {children}
    </WrapperUIContext.Provider>
  );
}

export function useWrapperUI(): WrapperUIContextValue {
  const ctx = useContext(WrapperUIContext);
  if (!ctx) throw new Error('useWrapperUI must be used within WrapperUIProvider');
  return ctx;
}
