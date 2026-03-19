'use client';

/**
 * RentCompDetailModal
 *
 * Full CRUD modal for rental comparables.
 * Layout mirrors SalesCompDetailModal: KPI strip → accordion sections → footer.
 * Sections: Property Info, Unit Details, Rent & Financial, Source & Notes.
 *
 * @created 2026-03-19
 */

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import { ChevronRight } from 'lucide-react';
import {
  createRentComparable,
  deleteRentComparable,
  getRentComparable,
  updateRentComparable,
  type RentComparableForm,
} from '@/lib/api/rentComps';
import styles from './RentCompDetailModal.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AccordionSection = 'property' | 'unit' | 'rent' | 'source';

interface RentCompDetailModalProps {
  projectId: number;
  comparableId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface RentCompFormValues {
  // Property
  property_name: string;
  address: string;
  latitude: string;
  longitude: string;
  year_built: string;
  total_units: string;
  distance_miles: string;
  // Unit
  unit_type: string;
  bedrooms: string;
  bathrooms: string;
  avg_sqft: string;
  // Rent
  asking_rent: string;
  effective_rent: string;
  concessions: string;
  // Source
  data_source: string;
  as_of_date: string;
  amenities: string;
  notes: string;
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DASH = '–';

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val === 0) return DASH;
  return `$${Math.round(val).toLocaleString()}`;
}

function formatDecimal(val: number | null | undefined, digits = 2): string {
  if (val == null || !Number.isFinite(val) || val === 0) return DASH;
  return `$${val.toFixed(digits)}`;
}

function formatInteger(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val === 0) return DASH;
  return val.toLocaleString();
}

