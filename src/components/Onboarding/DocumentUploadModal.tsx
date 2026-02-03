'use client';

import { useMemo, useState } from 'react';
import { DocumentAnalysis } from '@/services/landscaperProfile';

interface DocumentUploadModalProps {
  open: boolean;
  analysis: DocumentAnalysis | null;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}

export default function DocumentUploadModal({ open, analysis, onConfirm, onCancel }: DocumentUploadModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const hasConfidentiality = analysis?.confidentiality_flag;
  const markers = analysis?.confidential_markers ?? [];
  const buttonLabel = hasConfidentiality ? 'Proceed' : 'I Understand';
  const description = useMemo(() => {
    if (!analysis) return '';
    if (hasConfidentiality) {
      return `I noticed this document contains ${markers.join(', ')}. Please confirm you want it stored.`;
    }
    return 'This document will be stored in your private DMS. It trains your Landscaper and is never shared with Landscape staff.';
  }, [analysis, hasConfidentiality]);

  if (!open || !analysis) return null;

  const handleConfirmClick = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div
        className="w-full max-w-lg rounded-3xl p-6"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--cui-border-color)' }}
      >
        <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {hasConfidentiality ? 'Confidentiality Check' : 'Document Storage Confirmation'}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
          {description}
        </p>
        <div
          className="rounded-2xl p-4 border"
          style={{
            borderColor: 'var(--cui-border-color)',
            backgroundColor: 'var(--surface-card-header)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {analysis.summary}
          </p>
        </div>
        {markers.length > 0 && (
          <div className="mt-3 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            Detected markers: {markers.join(', ')}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--cui-border-color)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isProcessing}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: isProcessing ? 'var(--line-soft)' : 'var(--cui-primary)',
              color: 'var(--text-inverse)',
            }}
          >
            {isProcessing ? 'Working…' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
