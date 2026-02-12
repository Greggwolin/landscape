'use client';

import React from 'react';
import { CFormTextarea } from '@coreui/react';

export type TextareaProps = React.ComponentPropsWithoutRef<typeof CFormTextarea>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  return <CFormTextarea ref={ref} {...props} />;
});

Textarea.displayName = 'Textarea';

