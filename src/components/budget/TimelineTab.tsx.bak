'use client';

import { CAlert } from '@coreui/react';

interface TimelineTabProps {
  projectId: number;
}

export default function TimelineTab({ projectId }: TimelineTabProps) {
  return (
    <div>
      {/* Info alert */}
      <CAlert color="info" className="mb-4">
        <h4 className="alert-heading">Gantt Timeline View</h4>
        <p>Full-width custom SVG Gantt chart will be implemented here.</p>
        <hr />
        <p className="mb-2">This will show the same data as Budget Grid but in pure timeline format with:</p>
        <ul className="mb-0">
          <li>Period markers (Month 1, 2, 3...)</li>
          <li>Horizontal bars for each budget item</li>
          <li>Color-coding by scope (Acquisition, Stage 1-3)</li>
          <li>Interactive bar selection</li>
        </ul>
      </CAlert>

      {/* Timeline placeholder */}
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          height: '500px',
          border: '2px dashed var(--cui-border-color)',
          borderRadius: '8px',
          backgroundColor: 'var(--cui-tertiary-bg)'
        }}
      >
        <div className="text-center" style={{ color: 'var(--cui-secondary-color)' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
          <p className="h5">Full-Width Gantt Timeline</p>
        </div>
      </div>
    </div>
  );
}
