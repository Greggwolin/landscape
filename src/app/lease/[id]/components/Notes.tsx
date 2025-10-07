'use client';

import type { LeaseData } from '../../types';

interface NotesProps {
  data: LeaseData;
  onUpdate: (section: keyof LeaseData, field: string, value: unknown) => void;
}

const Notes: React.FC<NotesProps> = ({ data, onUpdate }) => {
  return (
    <div className="tab-section" id="notes">
      <div className="section-title">Notes & Documentation</div>
      <div className="section-subtitle">Contacts, notes, and supporting files</div>

      <div className="card-grid card-grid-2" style={{ marginTop: 20 }}>
        <div className="info-card">
          <h3 className="card-title">Internal Notes</h3>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={6}
              value={data.lease.notes ?? ''}
              onChange={(event) => onUpdate('lease', 'notes', event.target.value)}
            />
          </div>
        </div>

        <div className="info-card">
          <h3 className="card-title">Key Contacts</h3>
          <div className="form-group">
            <label className="form-label">Primary Contact</label>
            <input
              className="form-control"
              value={data.lease.tenant_contact ?? ''}
              onChange={(event) => onUpdate('lease', 'tenant_contact', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-control"
              value={data.lease.tenant_phone ?? ''}
              onChange={(event) => onUpdate('lease', 'tenant_phone', event.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              value={data.lease.tenant_email ?? ''}
              onChange={(event) => onUpdate('lease', 'tenant_email', event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="info-card" style={{ marginTop: 24 }}>
        <h3 className="card-title">Attachments</h3>
        <div className="helper-text">
          Attachments coming soon. Drop files into the document management module for now.
        </div>
      </div>
    </div>
  );
};

export default Notes;
