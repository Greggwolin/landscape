'use client';

import React from 'react';
import { CButton } from '@coreui/react';
import type { CButtonProps } from '@coreui/react';

export type SemanticButtonIntent =
  | 'primary-action'
  | 'secondary-action'
  | 'tertiary-action'
  | 'confirm-action'
  | 'destructive-action'
  | 'neutral-action';

// Guardrail: No action button may bypass SemanticButton. Search for direct `CButton color=`/`variant=` usage to enforce intent discipline.
// Strict governance: each intent routes through canonical CoreUI tokens.
// Confirm / primary default → `var(--cui-primary)` (hover/focus inherit ramp via CoreUI variables, confirm shares primary)
// Secondary default → `var(--cui-secondary)`, hover/focus rely on CoreUI secondary ramp
// Tertiary default → `var(--cui-light)` (used for ghost/tertiary flows)
// Destructive default → `var(--cui-danger)`, hover → `var(--cui-danger-ramp-04)`, focus/active → `var(--cui-danger-ramp-02)`, disabled → base
const intentColorMap: Record<SemanticButtonIntent, CButtonProps['color']> = {
  'primary-action': 'primary',
  'secondary-action': 'secondary',
  'tertiary-action': 'light',
  'confirm-action': 'primary',
  'destructive-action': 'danger',
  'neutral-action': 'secondary',
};

export interface SemanticButtonProps extends Omit<CButtonProps, 'color'> {
  intent: SemanticButtonIntent;
}

export function SemanticButton({
  intent,
  className,
  ...rest
}: SemanticButtonProps) {
  return (
    <CButton
      {...rest}
      color={intentColorMap[intent]}
      className={className}
      data-semantic-intent={intent}
    />
  );
}
