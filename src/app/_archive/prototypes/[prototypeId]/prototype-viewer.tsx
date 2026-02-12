'use client';

import { Suspense, useMemo } from 'react';

import { loadPrototypeComponent } from '@/lib/prototypes/loaders';
import type { PrototypeMetadata } from '@/lib/prototypes/types';

const MissingPrototypeMessage = ({ prototype }: { prototype: PrototypeMetadata }) => {
  return (
    <div className="space-y-4 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
      <h3 className="text-lg font-semibold text-white">Prototype loader not available</h3>
      <p>
        There is no loader registered for <code>{prototype.id}</code>. Add a component under
        <code>src/prototypes</code> and update <code>src/lib/prototypes/loaders.tsx</code> to see it here.
      </p>
    </div>
  );
};

interface PrototypeViewerProps {
  prototype: PrototypeMetadata;
}

export default function PrototypeViewer({ prototype }: PrototypeViewerProps) {
  const PrototypeComponent = useMemo(() => loadPrototypeComponent(prototype.id), [prototype.id]);

  if (!PrototypeComponent) {
    return <MissingPrototypeMessage prototype={prototype} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center text-sm text-neutral-400">
          Loading module…
        </div>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        <PrototypeComponent />
      </div>
    </Suspense>
  );
}
