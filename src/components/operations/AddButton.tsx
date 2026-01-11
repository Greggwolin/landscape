'use client';

import React from 'react';

interface AddButtonProps {
  label?: string;
  onClick: () => void;
  inline?: boolean;
  className?: string;
}

/**
 * AddButton - Button for adding new line items
 *
 * Two styles:
 * - Regular: Full button in section header (+ Add Unit Type)
 * - Inline: Small button that appears on parent row hover (+ Add)
 */
export function AddButton({
  label = 'Add',
  onClick,
  inline = false,
  className = ''
}: AddButtonProps) {
  const buttonClass = inline ? 'ops-inline-add' : 'ops-add-btn';

  return (
    <button
      type="button"
      className={`${buttonClass} ${className}`}
      onClick={onClick}
    >
      + {label}
    </button>
  );
}

export default AddButton;
