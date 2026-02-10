'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import type { Loan } from '@/types/assumptions';
import {
  useAcquisitionPriceSummary,
  useCalculateInterestReserve,
  useCreateLoan,
  useDeleteLoan,
  useUpdateLoan,
  type InterestReserveRecommendation,
} from '@/hooks/useCapitalization';
import LoanScheduleGrid from '@/components/capitalization/LoanScheduleGrid';
import LoanBudgetModal from '@/components/capitalization/LoanBudgetModal';
import { useToast } from '@/components/ui/toast';

type PeriodView = 'monthly' | 'quarterly' | 'annual';
type NumericFormat = 'currency' | 'percent' | 'integer' | 'decimal';
type GoverningConstraint = 'LTV' | 'LTC' | 'MANUAL';

interface LoanSizingPreview {
  sizingMethod: 'MANUAL' | 'LTV' | 'LTC' | 'MIN_LTV_LTC';
  governingConstraint: GoverningConstraint;
  valueBasis: number;
  costBasis: number;
  ltvAmount: number | null;
  ltcAmount: number | null;
  commitment: number;
  netProceeds: number;
}

interface LoanCardProps {
  loan: Loan | null;
  projectId: string;
  onSave: () => void;
  onDelete: () => void;
  onCancel?: () => void;
  defaultExpanded?: boolean;
}

const defaultLoan: Partial<Loan> = {
  loan_name: '',
  lender_name: '',
  facility_structure: 'TERM',
  loan_type: 'CONSTRUCTION',
  commitment_amount: null,
  loan_to_value_pct: null,
  loan_to_cost_pct: null,
  interest_type: 'Fixed',
  interest_index: 'SOFR',
  interest_spread_bps: null,
  interest_rate_pct: null,
  loan_term_months: null,
  amortization_months: null,
  interest_only_months: null,
  payment_frequency: 'MONTHLY',
  loan_start_date: null,
  origination_fee_pct: null,
  exit_fee_pct: null,
  unused_fee_pct: null,
  interest_reserve_amount: 0,
  interest_reserve_inflator: null,
  repayment_acceleration: null,
  draw_trigger_type: 'COST_INCURRED',
  collateral_basis_type: 'PROJECT_COST',
  closing_costs_appraisal: null,
  closing_costs_legal: null,
  closing_costs_other: null,
  recourse_type: 'FULL',
  notes: '',
};

const normalizeLoan = (loan?: Loan | null): Partial<Loan> => {
  if (!loan) return { ...defaultLoan };

  return {
    ...defaultLoan,
    ...loan,
    facility_structure: loan.facility_structure || loan.structure_type || 'TERM',
    loan_start_date: loan.loan_start_date ? loan.loan_start_date.split('T')[0] : loan.loan_start_date,
  };
};

const editableLoanFields: (keyof Loan)[] = [
  'loan_name',
  'loan_type',
  'structure_type',
  'lender_name',
  'seniority',
  'status',
  'commitment_amount',
  'loan_amount',
  'loan_to_cost_pct',
  'loan_to_value_pct',
  'interest_rate_pct',
  'interest_type',
  'interest_index',
  'interest_spread_bps',
  'loan_term_months',
  'loan_term_years',
  'amortization_months',
  'amortization_years',
  'interest_only_months',
  'payment_frequency',
  'loan_start_date',
  'loan_maturity_date',
  'origination_fee_pct',
  'exit_fee_pct',
  'unused_fee_pct',
  'interest_reserve_amount',
  'interest_reserve_inflator',
  'repayment_acceleration',
  'draw_trigger_type',
  'collateral_basis_type',
  'closing_costs_appraisal',
  'closing_costs_legal',
  'closing_costs_other',
  'recourse_type',
  'notes',
];

const normalizeErrors = (payload: unknown): Record<string, string> => {
  if (!payload || typeof payload !== 'object') return {};
  const raw = (payload as Record<string, unknown>).errors || payload;
  if (!raw || typeof raw !== 'object') return {};

  return Object.entries(raw as Record<string, unknown>).reduce((acc, [field, value]) => {
    if (Array.isArray(value)) {
      acc[field] = value.filter(Boolean).join(' ');
    } else if (typeof value === 'string') {
      acc[field] = value;
    }
    return acc;
  }, {} as Record<string, string>);
};

const parseErrorResponse = async (error: unknown): Promise<Record<string, string>> => {
  if (error instanceof Response) {
    const data = await error.json().catch(() => null);
    return normalizeErrors(data);
  }
  return {};
};

