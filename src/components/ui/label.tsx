'use client';

import React from 'react';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>((props, ref) => {
  return <label ref={ref} {...props} />;
});

Label.displayName = 'Label';

