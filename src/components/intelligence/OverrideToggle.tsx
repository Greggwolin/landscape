'use client';

/**
 * OverrideToggle — Red-dot toggle for calculated field overrides.
 *
 * Attaches to any calculated field. When active, shows a red dot
 * indicating the field's calculated value has been overridden.
 *
 * HIGH_RISK_FIELDS require a double-confirm dialog before override.
 */

import React, { useState, useCallback } from 'react';
import { CButton, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CSpinner } from '@coreui/react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * Fields that require double-confirmation before override (high financial impact).
 * Mirrors HIGH_RISK_FIELDS from mutation_service.py.
 */
const HIGH_RISK_FIELDS = new Set([
  'acquisition_price', 'asking_price',
  'price_per_unit', 'price_per_sf',
  'price_range_low', 'price_range_high',
  'cap_rate_current', 'cap_rate_proforma',
  'discount_rate_pct', 'cost_of_capital_pct',
  'market_rent', 'market_rent_psf_annual',
  'annual_amount',
  'saleprice',
  'purchase_price', 'exit_cap_rate',
]);

interface OverrideToggleProps {
  projectId: number;
  fieldKey: string;
  fieldLabel: string;
  calculatedValue: string | number | null;
  currentValue: string | number | null;
  /** Whether an override is currently active for this field */
  isOverridden: boolean;
  /** Active override ID (if overridden) */
  overrideId?: number | null;
  /** Called after toggling override on/off so parent can refresh */
  onToggle?: (isNowOverridden: boolean) => void;
  /** Optional scope IDs */
  divisionId?: number | null;
  unitId?: number | null;
}

export default function OverrideToggle({
  projectId,
  fieldKey,
  fieldLabel,
  calculatedValue,
  currentValue,
  isOverridden,
  overrideId,
  onToggle,
  divisionId,
  unitId,
}: OverrideToggleProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);

  const isHighRisk = HIGH_RISK_FIELDS.has(fieldKey);

  const handleToggleClick = useCallback(() => {
    if (isOverridden) {
      // Revert — single confirm
      setConfirmStep(1);
      setShowConfirm(true);
    } else {
      // Enable override
      if (isHighRisk) {
        setConfirmStep(1);
        setShowConfirm(true);
      } else {
        setConfirmStep(1);
        setShowConfirm(true);
      }
    }
  }, [isOverridden, isHighRisk]);

  const handleConfirm = useCallback(async () => {
    // High-risk fields require step 2 confirmation
    if (!isOverridden && isHighRisk && confirmStep === 1) {
      setConfirmStep(2);
      return;
    }

    setLoading(true);
    try {
      if (isOverridden && overrideId) {
        // Revert override
        const res = await fetch(
          `${DJANGO_API_URL}/api/landscaper/overrides/${overrideId}/revert/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (res.ok) {
          onToggle?.(false);
        }
      } else {
        // Toggle override ON
        const res = await fetch(
          `${DJANGO_API_URL}/api/landscaper/projects/${projectId}/overrides/toggle/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              field_key: fieldKey,
              override_value: String(currentValue ?? ''),
              calculated_value: String(calculatedValue ?? ''),
              division_id: divisionId,
              unit_id: unitId,
            }),
          }
        );
        if (res.ok) {
          onToggle?.(true);
        }
      }
    } catch (err) {
      console.error('[OverrideToggle] Toggle failed:', err);
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setConfirmStep(1);
    }
  }, [
    isOverridden, isHighRisk, confirmStep, overrideId,
    projectId, fieldKey, currentValue, calculatedValue,
    divisionId, unitId, onToggle,
  ]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setConfirmStep(1);
  }, []);

  return (
    <>
      {/* Red dot indicator + toggle button */}
      <button
        type="button"
        onClick={handleToggleClick}
        disabled={loading}
        title={
          isOverridden
            ? `Override active on "${fieldLabel}" — click to revert to calculated value`
            : `Override "${fieldLabel}" — replace calculated value with manual entry`
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: '0.75rem',
          color: isOverridden ? '#e55353' : 'var(--cui-secondary-color)',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {loading ? (
          <CSpinner size="sm" style={{ width: 10, height: 10 }} />
        ) : (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isOverridden ? '#e55353' : 'var(--cui-border-color)',
              display: 'inline-block',
              transition: 'background-color 0.2s',
            }}
          />
        )}
        {isOverridden ? 'Override' : 'Calc'}
      </button>

      {/* Confirmation Modal */}
      <CModal visible={showConfirm} onClose={handleCancel} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>
            {isOverridden ? 'Revert Override' : 'Override Calculated Value'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isOverridden ? (
            <p>
              Revert <strong>{fieldLabel}</strong> back to its calculated value
              {calculatedValue != null ? ` (${calculatedValue})` : ''}?
            </p>
          ) : confirmStep === 1 && !isHighRisk ? (
            <div>
              <p>
                Override the calculated value for <strong>{fieldLabel}</strong>?
              </p>
              <p className="text-body-secondary small">
                The current value ({currentValue ?? 'empty'}) will be locked as a manual override.
                Calculated updates will no longer apply until the override is reverted.
              </p>
            </div>
          ) : confirmStep === 1 && isHighRisk ? (
            <div>
              <p>
                <span className="text-danger fw-semibold">⚠ High-Impact Field</span>
              </p>
              <p>
                <strong>{fieldLabel}</strong> directly affects financial calculations
                (valuations, returns, underwriting).
              </p>
              <p className="text-body-secondary small">
                Overriding this field will lock the value and prevent automatic recalculation.
                Are you sure you want to proceed?
              </p>
            </div>
          ) : (
            <div>
              <p className="text-danger fw-semibold">
                ⚠ Final Confirmation Required
              </p>
              <p>
                You are about to override <strong>{fieldLabel}</strong>, a high-impact
                calculated field. This may materially change valuations and returns.
              </p>
              <p>
                Current value: <strong>{currentValue ?? '—'}</strong>
                <br />
                Calculated value: <strong>{calculatedValue ?? '—'}</strong>
              </p>
              <p className="text-danger small">
                This action is logged in the mutation audit trail.
              </p>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </CButton>
          <CButton
            color={isOverridden ? 'info' : (isHighRisk && confirmStep === 2 ? 'danger' : 'warning')}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <CSpinner size="sm" className="me-1" />}
            {isOverridden
              ? 'Revert to Calculated'
              : isHighRisk && confirmStep === 1
                ? 'Continue →'
                : 'Confirm Override'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
