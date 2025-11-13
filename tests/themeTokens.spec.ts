import fs from 'fs';
import path from 'path';
import { contrastRatio } from '@/test-utils/contrast';

type TokenMap = Map<string, string>;

const TOKENS_PATH = path.join(process.cwd(), 'src', 'styles', 'tokens.css');

function loadRootTokens(): TokenMap {
  const css = fs.readFileSync(TOKENS_PATH, 'utf8');
  const rootMatch = css.match(/:root\s*{([\s\S]*?)}/);
  if (!rootMatch) {
    throw new Error('Unable to find :root block in tokens.css');
  }

  const lines = rootMatch[1].split('\n');
  const map: TokenMap = new Map();
  const tokenRegex = /--([a-z0-9-]+):\s*([^;]+);/i;

  lines.forEach((line) => {
    const match = line.match(tokenRegex);
    if (match) {
      const [, name, value] = match;
      map.set(name.trim(), value.trim());
    }
  });

  return map;
}

function resolveToken(tokens: TokenMap, name: string, seen: Set<string> = new Set()): string {
  const value = tokens.get(name);
  if (!value) {
    throw new Error(`Token "${name}" not found in tokens.css`);
  }

  if (value.startsWith('var(')) {
    const inner = value.match(/var\((--[a-z0-9-]+)\)/i);
    if (!inner) {
      throw new Error(`Unable to parse variable reference for token "${name}"`);
    }
    const referenced = inner[1].replace(/^--/, '');
    if (seen.has(referenced)) {
      throw new Error(`Circular token reference detected for "${name}"`);
    }
    seen.add(referenced);
    return resolveToken(tokens, referenced, seen);
  }

  return value;
}

function ensureHex(value: string, tokenName: string) {
  const trimmed = value.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    throw new Error(`Token "${tokenName}" does not resolve to a hex color. Got: ${value}`);
  }
  return trimmed.toLowerCase();
}

describe('Theme token contrast compliance', () => {
  const tokens = loadRootTokens();
  const thresholds: Array<{ fg: string; bg: string; description: string }> = [
    { fg: 'nav-text', bg: 'nav-bg', description: 'nav-text vs nav-bg' },
    { fg: 'text-primary', bg: 'surface-bg', description: 'text-primary vs surface-bg' },
    { fg: 'text-inverse', bg: 'chip-info', description: 'text-inverse vs chip-info' },
    { fg: 'text-inverse', bg: 'parcel-commercial', description: 'text-inverse vs parcel-commercial' },
  ];

  thresholds.forEach(({ fg, bg, description }) => {
    test(`${description} meets WCAG AA`, () => {
      const fgHex = ensureHex(resolveToken(tokens, fg), fg);
      const bgHex = ensureHex(resolveToken(tokens, bg), bg);
      const ratio = contrastRatio(fgHex, bgHex);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
