'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { prototypeRegistry } from '@/lib/prototypes/registry';

const statusMap: Record<string, string> = {
  wip: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  stable: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  archived: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
};

interface PrototypeNoteEntry {
  id: string;
  prototypeId: string;
  note: string;
  timestamp: string;
}

type NotesByPrototype = Record<string, PrototypeNoteEntry[]>;


const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
};

export default function PrototypesIndexPage() {
  const [notes, setNotes] = useState<NotesByPrototype>({});
  const [error, setError] = useState<string | null>(null);

  const orderedNotes = useMemo(() => {
    const normalized: NotesByPrototype = {};
    Object.entries(notes).forEach(([prototypeId, entries]) => {
      normalized[prototypeId] = [...entries].sort((a, b) =>
        new Date(a.timestamp) > new Date(b.timestamp) ? -1 : 1
      );
    });
    return normalized;
  }, [notes]);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch('/api/prototypes/notes', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load notes');
        }
        const payload = (await response.json()) as PrototypeNoteEntry[];
        const grouped: NotesByPrototype = {};
        for (const entry of payload) {
          if (!grouped[entry.prototypeId]) {
            grouped[entry.prototypeId] = [];
          }
          grouped[entry.prototypeId].push(entry);
        }
        setNotes(grouped);
      } catch (err) {
        console.error(err);
        setError('Unable to load prototype notes.');
      }
    };

    loadNotes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-lg font-semibold">How this works</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Each card links to an isolated experiment. Prototypes can point to different branches, document
          owners, and list the UI systems they rely on. When you checkout a branch that contains the prototype
          code, the corresponding entry renders automatically.
        </p>
        <p className="mt-4 text-sm text-neutral-400">
          Add feedback from the prototype page itself. The most recent entry appears on each card, and the full
          history stays in <code className="mx-1 rounded bg-neutral-800 px-2 py-0.5 text-xs">docs/prototypes/notes.log</code>.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-amber-400">{error}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {prototypeRegistry.map((prototype) => {
          const prototypeNotes = orderedNotes[prototype.id] ?? [];
          const latestNote = prototypeNotes[0];

          return (
            <Link
              key={prototype.id}
              href={`/prototypes/${prototype.id}`}
              className="group flex h-full flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-300/60 hover:bg-neutral-900 cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">{prototype.name}</h3>
                    <span className="rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 text-xs font-medium">
                      Open →
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      statusMap[prototype.status]
                    }`}
                  >
                    {prototype.status}
                  </span>
                </div>
                <p className="text-sm text-neutral-400">{prototype.description}</p>
                {prototype.notes ? (
                  <p className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-400">
                    {prototype.notes}
                  </p>
                ) : null}
                {prototype.tags && prototype.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                    {prototype.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-neutral-700 px-3 py-1 uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {prototype.branch ? (
                  <div className="text-xs text-neutral-500">
                    Branch: <code>{prototype.branch}</code>
                  </div>
                ) : null}

                <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Latest note</div>
                  {latestNote ? (
                    <div className="text-xs text-neutral-300">
                      <div className="font-medium text-neutral-200">{formatTimestamp(latestNote.timestamp)}</div>
                      <div className="mt-1 text-neutral-400">{latestNote.note}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500">No notes yet.</div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
