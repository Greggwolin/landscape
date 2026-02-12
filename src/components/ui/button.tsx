'use client';

import React from 'react';
import { CButton } from '@coreui/react';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ComponentPropsWithoutRef<typeof CButton> {
  variant?: Variant;
  size?: Size;
}

const colorForVariant: Record<Variant, string> = {
  default: 'primary',
  destructive: 'danger',
  outline: 'secondary',
  secondary: 'secondary',
  ghost: 'secondary',
  link: 'link',
};

const classForSize: Record<Size, string | undefined> = {
  default: undefined,
  sm: 'btn-sm',
  lg: 'btn-lg',
  icon: 'p-1',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className, ...props }, ref) => {
    const coreColor = colorForVariant[variant] || 'primary';
    const coreVariant = variant === 'outline' ? 'outline' : undefined;
    const extraClass = [classForSize[size], className].filter(Boolean).join(' ');

    return (
      <CButton
        ref={ref}
        color={coreColor}
        variant={coreVariant}
        className={extraClass || undefined}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

