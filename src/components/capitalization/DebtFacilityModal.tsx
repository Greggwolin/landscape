'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CCloseButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react';
import type { Loan } from '@/types/assumptions';
import { useCreateLoan, useDeleteLoan, useUpdateLoan } from '@/hooks/useCapitalization';
import { useToast } from '@/components/ui/toast';

interface LoanFormFlyoutProps {
  visible: boolean;
  loan?: Partial<Loan> | null;
  projectId: string;
  onClose: () => void;
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
  interest_reserve_inflator: null,
  repayment_acceleration: null,
  draw_trigger_type: 'COST_INCURRED',
  collateral_basis_type: 'PROJECT_COST',
  closing_costs_appraisal: null,
  closing_costs_legal: null,
  closing_costs_closing: null,
  closing_costs_other: null,
  recourse_type: 'FULL',
  notes: '',
};

const normalizeLoan = (loan?: Partial<Loan> | null): Partial<Loan> => {
  if (!loan) return { ...defaultLoan };
  return {
    ...defaultLoan,
    ...loan,
    facility_structure: loan.facility_structure || loan.structure_type || 'TERM',
    loan_start_date: loan.loan_start_date ? loan.loan_start_date.split('T')[0] : loan.loan_start_date,
  };
};

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

const FormRow = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="loan-form-row">
    <div className="loan-form-label">
      {label}
      {required ? ' *' : ''}
    </div>
    <div className="loan-form-input">
      {children}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  </div>
);