const coerceNumeric = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,%\s,]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatCurrency = (value: unknown): string => {
  const numericValue = coerceNumeric(value);
  if (numericValue == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatPercent = (value: unknown, decimals = 3): string => {
  const numericValue = coerceNumeric(value);
  if (numericValue == null) return '0.000%';
  return `${numericValue.toFixed(decimals)}%`;
};

const addMonths = (dateStr: string | null | undefined, months: number): Date | null => {
  if (!dateStr || !months) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const targetMonth = date.getMonth() + months;
  const result = new Date(date);
  result.setMonth(targetMonth);
  return result;
};

const formatMonthYear = (date: Date | null): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatTerm = (months: number | null | undefined): string => {
  if (!months) return '—';
  if (months % 12 === 0) return `${months / 12}yr Term`;
  return `${months}mo Term`;
};

const getFacilityStructure = (loan: Partial<Loan>): string => {
  return loan.facility_structure || loan.structure_type || 'TERM';
};

const calculateLoanSizingPreview = (
  loanData: Partial<Loan>,
  askingPrice: number
): LoanSizingPreview => {
  const ltvPct = coerceNumeric(loanData.loan_to_value_pct);
  const ltcPct = coerceNumeric(loanData.loan_to_cost_pct);
  const hasLtv = ltvPct != null;
  const hasLtc = ltcPct != null;

  const valueBasis = Math.max(askingPrice, 0);
  const closingCostsTotal =
    (coerceNumeric(loanData.closing_costs_appraisal) || 0) +
    (coerceNumeric(loanData.closing_costs_legal) || 0) +
    (coerceNumeric(loanData.closing_costs_other) || 0);
  // TODO: include capex budget in LTC cost basis when budget source is wired.
  const costBasis = valueBasis + closingCostsTotal;

  const ltvAmount = hasLtv ? (ltvPct / 100) * valueBasis : null;
  const ltcAmount = hasLtc ? (ltcPct / 100) * costBasis : null;

  let commitment = coerceNumeric(loanData.commitment_amount) ?? coerceNumeric(loanData.loan_amount) ?? 0;
  let governingConstraint: GoverningConstraint = 'MANUAL';
  let sizingMethod: LoanSizingPreview['sizingMethod'] = 'MANUAL';

  if (ltvAmount != null && ltcAmount != null) {
    commitment = Math.min(ltvAmount, ltcAmount);
    governingConstraint = ltvAmount <= ltcAmount ? 'LTV' : 'LTC';
    sizingMethod = 'MIN_LTV_LTC';
  } else if (ltvAmount != null) {
    commitment = ltvAmount;
    governingConstraint = 'LTV';
    sizingMethod = 'LTV';
  } else if (ltcAmount != null) {
    commitment = ltcAmount;
    governingConstraint = 'LTC';
    sizingMethod = 'LTC';
  }

  const originationFeePct = coerceNumeric(loanData.origination_fee_pct) || 0;
  const interestReserveAmount = coerceNumeric(loanData.interest_reserve_amount) || 0;
  const holdbacks =
    (commitment * originationFeePct) / 100 +
    interestReserveAmount +
    closingCostsTotal;

  return {
    sizingMethod,
    governingConstraint,
    valueBasis,
    costBasis,
    ltvAmount,
    ltcAmount,
    commitment,
    netProceeds: commitment - holdbacks,
  };
};

const AssumptionRow = ({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`loan-assumption-row ${className || ''}`}>
    <label>{label}</label>
    <div className="loan-assumption-input-wrap">
      {children}
      {error && <div className="text-danger" style={{ fontSize: '0.6875rem' }}>{error}</div>}
    </div>
  </div>
);

const toNumericValue = (value: unknown): number | null => coerceNumeric(value);

const formatNumericValue = (
  value: unknown,
  format: NumericFormat,
  decimals = 2
): string => {
  const numericValue = toNumericValue(value);
  if (numericValue == null) return '';

  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  if (format === 'percent') {
    return `${numericValue.toFixed(decimals)}%`;
  }

  if (format === 'integer') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.trunc(numericValue));
  }

  return numericValue.toFixed(decimals);
};

const NumberDisplayInput = ({
  value,
  onChange,
  format,
  decimals = 2,
  disabled = false,
}: {
  value: number | string | null | undefined;
  onChange: (value: number | null) => void;
  format: NumericFormat;
  decimals?: number;
  disabled?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const displayValue = focused ? draft : formatNumericValue(value, format, decimals);

  return (
    <input
      type="text"
      inputMode={format === 'integer' ? 'numeric' : 'decimal'}
      value={displayValue}
      disabled={disabled}
      onFocus={() => {
        setFocused(true);
        const numericValue = toNumericValue(value);
        setDraft(numericValue == null ? '' : String(numericValue));
      }}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);

        const cleaned = raw.replace(/[$,%\s,]/g, '');
        if (cleaned === '') {
          onChange(null);
          return;
        }
        if (cleaned === '-' || cleaned === '.' || cleaned === '-.') {
          return;
        }

        const parsed = Number(cleaned);
        if (!Number.isFinite(parsed)) return;

        if (format === 'integer') {
          onChange(Math.trunc(parsed));
          return;
        }
        onChange(parsed);
      }}
    />
  );
};

