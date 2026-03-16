/**
 * Guide Content Types
 *
 * Type definitions for the in-app User Guide data structure.
 * Content is defined in src/data/guideContent.ts — these types enforce structure.
 */

export type GuideBlock =
  | { type: 'prose'; text: string }
  | { type: 'screenshot'; src: string; alt: string; caption: string }
  | { type: 'callout'; label: string; text: string }
  | { type: 'subsection'; number: string; title: string; blocks: GuideBlock[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface GuideSection {
  /** Section ID used as anchor hash, e.g. "4.2" */
  id: string;
  /** Section title, e.g. "The Persistent Assistant" */
  title: string;
  /** Content blocks within this section */
  content: GuideBlock[];
}

export interface GuideChapter {
  /** Chapter ID, e.g. "4" or "A" */
  id: string;
  /** Display number, e.g. "4" or "A" */
  number: string;
  /** Chapter title, e.g. "Introduction to Landscaper" */
  title: string;
  /** Optional italic subtitle below chapter title */
  subtitle?: string;
  /** Sidebar group label, e.g. "Getting Started" */
  group: string;
  /** Sections within this chapter */
  sections: GuideSection[];
}
