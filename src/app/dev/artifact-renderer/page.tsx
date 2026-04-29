'use client';

/**
 * Phase 2 verification route for the generative artifact renderer.
 *
 * Renders five hardcoded sample schemas covering all four block types plus
 * a combined real-world T-12 schema. Inline edits log RFC-6902 JSON Patch
 * to the console; edit-modal buttons log the modal name. No backend writes
 * happen from this route.
 *
 * Spec: SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §7, §8
 */

import React, { useState } from 'react';
import { ArtifactRenderer } from '@/components/wrapper/ArtifactRenderer';
import type {
  BlockDocument,
  CurrentValueMap,
  EditTarget,
  JsonPatchOp,
  SourcePointersMap,
} from '@/types/artifact';

interface SampleProps {
  name: string;
  description: string;
  artifactId: number;
  title: string;
  schema: BlockDocument;
  sourcePointers?: SourcePointersMap;
  currentValues?: CurrentValueMap;
  removedRowPaths?: Set<string>;
  newRowsAvailable?: boolean;
  editTarget?: EditTarget;
  pinnedLabel?: string | null;
}

export default function ArtifactRendererDevPage() {
  return (
    <div style={{ background: 'var(--cui-body-bg)', minHeight: '100vh', padding: '20px 16px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', color: 'var(--cui-body-color)' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Phase 2 Verification — ArtifactRenderer</h1>
          <p style={{ fontSize: 13, color: 'var(--cui-secondary-color)', lineHeight: 1.5 }}>
            All four block types should render below. Drift indicators on the table block. Inline
            edits on <code>editable: true</code> cells emit a JSON Patch via <code>onUpdate</code>{' '}
            (logged to console). Edit button stubs log the modal name. No backend writes from this
            route.
          </p>
        </header>

        <SampleSection
          name="1. Section block"
          description="Minimal section with one nested text block. Click the section header to collapse."
          artifactId={9001}
          title="Section block — minimal"
          schema={SECTION_SCHEMA}
        />

        <SampleSection
          name="2. Table block (with drift)"
          description="Operating-statement-style table with editable values column. Two stale rows, one removed row, one unchanged. Banner above the table for new-rows-available."
          artifactId={9002}
          title="Table block — operating expenses"
          schema={TABLE_SCHEMA}
          sourcePointers={TABLE_SOURCE_POINTERS}
          currentValues={TABLE_CURRENT_VALUES}
          removedRowPaths={new Set(['blocks/0/rows/3'])}
          newRowsAvailable
          editTarget={{ modal_name: 'operating_statement' }}
        />

        <SampleSection
          name="3. Key-value grid"
          description="4 pairs, mix of editable and read-only. 2-column layout."
          artifactId={9003}
          title="Key-value grid — property summary"
          schema={KV_SCHEMA}
          editTarget={{ modal_name: 'property_details' }}
        />

        <SampleSection
          name="4. Text block (three variants)"
          description="One paragraph each: body, caption, callout. Restricted markdown — **bold** and *italic* only."
          artifactId={9004}
          title="Text block — variants"
          schema={TEXT_SCHEMA}
        />

        <SampleSection
          name="5. Combined real-world T-12"
          description="Full T-12 schema from spec §7.3. Multiple sections, a key-value grid, and a table with source pointers. Edit button uses a list (synthesis edit_target)."
          artifactId={9005}
          title="Operating Statement — T-12 ending April 2026"
          schema={REAL_WORLD_T12_SCHEMA}
          sourcePointers={T12_SOURCE_POINTERS}
          currentValues={T12_CURRENT_VALUES}
          editTarget={[
            { modal_name: 'operating_statement', label: 'Operating Statement' },
            { modal_name: 'rent_roll', label: 'Rent Roll (revenue source)' },
          ]}
          pinnedLabel="Lender T-12 — May submission"
        />

        <SampleSection
          name="6. Unknown block type (schema warning)"
          description="Includes a block with type='unsupported' to verify the schema-warning indicator and console.warn behavior."
          artifactId={9006}
          title="Schema validation — unknown block"
          schema={UNKNOWN_BLOCK_SCHEMA}
        />
      </div>
    </div>
  );
}

function SampleSection(props: SampleProps) {
  const [pinnedLabel, setPinnedLabel] = useState<string | null>(props.pinnedLabel ?? null);

  const handleUpdate = (patch: JsonPatchOp[]) => {
     
    console.log(`[${props.name}] onUpdate JSON Patch:`, JSON.stringify(patch, null, 2));
  };

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, marginBottom: 2 }}>{props.name}</h2>
        <p style={{ fontSize: 11, color: 'var(--cui-secondary-color)', margin: 0 }}>{props.description}</p>
      </div>
      <div
        style={{
          height: 420,
          border: '1px solid var(--cui-border-color)',
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--cui-body-bg)',
        }}
      >
        <ArtifactRenderer
          artifactId={props.artifactId}
          title={props.title}
          schema={props.schema}
          sourcePointers={props.sourcePointers}
          currentValues={props.currentValues}
          removedRowPaths={props.removedRowPaths}
          newRowsAvailable={props.newRowsAvailable}
          editTarget={props.editTarget}
          pinnedLabel={pinnedLabel}
          onClose={() => console.log(`[${props.name}] onClose`)}
          onUpdate={handleUpdate}
          onPin={(label) => {
            console.log(`[${props.name}] onPin ${label}`);
            setPinnedLabel(label);
          }}
          onUnpin={() => {
            console.log(`[${props.name}] onUnpin`);
            setPinnedLabel(null);
          }}
          onSaveAsNewVersion={(label) => console.log(`[${props.name}] onSaveAsNewVersion ${label || '(no label)'}`)}
          onOpenModal={(modalName) => console.log(`[${props.name}] onOpenModal ${modalName}`)}
        />
      </div>
    </section>
  );
}