export default function LoanCard({
  loan,
  projectId,
  onSave,
  onDelete,
  onCancel,
  defaultExpanded = false,
}: LoanCardProps) {
  const { showToast } = useToast();
  const createLoan = useCreateLoan(projectId);
  const updateLoan = useUpdateLoan(projectId);
  const deleteLoan = useDeleteLoan(projectId);
  const { data: acquisitionSummary } = useAcquisitionPriceSummary(projectId, Boolean(projectId));

  const [isEditing, setIsEditing] = useState(defaultExpanded || false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleView, setScheduleView] = useState<PeriodView>('annual');
  const [formData, setFormData] = useState<Partial<Loan>>(normalizeLoan(loan));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [reserveRecommendation, setReserveRecommendation] = useState<InterestReserveRecommendation | null>(null);

  useEffect(() => {
    setFormData(normalizeLoan(loan));
    setErrors({});
    setIsEditing(Boolean(defaultExpanded || !loan));
    setShowSchedule(false);
    setScheduleView('annual');
    setReserveRecommendation(null);
  }, [loan, defaultExpanded]);

  const facilityStructure = getFacilityStructure(formData);
  const isRevolver = facilityStructure === 'REVOLVER';
  const isFloating = (formData.interest_type || 'Fixed') === 'Floating';
  const existingLoan = loan && loan.loan_id ? loan : null;
  const calculateReserve = useCalculateInterestReserve(projectId, existingLoan?.loan_id ?? null);
  const askingPrice = coerceNumeric(acquisitionSummary?.asking_price) || 0;
  const sizingPreview = useMemo(
    () => calculateLoanSizingPreview(formData, askingPrice),
    [formData, askingPrice]
  );
  const isAutoSized = sizingPreview.sizingMethod !== 'MANUAL';

  const cardTitle = isEditing
    ? formData.loan_name?.trim() || existingLoan?.loan_name || 'New Loan'
    : existingLoan?.loan_name || 'New Loan';

  const summaryLoan = useMemo(() => {
    if (!existingLoan) return null;
    const structure = getFacilityStructure(existingLoan);
    const maturity = addMonths(existingLoan.loan_start_date, Math.max((existingLoan.loan_term_months || 0) - 1, 0));

    return {
      structure,
      commitment: formatCurrency(existingLoan.commitment_amount),
      rate: `${formatPercent(existingLoan.interest_rate_pct)} ${existingLoan.interest_type || ''}`.trim(),
      term: formatTerm(existingLoan.loan_term_months),
      ioMonths: existingLoan.interest_only_months || 0,
      lender: existingLoan.lender_name || '—',
      maturity: formatMonthYear(maturity),
    };
  }, [existingLoan]);

  const handleTextChange = (field: keyof Loan) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const setNumberField = (field: keyof Loan, value: number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (field: keyof Loan) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };

  const buildLoanPayload = (sourceData: Partial<Loan>): Partial<Loan> => {
    const filtered: Partial<Loan> = {};
    editableLoanFields.forEach((field) => {
      const value = sourceData[field];
      if (value !== undefined) {
        (filtered as Record<string, unknown>)[field] = value;
      }
    });

    filtered.structure_type = getFacilityStructure(sourceData);
    const preview = calculateLoanSizingPreview(sourceData, askingPrice);
    if (preview.sizingMethod !== 'MANUAL') {
      filtered.commitment_amount = preview.commitment;
      filtered.loan_amount = preview.commitment;
    }

    return filtered;
  };

  const loadLoanDetails = async () => {
    if (!existingLoan?.loan_id) return;
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/loans/${existingLoan.loan_id}/`);
      if (!response.ok) throw new Error('Failed to load loan details');
      const detail = (await response.json()) as Loan;
      setFormData(normalizeLoan(detail));
    } catch {
      showToast('Failed to load full loan details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const persistLoan = async (
    sourceData: Partial<Loan>,
    successMessage: string,
    closeEditorOnSuccess = true
  ) => {
    setSaving(true);
    setErrors({});
    const payload = buildLoanPayload(sourceData);

    try {
      if (existingLoan?.loan_id) {
        await updateLoan.mutateAsync({ loanId: existingLoan.loan_id, data: payload });
        showToast(successMessage, 'success');
        if (closeEditorOnSuccess) {
          setIsEditing(false);
        }
      } else {
        await createLoan.mutateAsync(payload);
        showToast(successMessage, 'success');
      }
      onSave();
    } catch (error) {
      const fieldErrors = await parseErrorResponse(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      showToast('Failed to save loan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await persistLoan(
      formData,
      existingLoan?.loan_id ? 'Loan updated successfully' : 'Loan created successfully'
    );
  };

  const handleCancel = () => {
    setErrors({});
    if (existingLoan) {
      setFormData(normalizeLoan(existingLoan));
      setIsEditing(false);
      return;
    }
    onCancel?.();
  };

  const handleDelete = async () => {
    if (!existingLoan?.loan_id) return;
    if (!window.confirm('Are you sure you want to delete this loan?')) return;

    try {
      await deleteLoan.mutateAsync(existingLoan.loan_id);
      showToast('Loan deleted successfully', 'success');
      onDelete();
    } catch {
      showToast('Failed to delete loan', 'error');
    }
  };

  const handleReserveCalculate = async () => {
    if (!existingLoan?.loan_id) {
      showToast('Save the loan before calculating reserve', 'error');
      return;
    }
    try {
      const recommendation = await calculateReserve.mutateAsync();
      setReserveRecommendation(recommendation);
    } catch {
      showToast('Failed to calculate reserve suggestion', 'error');
    }
  };

  const handleApplyReserve = async () => {
    if (!reserveRecommendation) return;
    const nextData: Partial<Loan> = {
      ...formData,
      interest_reserve_amount: reserveRecommendation.recommended_reserve,
    };
    setFormData(nextData);
    setReserveRecommendation(null);
    await persistLoan(nextData, 'Interest reserve applied', false);
  };

  return (
    <CCard className="loan-card">
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center gap-2">
          <h6 className="mb-0">{cardTitle}</h6>
          {!isEditing && existingLoan && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-ghost-primary btn-sm"
                onClick={() => {
                  setIsEditing(true);
                  void loadLoanDetails();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleDelete}
                disabled={deleteLoan.isPending}
              >
                Delete
              </button>
            </div>
          )}

          {isEditing && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || loadingDetails}
              >
                {loadingDetails ? 'Loading...' : saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="btn btn-ghost-secondary btn-sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </CCardHeader>

      <CCardBody>
        {!isEditing && summaryLoan && (
          <div className="d-flex align-items-center gap-3 px-3 py-2 loan-summary-row" style={{ fontSize: '0.8125rem' }}>
            <span className={`badge ${summaryLoan.structure === 'TERM' ? 'bg-primary' : 'bg-success'}`}>
              {summaryLoan.structure}
            </span>
            <span>{summaryLoan.commitment}</span>
            <span>{summaryLoan.rate}</span>
            {coerceNumeric(formData.loan_to_value_pct ?? existingLoan?.loan_to_value_pct) != null && (
              <span>LTV {formatPercent(formData.loan_to_value_pct ?? existingLoan?.loan_to_value_pct, 2)}</span>
            )}
            {coerceNumeric(formData.loan_to_cost_pct ?? existingLoan?.loan_to_cost_pct) != null && (
              <span>LTC {formatPercent(formData.loan_to_cost_pct ?? existingLoan?.loan_to_cost_pct, 2)}</span>
            )}
            <span>{summaryLoan.term}</span>
            {summaryLoan.ioMonths > 0 && <span>{summaryLoan.ioMonths}mo IO</span>}
            {existingLoan?.net_loan_proceeds != null && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 loan-inline-link"
                onClick={() => setShowBudgetModal(true)}
              >
                Net Proceeds: {formatCurrency(existingLoan.net_loan_proceeds)}
              </button>
            )}
            <span className="text-muted">{summaryLoan.lender}</span>
            <span className="ms-auto text-muted">Maturity: {summaryLoan.maturity}</span>
          </div>
        )}

        {isEditing && (
          <div className="loan-assumptions-grid">
            <div className="loan-assumptions-column">
              <div className="loan-assumption-section">
                <div className="loan-assumption-header">Loan Sizing</div>
                <div className="loan-assumption-body">
                  <AssumptionRow label="LTV %" error={errors.loan_to_value_pct} className="input-narrow">
                    <NumberDisplayInput
                      format="percent"
                      decimals={2}
                      value={formData.loan_to_value_pct}
                      onChange={(value) => setNumberField('loan_to_value_pct', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="LTC %" error={errors.loan_to_cost_pct} className="input-narrow">
                    <NumberDisplayInput
                      format="percent"
                      decimals={2}
                      value={formData.loan_to_cost_pct}
                      onChange={(value) => setNumberField('loan_to_cost_pct', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Value Basis" className="input-currency">
                    <input type="text" value={formatCurrency(sizingPreview.valueBasis)} readOnly disabled />
                  </AssumptionRow>
                  <AssumptionRow label="Cost Basis" className="input-currency">
                    <input type="text" value={formatCurrency(sizingPreview.costBasis)} readOnly disabled />
                  </AssumptionRow>
                  <AssumptionRow label="LTV Amount" className="input-currency">
                    <input
                      type="text"
                      value={sizingPreview.ltvAmount == null ? '—' : formatCurrency(sizingPreview.ltvAmount)}
                      readOnly
                      disabled
                    />
                  </AssumptionRow>
                  <AssumptionRow label="LTC Amount" className="input-currency">
                    <input
                      type="text"
                      value={sizingPreview.ltcAmount == null ? '—' : formatCurrency(sizingPreview.ltcAmount)}
                      readOnly
                      disabled
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Governing" className="input-medium">
                    <input type="text" value={sizingPreview.governingConstraint} readOnly disabled />
                  </AssumptionRow>
                  <AssumptionRow label="Commitment" error={errors.commitment_amount} className="input-currency">
                    <NumberDisplayInput
                      format="currency"
                      value={isAutoSized ? sizingPreview.commitment : formData.commitment_amount}
                      onChange={(value) => setNumberField('commitment_amount', value)}
                      disabled={isAutoSized}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Net Proceeds" className="input-currency">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 loan-inline-link"
                      onClick={() => existingLoan?.loan_id && setShowBudgetModal(true)}
                      disabled={!existingLoan?.loan_id}
                    >
                      {formatCurrency(sizingPreview.netProceeds)}
                    </button>
                  </AssumptionRow>
                </div>
              </div>

              <div className="loan-assumption-section">
                <div className="loan-assumption-header">General</div>
                <div className="loan-assumption-body">
                  <AssumptionRow label="Loan Name" error={errors.loan_name} className="input-name">
                    <input type="text" value={formData.loan_name || ''} onChange={handleTextChange('loan_name')} />
                  </AssumptionRow>
                  <AssumptionRow label="Lender" error={errors.lender_name} className="input-name">
                    <input type="text" value={formData.lender_name || ''} onChange={handleTextChange('lender_name')} />
                  </AssumptionRow>
                  <AssumptionRow label="Structure" error={errors.facility_structure} className="input-structure">
                    <select value={facilityStructure} onChange={handleSelectChange('facility_structure')}>
                      <option value="TERM">TERM</option>
                      <option value="REVOLVER">REVOLVER</option>
                    </select>
                  </AssumptionRow>
                  <AssumptionRow label="Type" error={errors.loan_type} className="input-type">
                    <select value={formData.loan_type || 'CONSTRUCTION'} onChange={handleSelectChange('loan_type')}>
                      <option value="CONSTRUCTION">Construction</option>
                      <option value="PERMANENT">Permanent</option>
                      <option value="BRIDGE">Bridge</option>
                      <option value="MEZZANINE">Mezzanine</option>
                    </select>
                  </AssumptionRow>
                </div>
              </div>
            </div>

            <div className="loan-assumptions-column">
              <div className="loan-assumption-section">
                <div className="loan-assumption-header">Interest Rate</div>
                <div className="loan-assumption-body">
                  <AssumptionRow label="Type" error={errors.interest_type} className="input-rate-type">
                    <select value={formData.interest_type || 'Fixed'} onChange={handleSelectChange('interest_type')}>
                      <option value="Fixed">Fixed</option>
                      <option value="Floating">Floating</option>
                    </select>
                  </AssumptionRow>
                  <AssumptionRow label="Index" error={errors.interest_index} className="input-rate-type">
                    <select
                      value={formData.interest_index || 'SOFR'}
                      onChange={handleSelectChange('interest_index')}
                      disabled={!isFloating}
                    >
                      <option value="SOFR">SOFR</option>
                      <option value="PRIME">Prime</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </AssumptionRow>
                  <AssumptionRow label="Spread (bps)" error={errors.interest_spread_bps} className="input-narrow">
                    <NumberDisplayInput
                      format="integer"
                      value={formData.interest_spread_bps}
                      onChange={(value) => setNumberField('interest_spread_bps', value)}
                      disabled={!isFloating}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="All-In Rate %" error={errors.interest_rate_pct} className="input-narrow">
                    <NumberDisplayInput
                      format="percent"
                      decimals={3}
                      value={formData.interest_rate_pct}
                      onChange={(value) => setNumberField('interest_rate_pct', value)}
                    />
                  </AssumptionRow>
                  <div className="loan-interest-note">
                    {isFloating
                      ? `All-In = ${(formData.interest_index || 'Index').toUpperCase()} + ${(((coerceNumeric(formData.interest_spread_bps) || 0) / 100)).toFixed(3)}%`
                      : 'All-In is the stated fixed coupon rate.'}
                  </div>
                </div>
              </div>

              <div className="loan-assumption-section">
                <div className="loan-assumption-header">Term &amp; Amortization</div>
                <div className="loan-assumption-body">
                  <AssumptionRow label="Term (mo)" error={errors.loan_term_months} className="input-tiny">
                    <NumberDisplayInput
                      format="integer"
                      value={formData.loan_term_months}
                      onChange={(value) => setNumberField('loan_term_months', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Amort (mo)" error={errors.amortization_months} className="input-tiny">
                    <NumberDisplayInput
                      format="integer"
                      value={formData.amortization_months}
                      onChange={(value) => setNumberField('amortization_months', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="IO (mo)" error={errors.interest_only_months} className="input-tiny">
                    <NumberDisplayInput
                      format="integer"
                      value={formData.interest_only_months}
                      onChange={(value) => setNumberField('interest_only_months', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Frequency" error={errors.payment_frequency} className="input-frequency">
                    <select value={formData.payment_frequency || 'MONTHLY'} onChange={handleSelectChange('payment_frequency')}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="SEMI_ANNUAL">Semi-Annual</option>
                      <option value="ANNUAL">Annual</option>
                      <option value="AT_MATURITY">At Maturity</option>
                    </select>
                  </AssumptionRow>
                  <AssumptionRow label="Start Date" error={errors.loan_start_date} className="input-date">
                    <input type="date" value={formData.loan_start_date || ''} onChange={handleTextChange('loan_start_date')} />
                  </AssumptionRow>
                </div>
              </div>
            </div>

            <div className="loan-assumptions-column">
              <div className="loan-assumption-section">
                <div className="loan-assumption-header">Fees &amp; Costs</div>
                <div className="loan-assumption-body">
                  <AssumptionRow label="Orig Fee %" error={errors.origination_fee_pct} className="input-fee">
                    <NumberDisplayInput
                      format="percent"
                      decimals={2}
                      value={formData.origination_fee_pct}
                      onChange={(value) => setNumberField('origination_fee_pct', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Exit Fee %" error={errors.exit_fee_pct} className="input-fee">
                    <NumberDisplayInput
                      format="percent"
                      decimals={2}
                      value={formData.exit_fee_pct}
                      onChange={(value) => setNumberField('exit_fee_pct', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Unused %" error={errors.unused_fee_pct} className="input-fee">
                    <NumberDisplayInput
                      format="percent"
                      decimals={2}
                      value={formData.unused_fee_pct}
                      onChange={(value) => setNumberField('unused_fee_pct', value)}
                    />
                  </AssumptionRow>
                  <AssumptionRow label="Interest Reserve" error={errors.interest_reserve_amount} className="input-currency">
                    <div className="d-flex align-items-center gap-2">
                      <NumberDisplayInput
                        format="currency"
                        value={formData.interest_reserve_amount}
                        onChange={(value) => setNumberField('interest_reserve_amount', value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost-primary btn-sm"
                        onClick={handleReserveCalculate}
                        disabled={!existingLoan?.loan_id || calculateReserve.isPending}
                        title="Calculate recommended interest reserve"
                      >
                        {calculateReserve.isPending ? '...' : '🪄'}
                      </button>
                    </div>
                  </AssumptionRow>
                  {reserveRecommendation && (
                    <div className="loan-inline-suggestion">
                      Suggested: {formatCurrency(reserveRecommendation.recommended_reserve)} ({reserveRecommendation.calculation_basis.method})
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2 loan-inline-link"
                        onClick={() => void handleApplyReserve()}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2 loan-inline-link"
                        onClick={() => setReserveRecommendation(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="loan-assumption-section">
                <div className="loan-assumption-header">{isRevolver ? 'Revolver Assumptions & Notes' : 'Assumptions & Notes'}</div>
                <div className="loan-assumption-body">
                  {isRevolver && (
                    <>
                      <AssumptionRow label="Reserve Inflator" error={errors.interest_reserve_inflator} className="input-narrow">
                        <NumberDisplayInput
                          format="decimal"
                          decimals={2}
                          value={formData.interest_reserve_inflator}
                          onChange={(value) => setNumberField('interest_reserve_inflator', value)}
                        />
                      </AssumptionRow>
                      <AssumptionRow label="Repayment Accel" error={errors.repayment_acceleration} className="input-narrow">
                        <NumberDisplayInput
                          format="decimal"
                          decimals={2}
                          value={formData.repayment_acceleration}
                          onChange={(value) => setNumberField('repayment_acceleration', value)}
                        />
                      </AssumptionRow>
                      <AssumptionRow label="Draw Trigger" error={errors.draw_trigger_type} className="input-medium">
                        <select value={formData.draw_trigger_type || 'COST_INCURRED'} onChange={handleSelectChange('draw_trigger_type')}>
                          <option value="COST_INCURRED">Cost Incurred</option>
                          <option value="MANUAL">Manual</option>
                        </select>
                      </AssumptionRow>
                      <AssumptionRow label="Collateral Basis" error={errors.collateral_basis_type} className="input-medium">
                        <select value={formData.collateral_basis_type || 'PROJECT_COST'} onChange={handleSelectChange('collateral_basis_type')}>
                          <option value="PROJECT_COST">Project Cost</option>
                          <option value="RESIDUAL_LAND_VALUE">Residual Land Value</option>
                        </select>
                      </AssumptionRow>
                      <AssumptionRow label="Appraisal" error={errors.closing_costs_appraisal} className="input-currency">
                        <NumberDisplayInput
                          format="currency"
                          value={formData.closing_costs_appraisal}
                          onChange={(value) => setNumberField('closing_costs_appraisal', value)}
                        />
                      </AssumptionRow>
                      <AssumptionRow label="Legal" error={errors.closing_costs_legal} className="input-currency">
                        <NumberDisplayInput
                          format="currency"
                          value={formData.closing_costs_legal}
                          onChange={(value) => setNumberField('closing_costs_legal', value)}
                        />
                      </AssumptionRow>
                      <AssumptionRow label="Other" error={errors.closing_costs_other} className="input-currency">
                        <NumberDisplayInput
                          format="currency"
                          value={formData.closing_costs_other}
                          onChange={(value) => setNumberField('closing_costs_other', value)}
                        />
                      </AssumptionRow>
                    </>
                  )}

                  <AssumptionRow label="Recourse" error={errors.recourse_type} className="input-recourse">
                    <select value={formData.recourse_type || 'FULL'} onChange={handleSelectChange('recourse_type')}>
                      <option value="FULL">Full</option>
                      <option value="NON_RECOURSE">Non-Recourse</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </AssumptionRow>
                  <AssumptionRow label="Notes" error={errors.notes} className="input-notes">
                    <textarea rows={3} value={formData.notes || ''} onChange={handleTextChange('notes')} />
                  </AssumptionRow>
                </div>
              </div>
            </div>
          </div>
        )}

        {existingLoan && (
          <>
            <div
              className="d-flex align-items-center gap-2 px-3 py-2 loan-schedule-toggle"
              onClick={() => setShowSchedule((prev) => !prev)}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {showSchedule ? '▼ Hide Loan Schedule' : '▶ Show Loan Schedule'}
              </span>
              {showSchedule && (
                <div className="ms-auto d-flex gap-1" onClick={(event) => event.stopPropagation()}>
                  {(['monthly', 'quarterly', 'annual'] as PeriodView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      className={`btn btn-sm ${scheduleView === view ? 'btn-primary' : 'btn-ghost-secondary'}`}
                      onClick={() => setScheduleView(view)}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showSchedule && (
              <div className="px-3 pb-3">
                <LoanScheduleGrid
                  projectId={projectId}
                  loans={[existingLoan]}
                  hideControls
                  selectedLoanId={existingLoan.loan_id}
                  periodView={scheduleView}
                />
              </div>
            )}
          </>
        )}
      </CCardBody>

      {existingLoan?.loan_id && (
        <LoanBudgetModal
          projectId={projectId}
          loanId={existingLoan.loan_id}
          loanName={existingLoan.loan_name || undefined}
          visible={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
        />
      )}

      <style jsx global>{`
        .loan-card {
          margin-bottom: 12px;
        }

        .loan-card .card-header {
          padding: 8px 12px;
        }

        .loan-card .card-body {
          padding: 0;
        }

        .loan-summary-row {
          border-top: 1px solid var(--cui-border-color);
        }

        .loan-assumptions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 12px;
          border-top: 1px solid var(--cui-border-color);
        }

        .loan-assumptions-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .loan-assumption-section {
          border: 1px solid var(--cui-border-color);
          border-radius: 6px;
          background: var(--cui-body-bg);
          overflow: hidden;
        }

        .loan-assumption-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--cui-body-color);
          border-bottom: 1px solid var(--cui-border-color);
          padding: 8px 12px;
          background: var(--cui-tertiary-bg);
        }

        .loan-assumption-body {
          display: flex;
          flex-direction: column;
        }

        .loan-interest-note {
          font-size: 0.6875rem;
          color: var(--cui-secondary-color);
          padding: 6px 16px 8px 20px;
          border-top: 1px solid var(--cui-border-color-translucent);
          background: rgba(var(--cui-primary-rgb), 0.03);
        }

        .loan-assumption-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 12px 8px 16px;
          border-bottom: 1px solid var(--cui-border-color-translucent);
        }

        .loan-assumption-row:last-child {
          border-bottom: 0;
        }

        .loan-assumption-row label {
          font-size: 0.75rem;
          color: var(--cui-secondary-color);
          font-weight: 600;
          padding-left: 4px;
        }

        .loan-assumption-input-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .loan-assumption-row input,
        .loan-assumption-row select,
        .loan-assumption-row textarea {
          background: var(--cui-body-bg);
          border: 1px solid var(--cui-border-color);
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 0.8125rem;
          color: var(--cui-body-color);
          height: 28px;
          width: 100%;
          text-align: left;
        }

        .loan-assumption-row input:disabled {
          opacity: 0.9;
          color: var(--cui-body-color);
          background: var(--cui-tertiary-bg);
        }

        .loan-assumption-row textarea {
          height: auto;
          min-height: 72px;
          resize: vertical;
          text-align: left;
        }

        .loan-assumption-row input:focus,
        .loan-assumption-row select:focus,
        .loan-assumption-row textarea:focus {
          border-color: var(--cui-primary);
          outline: none;
          box-shadow: 0 0 0 2px rgba(var(--cui-primary-rgb), 0.25);
        }

        .loan-assumption-row.input-tiny input,
        .loan-assumption-row.input-tiny select {
          width: 60px;
          text-align: right;
        }

        .loan-assumption-row.input-narrow input,
        .loan-assumption-row.input-narrow select {
          width: 70px;
          text-align: right;
        }

        .loan-assumption-row.input-medium input,
        .loan-assumption-row.input-medium select {
          width: 130px;
        }

        .loan-assumption-row.input-wide input,
        .loan-assumption-row.input-wide select {
          width: 200px;
        }

        .loan-assumption-row.input-name input,
        .loan-assumption-row.input-name select {
          width: 180px;
        }

        .loan-assumption-row.input-structure input,
        .loan-assumption-row.input-structure select {
          width: 120px;
        }

        .loan-assumption-row.input-type input,
        .loan-assumption-row.input-type select {
          width: 120px;
        }

        .loan-assumption-row.input-rate-type input,
        .loan-assumption-row.input-rate-type select {
          width: 100px;
        }

        .loan-assumption-row.input-frequency input,
        .loan-assumption-row.input-frequency select {
          width: 120px;
        }

        .loan-assumption-row.input-recourse input,
        .loan-assumption-row.input-recourse select {
          width: 120px;
        }

        .loan-assumption-row.input-currency input {
          width: 132px;
          text-align: right;
        }

        .loan-assumption-row.input-date input {
          width: 140px;
        }

        .loan-assumption-row.input-fee input {
          width: 80px;
          text-align: right;
        }

        .loan-assumption-row.input-notes textarea {
          width: min(420px, 100%);
          min-width: 300px;
        }

        .loan-assumption-row.input-notes {
          align-items: flex-start;
        }

        .loan-assumption-row.input-notes .loan-assumption-input-wrap {
          width: 100%;
          align-items: stretch;
        }

        .loan-inline-suggestion {
          font-size: 0.6875rem;
          color: var(--cui-secondary-color);
          padding: 6px 16px 8px 16px;
          border-top: 1px solid var(--cui-border-color-translucent);
          background: rgba(var(--cui-info-rgb), 0.08);
        }

        .loan-inline-link {
          color: var(--cui-primary);
          text-decoration: none;
          font-weight: 500;
          white-space: nowrap;
        }

        .loan-inline-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 1400px) {
          .loan-assumptions-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 992px) {
          .loan-assumptions-grid {
            grid-template-columns: 1fr;
          }
        }

        .loan-schedule-toggle {
          cursor: pointer;
          border-top: 1px solid var(--cui-border-color);
        }
      `}</style>
    </CCard>
  );
}
