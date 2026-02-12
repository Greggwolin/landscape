import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPrototypeById } from '@/lib/prototypes/registry';
import type { PrototypeMetadata } from '@/lib/prototypes/types';
import PrototypeViewer from './prototype-viewer';
import PrototypeNotesClient from './PrototypeNotesClient';

interface PrototypePageProps {
  params: {
    prototypeId: string;
  };
}

const PrototypeMeta = ({ prototype }: { prototype: PrototypeMetadata }) => {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
      <span className="rounded-full border border-neutral-700 px-3 py-1 uppercase tracking-wide">
        {prototype.status}
      </span>
      {prototype.branch ? (
        <Link
          href={`https://github.com/Greggwolin/landscape/tree/${prototype.branch}`}
          className="rounded-full border border-neutral-700 px-3 py-1 transition hover:border-neutral-400"
          target="_blank"
          rel="noreferrer"
        >
          Branch: {prototype.branch}
        </Link>
      ) : null}
      {prototype.tags?.map((tag) => (
        <span key={tag} className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 uppercase">
          {tag}
        </span>
      ))}
      {prototype.owners ? (
        <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1">
          Owners: {prototype.owners.join(', ')}
        </span>
      ) : null}
    </div>
  );
};

export default function PrototypePage({ params }: PrototypePageProps) {
  const prototype = getPrototypeById(params.prototypeId);

  if (!prototype) {
    notFound();
  }

  const prototypeData = prototype;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/prototypes"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Back to prototype list
        </Link>
        <h2 className="mt-2 text-3xl font-semibold text-white">{prototypeData.name}</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">{prototypeData.description}</p>
        <PrototypeMeta prototype={prototypeData} />
      </div>

      <PrototypeNotesClient prototypeId={prototypeData.id} />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <PrototypeViewer prototype={prototypeData} />
      </div>
    </div>
  );
}
