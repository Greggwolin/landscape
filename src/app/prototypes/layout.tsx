import type { ReactNode } from 'react';

type PrototypeLayoutProps = {
  children: ReactNode;
};

export default function PrototypeLayout({ children }: PrototypeLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Prototype Lab</p>
            <h1 className="text-2xl font-semibold text-white">Landscape Experiment Hub</h1>
          </div>
          <p className="max-w-md text-sm text-neutral-400">
            Use this hub to explore design spikes without touching production flows. Each prototype is isolated
            and can live on its own branch until it is ready to merge.
          </p>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
