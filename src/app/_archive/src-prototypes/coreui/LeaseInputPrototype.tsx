'use client';

import { useEffect, useRef, useState } from 'react';

const iframeSrc = '/prototypes/lease-input-page.html';

const LeaseInputPrototype = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const handleLoad = () => setLoaded(true);
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-sm text-neutral-300">
        <div>
          <span className="font-semibold text-white">Lease Input Prototype</span>
          <span className="ml-2 text-neutral-500">
            Embedded static HTML generated in CoreUI. Useful for quick layout checks.
          </span>
        </div>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-neutral-600 px-3 py-1 text-xs font-medium text-neutral-200 transition hover:border-neutral-400 hover:text-white"
        >
          Open in new tab
        </a>
      </div>

      <div className="relative min-h-[720px] overflow-hidden rounded-xl border border-neutral-800 bg-black/40">
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-neutral-500">
            Loading CoreUI document…
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Lease Input Prototype"
          className="h-[1200px] w-full bg-white"
        />
      </div>
    </div>
  );
};

export default LeaseInputPrototype;
