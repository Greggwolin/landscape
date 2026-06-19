/**
 * Export the in-app User Guide content to a flat JSON corpus for backend
 * ingestion into the Landscaper reference brain (tbl_platform_knowledge*).
 *
 * Produces one record per (chapter, section, ui_path):
 *   - ui_path 'shared'  → the concept body (non-switch blocks)
 *   - ui_path 'chat'    → the chat-first steps from any uiswitch block
 *   - ui_path 'classic' → the classic-tabbed steps from any uiswitch block
 *
 * The ui_path tag lets retrieval prefer the steps for the user's current
 * interface, so the assistant answers "in the classic UI, go to the Valuation
 * folder…" grounded in the verified guide text.
 *
 * Run (from repo root):
 *   npx ts-node --transpile-only \
 *     --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/guide/export-guide-corpus.ts
 *
 * Output: backend/data/guide_corpus.json (committed).
 */
import * as fs from 'fs';
import * as path from 'path';
import { guideChapters } from '../../src/data/guideContent';
import type { GuideBlock } from '../../src/types/guide';

interface CorpusRecord {
  chapter_id: string;
  chapter_number: string;
  chapter_title: string;
  group: string;
  section_id: string;
  section_title: string;
  ui_path: 'shared' | 'chat' | 'classic';
  text: string;
}

/** Flatten an array of non-switch blocks to plain text. */
function flattenBlocks(blocks: GuideBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'prose':
        parts.push(b.text);
        break;
      case 'callout':
        parts.push(`${b.label}: ${b.text}`);
        break;
      case 'screenshot':
        if (b.caption) parts.push(b.caption);
        break;
      case 'table': {
        parts.push(b.headers.join(' | '));
        for (const row of b.rows) parts.push(row.join(' | '));
        break;
      }
      case 'subsection': {
        const inner = flattenBlocks(b.blocks);
        parts.push(b.title ? `${b.title}\n${inner}` : inner);
        break;
      }
      // uiswitch handled separately by the caller
      default:
        break;
    }
  }
  return parts.filter(Boolean).join('\n');
}

const records: CorpusRecord[] = [];

for (const ch of guideChapters) {
  for (const section of ch.sections) {
    const header = `${ch.number} ${ch.title} — ${section.title}`;

    const sharedBlocks = section.content.filter(b => b.type !== 'uiswitch');
    const chatBlocks: GuideBlock[] = [];
    const classicBlocks: GuideBlock[] = [];
    for (const b of section.content) {
      if (b.type === 'uiswitch') {
        chatBlocks.push(...b.chat);
        classicBlocks.push(...b.classic);
      }
    }

    const push = (ui_path: CorpusRecord['ui_path'], body: string) => {
      if (!body.trim()) return;
      records.push({
        chapter_id: ch.id,
        chapter_number: ch.number,
        chapter_title: ch.title,
        group: ch.group,
        section_id: section.id,
        section_title: section.title,
        ui_path,
        text: `${header}\n\n${body}`,
      });
    };

    push('shared', flattenBlocks(sharedBlocks));
    push('chat', flattenBlocks(chatBlocks));
    push('classic', flattenBlocks(classicBlocks));
  }
}

const outDir = path.resolve(__dirname, '../../backend/data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'guide_corpus.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2),
);

console.log(`Wrote ${records.length} records to ${outPath}`);
