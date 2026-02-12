'use client';

import {
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload } from '@coreui/icons';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid';
import {
  createSalesComparable,
  deleteSalesComparable,
  getSalesComparable,
  updateSalesComparable,
} from '@/lib/api/valuation';
import type {
  AdjustmentType,
  SalesCompAdjustment,
  SalesCompContact,
  SalesCompHistory,
  SalesCompUnitMixRow,
  SalesComparable,
  SalesComparableForm,
} from '@/types/valuation';
import styles from './SalesCompDetailModal.module.css';

const MAP_STYLE = getEsriHybridStyle();
const DASH = '–';

type OverlaySection = 'transaction' | 'property' | 'unit_mix';
type AccordionSection =
  | 'transaction'
  | 'property'
  | 'unit_mix'
  | 'contacts'
  | 'history'
  | 'documents'
  | 'notes';

const BASE_CONTACT_ROLES: SalesCompContact['role'][] = [
  'selling_broker',
  'buying_broker',
  'buyer',
  'true_buyer',
  'seller',
  'true_seller',
];

const ROLE_LABEL: Record<SalesCompContact['role'], string> = {
  selling_broker: 'Selling Broker',
  buying_broker: 'Buying Broker',
  buyer: 'Buyer',
  true_buyer: 'True Buyer',
  seller: 'Seller',
  true_seller: 'True Seller',
};

const TRANSACTION_ADJUSTMENT_TYPES: AdjustmentType[] = [
  'property_rights',
  'financing',
  'sale_conditions',
  'market_conditions',
];

const PROPERTY_ADJUSTMENT_TYPES: AdjustmentType[] = [
  'location',
  'physical_age',
  'physical_size',
  'physical_building_sf',
  'physical_stories',
  'physical_lot_size',
  'physical_unit_mix',
  'physical_condition',
  'other',
];

const ALL_MODAL_ADJUSTMENT_TYPES: AdjustmentType[] = [
  ...TRANSACTION_ADJUSTMENT_TYPES,
  ...PROPERTY_ADJUSTMENT_TYPES,
];

const PROPERTY_RIGHTS_OPTIONS = ['Fee Simple', 'Leased Fee', 'Leasehold', 'Partial Interest'];
const FINANCING_OPTIONS = ['Conventional', 'Seller Financing', 'Assumed Debt', 'Cash'];
const SALE_CONDITIONS_OPTIONS = [
  'Arms Length',
  'Short Sale',
  'Auction',
  'Foreclosure',
  '1031 Exchange',
  'Related Party',
];

interface SubjectInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  yearBuilt?: number;
  units?: number;
  buildingSf?: number;
  stories?: number;
  lotSizeAcres?: number;
}

interface SalesCompDetailModalProps {
  projectId: number;
  comparableId?: number;
  propertyType?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  compNumber?: number;
  allComparables?: SalesComparable[];
  subjectLocation?: { latitude: number; longitude: number } | null;
  subjectProperty?: SubjectInfo;
}

interface AdjustmentFormRow {
  adjustment_id?: number;
  adjustment_type: AdjustmentType;
  adjustment_pct: number | null;
  adjustment_amount?: number | null;
  user_notes?: string;
  justification?: string;
  subject_value?: string;
  comp_value?: string;
  landscaper_analysis?: string;
  ai_accepted?: boolean;
  confidence_score?: number | null;
}

interface UnitMixFormRow {
  unit_type: string;
  bed_count: string;
  bath_count: string;
  unit_count: string;
  unit_pct: string;
  avg_unit_sf: string;
  asking_rent_min: string;
  asking_rent_max: string;
  asking_rent_per_sf_min: string;
  vacant_units: string;
}

interface ContactFormRow {
  role: SalesCompContact['role'];
  name: string;
  company: string;
  phone: string;
  email: string;
  is_verification_source: boolean;
  verification_date: string;
  sort_order: number;
}

interface HistoryFormRow {
  sale_date: string;
  sale_price: string;
  price_per_unit: string;
  buyer_name: string;
  seller_name: string;
}

interface SalesCompFormValues {
  property_type: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;

  sale_date: string;
  sale_price: string;
  cap_rate: string;
  property_rights: string;
  financing_type: string;
  sale_conditions: string;

  year_built: string;
  units: string;
  building_sf: string;
  stories: string;
  land_area_acres: string;
  parking_spaces: string;
  quality: string;
  property_other: string;
  zoning: string;
  entitlements: string;

  notes: string;

  verification_source: string;
  verification_date: string;

  adjustments: AdjustmentFormRow[];
  unit_mix: UnitMixFormRow[];
  contacts: ContactFormRow[];
  history: HistoryFormRow[];
}

