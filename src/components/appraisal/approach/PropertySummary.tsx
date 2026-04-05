/**
 * PropertySummary
 *
 * Property Details pill view — grouped collapsible sections with progress bars.
 * Double-clicking "Total Units" opens the unit mix detail panel.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — Reworked from flat list to 6 accordion sections
 */

'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { AccordionSection } from '../shared/AccordionSection';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function PropertySummary({ onOpenDetail }: Props) {
  return (
    <>
      <div className="ps-section-title">
        Physical Description
      </div>

      {/* Property Identification — 10/10 */}
      <AccordionSection title="Property Identification" progress={{ filled: 10, total: 10, color: 'full' }}>
        <ProformaRow dot="green" label="Property Name" value="Chadron Terrace" />
        <ProformaRow dot="green" label="Street Address" value="14105 Chadron Ave" />
        <ProformaRow dot="green" label="City" value="Hawthorne" />
        <ProformaRow dot="green" label="State" value="CA" />
        <ProformaRow dot="green" label="ZIP" value="90250" />
        <ProformaRow dot="green" label="Market (MSA)" value="Los Angeles County" />
        <ProformaRow dot="green" label="Submarket" value="South Bay" />
        <ProformaRow dot="green" label="County" value="Los Angeles" />
        <ProformaRow dot="green" label="APN (Primary)" value="4052-022-015" />
        <ProformaRow dot="green" label="APN (Secondary)" value="4052-022-016" />
      </AccordionSection>

      {/* Site Characteristics — 5/11 */}
      <AccordionSection title="Site Characteristics" progress={{ filled: 5, total: 11, color: 'low' }}>
        <ProformaRow dot="green" label="Lot Size (Acres)" value="3.2 ac" />
        <ProformaRow dot="green" label="Lot Size (SF)" value="139,392 SF" />
        <ProformaRow dot="green" label="Shape" value="Rectangular" />
        <ProformaRow dot="green" label="Topography" value="Level" />
        <ProformaRow dot="green" label="Flood Zone" value="Zone X" />
        <ProformaRow dot="empty" label="Utilities" value="—" isWaiting />
        <ProformaRow dot="empty" label="Street Frontage" value="—" isWaiting />
        <ProformaRow dot="empty" label="Access" value="—" isWaiting />
        <ProformaRow dot="empty" label="Environmental" value="—" isWaiting />
        <ProformaRow dot="empty" label="Easements" value="—" isWaiting />
        <ProformaRow dot="empty" label="Zoning" value="—" isWaiting />
      </AccordionSection>

      {/* Building Characteristics — 5/10 */}
      <AccordionSection title="Building Characteristics" progress={{ filled: 5, total: 10, color: 'partial' }}>
        <ProformaRow
          dot="green"
          label="Total Units"
          value="64"
          onDoubleClick={() => onOpenDetail('unitmix', 'Unit Mix — Floor Plan Matrix')}
        />
        <ProformaRow dot="green" label="Gross Building SF" value="52,480 SF" />
        <ProformaRow dot="green" label="Stories" value="2" />
        <ProformaRow dot="green" label="Year Built" value="1998" />
        <ProformaRow dot="green" label="Building Class" value="Multifamily" />
        <ProformaRow dot="empty" label="Construction Type" value="—" isWaiting />
        <ProformaRow dot="empty" label="Roof" value="—" isWaiting />
        <ProformaRow dot="empty" label="Foundation" value="—" isWaiting />
        <ProformaRow dot="empty" label="HVAC" value="—" isWaiting />
        <ProformaRow dot="empty" label="Elevator" value="—" isWaiting />
      </AccordionSection>

      {/* Parking & Access — 0/3 */}
      <AccordionSection title="Parking & Access" defaultOpen={false} progress={{ filled: 0, total: 3, color: 'empty' }}>
        <ProformaRow dot="empty" label="Parking Type" value="—" isWaiting />
        <ProformaRow dot="empty" label="Parking Ratio" value="—" isWaiting />
        <ProformaRow dot="empty" label="Total Spaces" value="—" isWaiting />
      </AccordionSection>

      {/* Condition & Quality — 1/5 */}
      <AccordionSection title="Condition & Quality" defaultOpen={false} progress={{ filled: 1, total: 5, color: 'low' }}>
        <ProformaRow dot="green" label="Effective Age" value="10 years" />
        <ProformaRow dot="empty" label="Condition Rating" value="—" isWaiting />
        <ProformaRow dot="empty" label="Quality Rating" value="—" isWaiting />
        <ProformaRow dot="empty" label="Remaining Economic Life" value="—" isWaiting />
        <ProformaRow dot="empty" label="Recent Renovations" value="—" isWaiting />
      </AccordionSection>

      {/* Walkability Scores — 2/3 */}
      <AccordionSection title="Walkability Scores" defaultOpen={false} progress={{ filled: 2, total: 3, color: 'partial' }}>
        <ProformaRow dot="green" label="Walk Score" value="78" />
        <ProformaRow dot="green" label="Bike Score" value="75" />
        <ProformaRow dot="empty" label="Transit Score" value="—" isWaiting />
      </AccordionSection>
    </>
  );
}
