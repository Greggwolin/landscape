'use client';

import React from 'react';
import { CAlert, CCard, CCardBody } from '@coreui/react';
import { Monitor } from 'lucide-react';

export default function MobileWarning() {
  return (
    <div className="py-4">
      <CCard>
        <CCardBody className="text-center py-5">
          <Monitor size={48} className="mb-3 text-medium-emphasis" />
          <h4>Desktop Only</h4>
          <CAlert color="info" className="d-inline-block text-start mb-0">
            The Category Taxonomy Manager requires a larger screen. Please use a desktop or tablet
            device with a minimum width of 768px.
          </CAlert>
        </CCardBody>
      </CCard>
    </div>
  );
}
