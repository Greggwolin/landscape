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
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  defaultText = 'Not specified'
}) => {
  const displayValue = value !== null && value !== undefined && value !== ''
    ? String(value)
    : defaultText;

  return (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>
      <div className="profile-field-value">{displayValue}</div>
    </div>
  );
};

export default ProfileField;
