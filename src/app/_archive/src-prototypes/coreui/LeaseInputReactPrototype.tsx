'use client';

import { useState } from 'react';

const LeaseInputReactPrototype = () => {
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Lease Workspace Prototype</h3>
          <p className="text-neutral-400">
            React/Next.js conversion of the ARGUS-style lease input experience. Launches the dynamic route at
            <code className="ml-2 rounded bg-neutral-800 px-2 py-0.5 text-xs">/lease/101</code> backed by the mock
            API.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/lease/101"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-400"
          >
            Open full page
          </a>
          <button
            type="button"
            onClick={() => setIframeKey((prev) => prev + 1)}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white"
          >
            Reload preview
          </button>
        </div>
      </div>

      <div className="relative min-h-[720px] overflow-hidden rounded-xl border border-neutral-800 bg-black/40">
        <iframe
          key={iframeKey}
          src="/lease/101"
          title="Lease Input React Prototype"
          className="h-[1100px] w-full bg-transparent"
        />
      </div>
    </div>
  );
};

export default LeaseInputReactPrototype;
