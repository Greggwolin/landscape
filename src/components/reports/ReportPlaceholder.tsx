'use client';

import React from 'react';
import { CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilInfo } from '@coreui/icons';
import type { ReportDefinition } from '@/types/report-definitions';
import { READINESS_CONFIG } from '@/types/report-definitions';

interface ReportPlaceholderProps {
  definition: ReportDefinition;
  message?: string;
}

export default function ReportPlaceholder({ definition, message }: ReportPlaceholderProps) {
  const readiness = READINESS_CONFIG[definition.data_readiness] || READINESS_CONFIG.not_ready;

  return (
    <CCard className="h-100">
      <CCardBody className="d-flex flex-column align-items-center justify-content-center p-4"
        style={{ minHeight: '400px' }}
      >
        <CIcon icon={cilInfo} size="3xl" style={{ color: 'var(--cui-secondary-color)', marginBottom: '16px' }} />
        <h4 style={{ color: 'var(--cui-body-color)', marginBottom: '8px' }}>
          {definition.report_name}
        </h4>
        <span
          className={`badge bg-${readiness.color} mb-3`}
          style={{ fontSize: '0.75rem' }}
        >
          {readiness.label}
        </span>
        <p style={{
          color: 'var(--cui-secondary-color)',
          textAlign: 'center',
          maxWidth: '500px',
          marginBottom: '12px',
        }}>
          {message || 'This report is under development.'}
        </p>
        {definition.description && (
          <p style={{
            color: 'var(--cui-tertiary-color)',
            textAlign: 'center',
            maxWidth: '500px',
            fontSize: '0.85rem',
          }}>
            {definition.description}
          </p>
        )}
        {definition.argus_equivalent && (
          <p style={{
            color: 'var(--cui-tertiary-color)',
            fontSize: '0.8rem',
            fontStyle: 'italic',
          }}>
            ARGUS equivalent: {definition.argus_equivalent}
          </p>
        )}
      </CCardBody>
    </CCard>
  );
}
