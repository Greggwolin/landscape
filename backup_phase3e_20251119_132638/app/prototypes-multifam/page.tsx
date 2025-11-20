'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { ProjectProvider } from '../components/ProjectProvider';
import { multiFamPrototypeRegistry } from '@/lib/prototypes-multifam/registry';

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

function PrototypesMultiFamContent() {
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
        const response = await fetch('/api/prototypes/notes?type=multifam', { cache: 'no-store' });
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
    <div className="p-4 space-y-4 bg-gray-950 min-h-screen">
      {/* Page Title */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <h2 className="text-lg font-semibold text-white">Prototypes - MultiFam</h2>
      </div>

      {/* Description */}
      <div className="bg-gray-800 rounded border border-gray-700 p-4">
        <p className="text-sm text-gray-400">
          Each row contains two cards: one for the frontend UI prototype and one for the corresponding Django admin interface.
          Click any tile to open it in a new window.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-amber-400">{error}</p>
        ) : null}
      </div>

      {/* Prototypes Grid */}
      {multiFamPrototypeRegistry.length === 0 ? (
        <div className="bg-gray-800 rounded border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No multifamily prototypes registered yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Add entries to <code className="mx-1 rounded bg-gray-700 px-2 py-0.5 text-xs">src/lib/prototypes-multifam/registry.ts</code> to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {multiFamPrototypeRegistry.map((prototype) => {
            const frontendNotes = orderedNotes[prototype.id] ?? [];
            const backendNotes = orderedNotes[`${prototype.id}-admin`] ?? [];
            const latestFrontendNote = frontendNotes[0];
            const latestBackendNote = backendNotes[0];

            return (
              <div key={prototype.id} className="grid gap-4 md:grid-cols-2">
                {/* Frontend Tile */}
                <Link
                  href={prototype.frontendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col justify-between rounded-lg border border-gray-700 bg-gray-800 p-5 transition hover:border-gray-600 hover:bg-gray-750 cursor-pointer"
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
                    <p className="text-sm text-gray-400">{prototype.description}</p>
                    {prototype.notes ? (
                      <p className="rounded-lg border border-dashed border-gray-700 bg-gray-900/80 px-3 py-2 text-xs text-gray-400">
                        {prototype.notes}
                      </p>
                    ) : null}
                    {prototype.tags && prototype.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {prototype.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-gray-700 px-3 py-1 uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {prototype.branch ? (
                      <div className="text-xs text-gray-500">
                        Branch: <code>{prototype.branch}</code>
                      </div>
                    ) : null}

                    <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Latest note</div>
                      {latestFrontendNote ? (
                        <div className="text-xs text-gray-300">
                          <div className="font-medium text-gray-200">{formatTimestamp(latestFrontendNote.timestamp)}</div>
                          <div className="mt-1 text-gray-400">{latestFrontendNote.note}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No notes yet.</div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Backend Admin Tile */}
                <Link
                  href={prototype.backendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col justify-between rounded-lg border border-gray-700 bg-gray-800 p-5 transition hover:border-gray-600 hover:bg-gray-750 cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">{prototype.name} - Admin</h3>
                        <span className="rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 text-xs font-medium">
                          Admin →
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
                    <p className="text-sm text-gray-400">Django admin interface for {prototype.name.toLowerCase()}</p>
                    {prototype.tags && prototype.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {prototype.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-gray-700 px-3 py-1 uppercase">
                            {tag}
                          </span>
                        ))}
                        <span className="rounded-full border border-gray-700 px-3 py-1 uppercase">admin</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        <span className="rounded-full border border-gray-700 px-3 py-1 uppercase">admin</span>
                      </div>
                    )}

                    <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Latest note</div>
                      {latestBackendNote ? (
                        <div className="text-xs text-gray-300">
                          <div className="font-medium text-gray-200">{formatTimestamp(latestBackendNote.timestamp)}</div>
                          <div className="mt-1 text-gray-400">{latestBackendNote.note}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No notes yet.</div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PrototypesMultiFamPage() {
  const [activeView] = useState('prototype-lab-multifam');

  return (
    <ProjectProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Navigation activeView={activeView} setActiveView={() => {}} />
          <main className="flex-1 overflow-visible bg-gray-950">
            <PrototypesMultiFamContent />
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
