'use client';

import React from 'react';
import { Monitor } from 'lucide-react';

export default function MobileWarning() {
  return (
    <div className="mobile-warning">
      <div className="mobile-warning-content">
        <Monitor size={48} className="mb-3 text-muted" />
        <h4>Desktop Only</h4>
        <p className="text-muted">
          The Category Taxonomy Manager requires a larger screen for optimal use.
        </p>
        <p className="text-muted">
          Please access this feature from a desktop or tablet device with a minimum width of 768px.
        </p>
      </div>
    </div>
  );
}