/* ─── Sample schemas ──────────────────────────────────────────────────── */

const SECTION_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'section',
      id: 'sec_intro',
      title: 'Introduction',
      collapsed: false,
      children: [
        {
          type: 'text',
          id: 'txt_intro_body',
          content:
            'A **section** block holds nested children. Use it to group related blocks. Sections are collapsible — click the header. Restricted markdown is supported — *italic* and **bold**.',
          variant: 'body',
        },
      ],
    },
  ],
};

const TABLE_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'table',
      id: 'tbl_opex',
      title: 'Operating Expenses (T-12)',
      columns: [
        { key: 'line', label: 'Line Item', align: 'left' },
        { key: 'annual', label: 'Annual', align: 'right' },
        { key: 'per_unit', label: '$/Unit', align: 'right' },
      ],
      rows: [
        {
          id: 'real_estate_taxes',
          cells: { line: 'Real Estate Taxes', annual: 573900, per_unit: 5079 },
          source_ref: {
            table: 'core_fin_fact_actual',
            row_id: 8901,
            column: 'annual',
            captured_at: '2026-04-15T18:00:00Z',
            captured_value: 573900,
          },
          editable: true,
        },
        {
          id: 'insurance',
          cells: { line: 'Insurance', annual: 142000, per_unit: 1257 },
          source_ref: {
            table: 'core_fin_fact_actual',
            row_id: 8902,
            column: 'annual',
            captured_at: '2026-04-15T18:00:00Z',
            captured_value: 142000,
          },
          editable: true,
        },
        {
          id: 'utilities',
          cells: { line: 'Utilities', annual: 88000, per_unit: 779 },
          source_ref: {
            table: 'core_fin_fact_actual',
            row_id: 8903,
            column: 'annual',
            captured_at: '2026-04-15T18:00:00Z',
            captured_value: 88000,
          },
          editable: true,
        },
        {
          // This row will be marked "removed" via removedRowPaths.
          id: 'pest_control',
          cells: { line: 'Pest Control', annual: 6200, per_unit: 55 },
          source_ref: {
            table: 'core_fin_fact_actual',
            row_id: 8904,
            column: 'annual',
            captured_at: '2026-04-15T18:00:00Z',
            captured_value: 6200,
          },
          editable: true,
        },
      ],
    },
  ],
};

// currentValues map drives drift detection — staleness = current ≠ captured.
const TABLE_CURRENT_VALUES: CurrentValueMap = {
  // taxes drifted up 5%
  'core_fin_fact_actual:8901': 602595,
  // insurance drifted up
  'core_fin_fact_actual:8902': 156200,
  // utilities unchanged
  'core_fin_fact_actual:8903': 88000,
  // pest_control: removed (handled via removedRowPaths)
  'core_fin_fact_actual:8904': 6200,
};

const TABLE_SOURCE_POINTERS: SourcePointersMap = {};

const KV_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'key_value_grid',
      id: 'kv_property_summary',
      title: 'Property Summary',
      columns: 2,
      pairs: [
        { label: 'Property', value: 'Chadron Terrace' },
        { label: 'Units', value: 113 },
        { label: 'Year Built', value: 1978, editable: true },
        { label: 'Renovated', value: 2019, editable: true },
        { label: 'Net Rentable Area', value: '92,400 SF' },
        { label: 'Avg Unit Size', value: '818 SF' },
      ],
    },
  ],
};

