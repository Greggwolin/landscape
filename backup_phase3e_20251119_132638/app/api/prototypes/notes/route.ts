import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface PrototypeNoteEntry {
  id: string;
  prototypeId: string;
  note: string;
  timestamp: string;
}

const DATA_PATH = path.join(process.cwd(), 'data', 'prototype-notes.json');
const LOG_PATH = path.join(process.cwd(), 'docs', 'prototypes', 'notes.log');

type NodeError = NodeJS.ErrnoException;

const isNodeError = (error: unknown): error is NodeError =>
  typeof error === 'object' && error !== null && 'code' in error;

async function ensureFileExists(filePath: string, fallbackContent: string) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fallbackContent, 'utf8');
    } else {
      throw error;
    }
  }
}

async function readNotes(): Promise<PrototypeNoteEntry[]> {
  await ensureFileExists(DATA_PATH, '[]');
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as PrototypeNoteEntry[];
    }
    return [];
  } catch (error) {
    console.error('Failed to parse prototype notes file, resetting', error);
    await fs.writeFile(DATA_PATH, '[]', 'utf8');
    return [];
  }
}

export const GET = async (request: Request) => {
  const notes = await readNotes();
  const url = new URL(request.url);
  const prototypeId = url.searchParams.get('prototypeId');
  const type = url.searchParams.get('type'); // 'multifam' for MultiFam prototypes

  let filtered = notes;

  if (prototypeId) {
    filtered = filtered.filter((entry) => entry.prototypeId === prototypeId);
  }

  if (type === 'multifam') {
    // Filter to only MultiFam prototype IDs (can be extended with prefix logic if needed)
    filtered = filtered.filter((entry) => entry.prototypeId.startsWith('multifam-'));
  } else if (type === 'regular') {
    // Filter to only regular prototypes (exclude MultiFam)
    filtered = filtered.filter((entry) => !entry.prototypeId.startsWith('multifam-'));
  }

  return NextResponse.json(filtered);
};

export const POST = async (request: Request) => {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload.prototypeId !== 'string' || typeof payload.note !== 'string') {
    return NextResponse.json({ error: 'prototypeId and note are required' }, { status: 400 });
  }

  const trimmedNote = payload.note.trim();
  if (!trimmedNote) {
    return NextResponse.json({ error: 'Note cannot be empty' }, { status: 400 });
  }

  const entry: PrototypeNoteEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    prototypeId: payload.prototypeId,
    note: trimmedNote,
    timestamp: new Date().toISOString()
  };

  const notes = await readNotes();
  notes.push(entry);
  await fs.writeFile(DATA_PATH, JSON.stringify(notes, null, 2), 'utf8');

  await ensureFileExists(LOG_PATH, '');
  const logLine = `[${entry.timestamp}] (${entry.prototypeId}) ${entry.note}\n`;
  await fs.appendFile(LOG_PATH, logLine, 'utf8');

  return NextResponse.json({ ok: true, entry });
};
