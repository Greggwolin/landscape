'use client';

import { useEffect, useState, useTransition } from 'react';

interface PrototypeNoteEntry {
  id: string;
  prototypeId: string;
  note: string;
  timestamp: string;
}

interface PrototypeNotesClientProps {
  prototypeId: string;
}

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
};

const PrototypeNotesClient: React.FC<PrototypeNotesClientProps> = ({ prototypeId }) => {
  const [notes, setNotes] = useState<PrototypeNoteEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/prototypes/notes?prototypeId=${encodeURIComponent(prototypeId)}`, {
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error('Failed to load notes');
        }
        const payload = (await response.json()) as PrototypeNoteEntry[];
        const ordered = [...payload].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotes(ordered);
      } catch (err) {
        console.error(err);
        setError('Unable to load notes for this prototype.');
      }
    };

    load();
  }, [prototypeId]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/prototypes/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prototypeId, note: trimmed })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = (payload as { error?: string }).error ?? 'Unable to save note';
          throw new Error(message);
        }

        const { entry } = (await response.json()) as { entry: PrototypeNoteEntry };
        setNotes((prev) => [entry, ...prev]);
        setDraft('');
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Unexpected error while saving note.';
        setError(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-200">Add note</h3>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Capture quick reactions, TODOs, or follow-ups while reviewing this prototype."
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-white/40 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !draft.trim()}
            className="inline-flex items-center justify-center rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Log note'}
          </button>
          {error ? <span className="text-xs text-amber-400">{error}</span> : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">History</div>
        {notes.length === 0 ? (
          <div className="text-xs text-neutral-500">No notes yet. Add your first impression above.</div>
        ) : (
          <ul className="space-y-2 text-xs text-neutral-400">
            {notes.map((entry) => (
              <li key={entry.id} className="rounded-md border border-neutral-800 bg-neutral-950/80 p-3">
                <div className="font-medium text-neutral-200">{formatTimestamp(entry.timestamp)}</div>
                <div className="mt-1 text-neutral-400">{entry.note}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PrototypeNotesClient;
