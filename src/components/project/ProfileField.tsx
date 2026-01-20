/**
 * ProfileField Component
 *
 * Reusable component for displaying a label-value pair in the project profile
 */

import React from 'react';

interface ProfileFieldProps {
  label: string;
  value?: string | number | null;
  defaultText?: string;
  isLast?: boolean;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  defaultText = 'Not specified',
  isLast = false
}) => {
  const displayValue = value !== null && value !== undefined && value !== ''
    ? String(value)
    : defaultText;

  return (
    <div
      className={`d-flex gap-3 py-2 ${!isLast ? 'border-bottom' : ''}`}
      style={{ borderColor: 'var(--cui-border-color)', fontSize: '0.9375rem' }}
    >
      <span className="fw-semibold" style={{ minWidth: '140px', color: 'var(--cui-body-color)' }}>
        {label}
      </span>
      <span style={{ color: 'var(--cui-secondary-color)' }}>
        {displayValue}
      </span>
    </div>
  );
};

export default ProfileField;
