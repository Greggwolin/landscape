'use client';

/**
 * ExpenseCompDetailModal
 *
 * Full CRUD modal for expense comparables (operating statements).
 * Layout mirrors RentCompDetailModal: KPI strip → accordion sections → footer.
 * Sections: Property Info, Operating Expenses, Source & Notes.
 *
 * @created 2026-03-24
 */

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import { ChevronRight } from 'lucide-react';
import {
  createExpenseComparable,
  deleteExpenseComparable,
  getExpenseComparable,
  updateExpenseComparable,
  type ExpenseComparableForm,
} from '@/lib/api/expenseComps';
import styles from './ExpenseCompDetailModal.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AccordionSection = 'property' | 'expenses' | 'source';

interface ExpenseCompDetailModalProps {
  projectId: number;
  comparableId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface ExpenseCompFormValues {
  // Property
  property_name: string;
  address: string;
  total_units: string;
  total_sqft: string;
  year_built: string;
  distance_miles: string;
  latitude: string;
  longitude: string;
  // Expenses (all as strings for form handling, keyed by line item name)
  exp_real_estate_taxes: string;
  exp_property_insurance: string;
  exp_electricity: string;
  exp_water_sewer: string;
  exp_trash: string;
  exp_gas: string;
  exp_general_rm: string;
  exp_elevator: string;
  exp_janitorial: string;
  exp_pest_control: string;
  exp_landscaping: string;
  exp_management_fee: string;
  exp_payroll: string;
  exp_marketing: string;
  // Source
  data_source: string;
  as_of_date: string;
  notes: string;
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: { category: string; items: { label: string; formKey: keyof ExpenseCompFormValues; dbKey: string }[] }[] = [
  {
    category: 'Taxes & Insurance',
    items: [
      { label: 'Real Estate Taxes', formKey: 'exp_real_estate_taxes', dbKey: 'Real Estate Taxes' },
      { label: 'Property Insurance', formKey: 'exp_property_insurance', dbKey: 'Property Insurance' },
    ],
  },
  {
    category: 'Utilities',
    items: [
      { label: 'Electricity', formKey: 'exp_electricity', dbKey: 'Electricity' },
      { label: 'Water/Sewer', formKey: 'exp_water_sewer', dbKey: 'Water/Sewer' },
      { label: 'Trash', formKey: 'exp_trash', dbKey: 'Trash' },
      { label: 'Gas', formKey: 'exp_gas', dbKey: 'Gas' },
    ],
  },
  {
    category: 'Repairs & Maintenance',
    items: [
      { label: 'General R&M', formKey: 'exp_general_rm', dbKey: 'General R&M' },
      { label: 'Elevator', formKey: 'exp_elevator', dbKey: 'Elevator' },
      { label: 'Janitorial', formKey: 'exp_janitorial', dbKey: 'Janitorial' },
      { label: 'Pest Control', formKey: 'exp_pest_control', dbKey: 'Pest Control' },
      { label: 'Landscaping', formKey: 'exp_landscaping', dbKey: 'Landscaping' },
    ],
  },
  {
    category: 'Administrative',
    items: [
      { label: 'Management Fee', formKey: 'exp_management_fee', dbKey: 'Management Fee' },
      { label: 'Payroll', formKey: 'exp_payroll', dbKey: 'Payroll' },
      { label: 'Marketing', formKey: 'exp_marketing', dbKey: 'Marketing' },
    ],
  },
];

const ALL_EXPENSE_KEYS: { formKey: keyof ExpenseCompFormValues; dbKey: string }[] =
  EXPENSE_CATEGORIES.flatMap((c) => c.items.map((i) => ({ formKey: i.formKey, dbKey: i.dbKey })));

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

const DASH = '–';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function formatInteger(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val === 0) return DASH;
  return val.toLocaleString();
}

function formatDecimal(val: number | null | undefined, digits = 2): string {
  if (val == null || !Number.isFinite(val) || val === 0) return DASH;
  return `$${val.toFixed(digits)}`;
}

function cls(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const DEFAULT_VALUES: ExpenseCompFormValues = {
  property_name: '',
  address: '',
  total_units: '',
  total_sqft: '',
  year_built: '',
  distance_miles: '',
  latitude: '',
  longitude: '',
  exp_real_estate_taxes: '',
  exp_property_insurance: '',
  exp_electricity: '',
  exp_water_sewer: '',
  exp_trash: '',
  exp_gas: '',
  exp_general_rm: '',
  exp_elevator: '',
  exp_janitorial: '',
  exp_pest_control: '',
  exp_landscaping: '',
  exp_management_fee: '',
  exp_payroll: '',
  exp_marketing: '',
  data_source: 'Manual Entry',
  as_of_date: new Date().toISOString().split('T')[0],
  notes: '',
  is_active: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiItem({ title, value }: { title: string; value: string }) {
  return (
    <div className={styles.kpiItem}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={styles.kpiValue}>{value}</div>
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

export function ExpenseCompDetailModal({
  projectId,
  comparableId,
  isOpen,
  onClose,
  onSaved,
}: ExpenseCompDetailModalProps) {
  const isEditMode = comparableId != null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionSection, boolean>>({
    property: true,
    expenses: true,
    source: false,
  });

  const { control, register, reset, handleSubmit } = useForm<ExpenseCompFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  // Watch values for KPI strip
  const watchedName = useWatch({ control, name: 'property_name' }) || '';
  const watchedUnits = useWatch({ control, name: 'total_units' }) || '';
  const watchedSqft = useWatch({ control, name: 'total_sqft' }) || '';
  const watchedYearBuilt = useWatch({ control, name: 'year_built' }) || '';

  // Watch all expense fields for live total
  const expenseWatches: Record<string, string> = {};
  for (const { formKey } of ALL_EXPENSE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    expenseWatches[formKey] = String(useWatch({ control, name: formKey }) ?? '');
  }

  const unitsNum = useMemo(() => toNumber(watchedUnits), [watchedUnits]);
  const sqftNum = useMemo(() => toNumber(watchedSqft), [watchedSqft]);
  const yearBuiltNum = useMemo(() => toNumber(watchedYearBuilt), [watchedYearBuilt]);

  const totalOpex = useMemo(() => {
    let sum = 0;
    for (const { formKey } of ALL_EXPENSE_KEYS) {
      const n = toNumber(expenseWatches[formKey]);
      if (n != null) sum += n;
    }
    return sum > 0 ? sum : null;
  }, [expenseWatches]);

  const opexPerUnit = useMemo(() => {
    if (totalOpex == null || unitsNum == null || unitsNum === 0) return null;
    return totalOpex / unitsNum;
  }, [totalOpex, unitsNum]);

  const opexPerSf = useMemo(() => {
    if (totalOpex == null || sqftNum == null || sqftNum === 0) return null;
    return totalOpex / sqftNum;
  }, [totalOpex, sqftNum]);

  // Load existing comp for edit
  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode) {
      reset(DEFAULT_VALUES);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getExpenseComparable(projectId, comparableId!)
      .then((comp) => {
        if (cancelled) return;
        // Initialize all expense fields to empty
        const expenseDefaults = Object.fromEntries(
          ALL_EXPENSE_KEYS.map(({ formKey }) => [formKey, ''])
        ) as Pick<ExpenseCompFormValues,
          'exp_real_estate_taxes' | 'exp_property_insurance' | 'exp_electricity' |
          'exp_water_sewer' | 'exp_trash' | 'exp_gas' | 'exp_general_rm' |
          'exp_elevator' | 'exp_janitorial' | 'exp_pest_control' | 'exp_landscaping' |
          'exp_management_fee' | 'exp_payroll' | 'exp_marketing'
        >;

        // Populate expense fields from JSONB
        const expenses = comp.expenses || {};
        for (const { formKey, dbKey } of ALL_EXPENSE_KEYS) {
          const val = expenses[dbKey];
          if (val != null) {
            (expenseDefaults as Record<string, string>)[formKey] = String(val);
          }
        }

        const formValues: ExpenseCompFormValues = {
          property_name: comp.property_name || '',
          address: comp.address || '',
          total_units: comp.total_units != null ? String(comp.total_units) : '',
          total_sqft: comp.total_sqft != null ? String(comp.total_sqft) : '',
          year_built: comp.year_built != null ? String(comp.year_built) : '',
          distance_miles: comp.distance_miles != null ? String(comp.distance_miles) : '',
          latitude: comp.latitude != null ? String(comp.latitude) : '',
          longitude: comp.longitude != null ? String(comp.longitude) : '',
          data_source: comp.data_source || '',
          as_of_date: comp.as_of_date || '',
          notes: comp.notes || '',
          is_active: comp.is_active ?? true,
          ...expenseDefaults,
        };
        reset(formValues);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load expense comparable:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditMode, comparableId, projectId, reset]);

  // Build API payload from form values
  const buildPayload = useCallback((values: ExpenseCompFormValues): ExpenseComparableForm => {
    const num = (v: string) => {
      const n = toNumber(v);
      return n ?? undefined;
    };

    // Build expenses JSONB
    const expenses: Record<string, number | null> = {};
    for (const { formKey, dbKey } of ALL_EXPENSE_KEYS) {
      const n = toNumber(values[formKey] as string);
      if (n != null) {
        expenses[dbKey] = n;
      }
    }

    return {
      property_name: values.property_name.trim(),
      address: values.address.trim() || null,
      total_units: num(values.total_units) as number | null | undefined,
      total_sqft: num(values.total_sqft) as number | null | undefined,
      year_built: num(values.year_built) as number | null | undefined,
      distance_miles: num(values.distance_miles) as number | null | undefined,
      latitude: num(values.latitude) as number | null | undefined,
      longitude: num(values.longitude) as number | null | undefined,
      expenses,
      data_source: values.data_source || null,
      as_of_date: values.as_of_date || null,
      notes: values.notes.trim() || null,
      is_active: values.is_active,
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = buildPayload(values);
      if (isEditMode && comparableId != null) {
        await updateExpenseComparable(projectId, comparableId, payload);
      } else {
        await createExpenseComparable(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save expense comparable:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  });

  const onDelete = useCallback(async () => {
    if (!isEditMode || comparableId == null) return;
    const confirmed = window.confirm('Delete this expense comparable? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteExpenseComparable(projectId, comparableId);
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to delete expense comparable:', error);
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
                  {watchedName || (isEditMode ? 'Edit Expense Comparable' : 'New Expense Comparable')}
                </h5>
                <span className={cls('badge', styles.badgeOutline)}>Expense Comp</span>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            {/* ── KPI Strip ───────────────────────────────────────────── */}
            <div className={styles.kpiStrip}>
              <KpiItem title="Total OpEx" value={formatCurrency(totalOpex)} />
              <KpiItem title="$/Unit" value={formatCurrency(opexPerUnit)} />
              <KpiItem title="$/SF" value={formatDecimal(opexPerSf)} />
              <KpiItem title="Units" value={formatInteger(unitsNum)} />
              <KpiItem title="Year Built" value={yearBuiltNum != null ? String(yearBuiltNum) : DASH} />
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
                          placeholder="e.g., Chadron Terrace"
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Address</label>
                        <input className={cls('form-control', styles.smallControl)} {...register('address')} />
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
                        <label className={styles.fieldLabel}>Total SF</label>
                        <input
                          type="number"
                          className={cls('form-control', styles.smallControl, styles.valueRight)}
                          {...register('total_sqft')}
                        />
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

                  {/* ── Operating Expenses ── */}
                  <Section
                    title="Operating Expenses"
                    open={accordionOpen.expenses}
                    onToggle={() => toggle('expenses')}
                    badge={totalOpex != null ? formatCurrency(totalOpex) : undefined}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <div key={cat.category}>
                          <div className={styles.categoryLabel}>{cat.category}</div>
                          <div className={styles.fieldGrid}>
                            {cat.items.map((item) => (
                              <div key={item.formKey}>
                                <label className={styles.fieldLabel}>{item.label}</label>
                                <div className={styles.inputPrefix}>
                                  <span className={styles.prefix}>$</span>
                                  <input
                                    type="number"
                                    step="1"
                                    className={cls('form-control', styles.smallControl, styles.valueRight, styles.prefixedInput)}
                                    {...register(item.formKey)}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
                        <label className={styles.fieldLabel}>As-of Date</label>
                        <input type="date" className={cls('form-control', styles.smallControl)} {...register('as_of_date')} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.fieldLabel}>Notes</label>
                        <textarea className={cls('form-control', styles.notesArea)} rows={3} {...register('notes')} />
                      </div>
                      <div>
                        <label className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                          <input type="checkbox" {...register('is_active')} style={{ width: 14, height: 14 }} />
                          <span className={styles.fieldLabel} style={{ margin: 0, textTransform: 'none' }}>
                            Active comparable
                          </span>
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
                  <button
                    type="button"
                    className="btn btn-ghost-danger btn-sm"
                    onClick={onDelete}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-ghost-secondary btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onSubmit}
                  disabled={saving}
                  style={{ minWidth: '6rem' }}
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

  return createPortal(modal, document.body);
}

export default ExpenseCompDetailModal;
