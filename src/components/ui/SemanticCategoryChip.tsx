'use client';

import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type CategoryIntent =
  | 'horizontal'
  | 'vertical'
  | 'systems'
  | 'finishes'
  | 'soft_costs'
  | 'offsite'
  | 'contingency'
  | 'other';

export interface SemanticCategoryChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent: CategoryIntent;
  selected?: boolean;
}

export function SemanticCategoryChip({
  intent,
  selected = false,
  className,
  type = 'button',
  children,
  ...rest
}: SemanticCategoryChipProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx('semantic-category-chip', className)}
      data-intent={intent}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
    >
      <span className="semantic-category-chip__dot" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export type { CategoryIntent };
