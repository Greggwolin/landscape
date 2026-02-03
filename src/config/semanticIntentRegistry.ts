/**
 * Semantic Intent Registry
 *
 * Single source of truth for semantic governance display in StyleCatalog.
 * Contains button and badge intent definitions with metadata for documentation.
 *
 * @module config/semanticIntentRegistry
 */

import type { SemanticButtonIntent } from '@/components/ui/landscape/SemanticButton';
import type { SemanticIntent } from '@/components/ui/landscape/semanticBadgeTheme';

export interface ButtonIntentDefinition {
  intent: SemanticButtonIntent;
  coreUIColor: string;
  tokenRamps: string;
  useCase: string;
  sampleLabel: string;
}

export interface BadgeIntentDefinition {
  intent: SemanticIntent;
  valueExamples: string[];
  resolution: string;
  fallback: string;
}

export interface CardHeaderDefinition {
  element: string;
  hex: string;
  variable: string;
  usage: string;
}

/**
 * Button intent registry for StyleCatalog display
 * Maps each semantic intent to CoreUI color, token ramps, and use case
 */
export const buttonIntentRegistry: ButtonIntentDefinition[] = [
  {
    intent: 'primary-action',
    coreUIColor: 'primary',
    tokenRamps: '--cui-primary-ramp-*',
    useCase: 'Primary actions (save, submit)',
    sampleLabel: 'Save Changes',
  },
  {
    intent: 'secondary-action',
    coreUIColor: 'secondary',
    tokenRamps: '--cui-secondary, -dark',
    useCase: 'Secondary actions (cancel)',
    sampleLabel: 'Cancel',
  },
  {
    intent: 'tertiary-action',
    coreUIColor: 'light',
    tokenRamps: '--cui-light',
    useCase: 'Ghost/tertiary flows',
    sampleLabel: 'More Options',
  },
  {
    intent: 'confirm-action',
    coreUIColor: 'primary',
    tokenRamps: '--cui-primary-ramp-*',
    useCase: 'Confirmation dialogs',
    sampleLabel: 'Confirm',
  },
  {
    intent: 'destructive-action',
    coreUIColor: 'danger',
    tokenRamps: '--cui-danger-ramp-*',
    useCase: 'Delete, remove actions',
    sampleLabel: 'Delete',
  },
  {
    intent: 'neutral-action',
    coreUIColor: 'secondary',
    tokenRamps: '--cui-secondary',
    useCase: 'Neutral/passive actions',
    sampleLabel: 'Skip',
  },
];

/**
 * Badge intent registry for StyleCatalog display
 * Maps each semantic intent to value examples, resolution strategy, and fallback
 */
export const badgeIntentRegistry: BadgeIntentDefinition[] = [
  {
    intent: 'status',
    valueExamples: ['complete', 'partial', 'pending', 'rejected', 'selling', 'active'],
    resolution: 'Static map + dynamic prefix matching',
    fallback: 'secondary',
  },
  {
    intent: 'confidence',
    valueExamples: ['high', 'medium', 'low'],
    resolution: 'Dynamic resolver (keyword matching)',
    fallback: 'secondary',
  },
  {
    intent: 'category',
    valueExamples: ['land development', 'multifamily', 'rent_roll'],
    resolution: 'Static map (70+ values)',
    fallback: 'secondary',
  },
  {
    intent: 'action-state',
    valueExamples: ['yes', 'no', 'conditional', 'firm'],
    resolution: 'Static map + interactive override',
    fallback: 'secondary',
  },
  {
    intent: 'navigation-meta',
    valueExamples: ['active', 'inactive', 'subdivisions'],
    resolution: 'Static map',
    fallback: 'secondary',
  },
  {
    intent: 'user-tag',
    valueExamples: ['Custom Tag', 'Project Label'],
    resolution: 'Special inline styling (not CoreUI variant)',
    fallback: 'light',
  },
];

export const cardHeaderRegistry: CardHeaderDefinition[] = [
  {
    element: 'Primary Header',
    hex: '#F0F1F2',
    variable: '--cui-card-header-bg',
    usage: 'Card headers, accordion toggles, panel titles',
  },
  {
    element: 'Sub-Header',
    hex: '#F7F7FB',
    variable: '--cui-card-subheader-bg',
    usage: 'Nested headers, table sub-rows, grid section headers',
  },
];
