'use client';

/**
 * ProjectProfileEditModal Component
 *
 * Modal form for editing project profile metadata
 * Includes cascading dropdown logic for analysis_type -> property_subtype
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormFloating,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol
} from '@coreui/react';
import useSWR from 'swr';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile, ProjectProfileFormData, MSA } from '@/types/project-profile';
import { OWNERSHIP_TYPES, validateTargetUnits, validateGrossAcres } from '@/types/project-profile';
import { ANALYSIS_TYPES, getSubtypesForAnalysisType, type AnalysisType } from '@/types/project-taxonomy';

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  // If already yyyy-mm-dd, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

interface ProjectProfileEditModalProps {
  projectId: number;
  profile: ProjectProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const msaFetcher = (url: string) => fetchJson<MSA[]>(url);

export const ProjectProfileEditModal: React.FC<ProjectProfileEditModalProps> = ({
  projectId,
  profile,
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const buildFormState = (current: ProjectProfile): ProjectProfileFormData => ({
    project_name: current.project_name,
    analysis_type: (current.analysis_type || 'Land Development') as AnalysisType,
    property_subtype: current.property_subtype,
    target_units: current.target_units,
    gross_acres: current.gross_acres,
    address: current.address,
    city: current.city,
    county: current.county,
    state: current.state,
    zip_code: current.zip_code,
    msa_id: current.msa_id,
    apn: current.apn,
    ownership_type: current.ownership_type,
    start_date: toInputDate(current.start_date),
    analysis_start_date: toInputDate(current.analysis_start_date),
    analysis_end_date: toInputDate(current.analysis_end_date)
  });

  const [formData, setFormData] = useState<ProjectProfileFormData>(buildFormState(profile));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch MSAs for dropdown
  const { data: msas } = useSWR<MSA[]>('/api/lookups/msas', msaFetcher);

  // Cascading dropdown: Get property subtypes based on analysis type
  const subtypeOptions = useMemo(() => {
    return getSubtypesForAnalysisType(formData.analysis_type);
  }, [formData.analysis_type]);

  // When analysis type changes, clear property subtype if it's not valid for the new type
  useEffect(() => {
    if (formData.property_subtype && !subtypeOptions.includes(formData.property_subtype as any)) {
      setFormData(prev => ({ ...prev, property_subtype: undefined }));
    }
  }, [formData.analysis_type, subtypeOptions, formData.property_subtype]);

  // Reset form when modal opens with updated profile data
  useEffect(() => {
    if (isOpen) {
      setFormData(buildFormState(profile));
      setErrors({});
    }
  }, [isOpen, profile]);

  const handleInputChange = (field: keyof ProjectProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field: analysis_type
    if (!formData.project_name?.trim()) {
      newErrors.project_name = 'Project Name is required';
    }

    if (!formData.analysis_type) {
      newErrors.analysis_type = 'Analysis Type is required';
    }

    // Validate target_units if provided
    if (formData.target_units !== undefined && formData.target_units !== null) {
      if (!validateTargetUnits(formData.target_units)) {
        newErrors.target_units = 'Target Units must be a positive integer';
      }
    }

    // Validate gross_acres if provided
    if (formData.gross_acres !== undefined && formData.gross_acres !== null) {
      if (!validateGrossAcres(formData.gross_acres)) {
        newErrors.gross_acres = 'Gross Acres must be positive with max 2 decimal places';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasValueClass = (value: unknown) =>
    value !== undefined && value !== null && value !== '' ? 'has-value' : '';

  const hasValueAttr = (value: unknown) =>
    value !== undefined && value !== null && value !== '' ? 'true' : 'false';

  const floatLabelClass = (value: unknown) =>
    value !== undefined && value !== null && value !== '' ? 'float-active' : '';

  const buildPayload = (): Partial<ProjectProfileFormData> => {
    const payload: Partial<ProjectProfileFormData> = {};
    (Object.keys(formData) as Array<keyof ProjectProfileFormData>).forEach((key) => {
      if (formData[key] !== undefined) {
        // Normalize empty date strings to null so backend accepts/clears correctly
        if (
          (key === 'start_date' || key === 'analysis_start_date' || key === 'analysis_end_date') &&
          formData[key] === ''
        ) {
          payload[key] = null as any;
        } else {
          payload[key] = formData[key] as any;
        }
      }
    });
    return payload;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      // Build payload with current form values
      const payload = buildPayload();

      // First update profile-centric fields
      const response = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update profile');
      }

      // Then update core project fields (dates, etc.) to ensure persistence
      const corePayload: Record<string, unknown> = {};
      if (payload.start_date !== undefined) corePayload.start_date = payload.start_date;
      if (payload.analysis_start_date !== undefined) corePayload.analysis_start_date = payload.analysis_start_date;
      if (payload.analysis_end_date !== undefined) corePayload.analysis_end_date = payload.analysis_end_date;
      if (payload.analysis_type !== undefined) corePayload.analysis_type = payload.analysis_type;
      if (Object.keys(corePayload).length > 0) {
        const coreResponse = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corePayload)
        });
        if (!coreResponse.ok) {
          const error = await coreResponse.json();
          throw new Error(error.details || 'Failed to update project dates');
        }
      }

      onSaveSuccess();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg" backdrop="static">
      <CModalHeader>
        <CModalTitle className="d-flex flex-column">
          <span>Edit Project Profile</span>
          {profile.project_name && (
            <span className="text-muted small">{profile.project_name}</span>
          )}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {floatingStyles}
        <CForm className="project-profile-floating">
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormFloating>
                <CFormInput
                  id="project_name"
                  value={formData.project_name || ''}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  invalid={!!errors.project_name}
                  placeholder=" "
                />
                <CFormLabel htmlFor="project_name">
                  Project Name <span className="text-danger">*</span>
                </CFormLabel>
              </CFormFloating>
              {errors.project_name && (
                <div className="invalid-feedback d-block">{errors.project_name}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormSelect
                id="analysis_type"
                floatingLabel={
                  <>
                    Analysis Type <span className="text-danger">*</span>
                  </>
                }
                value={formData.analysis_type || ''}
                onChange={(e) => handleInputChange('analysis_type', e.target.value as AnalysisType)}
                invalid={!!errors.analysis_type}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {ANALYSIS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
              {errors.analysis_type && (
                <div className="invalid-feedback d-block">{errors.analysis_type}</div>
              )}
            </CCol>

            <CCol md={6}>
              <CFormSelect
                id="property_subtype"
                  floatingLabel="Project Type"
                value={formData.property_subtype || ''}
                onChange={(e) => handleInputChange('property_subtype', e.target.value || undefined)}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {subtypeOptions.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormSelect
                id="ownership_type"
                floatingLabel="Ownership Type"
                value={formData.ownership_type || ''}
                onChange={(e) => handleInputChange('ownership_type', e.target.value || undefined)}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {OWNERSHIP_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={6}>
              <CFormFloating>
                <CFormInput
                  type="date"
                  id="analysis_start_date"
                  value={formData.analysis_start_date || ''}
                  onChange={(e) => handleInputChange('analysis_start_date', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="analysis_start_date">Analysis Start Date [Period = 0]</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormFloating>
                <CFormInput
                  type="number"
                  id="target_units"
                  value={formData.target_units || ''}
                  onChange={(e) => handleInputChange('target_units', e.target.value ? parseInt(e.target.value) : undefined)}
                  invalid={!!errors.target_units}
                  placeholder=" "
                />
                <CFormLabel htmlFor="target_units">Target Units</CFormLabel>
              </CFormFloating>
              {errors.target_units && (
                <div className="invalid-feedback d-block">{errors.target_units}</div>
              )}
            </CCol>

            <CCol md={6}>
              <CFormFloating>
                <CFormInput
                  type="number"
                  step="0.01"
                  id="gross_acres"
                  value={formData.gross_acres || ''}
                  onChange={(e) => handleInputChange('gross_acres', e.target.value ? parseFloat(e.target.value) : undefined)}
                  invalid={!!errors.gross_acres}
                  placeholder=" "
                />
                <CFormLabel htmlFor="gross_acres">Gross Acres</CFormLabel>
              </CFormFloating>
              {errors.gross_acres && (
                <div className="invalid-feedback d-block">{errors.gross_acres}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="address">Address</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={4}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="city">City</CFormLabel>
              </CFormFloating>
            </CCol>

            <CCol md={4}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="county"
                  value={formData.county || ''}
                  onChange={(e) => handleInputChange('county', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="county">County</CFormLabel>
              </CFormFloating>
            </CCol>

            <CCol md={2}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="state">State</CFormLabel>
              </CFormFloating>
            </CCol>

            <CCol md={2}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="zip_code"
                  value={formData.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="zip_code">Zip Code</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormSelect
                id="msa_id"
                floatingLabel="Market (MSA)"
                value={formData.msa_id || ''}
                onChange={(e) => handleInputChange('msa_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {msas?.map(msa => (
                  <option key={msa.msa_id} value={msa.msa_id}>
                    {msa.msa_name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={6}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="apn"
                  value={formData.apn || ''}
                  onChange={(e) => handleInputChange('apn', e.target.value || undefined)}
                  placeholder=" "
                />
                <CFormLabel htmlFor="apn">APN</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default ProjectProfileEditModal;

// Scoped floating label adjustments for selects in this modal only
const floatingStyles = (
  <style jsx>{`
    .project-profile-floating .form-floating > .form-select {
      padding-top: 1.35rem;
      padding-bottom: 0.55rem;
      line-height: 1.25;
      text-align: left;
      text-align-last: left;
      -moz-text-align-last: left;
    }
  `}</style>
);
