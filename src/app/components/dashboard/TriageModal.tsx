'use client';

import React, { useState, useEffect } from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CBadge } from '@coreui/react';
import { Loader2, FileText, Building, Database, Plus, Check, X } from 'lucide-react';
import { LandscapeButton } from '@/components/ui/landscape';
import type { ProjectSummary } from '@/app/components/ProjectProvider';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  projects: ProjectSummary[];
  onNewProject: (files: File[]) => void;
  onAssociateWithProject: (projectId: number, files: File[]) => void;
  onAddToKnowledge: (files: File[]) => void;
}

interface ExtractionPreview {
  propertyName?: string;
  propertyType?: string;
  city?: string;
  state?: string;
  totalUnits?: number;
  confidence: number;
}

type TriageChoice = 'new' | 'associate' | 'knowledge' | null;

export default function TriageModal({
  isOpen,
  onClose,
  files,
  projects,
  onNewProject,
  onAssociateWithProject,
  onAddToKnowledge
}: TriageModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ExtractionPreview | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<TriageChoice>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analyze files when modal opens
  useEffect(() => {
    if (!isOpen || files.length === 0) {
      setPreview(null);
      setSelectedChoice(null);
      setSelectedProjectId(null);
      setError(null);
      return;
    }

    const analyzeFiles = async () => {
      setIsAnalyzing(true);
      setError(null);

      try {
        // Extract from first file for preview
        const formData = new FormData();
        formData.append('file', files[0]);

        const response = await fetch('/api/landscaper/extract-for-project', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok && result.extracted_fields) {
          const fields = result.extracted_fields;
          setPreview({
            propertyName: fields.property_name?.value || fields.project_name?.value,
            propertyType: fields.property_subtype?.value || fields.property_type?.value,
            city: fields.city?.value,
            state: fields.state?.value,
            totalUnits: fields.total_units?.value ? parseInt(fields.total_units.value) : undefined,
            confidence: calculateOverallConfidence(fields)
          });
        } else {
          setPreview({
            confidence: 0
          });
        }
      } catch (err) {
        console.error('Triage extraction error:', err);
        setError('Failed to analyze documents. You can still proceed manually.');
        setPreview({ confidence: 0 });
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeFiles();
  }, [isOpen, files]);

  const calculateOverallConfidence = (fields: Record<string, { value: unknown; confidence: number }>) => {
    const confidences = Object.values(fields).map(f => f.confidence);
    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  };

  const handleConfirm = () => {
    if (selectedChoice === 'new') {
      onNewProject(files);
      // Don't call onClose() - the handler will manage the transition
    } else if (selectedChoice === 'associate' && selectedProjectId) {
      onAssociateWithProject(selectedProjectId, files);
      onClose();
    } else if (selectedChoice === 'knowledge') {
      onAddToKnowledge(files);
      onClose();
    }
  };

  const getPropertyDescription = () => {
    if (!preview) return 'Analyzing...';

    const parts = [];
    if (preview.propertyName) parts.push(preview.propertyName);
    if (preview.totalUnits) parts.push(`${preview.totalUnits} units`);
    if (preview.propertyType) parts.push(preview.propertyType);
    if (preview.city && preview.state) parts.push(`${preview.city}, ${preview.state}`);
    else if (preview.city) parts.push(preview.city);

    return parts.length > 0 ? parts.join(' • ') : 'Property details not detected';
  };

  const fileNames = files.map(f => f.name).join(', ');

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Documents Received</CModalTitle>
      </CModalHeader>
      <CModalBody className="space-y-4">
        {/* File list */}
        <div className="rounded-lg border p-3" style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: 'var(--cui-tertiary-bg)'
        }}>
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 mt-0.5" style={{ color: 'var(--cui-primary)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {files.length} document{files.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--cui-secondary-color)' }}>
                {fileNames}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis status */}
        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing documents...
          </div>
        ) : preview ? (
          <div className="rounded-lg border p-3" style={{
            borderColor: 'var(--cui-border-color)',
            backgroundColor: preview.propertyName ? 'var(--cui-success-bg-subtle)' : 'var(--cui-tertiary-bg)'
          }}>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 mt-0.5" style={{
                color: preview.propertyName ? 'var(--cui-success)' : 'var(--cui-secondary-color)'
              }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  {preview.propertyName || 'Property details not detected'}
                </p>
                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  {getPropertyDescription()}
                </p>
                {preview.confidence > 0.7 && (
                  <CBadge color="success" className="mt-1">High confidence</CBadge>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded p-2">
            {error}
          </div>
        )}

        {/* Choice options */}
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
            What would you like to do?
          </p>

          {/* New Project option */}
          <button
            type="button"
            onClick={() => { setSelectedChoice('new'); setSelectedProjectId(null); }}
            className={`w-full rounded-lg border p-3 text-left transition-all ${
              selectedChoice === 'new' ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
              borderColor: selectedChoice === 'new' ? 'var(--cui-primary)' : 'var(--cui-border-color)',
              backgroundColor: selectedChoice === 'new' ? 'var(--cui-primary-bg-subtle)' : 'transparent'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2" style={{ backgroundColor: 'var(--cui-primary-bg-subtle)' }}>
                <Plus className="h-4 w-4" style={{ color: 'var(--cui-primary)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Start New Project
                </p>
                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  Create a new project with these documents
                </p>
              </div>
              {selectedChoice === 'new' && (
                <Check className="h-5 w-5" style={{ color: 'var(--cui-primary)' }} />
              )}
            </div>
          </button>

          {/* Associate with existing option */}
          <button
            type="button"
            onClick={() => setSelectedChoice('associate')}
            className={`w-full rounded-lg border p-3 text-left transition-all ${
              selectedChoice === 'associate' ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
              borderColor: selectedChoice === 'associate' ? 'var(--cui-primary)' : 'var(--cui-border-color)',
              backgroundColor: selectedChoice === 'associate' ? 'var(--cui-primary-bg-subtle)' : 'transparent'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2" style={{ backgroundColor: 'var(--cui-info-bg-subtle)' }}>
                <Building className="h-4 w-4" style={{ color: 'var(--cui-info)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Add to Existing Project
                </p>
                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  Associate documents with an existing project
                </p>
              </div>
              {selectedChoice === 'associate' && (
                <Check className="h-5 w-5" style={{ color: 'var(--cui-primary)' }} />
              )}
            </div>
          </button>

          {/* Project selector (shown when associate is selected) */}
          {selectedChoice === 'associate' && (
            <div className="ml-11 space-y-2">
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  color: 'var(--cui-body-color)'
                }}
              >
                <option value="">Select a project...</option>
                {projects.slice(0, 20).map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Knowledge store option */}
          <button
            type="button"
            onClick={() => { setSelectedChoice('knowledge'); setSelectedProjectId(null); }}
            className={`w-full rounded-lg border p-3 text-left transition-all ${
              selectedChoice === 'knowledge' ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
              borderColor: selectedChoice === 'knowledge' ? 'var(--cui-primary)' : 'var(--cui-border-color)',
              backgroundColor: selectedChoice === 'knowledge' ? 'var(--cui-primary-bg-subtle)' : 'transparent'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2" style={{ backgroundColor: 'var(--cui-secondary-bg-subtle)' }}>
                <Database className="h-4 w-4" style={{ color: 'var(--cui-secondary-color)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Add to Knowledge Store Only
                </p>
                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  Store for reference without creating a project
                </p>
              </div>
              {selectedChoice === 'knowledge' && (
                <Check className="h-5 w-5" style={{ color: 'var(--cui-primary)' }} />
              )}
            </div>
          </button>
        </div>
      </CModalBody>
      <CModalFooter>
        <LandscapeButton color="secondary" variant="ghost" onClick={onClose}>
          Cancel
        </LandscapeButton>
        <LandscapeButton
          color="primary"
          onClick={handleConfirm}
          disabled={
            isAnalyzing ||
            !selectedChoice ||
            (selectedChoice === 'associate' && !selectedProjectId)
          }
        >
          {selectedChoice === 'new' && 'Create New Project'}
          {selectedChoice === 'associate' && 'Add to Project'}
          {selectedChoice === 'knowledge' && 'Add to Knowledge'}
          {!selectedChoice && 'Select an Option'}
        </LandscapeButton>
      </CModalFooter>
    </CModal>
  );
}
