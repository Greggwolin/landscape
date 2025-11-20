/**
 * LandscapeButton - CoreUI Wrapper Component
 *
 * Thin wrapper around CoreUI CButton with Landscape-specific enhancements:
 * - Loading state support
 * - Icon support (prefix/suffix)
 * - Consistent sizing aligned with ARGUS information density
 *
 * @version 1.0.0
 * @phase Phase 1 - CoreUI Migration
 */

import React, { forwardRef } from 'react';
import { CButton, CSpinner } from '@coreui/react';
import type { CButtonProps } from '@coreui/react';

export interface LandscapeButtonProps extends Omit<CButtonProps, 'disabled'> {
  /**
   * Show loading spinner and disable the button
   */
  loading?: boolean;

  /**
   * Icon to display before the button text
   */
  icon?: React.ReactNode;

  /**
   * Icon to display after the button text
   */
  iconRight?: React.ReactNode;

  /**
   * Disable the button (separate from loading state)
   */
  disabled?: boolean;
}

/**
 * LandscapeButton Component
 *
 * @example
 * // Primary action button
 * <LandscapeButton color="primary">Save</LandscapeButton>
 *
 * @example
 * // Button with loading state
 * <LandscapeButton color="primary" loading={isSubmitting}>
 *   Submit
 * </LandscapeButton>
 *
 * @example
 * // Button with icon
 * <LandscapeButton color="success" icon={<CIcon icon={cilSave} />}>
 *   Save Changes
 * </LandscapeButton>
 *
 * @example
 * // Outline variant
 * <LandscapeButton color="secondary" variant="outline">
 *   Cancel
 * </LandscapeButton>
 */
export const LandscapeButton = forwardRef<HTMLButtonElement, LandscapeButtonProps>(
  ({ loading = false, icon, iconRight, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <CButton
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <CSpinner
              component="span"
              size="sm"
              aria-hidden="true"
              className="me-2"
            />
            {children}
          </>
        ) : (
          <>
            {icon && <span className="me-2">{icon}</span>}
            {children}
            {iconRight && <span className="ms-2">{iconRight}</span>}
          </>
        )}
      </CButton>
    );
  }
);

LandscapeButton.displayName = 'LandscapeButton';

/**
 * Common button variants for quick access
 */
export const ButtonVariants = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
  LIGHT: 'light',
  DARK: 'dark',
} as const;

/**
 * Common button sizes
 */
export const ButtonSizes = {
  SM: 'sm',
  LG: 'lg',
} as const;
