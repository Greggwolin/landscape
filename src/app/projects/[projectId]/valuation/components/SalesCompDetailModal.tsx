'use client';

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Map, {
  Marker,
  MapLayerMouseEvent,
  MarkerDragEvent,
  MapRef,
  NavigationControl,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  SalesComparable,
  SalesComparableForm,
  SalesCompAdjustment,
  AdjustmentType,
} from '@/types/valuation';
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid';
import {
  getSalesComparable,
  createSalesComparable,
  updateSalesComparable,
  deleteSalesComparable,
  addAdjustment,
  deleteAdjustment,
  updateUserAdjustment,
} from '@/lib/api/valuation';

import { COMP_MARKER_COLORS, getCompMarkerColor } from '@/lib/valuation/compMarkerUtils';

const MAP_STYLE = getEsriHybridStyle();
const PHOENIX_LOCATION = { latitude: 33.4484, longitude: -112.074 };

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface SalesCompDetailModalProps {
  projectId: number;
  comparableId?: number;
  propertyType: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  compNumber?: number;
  allComparables?: SalesComparable[];
  subjectLocation?: { latitude: number; longitude: number } | null;
}

type TabKey = 'overview' | 'property' | 'adjustments' | 'history' | 'documents';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'property', label: 'Property' },
  { key: 'adjustments', label: 'Adjustments' },
  { key: 'history', label: 'History' },
  { key: 'documents', label: 'Documents' },
];

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'property_rights', label: 'Property Rights' },
  { value: 'financing', label: 'Financing' },
  { value: 'conditions_of_sale', label: 'Conditions of Sale' },
  { value: 'market_conditions', label: 'Market Conditions' },
  { value: 'location', label: 'Location' },
  { value: 'physical_condition', label: 'Physical Condition' },
  { value: 'physical_age', label: 'Age / Condition' },
  { value: 'physical_unit_mix', label: 'Unit Mix' },
  { value: 'economic', label: 'Economic' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

const SALE_CONDITIONS_OPTIONS = [
  { value: 'ARMS_LENGTH', label: 'Arms Length' },
  { value: 'SHORT_SALE', label: 'Short Sale' },
  { value: 'AUCTION', label: 'Auction' },
  { value: 'ESTATE_SALE', label: 'Estate/Probate Sale' },
  { value: 'FORECLOSURE', label: 'Foreclosure/REO' },
  { value: 'RELATED_PARTY', label: 'Related Party' },
  { value: 'EXCHANGE_1031', label: '1031 Exchange' },
  { value: 'ASSEMBLAGE', label: 'Assemblage' },
  { value: 'EXCESS_LAND', label: 'Excess Land Sale' },
  { value: 'PARTIAL_INTEREST', label: 'Partial Interest' },
  { value: 'OTHER', label: 'Other' },
];

const PROPERTY_RIGHTS_OPTIONS = [
  { value: 'FEE_SIMPLE', label: 'Fee Simple' },
  { value: 'LEASED_FEE', label: 'Leased Fee' },
  { value: 'LEASEHOLD', label: 'Leasehold' },
  { value: 'PARTIAL_INTEREST', label: 'Partial Interest' },
  { value: 'LIFE_ESTATE', label: 'Life Estate' },
  { value: 'EASEMENT', label: 'Easement' },
  { value: 'OTHER', label: 'Other' },
];

interface HistoryEntry {
  date: string;
  event: string;
  price: string;
  notes: string;
}

const parseNum = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const truncCoord = (v: number) => Math.round(v * 1e7) / 1e7;

/** Safely coerce API values (may arrive as string from Django DecimalField) to number. */
const toNum = (v: number | string | null | undefined): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

const toIntString = (v: number | string | null | undefined): string => {
  const n = toNum(v);
  if (n == null) return '';
  return String(Math.round(n));
};

const fmtDollar = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
};

const fmtInt = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
};

const fmtPct = (v: number | string | null | undefined, decimals = 2): string => {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  const pct = Math.abs(n) < 1 ? n * 100 : n;
  return `${pct.toFixed(decimals)}%`;
};

const fmtYear = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  if (isNaN(n)) return '—';
  return String(n);
};

const fmtMultiplier = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toFixed(2);
};

// ---------------------------------------------------------------------------
// Form state shape — string-based for inputs
// ---------------------------------------------------------------------------

interface FormFields {
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  sale_date: string;
  sale_price: string;
  notes: string;
  // Land-specific
  land_area_sf: string;
  zoning: string;
  entitlements: string;
  // MF / improved-specific
  year_built: string;
  units: string;
  building_sf: string;
  cap_rate: string;
  grm: string;
  // Land extras
  highest_best_use: string;
  topography: string;
  shape: string;
  frontage_ft: string;
  access: string;
  utilities: string;
  flood_zone: string;
  environmental: string;
  soil_conditions: string;
  // MF extras
  stories: string;
  parking_spaces: string;
  parking_ratio: string;
  amenities: string;
  condition: string;
  construction_type: string;
  // Office / retail
  nra: string;
  floors: string;
  building_class: string;
  occupancy_pct: string;
  anchor_tenant: string;
  // Transaction
  buyer_name: string;
  buyer_type: string;
  seller_name: string;
  seller_type: string;
  sale_conditions: string;
  property_rights: string;
  sale_type: string;
  verification_status: string;
}

const emptyForm: FormFields = {
  property_name: '', address: '', city: '', state: '', zip: '',
  latitude: '', longitude: '',
  sale_date: '', sale_price: '', notes: '',
  land_area_sf: '', zoning: '', entitlements: '',
  year_built: '', units: '', building_sf: '', cap_rate: '', grm: '',
  highest_best_use: '', topography: '', shape: '', frontage_ft: '',
  access: '', utilities: '', flood_zone: '', environmental: '', soil_conditions: '',
  stories: '', parking_spaces: '', parking_ratio: '', amenities: '',
  condition: '', construction_type: '',
  nra: '', floors: '', building_class: '', occupancy_pct: '', anchor_tenant: '',
  buyer_name: '', buyer_type: '', seller_name: '', seller_type: '',
  sale_conditions: '', property_rights: '',
  sale_type: '', verification_status: '',
};