const OVERLAY_RECOMMENDATIONS: Record<OverlaySection, {
  title: string;
  rows: Array<{ type: AdjustmentType; pct: number; rationale: string }>;
  actions: string[];
}> = {
  transaction: {
    title: 'Transaction Factors',
    rows: [
      {
        type: 'property_rights',
        pct: 1.5,
        rationale: 'Comp rights appear broader than subject rights package.',
      },
      {
        type: 'financing',
        pct: -0.75,
        rationale: 'Debt terms were more favorable than current market debt costs.',
      },
      {
        type: 'sale_conditions',
        pct: 0.5,
        rationale: 'Buyer motivation indicates above-market urgency premium.',
      },
    ],
    actions: ['Apply adjustments', 'Open transaction comps', 'Refresh market timing'],
  },
  property: {
    title: 'Property Factors',
    rows: [
      {
        type: 'location',
        pct: -2.0,
        rationale: 'Subject micro-location outperforms comp trade area rent growth.',
      },
      {
        type: 'physical_age',
        pct: 1.25,
        rationale: 'Comp effective age is older versus subject lifecycle profile.',
      },
      {
        type: 'physical_condition',
        pct: 0.75,
        rationale: 'Observed renovation quality lags subject target finish level.',
      },
    ],
    actions: ['Apply adjustments', 'Compare condition photos', 'Save as baseline'],
  },
  unit_mix: {
    title: 'Unit Mix Factors',
    rows: [
      {
        type: 'physical_unit_mix',
        pct: 1.1,
        rationale: 'Comp mix skews to smaller units with weaker per-unit rent depth.',
      },
      {
        type: 'physical_size',
        pct: -0.8,
        rationale: 'Per-unit size discount observed versus subject unit plan average.',
      },
    ],
    actions: ['Apply adjustments', 'Normalize rent roll', 'Export mix analysis'],
  },
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toFixedOrDash(value: number | null, decimals = 1, withSign = true): string {
  if (value == null || value === 0) return DASH;
  const sign = value > 0 && withSign ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

function formatCurrency(value: number | null, signed = false): string {
  if (value == null || value === 0) return DASH;
  const abs = Math.abs(value);
  const rendered = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (!signed) {
    return `$${rendered}`;
  }
  return `${value < 0 ? '-' : '+'}$${rendered}`;
}

function formatNumber(value: number | null, decimals = 0): string {
  if (value == null || value === 0) return DASH;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value: number | null, decimals = 2): string {
  if (value == null || value === 0) return DASH;
  return `${value.toFixed(decimals)}%`;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const radiusMiles = 3958.7613;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusMiles * c;
}

function normalizeAdjustmentType(type: string): AdjustmentType {
  if (type === 'conditions_of_sale') return 'sale_conditions';
  return type as AdjustmentType;
}

function createDefaultAdjustments(): AdjustmentFormRow[] {
  return ALL_MODAL_ADJUSTMENT_TYPES.map((adjustment_type) => ({
    adjustment_type,
    adjustment_pct: null,
    user_notes: '',
    justification: '',
    ai_accepted: false,
  }));
}

function createDefaultContacts(): ContactFormRow[] {
  return BASE_CONTACT_ROLES.map((role, idx) => ({
    role,
    name: '',
    company: '',
    phone: '',
    email: '',
    is_verification_source: false,
    verification_date: '',
    sort_order: idx,
  }));
}

function createEmptyUnitMixRow(): UnitMixFormRow {
  return {
    unit_type: '',
    bed_count: '',
    bath_count: '',
    unit_count: '',
    unit_pct: '',
    avg_unit_sf: '',
    asking_rent_min: '',
    asking_rent_max: '',
    asking_rent_per_sf_min: '',
    vacant_units: '',
  };
}

function createEmptyHistoryRow(): HistoryFormRow {
  return {
    sale_date: '',
    sale_price: '',
    price_per_unit: '',
    buyer_name: '',
    seller_name: '',
  };
}

function roleClassName(role: SalesCompContact['role']): string {
  switch (role) {
    case 'selling_broker':
      return styles.roleSellingBroker;
    case 'buying_broker':
      return styles.roleBuyingBroker;
    case 'buyer':
      return styles.roleBuyer;
    case 'true_buyer':
      return styles.roleTrueBuyer;
    case 'seller':
      return styles.roleSeller;
    case 'true_seller':
      return styles.roleTrueSeller;
    default:
      return '';
  }
}

function formatContactSource(contact: ContactFormRow): string {
  const name = contact.name.trim() || '(Unnamed)';
  const role = ROLE_LABEL[contact.role];
  const company = contact.company.trim();
  return `${name} — ${role}${company ? ` (${company})` : ''}`;
}

function combineClassNames(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function signedValueClass(value: number | null): string {
  if (value == null || value === 0) return styles.valueNeutral;
  return value > 0 ? styles.valuePositive : styles.valueNegative;
}

function readString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function formatMonthYear(value: string): string {
  if (!value) return 'Apr 2024';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Apr 2024';
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatPropertyTypeLabel(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'Multifamily';
  return normalized
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ensureRoleRows(contacts: ContactFormRow[]): ContactFormRow[] {
  const next = [...contacts];
  BASE_CONTACT_ROLES.forEach((role) => {
    if (!next.some((row) => row.role === role)) {
      next.push({
        role,
        name: '',
        company: '',
        phone: '',
        email: '',
        is_verification_source: false,
        verification_date: '',
        sort_order: next.length,
      });
    }
  });
  return next
    .map((row, index) => ({ ...row, sort_order: row.sort_order ?? index }))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function AdjPercentInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!focused) {
      setDraft(value == null || value === 0 ? '' : String(value));
    }
  }, [focused, value]);

  return (
    <input
      type="text"
      className={styles.adjInput}
      value={focused ? draft : toFixedOrDash(value, 1, true)}
      onFocus={() => {
        setFocused(true);
        if (value == null || value === 0) {
          setDraft('');
        }
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = toNumber(draft.replace('%', '').replace('+', '').trim());
        if (parsed == null || parsed === 0) {
          onCommit(null);
          return;
        }
        onCommit(parsed);
      }}
    />
  );
}

function DashNumericInput({
  value,
  onChange,
  placeholder,
  className,
  textEnd = true,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  textEnd?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!focused) {
      const numeric = toNumber(value);
      setDraft(numeric == null || numeric === 0 ? '' : value);
    }
  }, [focused, value]);

  return (
    <input
      type="text"
      className={combineClassNames('form-control form-control-sm', styles.smallControl, className)}
      style={textEnd ? ({ textAlign: 'right' } as CSSProperties) : undefined}
      value={focused ? draft : toNumber(value) == null || toNumber(value) === 0 ? DASH : value}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setDraft(toNumber(value) == null || toNumber(value) === 0 ? '' : value);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = toNumber(draft);
        onChange(parsed == null || parsed === 0 ? '' : draft.replace(/,/g, ''));
      }}
    />
  );
}

