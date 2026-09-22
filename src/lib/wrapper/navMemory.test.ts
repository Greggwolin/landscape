/**
 * Navigation memory — the address format and the per-chat / per-project
 * memory behind navigation Rules 1, 2, 3 and 8 (chat MP, 2026-09-22).
 *
 * The suite runs in jest's node environment (no jsdom is installed), so a
 * minimal in-memory localStorage stands in for the browser's.
 */
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
};

import {
  NEW_THREAD,
  buildProjectUrl,
  forgetProjectThread,
  isThreadUuid,
  parsePanelState,
  rememberPanel,
  rememberProjectThread,
  rememberedPanel,
  rememberedProjectThread,
  samePanelState,
} from './navMemory';

const T1 = '11111111-2222-3333-4444-555555555555';
const T2 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('address format', () => {
  it('round-trips a screen panel with its chat', () => {
    const url = buildProjectUrl(9, {
      thread: T1,
      panel: { view: 'screen', folder: 'budget', tab: 'budget' },
    });
    expect(url).toBe(`/w/projects/9?thread=${T1}&view=screen&folder=budget&tab=budget`);
    const parsed = parsePanelState(new URLSearchParams(url.split('?')[1]));
    expect(parsed).toEqual({ view: 'screen', folder: 'budget', tab: 'budget' });
  });

  it('carries an open artifact', () => {
    const url = buildProjectUrl(17, { thread: T1, panel: { view: 'artifacts', artifact: 187 } });
    expect(parsePanelState(new URLSearchParams(url.split('?')[1]))).toEqual({
      view: 'artifacts',
      artifact: 187,
    });
  });

  it('a bare project address names no chat and no panel', () => {
    expect(buildProjectUrl(9)).toBe('/w/projects/9');
    expect(parsePanelState(new URLSearchParams(''))).toEqual({});
  });

  it('ignores an unknown view and a junk artifact id', () => {
    expect(parsePanelState(new URLSearchParams('view=nope&artifact=abc'))).toEqual({});
  });

  it('a blank chat is thread=new, which is not a chat id', () => {
    expect(buildProjectUrl(9, { thread: NEW_THREAD })).toBe('/w/projects/9?thread=new');
    expect(isThreadUuid(NEW_THREAD)).toBe(false);
    expect(isThreadUuid(T1)).toBe(true);
  });

  it('compares panel states field by field', () => {
    expect(samePanelState({ view: 'map' }, { view: 'map' })).toBe(true);
    expect(samePanelState({ view: 'map' }, { view: 'screen' })).toBe(false);
    expect(samePanelState({ view: 'artifacts', artifact: 1 }, { view: 'artifacts' })).toBe(false);
  });
});

describe('memory', () => {
  beforeEach(() => store.clear());

  it('Rule 2: each chat remembers its own panel', () => {
    rememberPanel(T1, { view: 'screen', folder: 'budget' });
    rememberPanel(T2, { view: 'artifacts', artifact: 42 });
    expect(rememberedPanel(T1)).toEqual({ view: 'screen', folder: 'budget' });
    expect(rememberedPanel(T2)).toEqual({ view: 'artifacts', artifact: 42 });
  });

  it('Rule 1: each project remembers its last chat, independently', () => {
    rememberProjectThread(9, T1);
    rememberProjectThread(17, T2);
    expect(rememberedProjectThread(9)).toBe(T1);
    expect(rememberedProjectThread(17)).toBe(T2);
    rememberProjectThread(9, T2);
    expect(rememberedProjectThread(9)).toBe(T2);
  });

  it('a first visit remembers nothing', () => {
    expect(rememberedProjectThread(3)).toBeNull();
    expect(rememberedPanel(T1)).toBeNull();
  });

  it('never records a blank chat or an empty panel', () => {
    rememberProjectThread(9, NEW_THREAD);
    rememberPanel(NEW_THREAD, { view: 'map' });
    rememberPanel(T1, {});
    expect(rememberedProjectThread(9)).toBeNull();
    expect(rememberedPanel(T1)).toBeNull();
  });

  it('forgets a project chat that no longer exists', () => {
    rememberProjectThread(9, T1);
    forgetProjectThread(9);
    expect(rememberedProjectThread(9)).toBeNull();
  });
});