export function LoanFormFlyout({ visible, loan, projectId, onClose }: LoanFormFlyoutProps) {
  const { showToast } = useToast();
  const createLoan = useCreateLoan(projectId);
  const updateLoan = useUpdateLoan(projectId);
  const deleteLoan = useDeleteLoan(projectId);

  const [formData, setFormData] = useState<Partial<Loan>>(defaultLoan);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(loan?.loan_id);

  useEffect(() => {
    if (visible) {
      setFormData(normalizeLoan(loan));
      setErrors({});
    }
  }, [visible, loan]);

  const facilityStructure = formData.facility_structure || 'TERM';
  const isRevolver = facilityStructure === 'REVOLVER';
  const isFloating = formData.interest_type === 'Floating';

  const handleTextChange = (field: keyof Loan) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberChange = (field: keyof Loan) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value === '' ? null : Number(value) }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (field: keyof Loan) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleTextareaChange = (field: keyof Loan) => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const payload = useMemo(() => {
    const data: Partial<Loan> = {
      ...formData,
      facility_structure: formData.facility_structure || 'TERM',
      structure_type: formData.facility_structure || formData.structure_type,
    };
    return data;
  }, [formData]);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (isEditMode && formData.loan_id != null) {
        await updateLoan.mutateAsync({
          loanId: formData.loan_id,
          data: payload,
        });
      } else {
        await createLoan.mutateAsync(payload);
      }
      showToast({
        title: 'Success',
        message: isEditMode ? 'Loan updated successfully' : 'Loan created successfully',
        type: 'success',
      });
      onClose();
    } catch (error) {
      const fieldErrors = await parseErrorResponse(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      showToast({
        title: 'Error',
        message: 'Failed to save loan',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.loan_id) return;
    if (!confirm('Are you sure you want to delete this loan?')) return;

    try {
      await deleteLoan.mutateAsync(formData.loan_id);
      showToast({
        title: 'Success',
        message: 'Loan deleted successfully',
        type: 'success',
      });
      onClose();
    } catch (error) {
      showToast({
        title: 'Error',
        message: 'Failed to delete loan',
        type: 'error',
      });
    }
  };

  return (
    <COffcanvas
      placement="end"
      visible={visible}
      onHide={onClose}
      backdrop={true}
      style={{ width: '480px' }}
    >
      <COffcanvasHeader className="border-bottom">
        <COffcanvasTitle>
          {isEditMode ? `Edit: ${formData.loan_name || 'Loan'}` : 'Add Loan'}
        </COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>
      <COffcanvasBody className="loan-form-body">
        <div className="loan-form-section">
          <div className="loan-section-header">General</div>
          <FormRow label="Loan Name" required error={errors.loan_name}>
            <input
              type="text"
              className="loan-input-cell loan-input-cell-left"
              value={formData.loan_name || ''}
              onChange={handleTextChange('loan_name')}
            />
          </FormRow>
          <FormRow label="Lender" error={errors.lender_name}>
            <input
              type="text"
              className="loan-input-cell loan-input-cell-left"
              value={formData.lender_name || ''}
              onChange={handleTextChange('lender_name')}
            />
          </FormRow>
          <FormRow label="Facility Structure" required error={errors.facility_structure}>
            <select
              className="loan-input-cell loan-input-cell-left"
              value={facilityStructure}
              onChange={handleSelectChange('facility_structure')}
            >
              <option value="TERM">TERM</option>
              <option value="REVOLVER">REVOLVER</option>
            </select>
          </FormRow>
          <FormRow label="Loan Type" required error={errors.loan_type}>
            <select
              className="loan-input-cell loan-input-cell-left"
              value={formData.loan_type || 'CONSTRUCTION'}
              onChange={handleSelectChange('loan_type')}
            >
              <option value="CONSTRUCTION">Construction</option>
              <option value="PERMANENT">Permanent</option>
              <option value="BRIDGE">Bridge</option>
              <option value="MEZZANINE">Mezzanine</option>
            </select>
          </FormRow>
        </div>

        <div className="loan-form-section">
          <div className="loan-section-header">Sizing</div>
          <FormRow label="Commitment Amount" required error={errors.commitment_amount}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.commitment_amount ?? ''}
              onChange={handleNumberChange('commitment_amount')}
            />
          </FormRow>
          <FormRow label="Loan to Value %" error={errors.loan_to_value_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.loan_to_value_pct ?? ''}
              onChange={handleNumberChange('loan_to_value_pct')}
              step="0.01"
            />
          </FormRow>
          <FormRow label="Loan to Cost %" error={errors.loan_to_cost_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.loan_to_cost_pct ?? ''}
              onChange={handleNumberChange('loan_to_cost_pct')}
              step="0.01"
            />
          </FormRow>
        </div>

        <div className="loan-form-section">
          <div className="loan-section-header">Interest Rate</div>
          <FormRow label="Interest Type" error={errors.interest_type}>
            <select
              className="loan-input-cell loan-input-cell-left"
              value={formData.interest_type || 'Fixed'}
              onChange={handleSelectChange('interest_type')}
            >
              <option value="Fixed">Fixed</option>
              <option value="Floating">Floating</option>
            </select>
          </FormRow>
          {isFloating && (
            <>
              <FormRow label="Interest Index" error={errors.interest_index}>
                <select
                  className="loan-input-cell loan-input-cell-left"
                  value={formData.interest_index || 'SOFR'}
                  onChange={handleSelectChange('interest_index')}
                >
                  <option value="SOFR">SOFR</option>
                  <option value="PRIME">Prime</option>
                  <option value="FIXED">Fixed</option>
                </select>
              </FormRow>
              <FormRow label="Interest Spread (bps)" error={errors.interest_spread_bps}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.interest_spread_bps ?? ''}
                  onChange={handleNumberChange('interest_spread_bps')}
                />
              </FormRow>
            </>
          )}
          <FormRow label="All-In Interest Rate %" required error={errors.interest_rate_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.interest_rate_pct ?? ''}
              onChange={handleNumberChange('interest_rate_pct')}
              step="0.001"
            />
          </FormRow>
        </div>

        <div className="loan-form-section">
          <div className="loan-section-header">Term &amp; Amortization</div>
          <FormRow label="Loan Term (months)" error={errors.loan_term_months}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.loan_term_months ?? ''}
              onChange={handleNumberChange('loan_term_months')}
            />
          </FormRow>
          <FormRow label="Amortization (months)" error={errors.amortization_months}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.amortization_months ?? ''}
              onChange={handleNumberChange('amortization_months')}
            />
          </FormRow>
          <FormRow label="Interest Only Period (months)" error={errors.interest_only_months}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.interest_only_months ?? ''}
              onChange={handleNumberChange('interest_only_months')}
            />
          </FormRow>
          <FormRow label="Payment Frequency" error={errors.payment_frequency}>
            <select
              className="loan-input-cell loan-input-cell-left"
              value={formData.payment_frequency || 'MONTHLY'}
              onChange={handleSelectChange('payment_frequency')}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          </FormRow>
          <FormRow label="Loan Start Date" error={errors.loan_start_date}>
            <input
              type="date"
              className="loan-input-cell loan-input-cell-left"
              value={formData.loan_start_date || ''}
              onChange={handleTextChange('loan_start_date')}
            />
          </FormRow>
        </div>

        <div className="loan-form-section">
          <div className="loan-section-header">Fees &amp; Costs</div>
          <FormRow label="Origination Fee %" error={errors.origination_fee_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.origination_fee_pct ?? ''}
              onChange={handleNumberChange('origination_fee_pct')}
              step="0.01"
            />
          </FormRow>
          <FormRow label="Exit Fee %" error={errors.exit_fee_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.exit_fee_pct ?? ''}
              onChange={handleNumberChange('exit_fee_pct')}
              step="0.01"
            />
          </FormRow>
          <FormRow label="Unused/Standby Fee %" error={errors.unused_fee_pct}>
            <input
              type="number"
              className="loan-input-cell"
              value={formData.unused_fee_pct ?? ''}
              onChange={handleNumberChange('unused_fee_pct')}
              step="0.01"
            />
          </FormRow>
        </div>

        {isRevolver && (
          <>
            <div className="loan-form-section">
              <div className="loan-section-header">Revolver-Specific</div>
              <FormRow label="Interest Reserve Inflator" error={errors.interest_reserve_inflator}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.interest_reserve_inflator ?? ''}
                  onChange={handleNumberChange('interest_reserve_inflator')}
                  step="0.01"
                />
              </FormRow>
              <FormRow label="Repayment Acceleration" error={errors.repayment_acceleration}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.repayment_acceleration ?? ''}
                  onChange={handleNumberChange('repayment_acceleration')}
                  step="0.01"
                />
              </FormRow>
              <FormRow label="Draw Trigger" error={errors.draw_trigger_type}>
                <select
                  className="loan-input-cell loan-input-cell-left"
                  value={formData.draw_trigger_type || 'COST_INCURRED'}
                  onChange={handleSelectChange('draw_trigger_type')}
                >
                  <option value="COST_INCURRED">Cost Incurred</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </FormRow>
              <FormRow label="Collateral Basis" error={errors.collateral_basis_type}>
                <select
                  className="loan-input-cell loan-input-cell-left"
                  value={formData.collateral_basis_type || 'PROJECT_COST'}
                  onChange={handleSelectChange('collateral_basis_type')}
                >
                  <option value="PROJECT_COST">Project Cost</option>
                  <option value="RESIDUAL_LAND_VALUE">Residual Land Value</option>
                </select>
              </FormRow>
            </div>

            <div className="loan-form-section">
              <div className="loan-section-header">Additional Closing Costs</div>
              <FormRow label="Appraisal" error={errors.closing_costs_appraisal}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.closing_costs_appraisal ?? ''}
                  onChange={handleNumberChange('closing_costs_appraisal')}
                />
              </FormRow>
              <FormRow label="Legal" error={errors.closing_costs_legal}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.closing_costs_legal ?? ''}
                  onChange={handleNumberChange('closing_costs_legal')}
                />
              </FormRow>
              <FormRow label="Closing" error={errors.closing_costs_closing}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.closing_costs_closing ?? ''}
                  onChange={handleNumberChange('closing_costs_closing')}
                />
              </FormRow>
              <FormRow label="Other" error={errors.closing_costs_other}>
                <input
                  type="number"
                  className="loan-input-cell"
                  value={formData.closing_costs_other ?? ''}
                  onChange={handleNumberChange('closing_costs_other')}
                />
              </FormRow>
              <FormRow label="Recourse Type" error={errors.recourse_type}>
                <select
                  className="loan-input-cell loan-input-cell-left"
                  value={formData.recourse_type || 'FULL'}
                  onChange={handleSelectChange('recourse_type')}
                >
                  <option value="FULL">Full</option>
                  <option value="NON_RECOURSE">Non-Recourse</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </FormRow>
            </div>
          </>
        )}

        <div className="loan-form-section">
          <div className="loan-section-header">Notes</div>
          <FormRow label="Notes" error={errors.notes}>
            <textarea
              className="loan-input-cell loan-input-cell-left loan-input-notes"
              rows={3}
              value={formData.notes || ''}
              onChange={handleTextareaChange('notes')}
            />
          </FormRow>
        </div>
      </COffcanvasBody>
      <div className="loan-form-footer d-flex justify-content-between align-items-center">
        {isEditMode ? (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleDelete}
            disabled={deleteLoan.isPending}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-ghost-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Loan'}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .loan-form-body {
          padding: 1rem 1.5rem 1.5rem;
        }
        .loan-form-section {
          margin-bottom: 1.25rem;
        }
        .loan-section-header {
          background: var(--cui-tertiary-bg);
          color: var(--cui-body-color);
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 4px;
          margin-bottom: 0.75rem;
        }
        .loan-form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 0.75rem;
        }
        .loan-form-label {
          color: var(--cui-body-color);
          font-size: 0.875rem;
          flex: 1 1 auto;
        }
        .loan-form-input {
          flex: 0 0 220px;
        }
        .loan-input-cell {
          background: rgba(var(--cui-primary-rgb), 0.08);
          border: 1px solid var(--cui-border-color);
          border-radius: 4px;
          padding: 4px 8px;
          text-align: right;
          color: var(--cui-body-color);
          width: 100%;
        }
        .loan-input-cell-left {
          text-align: left;
        }
        .loan-input-cell:focus {
          border-color: var(--cui-primary);
          outline: none;
          box-shadow: 0 0 0 2px rgba(var(--cui-primary-rgb), 0.25);
        }
        .loan-input-notes {
          text-align: left;
        }
        .loan-form-footer {
          padding: 0.75rem 1.5rem 1.25rem;
          border-top: 1px solid var(--cui-border-color);
          background: var(--cui-secondary-bg);
        }
      `}</style>
    </COffcanvas>
  );
}

export default LoanFormFlyout;
export const DebtFacilityModal = LoanFormFlyout;