export function SalesCompDetailModal({
  projectId,
  comparableId,
  propertyType,
  isOpen,
  onClose,
  onSaved,
  compNumber,
  subjectLocation,
  subjectProperty,
}: SalesCompDetailModalProps) {
  const isEditMode = comparableId != null;
  const mapRef = useRef<MapRef | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const overlayTriggerRefs: MutableRefObject<Record<OverlaySection, HTMLButtonElement | null>> = useRef({
    transaction: null,
    property: null,
    unit_mix: null,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlaySection | null>(null);
  const [overlayTop, setOverlayTop] = useState(12);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionSection, boolean>>({
    transaction: true,
    property: true,
    unit_mix: true,
    contacts: true,
    history: false,
    documents: false,
    notes: false,
  });
  const [linePixels, setLinePixels] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const {
    control,
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
  } = useForm<SalesCompFormValues>({
    defaultValues: {
      property_type: (propertyType ?? 'MULTIFAMILY').toUpperCase(),
      property_name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      latitude: '',
      longitude: '',
      sale_date: '',
      sale_price: '',
      cap_rate: '',
      property_rights: '',
      financing_type: '',
      sale_conditions: '',
      year_built: '',
      units: '',
      building_sf: '',
      stories: '',
      land_area_acres: '',
      parking_spaces: '',
      quality: '',
      property_other: '',
      zoning: '',
      entitlements: '',
      notes: '',
      verification_source: '',
      verification_date: '',
      adjustments: createDefaultAdjustments(),
      unit_mix: [],
      contacts: createDefaultContacts(),
      history: [],
    },
  });

  const unitMixArray = useFieldArray({ control, name: 'unit_mix' });
  const contactsArray = useFieldArray({ control, name: 'contacts' });
  const historyArray = useFieldArray({ control, name: 'history' });

  const watchedPropertyType = (useWatch({ control, name: 'property_type' }) || 'MULTIFAMILY').toUpperCase();
  const watchedPropertyName = useWatch({ control, name: 'property_name' }) || '';
  const watchedSalePrice = useWatch({ control, name: 'sale_price' }) || '';
  const watchedCapRate = useWatch({ control, name: 'cap_rate' }) || '';
  const watchedUnits = useWatch({ control, name: 'units' }) || '';
  const watchedBuildingSf = useWatch({ control, name: 'building_sf' }) || '';
  const watchedSaleDate = useWatch({ control, name: 'sale_date' }) || '';
  const watchedLandAreaAcres = useWatch({ control, name: 'land_area_acres' }) || '';
  const watchedCity = useWatch({ control, name: 'city' }) || '';
  const watchedParkingSpaces = useWatch({ control, name: 'parking_spaces' }) || '';
  const watchedUnitMix = useWatch({ control, name: 'unit_mix' }) || [];
  const watchedContacts = useWatch({ control, name: 'contacts' }) || [];
  const watchedAdjustments = useWatch({ control, name: 'adjustments' }) || [];
  const watchedVerificationSource = useWatch({ control, name: 'verification_source' }) || '';
  const watchedVerificationDate = useWatch({ control, name: 'verification_date' }) || '';
  const watchedLatitude = useWatch({ control, name: 'latitude' }) || '';
  const watchedLongitude = useWatch({ control, name: 'longitude' }) || '';

  const salePriceNum = useMemo(() => toNumber(watchedSalePrice), [watchedSalePrice]);
  const capRateNum = useMemo(() => toNumber(watchedCapRate), [watchedCapRate]);
  const unitsNum = useMemo(() => toNumber(watchedUnits), [watchedUnits]);
  const buildingSfNum = useMemo(() => toNumber(watchedBuildingSf), [watchedBuildingSf]);
  const landAreaAcresNum = useMemo(() => toNumber(watchedLandAreaAcres), [watchedLandAreaAcres]);

  const isLand = watchedPropertyType === 'LAND';

  const subject = useMemo<SubjectInfo | null>(() => {
    if (subjectProperty) return subjectProperty;
    if (subjectLocation?.latitude != null && subjectLocation?.longitude != null) {
      return {
        name: 'Subject',
        address: '',
        city: '',
        state: '',
        lat: subjectLocation.latitude,
        lng: subjectLocation.longitude,
      };
    }
    return null;
  }, [subjectLocation, subjectProperty]);

  const compCoords = useMemo(() => {
    const lat = toNumber(watchedLatitude);
    const lng = toNumber(watchedLongitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [watchedLatitude, watchedLongitude]);

  const subjectCoords = useMemo(() => {
    if (!subject || subject.lat == null || subject.lng == null) return null;
    return { lat: subject.lat, lng: subject.lng };
  }, [subject]);

  const unitMixStats = useMemo(() => {
    const totalUnits = watchedUnitMix.reduce((sum, row) => sum + (toNumber(row.unit_count) ?? 0), 0);
    const typeCount = watchedUnitMix.filter((row) => row.unit_type.trim()).length;
    return { totalUnits, typeCount };
  }, [watchedUnitMix]);

  const unitMixSummary = useMemo(() => {
    if (unitMixStats.totalUnits === 0 && unitMixStats.typeCount === 0) return DASH;
    return `${unitMixStats.typeCount} types / ${formatNumber(unitMixStats.totalUnits)} units`;
  }, [unitMixStats]);

  const unitMixHeaderSummary = useMemo(() => {
    return `${unitMixStats.totalUnits.toLocaleString('en-US')} units · ${unitMixStats.typeCount} types`;
  }, [unitMixStats]);

  const getAdjustment = useCallback((type: AdjustmentType): AdjustmentFormRow => {
    const found = watchedAdjustments.find((row) => normalizeAdjustmentType(row.adjustment_type) === type);
    return found ?? {
      adjustment_type: type,
      adjustment_pct: null,
      user_notes: '',
    };
  }, [watchedAdjustments]);

  const setAdjustmentValue = useCallback((type: AdjustmentType, patch: Partial<AdjustmentFormRow>) => {
    const current = getValues('adjustments') || [];
    const next = [...current];
    const idx = next.findIndex((row) => normalizeAdjustmentType(row.adjustment_type) === type);
    if (idx === -1) {
      next.push({
        adjustment_type: type,
        adjustment_pct: null,
        user_notes: '',
        ...patch,
      });
    } else {
      next[idx] = {
        ...next[idx],
        ...patch,
        adjustment_type: type,
      };
    }
    setValue('adjustments', next, { shouldDirty: true });
  }, [getValues, setValue]);

  const transactionSubtotalPct = useMemo(() => {
    return TRANSACTION_ADJUSTMENT_TYPES.reduce(
      (sum, type) => sum + (getAdjustment(type).adjustment_pct ?? 0),
      0,
    );
  }, [getAdjustment]);

  const propertySubtotalPct = useMemo(() => {
    return PROPERTY_ADJUSTMENT_TYPES.reduce(
      (sum, type) => sum + (getAdjustment(type).adjustment_pct ?? 0),
      0,
    );
  }, [getAdjustment]);

  const transactionSubtotalAmt = useMemo(() => {
    if (salePriceNum == null) return null;
    return salePriceNum * (transactionSubtotalPct / 100);
  }, [salePriceNum, transactionSubtotalPct]);

  const propertySubtotalAmt = useMemo(() => {
    if (salePriceNum == null) return null;
    return salePriceNum * (propertySubtotalPct / 100);
  }, [propertySubtotalPct, salePriceNum]);

  const netAdjPct = transactionSubtotalPct + propertySubtotalPct;
  const netAdjAmt = salePriceNum == null ? null : salePriceNum * (netAdjPct / 100);

  const pricePerUnit = useMemo(() => {
    if (salePriceNum == null || unitsNum == null || unitsNum === 0) return null;
    return salePriceNum / unitsNum;
  }, [salePriceNum, unitsNum]);

  const pricePerSf = useMemo(() => {
    if (salePriceNum == null || buildingSfNum == null || buildingSfNum === 0) return null;
    return salePriceNum / buildingSfNum;
  }, [buildingSfNum, salePriceNum]);

  const adjPricePerUnit = useMemo(() => {
    if (pricePerUnit == null) return null;
    return pricePerUnit * (1 + netAdjPct / 100);
  }, [netAdjPct, pricePerUnit]);

  const marketConditionText = useMemo(() => `${formatMonthYear(watchedSaleDate)} → Present`, [watchedSaleDate]);

  const locationComparison = useMemo(() => {
    const compCity = watchedCity || 'Comp City';
    const subjCity = subject?.city || 'Subject City';
    return `${subjCity} → ${compCity}`;
  }, [subject?.city, watchedCity]);

  const lotSizeSf = useMemo(() => {
    if (landAreaAcresNum == null) return null;
    return landAreaAcresNum * 43560;
  }, [landAreaAcresNum]);

  const parkingRatio = useMemo(() => {
    const parkingSpaces = toNumber(watchedParkingSpaces);
    if (parkingSpaces == null || unitsNum == null || unitsNum === 0) return null;
    return parkingSpaces / unitsNum;
  }, [unitsNum, watchedParkingSpaces]);

  const distanceMiles = useMemo(() => {
    if (!compCoords || !subjectCoords) return null;
    return haversineMiles(subjectCoords.lat, subjectCoords.lng, compCoords.lat, compCoords.lng);
  }, [compCoords, subjectCoords]);

  const updateLineProjection = useCallback(() => {
    if (!mapRef.current || !compCoords || !subjectCoords) {
      setLinePixels(null);
      return;
    }
    const start = mapRef.current.project([subjectCoords.lng, subjectCoords.lat]);
    const end = mapRef.current.project([compCoords.lng, compCoords.lat]);
    setLinePixels({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
  }, [compCoords, subjectCoords]);

  const positionOverlay = useCallback((section: OverlaySection) => {
    const bodyRect = modalBodyRef.current?.getBoundingClientRect();
    const triggerRect = overlayTriggerRefs.current[section]?.getBoundingClientRect();
    if (!bodyRect || !triggerRect) {
      setOverlayTop(12);
      return;
    }
    const scrollTop = modalBodyRef.current?.scrollTop ?? 0;
    const rawTop = triggerRect.top - bodyRect.top + scrollTop - 10;
    const maxTop = Math.max(12, (modalBodyRef.current?.scrollHeight ?? 0) - 470);
    setOverlayTop(Math.max(10, Math.min(rawTop, maxTop)));
  }, []);

  const openOverlay = useCallback((section: OverlaySection) => {
    setActiveOverlay((prev) => (prev === section ? null : section));
    setTimeout(() => positionOverlay(section), 0);
  }, [positionOverlay]);

  useEffect(() => {
    if (!activeOverlay) return;
    positionOverlay(activeOverlay);
  }, [activeOverlay, positionOverlay]);

  useEffect(() => {
    updateLineProjection();
  }, [updateLineProjection]);

  useEffect(() => {
    if (!isOpen) return;

    const setDefaults = (override?: Partial<SalesCompFormValues>) => {
      const defaults: SalesCompFormValues = {
        property_type: (propertyType ?? 'MULTIFAMILY').toUpperCase(),
        property_name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        latitude: subjectCoords?.lat != null ? String(subjectCoords.lat) : '',
        longitude: subjectCoords?.lng != null ? String(subjectCoords.lng) : '',
        sale_date: '',
        sale_price: '',
        cap_rate: '',
        property_rights: '',
        financing_type: '',
        sale_conditions: '',
        year_built: '',
        units: '',
        building_sf: '',
        stories: '',
        land_area_acres: '',
        parking_spaces: '',
        quality: '',
        property_other: '',
        zoning: '',
        entitlements: '',
        notes: '',
        verification_source: '',
        verification_date: '',
        adjustments: createDefaultAdjustments(),
        unit_mix: [],
        contacts: createDefaultContacts(),
        history: [],
        ...override,
      };
      reset(defaults);
      setAccordionOpen({
        transaction: true,
        property: true,
        unit_mix: true,
        contacts: true,
        history: false,
        documents: false,
        notes: false,
      });
      setActiveOverlay(null);
      setOverlayMessage('');
    };

    if (!isEditMode) {
      setDefaults();
      return;
    }

    setLoading(true);
    getSalesComparable(projectId, comparableId)
      .then((comp) => {
        const extra = (comp.extra_data ?? {}) as Record<string, unknown>;

        const existingAdjustments = (comp.adjustments ?? []).map((item) => ({
          adjustment_id: item.adjustment_id,
          adjustment_type: normalizeAdjustmentType(item.adjustment_type),
          adjustment_pct: item.user_adjustment_pct ?? item.adjustment_pct,
          adjustment_amount: item.adjustment_amount,
          user_notes: item.user_notes ?? '',
          justification: item.justification ?? '',
          subject_value: item.subject_value ?? '',
          comp_value: item.comp_value ?? '',
          landscaper_analysis: item.landscaper_analysis ?? '',
          ai_accepted: item.ai_accepted,
          confidence_score: item.confidence_score ?? null,
        }));

        const adjustmentMap = new globalThis.Map<AdjustmentType, AdjustmentFormRow>();
        createDefaultAdjustments().forEach((row) => {
          adjustmentMap.set(row.adjustment_type, row);
        });
        existingAdjustments.forEach((row) => {
          adjustmentMap.set(row.adjustment_type, {
            ...adjustmentMap.get(row.adjustment_type),
            ...row,
          });
        });

        const contacts = ensureRoleRows(
          (comp.contacts ?? []).map((contact, index) => ({
            role: contact.role,
            name: readString(contact.name),
            company: readString(contact.company),
            phone: readString(contact.phone),
            email: readString(contact.email),
            is_verification_source: Boolean(contact.is_verification_source),
            verification_date: readString(contact.verification_date),
            sort_order: contact.sort_order ?? index,
          })),
        );

        const unitMixRows = Array.isArray(comp.unit_mix)
          ? (comp.unit_mix as SalesCompUnitMixRow[]).map((row) => ({
              unit_type: readString(row.unit_type),
              bed_count: readString(row.bed_count),
              bath_count: readString(row.bath_count),
              unit_count: readString(row.unit_count),
              unit_pct: readString(row.unit_pct),
              avg_unit_sf: readString(row.avg_unit_sf),
              asking_rent_min: readString(row.asking_rent_min),
              asking_rent_max: readString(row.asking_rent_max),
              asking_rent_per_sf_min: readString(row.asking_rent_per_sf_min),
              vacant_units: readString(row.vacant_units),
            }))
          : [];

        const historyRows = (comp.history ?? []).map((row: SalesCompHistory) => ({
          sale_date: readString(row.sale_date),
          sale_price: readString(row.sale_price),
          price_per_unit: readString(row.price_per_unit),
          buyer_name: readString(row.buyer_name),
          seller_name: readString(row.seller_name),
        }));

        setDefaults({
          property_type: (comp.property_type || propertyType || 'MULTIFAMILY').toUpperCase(),
          property_name: readString(comp.property_name),
          address: readString(comp.address),
          city: readString(comp.city),
          state: readString(comp.state),
          zip: readString(comp.zip),
          latitude: readString(comp.latitude),
          longitude: readString(comp.longitude),
          sale_date: readString(comp.sale_date),
          sale_price: readString(comp.sale_price),
          cap_rate: readString(comp.cap_rate),
          property_rights: readString(comp.property_rights),
          financing_type: readString((comp as unknown as Record<string, unknown>).financing_type),
          sale_conditions: readString(comp.sale_conditions),
          year_built: readString(comp.year_built),
          units: readString(comp.units),
          building_sf: readString(comp.building_sf),
          stories: readString((comp as unknown as Record<string, unknown>).num_floors ?? extra.stories),
          land_area_acres: readString(comp.land_area_acres),
          parking_spaces: readString((comp as unknown as Record<string, unknown>).parking_spaces ?? extra.parking_spaces),
          quality: readString(extra.quality),
          property_other: readString(extra.property_other),
          zoning: readString(comp.zoning),
          entitlements: readString(comp.entitlements),
          notes: readString(comp.notes),
          verification_source: readString(comp.verification_source),
          verification_date: readString(comp.verification_date),
          adjustments: Array.from(adjustmentMap.values()),
          unit_mix: unitMixRows,
          contacts,
          history: historyRows,
        });
      })
      .catch((error) => {
        console.error('Failed to load sales comparable detail:', error);
      })
      .finally(() => setLoading(false));
  }, [
    comparableId,
    isEditMode,
    isOpen,
    projectId,
    propertyType,
    reset,
    subjectCoords?.lat,
    subjectCoords?.lng,
  ]);

  const onSelectVerificationSource = useCallback((nextValue: string) => {
    const currentContacts = getValues('contacts') || [];
    if (nextValue === 'public_records') {
      setValue('verification_source', 'Public Records', { shouldDirty: true });
      setValue(
        'contacts',
        currentContacts.map((contact) => ({
          ...contact,
          is_verification_source: false,
        })),
        { shouldDirty: true },
      );
      return;
    }

    if (nextValue.startsWith('contact-')) {
      const index = Number(nextValue.split('-')[1]);
      if (Number.isNaN(index) || !currentContacts[index]) return;
      const selected = currentContacts[index];
      setValue('verification_source', formatContactSource(selected), { shouldDirty: true });
      setValue(
        'contacts',
        currentContacts.map((contact, idx) => ({
          ...contact,
          is_verification_source: idx === index,
          verification_date: idx === index ? watchedVerificationDate : contact.verification_date,
        })),
        { shouldDirty: true },
      );
    }
  }, [getValues, setValue, watchedVerificationDate]);

  const verificationSelectValue = useMemo(() => {
    if (watchedVerificationSource === 'Public Records') return 'public_records';
    const flaggedIndex = watchedContacts.findIndex(
      (contact) => contact.is_verification_source && contact.name.trim().length > 0,
    );
    if (flaggedIndex >= 0) return `contact-${flaggedIndex}`;

    const matchedIndex = watchedContacts.findIndex(
      (contact) => formatContactSource(contact) === watchedVerificationSource,
    );
    if (matchedIndex >= 0) return `contact-${matchedIndex}`;

    if (watchedVerificationSource) return 'custom';
    return '';
  }, [watchedContacts, watchedVerificationSource]);

  const verificationSourceOptions = useMemo(() => {
    return watchedContacts
      .map((contact, index) => ({ contact, index }))
      .filter(({ contact }) => contact.name.trim().length > 0)
      .map(({ contact, index }) => ({
        value: `contact-${index}`,
        label: formatContactSource(contact),
      }));
  }, [watchedContacts]);

  const applyOverlayAdjustments = useCallback((section: OverlaySection) => {
    const recommendation = OVERLAY_RECOMMENDATIONS[section];
    recommendation.rows.forEach((row) => {
      setAdjustmentValue(row.type, {
        adjustment_pct: row.pct,
        user_notes: row.rationale,
      });
    });
    setActiveOverlay(null);
  }, [setAdjustmentValue]);

  const buildPayload = useCallback((values: SalesCompFormValues): SalesComparableForm => {
    const serializedAdjustments = values.adjustments
      .map((row) => ({
        ...row,
        adjustment_pct: row.adjustment_pct,
      }))
      .filter((row) => {
        return (
          row.adjustment_pct != null ||
          Boolean(row.user_notes?.trim()) ||
          Boolean(row.justification?.trim()) ||
          Boolean(row.ai_accepted)
        );
      })
      .map((row) => ({
        adjustment_type: row.adjustment_type,
        adjustment_pct: row.adjustment_pct,
        adjustment_amount: salePriceNum == null || row.adjustment_pct == null
          ? null
          : salePriceNum * (row.adjustment_pct / 100),
        user_notes: row.user_notes || null,
        justification: row.justification || null,
        subject_value: row.subject_value || null,
        comp_value: row.comp_value || null,
        landscaper_analysis: row.landscaper_analysis || null,
        ai_accepted: Boolean(row.ai_accepted),
        confidence_score: row.confidence_score ?? null,
      }));

    const serializedUnitMix = values.unit_mix
      .map((row) => ({
        unit_type: row.unit_type || null,
        bed_count: toNumber(row.bed_count),
        bath_count: toNumber(row.bath_count),
        unit_count: toNumber(row.unit_count) ?? 0,
        unit_pct: toNumber(row.unit_pct),
        avg_unit_sf: toNumber(row.avg_unit_sf),
        asking_rent_min: toNumber(row.asking_rent_min),
        asking_rent_max: toNumber(row.asking_rent_max),
        asking_rent_per_sf_min: toNumber(row.asking_rent_per_sf_min),
        vacant_units: toNumber(row.vacant_units) ?? 0,
      }))
      .filter((row) => row.unit_type || row.unit_count > 0);

    const serializedContacts = values.contacts
      .map((row, idx) => ({
        role: row.role,
        name: row.name.trim() || null,
        company: row.company.trim() || null,
        phone: row.phone.trim() || null,
        email: row.email.trim() || null,
        is_verification_source: Boolean(row.is_verification_source),
        verification_date: row.is_verification_source
          ? values.verification_date || row.verification_date || null
          : null,
        sort_order: row.sort_order ?? idx,
      }))
      .filter((row) => row.name || row.company || row.phone || row.email || BASE_CONTACT_ROLES.includes(row.role));

    const serializedHistory = values.history
      .map((row) => ({
        sale_date: row.sale_date || null,
        sale_price: toNumber(row.sale_price),
        price_per_unit: toNumber(row.price_per_unit),
        buyer_name: row.buyer_name.trim() || null,
        seller_name: row.seller_name.trim() || null,
      }))
      .filter((row) => row.sale_date || row.sale_price != null || row.buyer_name || row.seller_name);

    const payload: SalesComparableForm = {
      project_id: projectId,
      property_type: values.property_type || null,
      comp_number: compNumber ?? null,
      property_name: values.property_name || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zip: values.zip || null,
      latitude: toNumber(values.latitude),
      longitude: toNumber(values.longitude),
      sale_date: values.sale_date || null,
      sale_price: toNumber(values.sale_price),
      cap_rate: toNumber(values.cap_rate),
      sale_conditions: values.sale_conditions || null,
      property_rights: values.property_rights || null,
      verification_source: values.verification_source || null,
      verification_date: values.verification_date || null,
      year_built: toNumber(values.year_built),
      units: toNumber(values.units),
      building_sf: toNumber(values.building_sf),
      land_area_acres: toNumber(values.land_area_acres),
      land_area_sf: lotSizeSf,
      zoning: values.zoning || null,
      entitlements: values.entitlements || null,
      notes: values.notes || null,
      adjustments: serializedAdjustments,
      unit_mix: serializedUnitMix,
      contacts: serializedContacts,
      history: serializedHistory,
      extra_data: {
        stories: toNumber(values.stories),
        parking_spaces: toNumber(values.parking_spaces),
        quality: values.quality || null,
        property_other: values.property_other || null,
      },
    } as SalesComparableForm;

    (payload as unknown as Record<string, unknown>).financing_type = values.financing_type || null;
    (payload as unknown as Record<string, unknown>).num_floors = toNumber(values.stories);
    (payload as unknown as Record<string, unknown>).parking_spaces = toNumber(values.parking_spaces);

    return payload;
  }, [compNumber, lotSizeSf, projectId, salePriceNum]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = buildPayload(values);
      if (isEditMode && comparableId != null) {
        await updateSalesComparable(projectId, comparableId, payload);
      } else {
        await createSalesComparable(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save comparable detail modal:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  });

  const onDelete = useCallback(async () => {
    if (!isEditMode || comparableId == null) return;
    const confirmed = window.confirm('Delete this comparable? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteSalesComparable(projectId, comparableId);
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to delete comparable:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [comparableId, isEditMode, onClose, onSaved, projectId]);

  const contactsCount = watchedContacts.length;
  const historyCount = historyArray.fields.length;
  const propertyTypeLabel = formatPropertyTypeLabel(watchedPropertyType || propertyType || 'MULTIFAMILY');

  if (!isOpen) return null;

  const modal = (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className={styles.modalRoot} role="dialog" aria-modal="true">
        <div className={combineClassNames('modal-dialog modal-dialog-scrollable', styles.modalDialog)}>
          <div className={combineClassNames(styles.modalContent, 'salesCompDetailModal')}>
            <div className={combineClassNames('d-flex align-items-center justify-content-between', styles.header)}>
              <div className="d-flex align-items-center gap-2">
                <h5 className={styles.headerTitle}>{watchedPropertyName || (isEditMode ? 'Edit Comparable' : 'New Comparable')}</h5>
                {compNumber != null && <span className="badge bg-danger">Comp {compNumber}</span>}
                <span className={combineClassNames('badge', styles.badgeOutline)}>
                  {propertyTypeLabel}
                </span>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div ref={modalBodyRef} className={styles.body}>
              {loading ? (
                <div className={combineClassNames('py-5 text-center small', styles.mutedText)}>
                  Loading comparable detail...
                </div>
              ) : (
                <>
                  <div className={styles.mapCard}>
                    {compCoords && subjectCoords ? (
                      <div className={styles.mapFrame}>
                        <Map
                          ref={mapRef}
                          mapStyle={MAP_STYLE}
                          initialViewState={{
                            latitude: (compCoords.lat + subjectCoords.lat) / 2,
                            longitude: (compCoords.lng + subjectCoords.lng) / 2,
                            zoom: 11,
                          }}
                          onMove={() => updateLineProjection()}
                          onResize={() => updateLineProjection()}
                          onLoad={() => updateLineProjection()}
                          style={{ width: '100%', height: '100%' }}
                          scrollZoom={false}
                        >
                          <NavigationControl position="bottom-right" />
                          <Marker latitude={subjectCoords.lat} longitude={subjectCoords.lng}>
                            <div className="d-flex flex-column align-items-center">
                              <div className={combineClassNames(styles.pin, styles.pinSubject)}>S</div>
                              <div className={styles.pinLabel}>
                                {subject?.name || 'Subject'} {subject?.city ? `• ${subject.city}` : ''}
                              </div>
                            </div>
                          </Marker>
                          <Marker latitude={compCoords.lat} longitude={compCoords.lng}>
                            <div className="d-flex flex-column align-items-center">
                              <div className={combineClassNames(styles.pin, styles.pinComp)}>{compNumber ?? 1}</div>
                              <div className={styles.pinLabel}>
                                {(watchedPropertyName || 'Comparable').toString()} {watchedCity ? `• ${watchedCity}` : ''}
                              </div>
                            </div>
                          </Marker>
                        </Map>

                        {linePixels && (
                          <div className={styles.mapLineLayer}>
                            <svg width="100%" height="100%">
                              <line
                                x1={linePixels.x1}
                                y1={linePixels.y1}
                                x2={linePixels.x2}
                                y2={linePixels.y2}
                                stroke="var(--cui-info)"
                                strokeDasharray="6 5"
                                strokeWidth="2"
                              />
                            </svg>
                            <div
                              className={styles.mapDistanceChip}
                              style={{
                                left: `${(linePixels.x1 + linePixels.x2) / 2}px`,
                                top: `${(linePixels.y1 + linePixels.y2) / 2}px`,
                              }}
                            >
                              {distanceMiles == null ? DASH : `${distanceMiles.toFixed(2)} mi`}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.mapPlaceholder}>Map will populate when address is geocoded</div>
                    )}
                  </div>

                  <div className={styles.addressBar}>
                    <div className={styles.addressGrid}>
                      <div>
                        <label className={styles.fieldLabel}>Property Name</label>
                        <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('property_name')} />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Address</label>
                        <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('address')} />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>City</label>
                        <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('city')} />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>State</label>
                        <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('state')} />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Zip</label>
                        <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('zip')} />
                      </div>
                    </div>
                  </div>

                  <div className={styles.kpiStrip}>
                    <KpiItem title="Sale Price" value={formatCurrency(salePriceNum)} />
                    <KpiItem title="Sale Date" value={watchedSaleDate || DASH} />
                    <KpiItem title="$/Unit" value={formatCurrency(pricePerUnit)} />
                    <KpiItem title="Cap Rate" value={formatPercent(capRateNum)} />
                    <KpiItem title="Net Adj" value={toFixedOrDash(netAdjPct)} className={signedValueClass(netAdjPct)} />
                    <KpiItem title="Adj $/Unit" value={formatCurrency(adjPricePerUnit)} className={signedValueClass(adjPricePerUnit)} />
                  </div>

                  <Section
                    title="Transaction"
                    open={accordionOpen.transaction}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, transaction: !prev.transaction }))}
                    headerMeta={`Subtotal: ${toFixedOrDash(transactionSubtotalPct)} / ${formatCurrency(transactionSubtotalAmt, true)}`}
                    landscaperButton={
                      <button
                        ref={(node) => {
                          overlayTriggerRefs.current.transaction = node;
                        }}
                        type="button"
                        className={styles.landscaperBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          openOverlay('transaction');
                        }}
                      >
                        <span className={styles.pulseDot} />Landscaper
                      </button>
                    }
                  >
                    <div className={styles.fieldGridHeader}>
                      <div>Field</div>
                      <div>Value</div>
                      <div className="text-end">Adj %</div>
                      <div className="text-end">Adj $</div>
                      <div>Notes</div>
                    </div>

                    <div className={styles.fieldGridRow}>
                      <div className={styles.fieldName}>Sale Date</div>
                      <div>
                        <input type="date" className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('sale_date')} />
                      </div>
                      <div />
                      <div />
                      <div />
                    </div>

                    <div className={styles.fieldGridRow}>
                      <div className={styles.fieldName}>Sale Price</div>
                      <div>
                        <div className={styles.inputPrefix}>
                          <span className={styles.prefix}>$</span>
                          <Controller
                            control={control}
                            name="sale_price"
                            render={({ field }) => (
                              <DashNumericInput
                                value={field.value}
                                onChange={field.onChange}
                                textEnd={false}
                                className={styles.prefixedInput}
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div />
                      <div />
                      <div />
                    </div>

                    <AdjustmentRow
                      label="Property Rights"
                      valueNode={
                        <select className={combineClassNames('form-select form-select-sm', styles.smallControl)} {...register('property_rights')}>
                          <option value="">Select</option>
                          {PROPERTY_RIGHTS_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      }
                      adjustment={getAdjustment('property_rights')}
                      adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('property_rights').adjustment_pct ?? 0) / 100)}
                      onPctChange={(nextPct) => setAdjustmentValue('property_rights', { adjustment_pct: nextPct })}
                      onNotesChange={(nextNotes) => setAdjustmentValue('property_rights', { user_notes: nextNotes })}
                    />

                    <AdjustmentRow
                      label="Financing"
                      valueNode={
                        <select className={combineClassNames('form-select form-select-sm', styles.smallControl)} {...register('financing_type')}>
                          <option value="">Select</option>
                          {FINANCING_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      }
                      adjustment={getAdjustment('financing')}
                      adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('financing').adjustment_pct ?? 0) / 100)}
                      onPctChange={(nextPct) => setAdjustmentValue('financing', { adjustment_pct: nextPct })}
                      onNotesChange={(nextNotes) => setAdjustmentValue('financing', { user_notes: nextNotes })}
                    />

                    <AdjustmentRow
                      label="Sale Conditions"
                      valueNode={
                        <select className={combineClassNames('form-select form-select-sm', styles.smallControl)} {...register('sale_conditions')}>
                          <option value="">Select</option>
                          {SALE_CONDITIONS_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      }
                      adjustment={getAdjustment('sale_conditions')}
                      adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('sale_conditions').adjustment_pct ?? 0) / 100)}
                      onPctChange={(nextPct) => setAdjustmentValue('sale_conditions', { adjustment_pct: nextPct })}
                      onNotesChange={(nextNotes) => setAdjustmentValue('sale_conditions', { user_notes: nextNotes })}
                    />

                    <AdjustmentRow
                      label="Market Conditions"
                      valueNode={<CalculatedBadgeValue value={marketConditionText} badge="AUTO" />}
                      adjustment={getAdjustment('market_conditions')}
                      adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('market_conditions').adjustment_pct ?? 0) / 100)}
                      onPctChange={(nextPct) => setAdjustmentValue('market_conditions', { adjustment_pct: nextPct })}
                      onNotesChange={(nextNotes) => setAdjustmentValue('market_conditions', { user_notes: nextNotes })}
                    />

                    <div className={styles.fieldGridSubtotal}>
                      <div>Subtotal</div>
                      <div />
                      <div className="text-end">{toFixedOrDash(transactionSubtotalPct)}</div>
                      <div className="text-end">{formatCurrency(transactionSubtotalAmt, true)}</div>
                      <div />
                    </div>
                  </Section>

                  <Section
                    title="Property"
                    open={accordionOpen.property}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, property: !prev.property }))}
                    headerMeta={`Subtotal: ${toFixedOrDash(propertySubtotalPct)} / ${formatCurrency(propertySubtotalAmt, true)}`}
                    landscaperButton={
                      <button
                        ref={(node) => {
                          overlayTriggerRefs.current.property = node;
                        }}
                        type="button"
                        className={styles.landscaperBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          openOverlay('property');
                        }}
                      >
                        <span className={styles.pulseDot} />Landscaper
                      </button>
                    }
                  >
                    <div className={styles.fieldGridHeader}>
                      <div>Field</div>
                      <div>Value</div>
                      <div className="text-end">Adj %</div>
                      <div className="text-end">Adj $</div>
                      <div>Notes</div>
                    </div>

                    <AdjustmentRow
                      label="Location"
                      valueNode={<CalculatedBadgeValue value={locationComparison} badge="VS SUBJ" />}
                      adjustment={getAdjustment('location')}
                      adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('location').adjustment_pct ?? 0) / 100)}
                      onPctChange={(nextPct) => setAdjustmentValue('location', { adjustment_pct: nextPct })}
                      onNotesChange={(nextNotes) => setAdjustmentValue('location', { user_notes: nextNotes })}
                    />

                    {!isLand ? (
                      <>
                        <AdjustmentRow
                          label="Year Built"
                          valueNode={
                            <Controller
                              control={control}
                              name="year_built"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          }
                          adjustment={getAdjustment('physical_age')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_age').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_age', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_age', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Units"
                          valueNode={
                            <Controller
                              control={control}
                              name="units"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          }
                          adjustment={getAdjustment('physical_size')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_size').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_size', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_size', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Bldg SF"
                          valueNode={
                            <Controller
                              control={control}
                              name="building_sf"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          }
                          adjustment={getAdjustment('physical_building_sf')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_building_sf').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_building_sf', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_building_sf', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Stories"
                          valueNode={
                            <Controller
                              control={control}
                              name="stories"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          }
                          adjustment={getAdjustment('physical_stories')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_stories').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_stories', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_stories', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Lot Size (Acres)"
                          valueNode={
                            <Controller
                              control={control}
                              name="land_area_acres"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          }
                          adjustment={getAdjustment('physical_lot_size')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_lot_size').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_lot_size', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_lot_size', { user_notes: nextNotes })}
                        />

                        <div className={styles.fieldGridRow}>
                          <div className={styles.fieldName}>Lot Size (SF)</div>
                          <div>
                            <CalculatedBadgeValue value={formatNumber(lotSizeSf)} badge="CALC" />
                          </div>
                          <div />
                          <div className={combineClassNames(styles.adjAmount, styles.valueNeutral)}>{DASH}</div>
                          <div />
                        </div>

                        <div className={styles.fieldGridRow}>
                          <div className={styles.fieldName}>Parking Spaces</div>
                          <div className={styles.parkingInputWrap}>
                            <Controller
                              control={control}
                              name="parking_spaces"
                              render={({ field }) => (
                                <DashNumericInput value={field.value} onChange={field.onChange} className={styles.parkingInput} />
                              )}
                            />
                          </div>
                          <div />
                          <div />
                          <div />
                        </div>

                        <div className={styles.fieldGridRow}>
                          <div className={styles.fieldName}>Parking Ratio</div>
                          <div>
                            <CalculatedBadgeValue value={parkingRatio == null ? DASH : `${parkingRatio.toFixed(2)} / unit`} badge="CALC" />
                          </div>
                          <div />
                          <div />
                          <div />
                        </div>

                        <AdjustmentRow
                          label="Unit Mix"
                          valueNode={<CalculatedBadgeValue value={unitMixSummary} badge="VS SUBJ" />}
                          adjustment={getAdjustment('physical_unit_mix')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_unit_mix').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_unit_mix', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_unit_mix', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Quality"
                          valueNode={<input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('quality')} />}
                          adjustment={getAdjustment('physical_condition')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('physical_condition').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('physical_condition', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('physical_condition', { user_notes: nextNotes })}
                        />

                        <AdjustmentRow
                          label="Other"
                          valueNode={<input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('property_other')} />}
                          adjustment={getAdjustment('other')}
                          adjustmentAmount={salePriceNum == null ? null : salePriceNum * ((getAdjustment('other').adjustment_pct ?? 0) / 100)}
                          onPctChange={(nextPct) => setAdjustmentValue('other', { adjustment_pct: nextPct })}
                          onNotesChange={(nextNotes) => setAdjustmentValue('other', { user_notes: nextNotes })}
                        />
                      </>
                    ) : (
                      <>
                        <div className={styles.fieldGridRow}>
                          <div className={styles.fieldName}>Zoning</div>
                          <div>
                            <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('zoning')} />
                          </div>
                          <div />
                          <div className={styles.adjAmount}>{DASH}</div>
                          <div />
                        </div>

                        <div className={styles.fieldGridRow}>
                          <div className={styles.fieldName}>Entitlements</div>
                          <div>
                            <input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register('entitlements')} />
                          </div>
                          <div />
                          <div className={styles.adjAmount}>{DASH}</div>
                          <div />
                        </div>
                      </>
                    )}

                    <div className={styles.fieldGridSubtotal}>
                      <div>Subtotal</div>
                      <div />
                      <div className="text-end">{toFixedOrDash(propertySubtotalPct)}</div>
                      <div className="text-end">{formatCurrency(propertySubtotalAmt, true)}</div>
                      <div />
                    </div>

                    <div className={styles.metricsStrip}>
                      <MetricCard label="$/Unit" value={formatCurrency(pricePerUnit)} />
                      <MetricCard label="$/SF" value={formatCurrency(pricePerSf)} />
                      <MetricCard label="Cap Rate" value={formatPercent(capRateNum)} />
                      <MetricCard label="GRM" value={DASH} />
                      {/* GRM requires gross_income which is not on comp schema yet */}
                    </div>
                  </Section>

                  <div className={styles.netBar}>
                    <NetCell label="Transaction" value={toFixedOrDash(transactionSubtotalPct)} className={signedValueClass(transactionSubtotalPct)} />
                    <NetCell label="Property" value={toFixedOrDash(propertySubtotalPct)} className={signedValueClass(propertySubtotalPct)} />
                    <NetCell label="Net" value={toFixedOrDash(netAdjPct)} className={signedValueClass(netAdjPct)} />
                    <NetCell label="Adj $/Unit" value={formatCurrency(adjPricePerUnit)} className={signedValueClass(adjPricePerUnit)} />
                  </div>

                  <Section
                    title="Unit Mix"
                    open={accordionOpen.unit_mix}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, unit_mix: !prev.unit_mix }))}
                    headerMeta={unitMixHeaderSummary}
                    landscaperButton={
                      <button
                        ref={(node) => {
                          overlayTriggerRefs.current.unit_mix = node;
                        }}
                        type="button"
                        className={styles.landscaperBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          openOverlay('unit_mix');
                        }}
                      >
                        <span className={styles.pulseDot} />Landscaper
                      </button>
                    }
                  >
                    <div className={styles.tableWrap}>
                      <table className={styles.compTable}>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Beds</th>
                            <th>Baths</th>
                            <th>#</th>
                            <th>%</th>
                            <th>Avg SF</th>
                            <th>Rent Range</th>
                            <th>$/SF</th>
                            <th>Vacant</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {unitMixArray.fields.map((field, index) => (
                            <tr key={field.id}>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`unit_mix.${index}.unit_type`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.bed_count`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.bath_count`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.unit_count`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.unit_pct`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.avg_unit_sf`)} /></td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.asking_rent_min`)} />
                                  <span className={styles.sectionMeta}>-</span>
                                  <input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.asking_rent_max`)} />
                                </div>
                              </td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.asking_rent_per_sf_min`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`unit_mix.${index}.vacant_units`)} /></td>
                              <td>
                                <button type="button" className="btn btn-ghost-secondary btn-sm" onClick={() => unitMixArray.remove(index)}>×</button>
                              </td>
                            </tr>
                          ))}
                          {unitMixArray.fields.length === 0 && (
                            <tr>
                              <td colSpan={10} className={combineClassNames('text-center', styles.mutedText)}>
                                No unit mix rows yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={10}>Totals: {unitMixSummary}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="mt-2">
                      <button type="button" className={styles.addRowBtn} onClick={() => unitMixArray.append(createEmptyUnitMixRow())}>
                        Add Unit Type
                      </button>
                    </div>
                  </Section>

                  <Section
                    title="Contacts & Verification"
                    open={accordionOpen.contacts}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, contacts: !prev.contacts }))}
                    headerMeta={`${contactsCount} contacts`}
                  >
                    <div className={styles.tableWrap}>
                      <table className={styles.compTable}>
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Name</th>
                            <th>Company</th>
                            <th>Phone</th>
                            <th>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contactsArray.fields.map((field, index) => (
                            <tr key={field.id}>
                              <td>
                                <span className={combineClassNames(styles.roleBadge, roleClassName(watchedContacts[index]?.role ?? 'buyer'))}>
                                  {ROLE_LABEL[watchedContacts[index]?.role ?? 'buyer']}
                                </span>
                              </td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`contacts.${index}.name`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`contacts.${index}.company`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`contacts.${index}.phone`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`contacts.${index}.email`)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        className={styles.addRowBtn}
                        onClick={() => contactsArray.append({
                          role: 'buyer',
                          name: '',
                          company: '',
                          phone: '',
                          email: '',
                          is_verification_source: false,
                          verification_date: '',
                          sort_order: contactsArray.fields.length,
                        })}
                      >
                        Add Contact
                      </button>
                    </div>

                    <div className={styles.verificationBlock}>
                      <div className={styles.verificationGrid}>
                        <div className={styles.fieldLabel}>Confirmed By</div>
                        <select
                          className={combineClassNames('form-select form-select-sm', styles.smallControl)}
                          value={verificationSelectValue}
                          onChange={(event) => onSelectVerificationSource(event.target.value)}
                        >
                          <option value="">Select source</option>
                          {verificationSourceOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                          <option value="public_records">Public Records</option>
                          {verificationSelectValue === 'custom' && (
                            <option value="custom">{watchedVerificationSource}</option>
                          )}
                        </select>
                        <Controller
                          control={control}
                          name="verification_date"
                          render={({ field }) => (
                            <input
                              type="date"
                              className={combineClassNames('form-control form-control-sm', styles.smallControl)}
                              value={field.value}
                              onChange={(event) => {
                                field.onChange(event.target.value);
                                const currentContacts = getValues('contacts') || [];
                                setValue(
                                  'contacts',
                                  currentContacts.map((contact) =>
                                    contact.is_verification_source
                                      ? { ...contact, verification_date: event.target.value }
                                      : contact,
                                  ),
                                  { shouldDirty: true },
                                );
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Sale History"
                    open={accordionOpen.history}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, history: !prev.history }))}
                    headerMeta={`${historyCount} prior sales`}
                  >
                    <div className={styles.tableWrap}>
                      <table className={styles.compTable}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Price</th>
                            <th>$/Unit</th>
                            <th>Buyer</th>
                            <th>Seller</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {historyArray.fields.map((field, index) => (
                            <tr key={field.id}>
                              <td><input type="date" className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`history.${index}.sale_date`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`history.${index}.sale_price`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl, 'text-end')} {...register(`history.${index}.price_per_unit`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`history.${index}.buyer_name`)} /></td>
                              <td><input className={combineClassNames('form-control form-control-sm', styles.smallControl)} {...register(`history.${index}.seller_name`)} /></td>
                              <td><button type="button" className="btn btn-ghost-secondary btn-sm" onClick={() => historyArray.remove(index)}>×</button></td>
                            </tr>
                          ))}
                          {historyArray.fields.length === 0 && (
                            <tr>
                              <td colSpan={6} className={combineClassNames('text-center', styles.mutedText)}>
                                No prior sale records.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2">
                      <button type="button" className={styles.addRowBtn} onClick={() => historyArray.append(createEmptyHistoryRow())}>
                        Add Prior Sale
                      </button>
                    </div>
                  </Section>

                  <Section
                    title="Documents & Photos"
                    open={accordionOpen.documents}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, documents: !prev.documents }))}
                    headerMeta="0 files"
                  >
                    <div className={styles.docDropzone}>
                      <div>
                        <CIcon icon={cilCloudUpload} className={styles.docIcon} />
                        <div className={styles.docText}>Drop files or click to upload</div>
                        <button
                          type="button"
                          className={styles.docDmsLink}
                          onClick={() => { /* DMS modal integration — future */ }}
                        >
                          Select from DMS →
                        </button>
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Notes"
                    open={accordionOpen.notes}
                    onToggle={() => setAccordionOpen((prev) => ({ ...prev, notes: !prev.notes }))}
                  >
                    <textarea className={combineClassNames('form-control form-control-sm', styles.notesArea)} {...register('notes')} />
                  </Section>

                  {activeOverlay && (
                    <div className={styles.overlayPanel} style={{ top: `${overlayTop}px` }}>
                      <div className={combineClassNames('d-flex align-items-center justify-content-between', styles.overlayHeader)}>
                        <div className="d-flex align-items-center gap-2">
                          <span className={styles.overlayIcon}><span className={styles.pulseDot} /></span>
                          <span className={styles.overlayTitle}>Landscaper</span>
                          <span className={styles.overlayContext}>{OVERLAY_RECOMMENDATIONS[activeOverlay].title}</span>
                        </div>
                        <button type="button" className="btn-close btn-sm" onClick={() => setActiveOverlay(null)} />
                      </div>

                      <div className={styles.overlayBody}>
                        <div className={combineClassNames('small mb-2', styles.mutedText)}>
                          Recommended adjustments based on current comp profile and subject context.
                        </div>

                        {OVERLAY_RECOMMENDATIONS[activeOverlay].rows.map((row) => (
                          <div key={row.type} className={styles.overlaySuggestion}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-semibold small">{row.type.replace(/_/g, ' ')}</span>
                              <span className="small fw-semibold">{toFixedOrDash(row.pct, 1)}</span>
                            </div>
                            <div className="small">{row.rationale}</div>
                          </div>
                        ))}

                        <div className="small fw-semibold mb-1">Action chips</div>
                        <div className={styles.overlayActions}>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => applyOverlayAdjustments(activeOverlay)}
                          >
                            Apply adjustments
                          </button>
                          {OVERLAY_RECOMMENDATIONS[activeOverlay].actions
                            .filter((action) => action !== 'Apply adjustments')
                            .map((action) => (
                              <span key={action} className={styles.actionChip}>{action}</span>
                            ))}
                        </div>
                      </div>

                      <div className={styles.overlayFooter}>
                        <div className={combineClassNames('small mb-1', styles.mutedText)}>Prompt</div>
                        <textarea
                          className={combineClassNames('form-control form-control-sm mb-2', styles.notesArea)}
                          value={overlayMessage}
                          onChange={(event) => setOverlayMessage(event.target.value)}
                        />
                        <div className="d-flex justify-content-end">
                          <button type="button" className="btn btn-success btn-sm" onClick={() => setOverlayMessage('')}>
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={combineClassNames('d-flex align-items-center justify-content-between', styles.footer)}>
              <div>
                {isEditMode && (
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={onDelete}>
                    Delete
                  </button>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-ghost-secondary btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onSubmit()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function Section({
  title,
  open,
  onToggle,
  children,
  headerMeta,
  landscaperButton,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerMeta?: string;
  landscaperButton?: ReactNode;
}) {
  return (
    <section className={combineClassNames(styles.section, open && styles.sectionOpen)}>
      <button
        type="button"
        className={combineClassNames('d-flex align-items-center', styles.sectionHeader, open && styles.sectionHeaderOpen)}
        onClick={onToggle}
      >
        <span className={combineClassNames('d-flex align-items-center gap-2', styles.sectionHeading)}>
          <span className={combineClassNames(styles.chevron, open && styles.chevronOpen)}>▸</span>
          <span className={styles.sectionName}>{title}</span>
          {landscaperButton}
        </span>
        {headerMeta && <span className={styles.sectionMeta}>{headerMeta}</span>}
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

function KpiItem({ title, value, className }: { title: string; value: string; className?: string }) {
  return (
    <div className={styles.kpiItem}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={combineClassNames(styles.kpiValue, className)}>{value || DASH}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricTitle}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}

function NetCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={styles.netCell}>
      <div className={styles.netLabel}>{label}</div>
      <div className={combineClassNames(styles.netValue, className)}>{value || DASH}</div>
    </div>
  );
}

function CalculatedBadgeValue({ value, badge }: { value: string; badge: string }) {
  return (
    <div className={styles.calcValue}>
      <span>{value}</span>
      <span className={styles.calcBadge}>{badge}</span>
    </div>
  );
}

function AdjustmentRow({
  label,
  valueNode,
  adjustment,
  adjustmentAmount,
  onPctChange,
  onNotesChange,
}: {
  label: string;
  valueNode: ReactNode;
  adjustment: AdjustmentFormRow;
  adjustmentAmount: number | null;
  onPctChange: (nextPct: number | null) => void;
  onNotesChange: (nextNote: string) => void;
}) {
  return (
    <div className={styles.fieldGridRow}>
      <div className={styles.fieldName}>{label}</div>
      <div>{valueNode}</div>
      <div>
        <AdjPercentInput value={adjustment.adjustment_pct} onCommit={onPctChange} />
      </div>
      <div className={combineClassNames(styles.adjAmount, signedValueClass(adjustmentAmount))}>{formatCurrency(adjustmentAmount, true)}</div>
      <div>
        <input
          className={styles.notesInput}
          value={adjustment.user_notes ?? ''}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </div>
    </div>
  );
}
