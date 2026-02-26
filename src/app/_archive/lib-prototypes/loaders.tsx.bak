'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const loaderMap: Record<string, () => Promise<{ default: ComponentType<Record<string, unknown>> }>> = {
  'coreui-lease-input': () => import('@/prototypes/coreui/LeaseInputPrototype'),
  'coreui-lease-react': () => import('@/prototypes/coreui/LeaseInputReactPrototype'),
  'coreui-shell': () => import('@/prototypes/remote/CoreUIShellPlaceholder')
};

export const loadPrototypeComponent = (id: string) => {
  const loader = loaderMap[id];

  if (!loader) {
    return null;
  }

  return dynamic(loader, {
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading prototype…
      </div>
    ),
    ssr: false
  });
};
