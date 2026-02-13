'use client';

import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormTextarea,
  CSpinner,
} from '@coreui/react';
import { useState } from 'react';

interface ScenarioSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { scenario_name: string; description: string; tags: string[] }) => Promise<void>;
  defaultName?: string;
}

export function ScenarioSaveModal({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
}: ScenarioSaveModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Scenario name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave({ scenario_name: name.trim(), description: description.trim(), tags });
      // Reset form
      setName('');
      setDescription('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save scenario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CModal visible={isOpen} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Save Scenario</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {error && (
          <div className="alert alert-danger mb-3" role="alert">
            {error}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label fw-medium">Scenario Name *</label>
          <CFormInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Conservative Case"
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">Description</label>
          <CFormTextarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this scenario..."
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-medium">Tags</label>
          <CFormInput
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Comma-separated, e.g., optimistic, growth"
          />
          <div className="form-text">Separate multiple tags with commas</div>
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={loading || !name.trim()}>
          {loading ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Save Scenario'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
