/**
 * ProfileField Component
 *
 * Reusable component for displaying a label-value pair in the project profile.
 * Renders as a grid cell with label above value (two-column profile grid layout).
 */

import React from 'react';

interface ProfileFieldProps {
  label: string;
  value?: string | number | React.ReactNode | null;
  defaultText?: string;
  isLast?: boolean;
  /** Span full width of the two-column grid */
  fullWidth?: boolean;
  /** Custom content (replaces default value rendering) */
  children?: React.ReactNode;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  defaultText = 'Not specified',
  isLast = false,
  fullWidth = false,
  children
}) => {
  const hasValue = value !== null && value !== undefined && value !== '';
  const displayValue = hasValue
    ? (typeof value === 'string' || typeof value === 'number' ? String(value) : value)
    : defaultText;

  return (
    <div
      className={`profile-field${fullWidth ? ' profile-field--full' : ''}`}
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <span className="profile-field__label">{label}</span>
      {children ? (
        <span className="profile-field__value">{children}</span>
      ) : (
        <span className={`profile-field__value${!hasValue ? ' profile-field__value--empty' : ''}`}>
          {displayValue}
        </span>
      )}
    </div>
  );
};

export default ProfileField;