function buildFormFromComp(comp: SalesComparable): FormFields {
  const extra = (comp.extra_data ?? {}) as Record<string, unknown>;
  return {
    property_name: comp.property_name ?? '',
    address: comp.address ?? '',
    city: comp.city ?? '',
    state: comp.state ?? '',
    zip: comp.zip ?? '',
    latitude: comp.latitude?.toString() ?? '',
    longitude: comp.longitude?.toString() ?? '',
    sale_date: comp.sale_date ?? '',
    sale_price: comp.sale_price?.toString() ?? '',
    notes: comp.notes ?? '',
    land_area_sf: comp.land_area_sf?.toString() ?? '',
    zoning: comp.zoning ?? '',
    entitlements: comp.entitlements ?? '',
    year_built: toIntString(comp.year_built),
    units: toIntString(comp.units),
    building_sf: toIntString(comp.building_sf),
    cap_rate: comp.cap_rate?.toString() ?? '',
    grm: comp.grm?.toString() ?? '',
    highest_best_use: (extra.highest_best_use as string) ?? '',
    topography: (extra.topography as string) ?? '',
    shape: (extra.shape as string) ?? '',
    frontage_ft: (extra.frontage_ft as string) ?? '',
    access: (extra.access as string) ?? '',
    utilities: (extra.utilities as string) ?? '',
    flood_zone: (extra.flood_zone as string) ?? '',
    environmental: (extra.environmental as string) ?? '',
    soil_conditions: (extra.soil_conditions as string) ?? '',
    stories: (extra.stories as string) ?? '',
    parking_spaces: (extra.parking_spaces as string) ?? '',
    parking_ratio: (extra.parking_ratio as string) ?? '',
    amenities: (extra.amenities as string) ?? '',
    condition: (extra.condition as string) ?? '',
    construction_type: (extra.construction_type as string) ?? '',
    nra: (extra.nra as string) ?? '',
    floors: (extra.floors as string) ?? '',
    building_class: (extra.building_class as string) ?? '',
    occupancy_pct: (extra.occupancy_pct as string) ?? '',
    anchor_tenant: (extra.anchor_tenant as string) ?? '',
    buyer_name: (extra.buyer_name as string) ?? '',
    buyer_type: (extra.buyer_type as string) ?? '',
    seller_name: (extra.seller_name as string) ?? '',
    seller_type: (extra.seller_type as string) ?? '',
    sale_conditions: comp.sale_conditions ?? '',
    property_rights: comp.property_rights ?? '',
    sale_type: (extra.sale_type as string) ?? '',
    verification_status: (extra.verification_status as string) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SalesCompDetailModal({
  projectId,
  comparableId,
  propertyType,
  isOpen,
  onClose,
  onSaved,
  compNumber,
  allComparables,
  subjectLocation: subjectLocProp,
}: SalesCompDetailModalProps) {
  const isEditMode = comparableId != null;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [form, setForm] = useState<FormFields>({ ...emptyForm });
  const [adjustments, setAdjustments] = useState<SalesCompAdjustment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const initialDataRef = useRef<string>('');
  const mapRef = useRef<MapRef | null>(null);

  const subjectLoc = useMemo(
    () => subjectLocProp ?? PHOENIX_LOCATION,
    [subjectLocProp]
  );

  const pType = propertyType?.toUpperCase() ?? '';
  const isLand = pType === 'LAND';
  const isMF = pType === 'MULTIFAMILY' || pType === 'MF';
  const isOffice = pType === 'OFFICE' || pType === 'OFF';
  const isRetail = pType === 'RETAIL' || pType === 'RET';

  // ---- Data fetching ----

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('overview');
    setDeleteConfirm(false);
    setDirty(false);

    if (isEditMode) {
      setLoading(true);
      getSalesComparable(projectId, comparableId!)
        .then((comp) => {
          const f = buildFormFromComp(comp);
          const extra = (comp.extra_data ?? {}) as Record<string, unknown>;
          const historyRows = Array.isArray(extra.history) ? (extra.history as HistoryEntry[]) : [];
          setForm(f);
          setHistory(historyRows);
          initialDataRef.current = JSON.stringify({ form: f, history: historyRows });
          setDirty(false);
          setAdjustments(comp.adjustments ?? []);
        })
        .catch((err) => {
          console.error('Failed to load comparable:', err);
        })
        .finally(() => setLoading(false));
    } else {
      const f = { ...emptyForm, latitude: subjectLoc.latitude.toString(), longitude: subjectLoc.longitude.toString() };
      setForm(f);
      setAdjustments([]);
      setHistory([]);
      initialDataRef.current = JSON.stringify({ form: f, history: [] as HistoryEntry[] });
      setDirty(false);
    }
  }, [isOpen, isEditMode, comparableId, projectId, subjectLoc]);

  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;
    setDirty(JSON.stringify({ form, history }) !== initialDataRef.current);
  }, [isOpen, form, history]);

  // ---- Close with dirty-state confirmation ----

  const handleCloseAttempt = useCallback(() => {
    if (dirty) {
      const shouldClose = window.confirm('You have unsaved changes. Close without saving?');
      if (!shouldClose) return;
    }
    onClose();
  }, [dirty, onClose]);

  // ---- Escape key ----

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseAttempt();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleCloseAttempt]);

  // ---- Input helpers ----

  const handleInput = useCallback((field: keyof FormFields) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }, []);

  const handleSalePriceChange = useCallback((rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9.]/g, '');
    const [whole = '', ...rest] = cleaned.split('.');
    const nextValue = rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
    setForm((prev) => ({ ...prev, sale_price: nextValue }));
  }, []);

  // ---- Map marker ----

  const markerLat = parseNum(form.latitude) ?? subjectLoc.latitude;
  const markerLng = parseNum(form.longitude) ?? subjectLoc.longitude;
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleMapMouseDown = useCallback((e: MapLayerMouseEvent) => {
    mouseDownPos.current = { x: e.point.x, y: e.point.y };
  }, []);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (mouseDownPos.current) {
      const dx = e.point.x - mouseDownPos.current.x;
      const dy = e.point.y - mouseDownPos.current.y;
      if (dx * dx + dy * dy > 25) return;
    }
    const lat = truncCoord(e.lngLat.lat);
    const lng = truncCoord(e.lngLat.lng);
    setForm((prev) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
  }, []);

  const handleMarkerDrag = useCallback((e: MarkerDragEvent) => {
    const lat = truncCoord(e.lngLat.lat);
    const lng = truncCoord(e.lngLat.lng);
    setForm((prev) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
  }, []);

  // ---- Calculated metrics ----

  const salePrice = parseNum(form.sale_price);
  const landSf = parseNum(form.land_area_sf);
  const landAcres = landSf != null ? landSf / 43560 : null;
  const landPricePerSf = salePrice != null && landSf ? salePrice / landSf : null;
  const landPricePerAcre = salePrice != null && landAcres ? salePrice / landAcres : null;
  const unitsNumRaw = parseNum(form.units);
  const unitsNum = unitsNumRaw != null ? Math.round(unitsNumRaw) : null;
  const bldgSfRaw = parseNum(form.building_sf);
  const bldgSf = bldgSfRaw != null ? Math.round(bldgSfRaw) : null;
  const yearBuiltRaw = parseNum(form.year_built);
  const yearBuilt = yearBuiltRaw != null ? Math.round(yearBuiltRaw) : null;
  const pricePerUnit = salePrice != null && unitsNum ? salePrice / unitsNum : null;
  const pricePerSf = salePrice != null && bldgSf ? salePrice / bldgSf : null;
  const capRateValue = toNum(form.cap_rate);
  const grmValue = toNum(form.grm);

  const netAdjPct = adjustments.reduce((sum, a) => {
    const pct = a.user_adjustment_pct ?? a.adjustment_pct ?? 0;
    return sum + pct;
  }, 0);
  const grossAdjPct = adjustments.reduce((sum, a) => {
    const pct = a.user_adjustment_pct ?? a.adjustment_pct ?? 0;
    return sum + Math.abs(pct);
  }, 0);
  const netAdjAmt = salePrice != null ? salePrice * (netAdjPct / 100) : null;
  const adjustedPrice = salePrice != null ? salePrice + (netAdjAmt ?? 0) : null;

  // Key KPI metric based on property type
  const keyMetricLabel = isLand ? '$/SF' : isMF ? '$/Unit' : '$/SF';
  const keyMetricValue = isLand ? landPricePerSf : isMF ? pricePerUnit : pricePerSf;

  // ---- Build payload ----

  const buildPayload = useCallback((): SalesComparableForm => {
    const extra: Record<string, unknown> = {};
    // Store extended fields in extra_data
    const extFields: (keyof FormFields)[] = [
      'highest_best_use', 'topography', 'shape', 'frontage_ft', 'access',
      'utilities', 'flood_zone', 'environmental', 'soil_conditions',
      'stories', 'parking_spaces', 'parking_ratio', 'amenities',
      'condition', 'construction_type',
      'nra', 'floors', 'building_class', 'occupancy_pct', 'anchor_tenant',
      'buyer_name', 'buyer_type', 'seller_name', 'seller_type',
      'sale_type', 'verification_status',
    ];
    for (const k of extFields) {
      if (form[k]) extra[k] = form[k];
    }
    if (history.length > 0) extra.history = history;

    const payload: Record<string, unknown> = {
      project_id: projectId,
      property_type: propertyType?.toUpperCase() || null,
      property_name: form.property_name || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      sale_date: form.sale_date || null,
      sale_price: salePrice,
      latitude: parseNum(form.latitude) != null ? truncCoord(parseNum(form.latitude)!) : null,
      longitude: parseNum(form.longitude) != null ? truncCoord(parseNum(form.longitude)!) : null,
      notes: form.notes || null,
      extra_data: Object.keys(extra).length > 0 ? extra : null,
      sale_conditions: form.sale_conditions || null,
      property_rights: form.property_rights || null,
    };

    if (isLand) {
      payload.land_area_sf = landSf;
      payload.land_area_acres = landAcres;
      payload.zoning = form.zoning || null;
      payload.entitlements = form.entitlements || null;
      payload.units = landAcres;
      payload.building_sf = form.zoning || null;
    } else {
      payload.year_built = yearBuilt;
      payload.units = unitsNum;
      payload.building_sf = bldgSf;
    }

    return payload as unknown as SalesComparableForm;
  }, [form, history, projectId, propertyType, isLand, salePrice, landSf, landAcres, unitsNum, bldgSf, yearBuilt]);

  // ---- Save ----

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEditMode) {
        await updateSalesComparable(projectId, comparableId!, payload);
      } else {
        await createSalesComparable(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----

  const handleDelete = async () => {
    if (!isEditMode) return;
    try {
      await deleteSalesComparable(projectId, comparableId!);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // ---- Adjustments CRUD ----

  const handleAddAdjustment = async (type: AdjustmentType) => {
    if (!isEditMode) return;
    try {
      const result = await addAdjustment(projectId, comparableId!, {
        adjustment_type: type,
        adjustment_pct: 0,
        justification: '',
      });
      setAdjustments(result.adjustments ?? []);
    } catch (err) {
      console.error('Add adjustment failed:', err);
    }
  };

  const handleUpdateAdjustment = async (adjId: number, pct: number | null, notes?: string) => {
    try {
      await updateUserAdjustment(adjId, {
        user_adjustment_pct: pct,
        user_notes: notes,
      });
      // Re-fetch comp to get updated adjustments
      if (isEditMode) {
        const comp = await getSalesComparable(projectId, comparableId!);
        setAdjustments(comp.adjustments ?? []);
      }
    } catch (err) {
      console.error('Update adjustment failed:', err);
    }
  };

  const handleDeleteAdjustment = async (adjId: number) => {
    try {
      await deleteAdjustment(adjId);
      setAdjustments((prev) => prev.filter((a) => a.adjustment_id !== adjId));
    } catch (err) {
      console.error('Delete adjustment failed:', err);
    }
  };

  // ---- History ----

  const handleAddHistory = () => {
    setHistory((prev) => [...prev, { date: '', event: 'Sale', price: '', notes: '' }]);
  };

  const handleHistoryChange = (idx: number, field: keyof HistoryEntry, value: string) => {
    setHistory((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  };

  const handleDeleteHistory = (idx: number) => {
    setHistory((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---- Render helpers ----

  const inputCls = 'form-control form-control-sm';
  const selectCls = 'form-select form-select-sm';
  const readOnlyStyle = { background: 'var(--cui-tertiary-bg)' };
  const labelCls = 'form-label mb-0 small';

  if (!isOpen) return null;

  // ===========================================================================
  // RENDER — portaled to document.body to escape ancestor stacking contexts
  // ===========================================================================

  const modalContent = (
    <>
      {/* Backdrop — clicking this closes the modal */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={handleCloseAttempt}
      />
      {/* Modal wrapper — fully inline-styled, NO CoreUI .modal class */}
      <div
        style={{
          display: 'block',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1055,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="modal-dialog modal-dialog-scrollable"
          style={{ maxWidth: 1080, pointerEvents: 'auto' }}
        >
          <div
            className="card mb-0"
            style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}
          >
            {/* ============= HEADER ============= */}
            <div
              className="card-header d-flex align-items-center justify-content-between"
              style={{ backgroundColor: 'var(--cui-card-header-bg)' }}
            >
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0" style={{ color: 'var(--cui-body-color)' }}>
                  {form.property_name || (isEditMode ? 'Edit Comparable' : 'New Comparable')}
                </h5>
                {compNumber != null && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getCompMarkerColor(compNumber).bg,
                      color: getCompMarkerColor(compNumber).text,
                      fontSize: '0.75rem',
                    }}
                  >
                    Comp {compNumber}
                  </span>
                )}
                <span
                  className="badge"
                  style={{ backgroundColor: 'var(--cui-secondary-bg)', color: 'var(--cui-body-color)', fontSize: '0.7rem' }}
                >
                  {pType || 'UNKNOWN'}
                </span>
              </div>
              <button type="button" className="btn-close" onClick={handleCloseAttempt} />
            </div>

            {/* ============= KPI STRIP ============= */}
            <div
              className="d-flex align-items-center gap-3 px-3 py-2"
              style={{
                borderBottom: '1px solid var(--cui-border-color)',
                backgroundColor: 'var(--cui-secondary-bg)',
                fontSize: '0.8rem',
              }}
            >
              <KpiChip label="Sale Price" value={fmtDollar(salePrice)} />
              <KpiChip label="Sale Date" value={form.sale_date || '—'} />
              <KpiChip label={keyMetricLabel} value={fmtDollar(keyMetricValue)} />
              <KpiChip label="Net Adj %" value={fmtPct(netAdjPct)} />
              <KpiChip label="Adjusted Price" value={fmtDollar(adjustedPrice)} highlight />
            </div>

            {/* ============= TABS ============= */}
            <div
              className="px-3 pt-2"
              style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}
            >
              <ul className="nav nav-tabs" style={{ borderBottom: 'none', marginBottom: -1 }}>
                {TABS.map((tab) => (
                  <li className="nav-item" key={tab.key}>
                    <button
                      type="button"
                      className={`nav-link${activeTab === tab.key ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        color: activeTab === tab.key ? 'var(--cui-primary)' : 'var(--cui-body-color)',
                        backgroundColor: activeTab === tab.key ? 'var(--cui-card-bg)' : 'transparent',
                        borderColor: activeTab === tab.key ? 'var(--cui-border-color) var(--cui-border-color) var(--cui-card-bg)' : 'transparent',
                        fontSize: '0.8rem',
                        fontWeight: activeTab === tab.key ? 600 : 400,
                      }}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ============= TAB CONTENT ============= */}
            <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto', backgroundColor: 'var(--cui-card-bg)' }}>
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
                  Loading comparable data...
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <OverviewTab
                      form={form} handleInput={handleInput}
                      handleSalePriceChange={handleSalePriceChange}
                      isLand={isLand}
                      landPricePerSf={landPricePerSf}
                      pricePerUnit={pricePerUnit} pricePerSf={pricePerSf}
                      capRateValue={capRateValue} grmValue={grmValue}
                      markerLat={markerLat} markerLng={markerLng}
                      subjectLoc={subjectLoc} compNumber={compNumber}
                      allComparables={allComparables}
                      mapRef={mapRef}
                      handleMapMouseDown={handleMapMouseDown}
                      handleMapClick={handleMapClick}
                      handleMarkerDrag={handleMarkerDrag}
                      inputCls={inputCls} selectCls={selectCls} labelCls={labelCls}
                    />
                  )}
                  {activeTab === 'property' && (
                    <PropertyTab
                      form={form} handleInput={handleInput}
                      isLand={isLand} isMF={isMF} isOffice={isOffice} isRetail={isRetail}
                      inputCls={inputCls} selectCls={selectCls} labelCls={labelCls}
                    />
                  )}
                  {activeTab === 'adjustments' && (
                    <AdjustmentsTab
                      adjustments={adjustments}
                      salePrice={salePrice}
                      isEditMode={isEditMode}
                      netAdjPct={netAdjPct}
                      grossAdjPct={grossAdjPct}
                      netAdjAmt={netAdjAmt}
                      adjustedPrice={adjustedPrice}
                      onAdd={handleAddAdjustment}
                      onUpdate={handleUpdateAdjustment}
                      onDelete={handleDeleteAdjustment}
                      inputCls={inputCls} selectCls={selectCls} labelCls={labelCls}
                    />
                  )}
                  {activeTab === 'history' && (
                    <HistoryTab
                      entries={history}
                      onAdd={handleAddHistory}
                      onChange={handleHistoryChange}
                      onDelete={handleDeleteHistory}
                      inputCls={inputCls} selectCls={selectCls} labelCls={labelCls}
                    />
                  )}
                  {activeTab === 'documents' && <DocumentsTab />}
                </>
              )}
            </div>

            {/* ============= FOOTER ============= */}
            <div
              className="card-footer d-flex justify-content-between align-items-center"
              style={{ backgroundColor: 'var(--cui-card-header-bg)', borderColor: 'var(--cui-border-color)' }}
            >
              <div>
                {isEditMode && !deleteConfirm && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                )}
                {isEditMode && deleteConfirm && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="small" style={{ color: 'var(--cui-danger)' }}>
                      Are you sure?
                    </span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                      Yes, Delete
                    </button>
                    <button type="button" className="btn btn-ghost-secondary btn-sm" onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCloseAttempt}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save & Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

// ===========================================================================
// KPI Chip
// ===========================================================================

function KpiChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="d-flex flex-column" style={{ minWidth: 0 }}>
      <span
        className="text-uppercase"
        style={{ fontSize: '0.6rem', color: 'var(--cui-secondary-color)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      <span
        className="fw-semibold"
        style={{
          fontSize: '0.85rem',
          color: highlight ? 'var(--cui-primary)' : 'var(--cui-body-color)',
          whiteSpace: 'nowrap',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function CalculatedValue({ value }: { value: string }) {
  return (
    <div
      className="d-flex align-items-center justify-content-between rounded px-2 py-1"
      style={{
        border: '1px solid var(--cui-border-color)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        minHeight: 31,
      }}
    >
      <span style={{ color: 'var(--cui-body-color)', fontStyle: 'italic', fontSize: '0.8rem' }}>{value}</span>
      <span className="badge border" style={{ fontSize: '0.6rem', color: 'var(--cui-secondary-color)' }}>calc</span>
    </div>
  );
}

// ===========================================================================
// OVERVIEW TAB
// ===========================================================================

function OverviewTab({
  form, handleInput, handleSalePriceChange,
  isLand,
  landPricePerSf, pricePerUnit, pricePerSf, capRateValue, grmValue,
  markerLat, markerLng, subjectLoc, compNumber,
  allComparables,
  mapRef,
  handleMapMouseDown, handleMapClick, handleMarkerDrag,
  inputCls, selectCls, labelCls,
}: {
  form: FormFields;
  handleInput: (field: keyof FormFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSalePriceChange: (value: string) => void;
  isLand: boolean;
  landPricePerSf: number | null;
  pricePerUnit: number | null; pricePerSf: number | null;
  capRateValue: number | null; grmValue: number | null;
  markerLat: number; markerLng: number;
  subjectLoc: { latitude: number; longitude: number };
  compNumber?: number;
  allComparables?: SalesComparable[];
  mapRef: React.MutableRefObject<MapRef | null>;
  handleMapMouseDown: (e: MapLayerMouseEvent) => void;
  handleMapClick: (e: MapLayerMouseEvent) => void;
  handleMarkerDrag: (e: MarkerDragEvent) => void;
  inputCls: string; selectCls: string; labelCls: string;
}) {
  const [isPriceFocused, setIsPriceFocused] = useState(false);

  const salePriceInputValue = useMemo(() => {
    if (isPriceFocused) return form.sale_price;
    const n = toNum(form.sale_price);
    return n == null ? '' : Math.round(n).toLocaleString('en-US');
  }, [form.sale_price, isPriceFocused]);

  return (
    <div className="row g-3">
      {/* ---- LEFT COLUMN: Transaction + Metrics ---- */}
      <div className="col-7">
        <h6 className="small fw-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>Transaction</h6>
        <div className="d-flex gap-2 mb-2 flex-wrap">
          <div style={{ flex: '0 0 180px' }}>
            <label className={labelCls}>Sale Date *</label>
            <input type="date" className={inputCls} value={form.sale_date} onChange={handleInput('sale_date')} />
          </div>
          <div style={{ flex: '0 0 180px' }}>
            <label className={labelCls}>Sale Price *</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">$</span>
              <input
                type="text"
                className="form-control"
                value={salePriceInputValue}
                onFocus={() => setIsPriceFocused(true)}
                onBlur={() => setIsPriceFocused(false)}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
          <div style={{ flex: '1 1 auto' }}>
            <label className={labelCls}>Sale Conditions</label>
            <select className={selectCls} value={form.sale_conditions} onChange={handleInput('sale_conditions')}>
              <option value="">Select...</option>
              {SALE_CONDITIONS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="d-flex gap-2 mb-2 flex-wrap">
          <div style={{ flex: '1 1 260px' }}>
            <label className={labelCls}>Property Rights</label>
            <select className={selectCls} value={form.property_rights} onChange={handleInput('property_rights')}>
              <option value="">Select...</option>
              {PROPERTY_RIGHTS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <label className={labelCls}>Verification</label>
            <input type="text" className={inputCls} value={form.verification_status} onChange={handleInput('verification_status')} placeholder="Confirmed, Unconfirmed" />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className={labelCls}>Buyer Name</label>
            <input type="text" className={inputCls} value={form.buyer_name} onChange={handleInput('buyer_name')} />
          </div>
          <div className="col-6">
            <label className={labelCls}>Buyer Type</label>
            <input type="text" className={inputCls} value={form.buyer_type} onChange={handleInput('buyer_type')} />
          </div>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className={labelCls}>Seller Name</label>
            <input type="text" className={inputCls} value={form.seller_name} onChange={handleInput('seller_name')} />
          </div>
          <div className="col-6">
            <label className={labelCls}>Seller Type</label>
            <input type="text" className={inputCls} value={form.seller_type} onChange={handleInput('seller_type')} />
          </div>
        </div>

        {/* Metrics section */}
        <h6 className="small fw-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>Metrics</h6>
        <div className="row g-2 mb-2">
          <div className="col-3">
            <label className={labelCls}>$/Unit</label>
            <CalculatedValue value={fmtDollar(pricePerUnit)} />
          </div>
          <div className="col-3">
            <label className={labelCls}>$/SF</label>
            <CalculatedValue value={fmtDollar(isLand ? landPricePerSf : pricePerSf)} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Cap Rate %</label>
            <CalculatedValue value={fmtPct(capRateValue)} />
          </div>
          <div className="col-3">
            <label className={labelCls}>GRM</label>
            <CalculatedValue value={fmtMultiplier(grmValue)} />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-0">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls}`} rows={2} value={form.notes} onChange={handleInput('notes')} />
        </div>
      </div>

      {/* ---- RIGHT COLUMN: Location + Map ---- */}
      <div className="col-5">
        <h6 className="small fw-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>Location</h6>
        <div className="row g-2 mb-2">
          <div className="col-12">
            <label className={labelCls}>Property Name *</label>
            <input type="text" className={inputCls} value={form.property_name} onChange={handleInput('property_name')} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12">
            <label className={labelCls}>Address</label>
            <input type="text" className={inputCls} value={form.address} onChange={handleInput('address')} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-5">
            <label className={labelCls}>City</label>
            <input type="text" className={inputCls} value={form.city} onChange={handleInput('city')} />
          </div>
          <div className="col-3">
            <label className={labelCls}>State</label>
            <input type="text" className={inputCls} value={form.state} onChange={handleInput('state')} />
          </div>
          <div className="col-4">
            <label className={labelCls}>Zip</label>
            <input type="text" className={inputCls} value={form.zip} onChange={handleInput('zip')} />
          </div>
        </div>
        {/* Map */}
        <div style={{ height: 320, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--cui-border-color)' }}>
          <Map
            ref={mapRef}
            mapStyle={MAP_STYLE}
            initialViewState={{
              latitude: markerLat,
              longitude: markerLng,
              zoom: 11,
            }}
            style={{ width: '100%', height: '100%' }}
            scrollZoom={false}
            onMouseDown={handleMapMouseDown}
            onClick={handleMapClick}
          >
            <NavigationControl position="bottom-right" />
            {/* Subject marker */}
            <Marker longitude={subjectLoc.longitude} latitude={subjectLoc.latitude} offset={[0, -10]}>
              <div style={{ color: '#0d6efd', fontSize: 20 }}>&#9733;</div>
            </Marker>
            {/* All other comps (faded) */}
            {allComparables?.filter((c) => c.latitude && c.longitude).map((c, i) => {
              const cn = c.comp_number ?? i + 1;
              const { bg, text } = getCompMarkerColor(cn);
              return (
                <Marker key={c.comparable_id} longitude={Number(c.longitude)} latitude={Number(c.latitude)} offset={[0, -14]}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      backgroundColor: bg, border: '2px solid #000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: text, fontSize: 10, fontWeight: 700, opacity: 0.5,
                    }}
                  >
                    {cn}
                  </div>
                </Marker>
              );
            })}
            {/* Current comp marker (draggable) */}
            <Marker
              longitude={markerLng}
              latitude={markerLat}
              draggable
              onDragEnd={handleMarkerDrag}
              offset={[0, -14]}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: getCompMarkerColor(compNumber ?? 1).bg,
                  border: '2.5px solid #000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: getCompMarkerColor(compNumber ?? 1).text,
                  fontSize: 12, fontWeight: 700, cursor: 'grab',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                {compNumber ?? '?'}
              </div>
            </Marker>
          </Map>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// PROPERTY TAB
// ===========================================================================

function PropertyTab({
  form, handleInput,
  isLand, isMF, isOffice, isRetail,
  inputCls, selectCls, labelCls,
}: {
  form: FormFields;
  handleInput: (field: keyof FormFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  isLand: boolean; isMF: boolean; isOffice: boolean; isRetail: boolean;
  inputCls: string; selectCls: string; labelCls: string;
}) {
  const capRateValue = toNum(form.cap_rate);
  const grmValue = toNum(form.grm);

  if (isLand) {
    return (
      <div>
        <h6 className="small fw-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>Land Details</h6>
        <div className="row g-2 mb-2">
          <div className="col-4">
            <label className={labelCls}>Zoning</label>
            <input type="text" className={inputCls} value={form.zoning} onChange={handleInput('zoning')} />
          </div>
          <div className="col-4">
            <label className={labelCls}>Entitlements</label>
            <input type="text" className={inputCls} value={form.entitlements} onChange={handleInput('entitlements')} placeholder="Entitled, Unentitled, etc." />
          </div>
          <div className="col-4">
            <label className={labelCls}>Highest & Best Use</label>
            <input type="text" className={inputCls} value={form.highest_best_use} onChange={handleInput('highest_best_use')} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-4">
            <label className={labelCls}>Topography</label>
            <input type="text" className={inputCls} value={form.topography} onChange={handleInput('topography')} placeholder="Level, Rolling, Hilly" />
          </div>
          <div className="col-4">
            <label className={labelCls}>Shape</label>
            <input type="text" className={inputCls} value={form.shape} onChange={handleInput('shape')} placeholder="Regular, Irregular" />
          </div>
          <div className="col-4">
            <label className={labelCls}>Frontage (ft)</label>
            <input type="number" className={inputCls} value={form.frontage_ft} onChange={handleInput('frontage_ft')} min={0} step="any" />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-4">
            <label className={labelCls}>Access</label>
            <input type="text" className={inputCls} value={form.access} onChange={handleInput('access')} placeholder="Paved road, dirt road, etc." />
          </div>
          <div className="col-4">
            <label className={labelCls}>Utilities</label>
            <input type="text" className={inputCls} value={form.utilities} onChange={handleInput('utilities')} placeholder="All public, partial, none" />
          </div>
          <div className="col-4">
            <label className={labelCls}>Flood Zone</label>
            <input type="text" className={inputCls} value={form.flood_zone} onChange={handleInput('flood_zone')} placeholder="X, A, AE, etc." />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-4">
            <label className={labelCls}>Environmental Status</label>
            <input type="text" className={inputCls} value={form.environmental} onChange={handleInput('environmental')} placeholder="Clean, Phase I, Phase II" />
          </div>
          <div className="col-4">
            <label className={labelCls}>Soil Conditions</label>
            <input type="text" className={inputCls} value={form.soil_conditions} onChange={handleInput('soil_conditions')} />
          </div>
          <div className="col-4" />
        </div>
        <div className="mb-0">
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={3} value={form.notes} onChange={handleInput('notes')} />
        </div>
      </div>
    );
  }

  if (isMF) {
    return (
      <div>
        <h6 className="small fw-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>Multifamily Details</h6>
        <div className="row g-2 mb-2">
          <div className="col-3">
            <label className={labelCls}>Units</label>
            <input type="number" className={inputCls} value={form.units} onChange={handleInput('units')} min={0} step={1} title={fmtInt(form.units)} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Stories</label>
            <input type="number" className={inputCls} value={form.stories} onChange={handleInput('stories')} min={0} step={1} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Building SF</label>
            <input type="number" className={inputCls} value={form.building_sf} onChange={handleInput('building_sf')} min={0} step={1} title={fmtInt(form.building_sf)} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Year Built</label>
            <input type="number" className={inputCls} value={form.year_built} onChange={handleInput('year_built')} min={1800} max={2100} step={1} title={fmtYear(form.year_built)} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-3">
            <label className={labelCls}>Parking Spaces</label>
            <input type="number" className={inputCls} value={form.parking_spaces} onChange={handleInput('parking_spaces')} min={0} step={1} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Parking Ratio</label>
            <input type="text" className={inputCls} value={form.parking_ratio} onChange={handleInput('parking_ratio')} placeholder="e.g. 1.5:1" />
          </div>
          <div className="col-3">
            <label className={labelCls}>Condition</label>
            <input type="text" className={inputCls} value={form.condition} onChange={handleInput('condition')} placeholder="Good, Fair, Poor" />
          </div>
          <div className="col-3">
            <label className={labelCls}>Construction Type</label>
            <input type="text" className={inputCls} value={form.construction_type} onChange={handleInput('construction_type')} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12">
            <label className={labelCls}>Amenities</label>
            <input type="text" className={inputCls} value={form.amenities} onChange={handleInput('amenities')} placeholder="Pool, gym, laundry, etc." />
          </div>
        </div>
        <div className="mb-0">
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={3} value={form.notes} onChange={handleInput('notes')} />
        </div>
      </div>
    );
  }

  if (isOffice || isRetail) {
    return (
      <div>
        <h6 className="small fw-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
          {isOffice ? 'Office' : 'Retail'} Details
        </h6>
        <div className="row g-2 mb-2">
          <div className="col-3">
            <label className={labelCls}>NRA (SF)</label>
            <input type="number" className={inputCls} value={form.nra} onChange={handleInput('nra')} min={0} step="any" />
          </div>
          <div className="col-3">
            <label className={labelCls}>Floors</label>
            <input type="number" className={inputCls} value={form.floors} onChange={handleInput('floors')} min={0} step={1} />
          </div>
          <div className="col-3">
            <label className={labelCls}>Building Class</label>
            <select className={selectCls} value={form.building_class} onChange={handleInput('building_class')}>
              <option value="">—</option>
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="C">Class C</option>
            </select>
          </div>
          <div className="col-3">
            <label className={labelCls}>Year Built</label>
            <input type="number" className={inputCls} value={form.year_built} onChange={handleInput('year_built')} min={1800} max={2100} step={1} title={fmtYear(form.year_built)} />
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-3">
            <label className={labelCls}>Parking Ratio</label>
            <input type="text" className={inputCls} value={form.parking_ratio} onChange={handleInput('parking_ratio')} placeholder="e.g. 4:1000" />
          </div>
          <div className="col-3">
            <label className={labelCls}>Occupancy %</label>
            <input type="number" className={inputCls} value={form.occupancy_pct} onChange={handleInput('occupancy_pct')} min={0} max={100} step="0.1" />
          </div>
          <div className="col-6">
            <label className={labelCls}>Anchor Tenant</label>
            <input type="text" className={inputCls} value={form.anchor_tenant} onChange={handleInput('anchor_tenant')} />
          </div>
        </div>
        <div className="mb-0">
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={3} value={form.notes} onChange={handleInput('notes')} />
        </div>
      </div>
    );
  }

  // Fallback: generic property fields
  return (
    <div>
      <h6 className="small fw-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>Property Details</h6>
      <div className="row g-2 mb-2">
        <div className="col-3">
          <label className={labelCls}>Year Built</label>
          <input type="number" className={inputCls} value={form.year_built} onChange={handleInput('year_built')} min={1800} max={2100} step={1} title={fmtYear(form.year_built)} />
        </div>
        <div className="col-3">
          <label className={labelCls}>Units</label>
          <input type="number" className={inputCls} value={form.units} onChange={handleInput('units')} min={0} step={1} title={fmtInt(form.units)} />
        </div>
        <div className="col-3">
          <label className={labelCls}>Bldg SF</label>
          <input type="number" className={inputCls} value={form.building_sf} onChange={handleInput('building_sf')} min={0} step={1} title={fmtInt(form.building_sf)} />
        </div>
        <div className="col-3">
          <label className={labelCls}>Land SF</label>
          <input type="number" className={inputCls} value={form.land_area_sf} onChange={handleInput('land_area_sf')} min={0} step="any" />
        </div>
      </div>
      <div className="row g-2 mb-2">
        <div className="col-4">
          <label className={labelCls}>Cap Rate %</label>
          <CalculatedValue value={fmtPct(capRateValue)} />
        </div>
        <div className="col-4">
          <label className={labelCls}>GRM</label>
          <CalculatedValue value={fmtMultiplier(grmValue)} />
        </div>
        <div className="col-4">
          <label className={labelCls}>Zoning</label>
          <input type="text" className={inputCls} value={form.zoning} onChange={handleInput('zoning')} />
        </div>
      </div>
      <div className="mb-0">
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls} rows={3} value={form.notes} onChange={handleInput('notes')} />
      </div>
    </div>
  );
}

// ===========================================================================
// ADJUSTMENTS TAB
// ===========================================================================

function AdjustmentsTab({
  adjustments, salePrice, isEditMode,
  netAdjPct, grossAdjPct, netAdjAmt, adjustedPrice,
  onAdd, onUpdate, onDelete,
  inputCls, selectCls, labelCls,
}: {
  adjustments: SalesCompAdjustment[];
  salePrice: number | null;
  isEditMode: boolean;
  netAdjPct: number;
  grossAdjPct: number;
  netAdjAmt: number | null;
  adjustedPrice: number | null;
  onAdd: (type: AdjustmentType) => Promise<void>;
  onUpdate: (adjId: number, pct: number | null, notes?: string) => Promise<void>;
  onDelete: (adjId: number) => Promise<void>;
  inputCls: string; selectCls: string; labelCls: string;
}) {
  const [newAdjType, setNewAdjType] = useState<AdjustmentType>('location');

  return (
    <div>
      {!isEditMode ? (
        <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
          Save the comparable first to manage adjustments.
        </div>
      ) : (
        <>
          {/* Adjustment table */}
          <table className="table table-sm mb-3" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderColor: 'var(--cui-border-color)' }}>
                <th style={{ color: 'var(--cui-body-color)', width: '30%' }}>Factor</th>
                <th style={{ color: 'var(--cui-body-color)', width: '15%', textAlign: 'right' }}>Adj %</th>
                <th style={{ color: 'var(--cui-body-color)', width: '20%', textAlign: 'right' }}>Adj $</th>
                <th style={{ color: 'var(--cui-body-color)', width: '30%' }}>Justification</th>
                <th style={{ width: '5%' }} />
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj) => {
                const pct = adj.user_adjustment_pct ?? adj.adjustment_pct ?? 0;
                const amt = salePrice != null ? salePrice * (pct / 100) : 0;
                return (
                  <tr key={adj.adjustment_id} style={{ borderColor: 'var(--cui-border-color)' }}>
                    <td style={{ color: 'var(--cui-body-color)', verticalAlign: 'middle' }}>
                      {adj.adjustment_type_display || adj.adjustment_type}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        className={inputCls}
                        style={{ width: 80, textAlign: 'right' }}
                        value={adj.user_adjustment_pct ?? adj.adjustment_pct ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.trim() === '' ? null : Number(e.target.value);
                          onUpdate(adj.adjustment_id, v);
                        }}
                        step="0.1"
                      />
                    </td>
                    <td style={{ color: 'var(--cui-body-color)', textAlign: 'right', verticalAlign: 'middle' }}>
                      {fmtDollar(amt)}
                    </td>
                    <td>
                      <input
                        type="text"
                        className={inputCls}
                        value={adj.user_notes ?? adj.justification ?? ''}
                        onChange={(e) => {
                          onUpdate(adj.adjustment_id, adj.user_adjustment_pct ?? adj.adjustment_pct, e.target.value);
                        }}
                        placeholder="Justification..."
                      />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        className="btn btn-ghost-secondary btn-sm p-0"
                        onClick={() => onDelete(adj.adjustment_id)}
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-3" style={{ color: 'var(--cui-secondary-color)' }}>
                    No adjustments yet. Add one below.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderColor: 'var(--cui-border-color)', fontWeight: 600 }}>
                <td style={{ color: 'var(--cui-body-color)' }}>Net Adjustment</td>
                <td style={{ color: 'var(--cui-body-color)', textAlign: 'right' }}>{fmtPct(netAdjPct)}</td>
                <td style={{ color: 'var(--cui-body-color)', textAlign: 'right' }}>{fmtDollar(netAdjAmt)}</td>
                <td colSpan={2} />
              </tr>
              <tr style={{ borderColor: 'var(--cui-border-color)' }}>
                <td style={{ color: 'var(--cui-secondary-color)' }}>Gross Adjustment</td>
                <td style={{ color: 'var(--cui-secondary-color)', textAlign: 'right' }}>{fmtPct(grossAdjPct)}</td>
                <td colSpan={3} />
              </tr>
              <tr style={{ borderColor: 'var(--cui-border-color)', fontWeight: 700 }}>
                <td style={{ color: 'var(--cui-primary)' }}>Adjusted Sale Price</td>
                <td />
                <td style={{ color: 'var(--cui-primary)', textAlign: 'right', fontSize: '0.9rem' }}>{fmtDollar(adjustedPrice)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>

          {/* Add adjustment */}
          <div className="d-flex align-items-center gap-2 mb-4">
            <select
              className={selectCls}
              style={{ width: 200 }}
              value={newAdjType}
              onChange={(e) => setNewAdjType(e.target.value as AdjustmentType)}
            >
              {ADJUSTMENT_TYPES.map((at) => (
                <option key={at.value} value={at.value}>{at.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onAdd(newAdjType)}
            >
              Add Adjustment
            </button>
          </div>

          {/* Landscaper Analysis Panel */}
          <div
            className="p-3 rounded"
            style={{
              background: 'rgba(88, 86, 214, 0.06)',
              border: '1px solid rgba(88, 86, 214, 0.15)',
            }}
          >
            <h6 className="small fw-semibold mb-2" style={{ color: 'var(--cui-primary)' }}>
              Landscaper Analysis
            </h6>
            {adjustments.some((a) => a.justification) ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--cui-body-color)' }}>
                {adjustments.filter((a) => a.justification).map((a) => (
                  <div key={a.adjustment_id} className="mb-1">
                    <span className="fw-semibold">{a.adjustment_type_display || a.adjustment_type}:</span>{' '}
                    {a.justification}
                  </div>
                ))}
              </div>
            ) : (
              <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
                No AI analysis available. Landscaper will analyze adjustments when document extraction is complete.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================================================
// HISTORY TAB
// ===========================================================================

function HistoryTab({
  entries, onAdd, onChange, onDelete,
  inputCls, selectCls, labelCls,
}: {
  entries: HistoryEntry[];
  onAdd: () => void;
  onChange: (idx: number, field: keyof HistoryEntry, value: string) => void;
  onDelete: (idx: number) => void;
  inputCls: string; selectCls: string; labelCls: string;
}) {
  const eventOptions = ['Sale', 'Listing', 'Financing', 'Renovation', 'Assessment'];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="small fw-semibold mb-0" style={{ color: 'var(--cui-body-color)' }}>Prior Sales & Events</h6>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
          Add Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
          No history entries. Click "Add Entry" to record prior sales or events.
        </div>
      ) : (
        <table className="table table-sm" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderColor: 'var(--cui-border-color)' }}>
              <th style={{ color: 'var(--cui-body-color)', width: '20%' }}>Date</th>
              <th style={{ color: 'var(--cui-body-color)', width: '20%' }}>Event</th>
              <th style={{ color: 'var(--cui-body-color)', width: '20%' }}>Price</th>
              <th style={{ color: 'var(--cui-body-color)', width: '35%' }}>Notes</th>
              <th style={{ width: '5%' }} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx} style={{ borderColor: 'var(--cui-border-color)' }}>
                <td>
                  <input type="date" className={inputCls} value={entry.date} onChange={(e) => onChange(idx, 'date', e.target.value)} />
                </td>
                <td>
                  <select className={selectCls} value={entry.event} onChange={(e) => onChange(idx, 'event', e.target.value)}>
                    {eventOptions.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input type="number" className={inputCls} value={entry.price} onChange={(e) => onChange(idx, 'price', e.target.value)} min={0} step="any" />
                </td>
                <td>
                  <input type="text" className={inputCls} value={entry.notes} onChange={(e) => onChange(idx, 'notes', e.target.value)} />
                </td>
                <td>
                  <button type="button" className="btn btn-ghost-secondary btn-sm p-0" onClick={() => onDelete(idx)} title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ===========================================================================
// DOCUMENTS TAB (skeleton)
// ===========================================================================

function DocumentsTab() {
  return (
    <div>
      <h6 className="small fw-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>Documents</h6>
      <div
        className="d-flex align-items-center justify-content-center rounded mb-3"
        style={{
          height: 120,
          backgroundColor: 'var(--cui-tertiary-bg)',
          border: '2px dashed var(--cui-border-color)',
          color: 'var(--cui-secondary-color)',
          cursor: 'pointer',
        }}
      >
        <div className="text-center">
          <div style={{ fontSize: 28, marginBottom: 4, opacity: 0.5 }}>&#128196;</div>
          <div className="small">Drop documents here or click to upload</div>
          <div className="small" style={{ opacity: 0.6 }}>DMS integration coming in a future sprint</div>
        </div>
      </div>
      <div className="mb-0">
        <label className="form-label mb-1 small" style={{ color: 'var(--cui-body-color)' }}>Notes / References</label>
        <textarea
          className="form-control form-control-sm"
          rows={4}
          placeholder="Paste document links, notes, or references here..."
        />
      </div>
    </div>
  );
}
