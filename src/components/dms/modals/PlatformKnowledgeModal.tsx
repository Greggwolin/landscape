'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react';

const DOMAIN_OPTIONS = [
 'Operating Expenses',
 'Valuation Methodology',
 'Market Data',
 'Legal/Regulatory',
 'Cost Estimation',
 'Other'
];

const PROPERTY_TYPE_OPTIONS = [
 'Multifamily',
 'Retail',
 'Office',
 'Industrial',
 'Land Development',
 'All'
];

const SOURCE_OPTIONS = [
 'IREM',
 'Appraisal Institute',
 'USPAP',
 'NAA',
 'BOMA',
 'Internal',
 'Other'
];

const GEO_SCOPE_OPTIONS = [
 'National',
 'Regional',
 'State',
 'MSA/Metro',
 'Local'
];

export interface PlatformKnowledgeMetadata {
 knowledge_domain: string;
 property_types: string[];
 source: string;
 year?: number | null;
 geographic_scope: string;
 supersedes?: string;
}

interface PlatformKnowledgeModalProps {
 visible: boolean;
 fileName: string;
 analysis: string;
 estimatedChunks?: number | null;
 initialValues: PlatformKnowledgeMetadata;
 onClose: () => void;
 onConfirm: (values: PlatformKnowledgeMetadata) => void;
 isSubmitting?: boolean;
}

export default function PlatformKnowledgeModal({
 visible,
 fileName,
 analysis,
 estimatedChunks,
 initialValues,
 onClose,
 onConfirm,
 isSubmitting = false
}: PlatformKnowledgeModalProps) {
 const [formValues, setFormValues] = useState<PlatformKnowledgeMetadata>(initialValues);

 useEffect(() => {
 setFormValues(initialValues);
 }, [initialValues]);

 const yearValue = useMemo(() => (formValues.year ? String(formValues.year) : ''), [formValues.year]);

 return (
 <CModal visible={visible} onClose={onClose} size="lg" alignment="center">
 <CModalHeader>
 <CModalTitle>Catalog Platform Knowledge</CModalTitle>
 </CModalHeader>
 <CModalBody className="space-y-4">
 <div className="text-sm font-medium">{fileName}</div>

 <div className="rounded-lg border border bg-body-tertiary p-3 text-sm text-body-secondary">
 <div className="text-xs uppercase tracking-[0.2em] text-body-tertiary mb-2">Landscaper Analysis</div>
 {analysis}
 </div>

 <div className="rounded-lg border border p-3">
 <div className="text-xs uppercase tracking-[0.2em] text-body-tertiary mb-2">Suggested Cataloging</div>

 <div className="grid grid-cols-1 gap-3">
 <div>
 <label className="text-xs font-medium text-body-secondary">Knowledge Domain</label>
 <select
 className="mt-1 w-full rounded-md border border bg-body px-3 py-2 text-sm"
 value={formValues.knowledge_domain}
 onChange={(event) => setFormValues((prev) => ({ ...prev, knowledge_domain: event.target.value }))}
 >
 {DOMAIN_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-xs font-medium text-body-secondary">Property Types</label>
 <div className="mt-2 flex flex-wrap gap-3">
 {PROPERTY_TYPE_OPTIONS.map((option) => (
 <label key={option} className="flex items-center gap-2 text-xs text-body-secondary">
 <input
 type="checkbox"
 checked={formValues.property_types.includes(option)}
 onChange={(event) => {
 setFormValues((prev) => {
 const next = new Set(prev.property_types);
 if (event.target.checked) {
 next.add(option);
 } else {
 next.delete(option);
 }
 return { ...prev, property_types: Array.from(next) };
 });
 }}
 />
 {option}
 </label>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-medium text-body-secondary">Source</label>
 <select
 className="mt-1 w-full rounded-md border border bg-body px-3 py-2 text-sm"
 value={formValues.source}
 onChange={(event) => setFormValues((prev) => ({ ...prev, source: event.target.value }))}
 >
 {SOURCE_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-body-secondary">Year</label>
 <input
 type="text"
 className="mt-1 w-full rounded-md border border bg-body px-3 py-2 text-sm"
 value={yearValue}
 onChange={(event) => {
 const nextValue = event.target.value.replace(/[^\d]/g, '');
 setFormValues((prev) => ({
 ...prev,
 year: nextValue ? parseInt(nextValue, 10) : null
 }));
 }}
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-medium text-body-secondary">Geographic Scope</label>
 <select
 className="mt-1 w-full rounded-md border border bg-body px-3 py-2 text-sm"
 value={formValues.geographic_scope}
 onChange={(event) => setFormValues((prev) => ({ ...prev, geographic_scope: event.target.value }))}
 >
 {GEO_SCOPE_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-xs font-medium text-body-secondary">Supersedes (optional)</label>
 <input
 type="text"
 className="mt-1 w-full rounded-md border border bg-body px-3 py-2 text-sm"
 value={formValues.supersedes || ''}
 onChange={(event) => setFormValues((prev) => ({ ...prev, supersedes: event.target.value }))}
 />
 </div>
 </div>
 </div>

 <div className="text-xs text-body-tertiary">
 Ready to index: This document will be split into approximately {estimatedChunks ?? '—'} searchable sections.
 </div>
 </CModalBody>
 <CModalFooter>
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-sm rounded-md border border"
 disabled={isSubmitting}
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => onConfirm(formValues)}
 className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
 disabled={isSubmitting}
 >
 {isSubmitting ? 'Processing...' : 'Confirm & Process'}
 </button>
 </CModalFooter>
 </CModal>
 );
}
