'use client';

import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CSpinner,
} from '@coreui/react';

interface RenameModalProps {
  visible: boolean;
  onClose: () => void;
  docId: number;
  projectId: number;
  currentName: string;
  onRename: (newName: string) => Promise<void>;
}

export default function RenameModal({
  visible,
  onClose,
  docId: _docId,
  projectId: _projectId,
  currentName,
  onRename,
}: RenameModalProps) {
  // docId and projectId reserved for future API calls if needed
  void _docId;
  void _projectId;
  const [newName, setNewName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with new document
  useEffect(() => {
    if (visible) {
      setNewName(currentName);
      setError(null);
    }
  }, [visible, currentName]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === currentName) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onRename(newName.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleRename();
    }
  };

  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Rename Document</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <div className="mb-3">
          <CFormLabel htmlFor="filename">Filename</CFormLabel>
          <CFormInput
            id="filename"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />
        </div>
        {error && <p className="text-danger small mb-0">{error}</p>}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleRename}
          disabled={isLoading || !newName.trim()}
        >
          {isLoading ? <CSpinner size="sm" /> : 'Rename'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