function cls(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const DATA_SOURCE_OPTIONS = [
  '',
  'CoStar',
  'Apartments.com',
  'Zillow',
  'RealPage',
  'Yardi Matrix',
  'LoopNet',
  'Manual Entry',
  'Broker',
  'Property Website',
  'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiItem({ title, value, className }: { title: string; value: string; className?: string }) {
  return (
    <div className={styles.kpiItem}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={cls(styles.kpiValue, className)}>{value}</div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
  badge,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <section className={cls('card', styles.section)}>
      <div
        role="button"
        tabIndex={0}
        className={cls('card-header d-flex align-items-center', styles.sectionHeader, open && styles.sectionHeaderOpen)}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <ChevronRight size={14} className={cls(styles.chevron, open && styles.chevronOpen)} />
        <span>{title}</span>
        {badge && (
          <span className={cls('badge', styles.badgeOutline)} style={{ marginLeft: 'auto', fontSize: '0.625rem' }}>
            {badge}
          </span>
        )}
      </div>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RentCompDetailModal({
  projectId,
  comparableId,
  isOpen,
  onClose,
  onSaved,
}: RentCompDetailModalProps) {
  const isEditMode = comparableId != null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionSection, boolean>>({
    property: true,
    unit: true,
    rent: true,
    source: false,
  });

  const { control, register, reset, handleSubmit } = useForm<RentCompFormValues>({
    defaultValues: {
      property_name: '',
      address: '',
      latitude: '',
      longitude: '',
      year_built: '',
      total_units: '',
      distance_miles: '',
      unit_type: '',
      bedrooms: '',
      bathrooms: '',
      avg_sqft: '',
      asking_rent: '',
      effective_rent: '',
      concessions: '',
      data_source: 'Manual Entry',
      as_of_date: new Date().toISOString().split('T')[0],
      amenities: '',
      notes: '',
      is_active: true,
    },
  });

  // Watch values for KPI strip
  const watchedName = useWatch({ control, name: 'property_name' }) || '';
  const watchedAskingRent = useWatch({ control, name: 'asking_rent' }) || '';
  const watchedEffectiveRent = useWatch({ control, name: 'effective_rent' }) || '';
  const watchedAvgSqft = useWatch({ control, name: 'avg_sqft' }) || '';
  const watchedBedrooms = useWatch({ control, name: 'bedrooms' }) || '';
  const watchedBathrooms = useWatch({ control, name: 'bathrooms' }) || '';

  const askingRentNum = useMemo(() => toNumber(watchedAskingRent), [watchedAskingRent]);
  const effectiveRentNum = useMemo(() => toNumber(watchedEffectiveRent), [watchedEffectiveRent]);
  const avgSqftNum = useMemo(() => toNumber(watchedAvgSqft), [watchedAvgSqft]);
  const bedroomsNum = useMemo(() => toNumber(watchedBedrooms), [watchedBedrooms]);
  const bathroomsNum = useMemo(() => toNumber(watchedBathrooms), [watchedBathrooms]);

  const rentPerSf = useMemo(() => {
    if (askingRentNum == null || avgSqftNum == null || avgSqftNum === 0) return null;
    return askingRentNum / avgSqftNum;
  }, [askingRentNum, avgSqftNum]);

  const unitTypeLabel = useMemo(() => {
    if (bedroomsNum != null && bathroomsNum != null) {
      return `${bedroomsNum}BR / ${bathroomsNum}BA`;
    }
    return DASH;
  }, [bathroomsNum, bedroomsNum]);

  // Load existing comp for edit
  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode) {
      reset({
        property_name: '',
        address: '',
        latitude: '',
        longitude: '',
        year_built: '',
        total_units: '',
        distance_miles: '',
        unit_type: '',
        bedrooms: '',
        bathrooms: '',
        avg_sqft: '',
        asking_rent: '',
        effective_rent: '',
        concessions: '',
        data_source: 'Manual Entry',
        as_of_date: new Date().toISOString().split('T')[0],
        amenities: '',
        notes: '',
        is_active: true,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    getRentComparable(projectId, comparableId!)
      .then((comp) => {
        if (cancelled) return;
        reset({
          property_name: comp.property_name || '',
          address: comp.address || '',
          latitude: comp.latitude != null ? String(comp.latitude) : '',
          longitude: comp.longitude != null ? String(comp.longitude) : '',
          year_built: comp.year_built != null ? String(comp.year_built) : '',
          total_units: comp.total_units != null ? String(comp.total_units) : '',
          distance_miles: comp.distance_miles != null ? String(comp.distance_miles) : '',
          unit_type: comp.unit_type || '',
          bedrooms: String(comp.bedrooms ?? ''),
          bathrooms: String(comp.bathrooms ?? ''),
          avg_sqft: comp.avg_sqft != null ? String(comp.avg_sqft) : '',
          asking_rent: comp.asking_rent != null ? String(comp.asking_rent) : '',
          effective_rent: comp.effective_rent != null ? String(comp.effective_rent) : '',
          concessions: comp.concessions || '',
          data_source: comp.data_source || '',
          as_of_date: comp.as_of_date || '',
          amenities: comp.amenities || '',
          notes: comp.notes || '',
          is_active: comp.is_active ?? true,
        });
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load rent comparable:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditMode, comparableId, projectId, reset]);

  // Build API payload from form values
  const buildPayload = useCallback((values: RentCompFormValues): RentComparableForm => {
    const num = (v: string) => {
      const n = toNumber(v);
      return n ?? undefined;
    };
    return {
      property_name: values.property_name.trim(),
      address: values.address.trim() || null,
      latitude: num(values.latitude) as number | null | undefined,
      longitude: num(values.longitude) as number | null | undefined,
      year_built: num(values.year_built) as number | null | undefined,
      total_units: num(values.total_units) as number | null | undefined,
      distance_miles: num(values.distance_miles) as number | null | undefined,
      unit_type: values.unit_type.trim() || `${values.bedrooms}BR/${values.bathrooms}BA`,
      bedrooms: toNumber(values.bedrooms) ?? 0,
      bathrooms: toNumber(values.bathrooms) ?? 0,
      avg_sqft: toNumber(values.avg_sqft) ?? 0,
      asking_rent: toNumber(values.asking_rent) ?? 0,
      effective_rent: num(values.effective_rent) as number | null | undefined,
      concessions: values.concessions.trim() || null,
      amenities: values.amenities.trim() || null,
      notes: values.notes.trim() || null,
      data_source: values.data_source || null,
      as_of_date: values.as_of_date || new Date().toISOString().split('T')[0],
      is_active: values.is_active,
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = buildPayload(values);
      if (isEditMode && comparableId != null) {
        await updateRentComparable(projectId, comparableId, payload);
      } else {
        await createRentComparable(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save rent comparable:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  });

  const onDelete = useCallback(async () => {
    if (!isEditMode || comparableId == null) return;
    const confirmed = window.confirm('Delete this rent comparable? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteRentComparable(projectId, comparableId);
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to delete rent comparable:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [comparableId, isEditMode, onClose, onSaved, projectId]);

  const toggle = useCallback((section: AccordionSection) => {
    setAccordionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  if (!isOpen) return null;

  const modal = (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className={styles.modalRoot} role="dialog" aria-modal="true">
        <div className={cls('modal-dialog modal-dialog-scrollable', styles.modalDialog)}>
          <div className={styles.modalContent}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className={cls('d-flex align-items-center justify-content-between', styles.header)}>
              <div className="d-flex align-items-center gap-2">
                <h5 className={styles.headerTitle}>
                  {watchedName || (isEditMode ? 'Edit Rent Comparable' : 'New Rent Comparable')}
                </h5>
                <span className={cls('badge', styles.badgeOutline)}>Rental Comp</span>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            {/* ── KPI Strip ───────────────────────────────────────────── */}
            <div className={styles.kpiStrip}>
              <KpiItem title="Asking Rent" value={formatCurrency(askingRentNum)} />
              <KpiItem title="Effective Rent" value={formatCurrency(effectiveRentNum)} />
              <KpiItem title="Avg SF" value={formatInteger(avgSqftNum)} />
              <KpiItem title="$/SF" value={formatDecimal(rentPerSf)} />
              <KpiItem title="Unit Type" value={unitTypeLabel} />
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className={styles.body}>
              {loading ? (
                <div className={cls('py-5 text-center small', styles.mutedText)}>
                  Loading comparable detail...
                </div>
              ) : (
                <>
                  {/* ── Property Info ── */}
                  <Section title="Property Information" open={accordionOpen.property} onToggle={() => toggle('property')}>
                    <div className={styles.fieldGrid}>
                      <div>
                        <label className={styles.fieldLabel}>Property Name *</label>
                        <input
                          className={cls('form-control', styles.smallControl)}
                          {...register('property_name', { required: true })}
                          placeholder="e.g., Chadron Apartments"
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Address</label>
                        <input className={cls('form-control', styles.smallControl)} {...register('address')} />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Year Built</label>
                        <input
                          type="number"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('year_built')}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Total Units</label>
                        <input
                          type="number"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('total_units')}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Distance (mi)</label>
                        <input
                          type="number"
                          step="0.01"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('distance_miles')}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Latitude</label>
                        <input
                          type="number"
                          step="0.0000001"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('latitude')}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Longitude</label>
                        <input
                          type="number"
                          step="0.0000001"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('longitude')}
                        />
                      </div>
                    </div>
                  </Section>

                  {/* ── Unit Details ── */}
                  <Section
                    title="Unit Details"
                    open={accordionOpen.unit}
                    onToggle={() => toggle('unit')}
                    badge={unitTypeLabel !== DASH ? unitTypeLabel : undefined}
                  >
                    <div className={styles.fieldGrid4}>
                      <div>
                        <label className={styles.fieldLabel}>Unit Type</label>
                        <input
                          className={cls('form-control', styles.smallControl)}
                          {...register('unit_type')}
                          placeholder="e.g., 2BR/2BA"
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Bedrooms *</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('bedrooms', { required: true })}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Bathrooms *</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('bathrooms', { required: true })}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Avg SF *</label>
                        <input
                          type="number"
                          min="0"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('avg_sqft', { required: true })}
                        />
                      </div>
                    </div>
                  </Section>

                  {/* ── Rent & Financial ── */}
                  <Section title="Rent & Financial" open={accordionOpen.rent} onToggle={() => toggle('rent')}>
                    <div className={styles.fieldGrid}>
                      <div>
                        <label className={styles.fieldLabel}>Asking Rent *</label>
                        <div className={styles.inputPrefix}>
                          <span className={styles.prefix}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={cls('form-control', styles.smallControl, styles.prefixedInput, styles.valueRight)}
                            {...register('asking_rent', { required: true })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Effective Rent</label>
                        <div className={styles.inputPrefix}>
                          <span className={styles.prefix}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={cls('form-control', styles.smallControl, styles.prefixedInput, styles.valueRight)}
                            {...register('effective_rent')}
                          />
                        </div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Concessions</label>
                        <input
                          className={cls('form-control', styles.smallControl)}
                          {...register('concessions')}
                          placeholder="e.g., 1 month free on 12-month lease"
                        />
                      </div>
                    </div>
                  </Section>

                  {/* ── Source & Notes ── */}
                  <Section title="Source & Notes" open={accordionOpen.source} onToggle={() => toggle('source')}>
                    <div className={styles.fieldGrid}>
                      <div>
                        <label className={styles.fieldLabel}>Data Source</label>
                        <select className={cls('form-select', styles.smallControl)} {...register('data_source')}>
                          {DATA_SOURCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt || '— Select —'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>As-of Date *</label>
                        <input
                          type="date"
                          className={cls('form-control', styles.smallControl)}
                          {...register('as_of_date', { required: true })}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Amenities</label>
                        <input
                          className={cls('form-control', styles.smallControl)}
                          {...register('amenities')}
                          placeholder="e.g., Pool, Fitness, In-Unit W/D, Garage"
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Notes</label>
                        <textarea
                          className={cls('form-control', styles.notesArea)}
                          {...register('notes')}
                          rows={3}
                        />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          id="rent-comp-active"
                          className="form-check-input"
                          {...register('is_active')}
                        />
                        <label htmlFor="rent-comp-active" className={styles.fieldLabel} style={{ marginBottom: 0 }}>
                          Active
                        </label>
                      </div>
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className={cls('d-flex align-items-center justify-content-between', styles.footer)}>
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