const TEXT_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'text',
      id: 'txt_body',
      content: 'This is a **body** text block. It supports *italic* and **bold** via restricted markdown. No other formatting tokens are interpreted.',
      variant: 'body',
    },
    {
      type: 'text',
      id: 'txt_caption',
      content: 'This is a *caption* — small italic text for footnotes or subtle commentary.',
      variant: 'caption',
    },
    {
      type: 'text',
      id: 'txt_callout',
      content: 'This is a **callout** — used for **important** points the user should not miss. Renders with a left border accent.',
      variant: 'callout',
    },
  ],
};

const REAL_WORLD_T12_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'section',
      id: 'header',
      title: 'Operating Statement — T-12 ending April 2026',
      children: [
        {
          type: 'key_value_grid',
          id: 'header_kv',
          columns: 2,
          pairs: [
            { label: 'Property', value: 'Chadron Terrace' },
            { label: 'Units', value: 113 },
            { label: 'Period', value: 'May 2025 – April 2026' },
            { label: 'Source', value: 'Combined: T-12 OM 2024.pdf + 2025 Actuals' },
          ],
        },
      ],
    },
    {
      type: 'section',
      id: 'income',
      title: 'Income',
      children: [
        {
          type: 'table',
          id: 'income_table',
          columns: [
            { key: 'line', label: 'Line Item', align: 'left' },
            { key: 'annual', label: 'Annual', align: 'right' },
            { key: 'per_unit', label: '$/Unit', align: 'right' },
          ],
          rows: [
            {
              id: 'gross_potential_rent',
              cells: { line: 'Gross Potential Rent', annual: 2300000, per_unit: 20354 },
              source_ref: {
                table: 'core_fin_fact_actual',
                row_id: 8821,
                column: 'annual',
                captured_at: '2026-04-15T18:00:00Z',
                captured_value: 2300000,
              },
              editable: true,
            },
            {
              id: 'vacancy_loss',
              cells: { line: 'Vacancy Loss', annual: -184000, per_unit: -1628 },
              editable: true,
            },
            {
              id: 'effective_gross_income',
              cells: { line: 'Effective Gross Income', annual: 2116000, per_unit: 18726 },
            },
          ],
        },
      ],
    },
    {
      type: 'section',
      id: 'expenses',
      title: 'Operating Expenses',
      children: [
        {
          type: 'table',
          id: 'expenses_table',
          columns: [
            { key: 'line', label: 'Line Item', align: 'left' },
            { key: 'annual', label: 'Annual', align: 'right' },
            { key: 'per_unit', label: '$/Unit', align: 'right' },
          ],
          rows: [
            {
              id: 'real_estate_taxes_t12',
              cells: { line: 'Real Estate Taxes', annual: 573900, per_unit: 5079 },
              source_ref: {
                table: 'core_fin_fact_actual',
                row_id: 8901,
                column: 'annual',
                captured_at: '2026-04-15T18:00:00Z',
                captured_value: 573900,
              },
              editable: true,
            },
            {
              id: 'insurance_t12',
              cells: { line: 'Insurance', annual: 142000, per_unit: 1257 },
              editable: true,
            },
            {
              id: 'utilities_t12',
              cells: { line: 'Utilities', annual: 88000, per_unit: 779 },
              editable: true,
            },
            {
              id: 'mgmt_fees_t12',
              cells: { line: 'Management Fees', annual: 84640, per_unit: 749 },
              editable: true,
            },
          ],
        },
      ],
    },
    {
      type: 'text',
      id: 'commentary',
      content:
        '*Source notes:* values derived from a combination of the **2024 OM** and **2025 actuals**. Real estate taxes refer to the most recent assessor billing.',
      variant: 'caption',
    },
  ],
};

// T-12 stale row: real_estate_taxes_t12 drifted +5%
const T12_CURRENT_VALUES: CurrentValueMap = {
  'core_fin_fact_actual:8821': 2300000, // unchanged
  'core_fin_fact_actual:8901': 602595, // drifted
};

const T12_SOURCE_POINTERS: SourcePointersMap = {};

const UNKNOWN_BLOCK_SCHEMA: BlockDocument = {
  blocks: [
    {
      type: 'text',
      id: 'txt_before',
      content: 'A *valid* text block before the unknown one.',
      variant: 'body',
    },
    // Cast through unknown to bypass TS so we can verify runtime rejection.
    {
      type: 'unsupported_block_type',
      id: 'unknown_block',
      data: 'this should be rejected with a console.warn + header indicator',
    } as unknown as BlockDocument['blocks'][number],
    {
      type: 'text',
      id: 'txt_after',
      content: 'A **valid** text block after — should still render.',
      variant: 'body',
    },
  ],
};
