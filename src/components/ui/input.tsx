'use client';

import React from 'react';
import { CFormInput } from '@coreui/react';

export type InputProps = React.ComponentPropsWithoutRef<typeof CFormInput>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <CFormInput ref={ref} {...props} />;
});

Input.displayName = 'Input';

