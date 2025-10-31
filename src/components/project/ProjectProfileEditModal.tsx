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
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol
} from '@coreui/react';
import useSWR from 'swr';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile, ProjectProfileFormData, MSA } from '@/types/project-profile';
import { PROJECT_STATUSES, OWNERSHIP_TYPES, validateTargetUnits, validateGrossAcres } from '@/types/project-profile';
import { ANALYSIS_TYPES, getSubtypesForAnalysisType, type AnalysisType } from '@/types/project-taxonomy';

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
  const [formData, setFormData] = useState<ProjectProfileFormData>({
    analysis_type: (profile.analysis_type || 'Land Development') as AnalysisType,
    property_subtype: profile.property_subtype,
    project_status: profile.project_status,
    target_units: profile.target_units,
    gross_acres: profile.gross_acres,
    address: profile.address,
    city: profile.city,
    county: profile.county,
    msa_id: profile.msa_id,
    apn: profile.apn,
    ownership_type: profile.ownership_type
  });

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

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      // Build payload with only changed fields
      const payload: Partial<ProjectProfileFormData> = {};

      (Object.keys(formData) as Array<keyof ProjectProfileFormData>).forEach(key => {
        const newValue = formData[key];
        const oldValue = profile[key as keyof ProjectProfile];

        // Include if value has changed (including null/undefined changes)
        if (newValue !== oldValue) {
          payload[key] = newValue as any;
        }
      });

      const response = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update profile');
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
        <CModalTitle>Edit Project Profile</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="analysis_type">
                Analysis Type <span className="text-danger">*</span>
              </CFormLabel>
              <CFormSelect
                id="analysis_type"
                value={formData.analysis_type}
                onChange={(e) => handleInputChange('analysis_type', e.target.value as AnalysisType)}
                invalid={!!errors.analysis_type}
              >
                {ANALYSIS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
              {errors.analysis_type && (
                <div className="invalid-feedback d-block">{errors.analysis_type}</div>
              )}
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="property_subtype">Property Subtype</CFormLabel>
              <CFormSelect
                id="property_subtype"
                value={formData.property_subtype || ''}
                onChange={(e) => handleInputChange('property_subtype', e.target.value || undefined)}
              >
                <option value="">-- Select --</option>
                {subtypeOptions.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="project_status">Project Status</CFormLabel>
              <CFormSelect
                id="project_status"
                value={formData.project_status || ''}
                onChange={(e) => handleInputChange('project_status', e.target.value || undefined)}
              >
                <option value="">-- Select --</option>
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="ownership_type">Ownership Type</CFormLabel>
              <CFormSelect
                id="ownership_type"
                value={formData.ownership_type || ''}
                onChange={(e) => handleInputChange('ownership_type', e.target.value || undefined)}
              >
                <option value="">-- Select --</option>
                {OWNERSHIP_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="target_units">Target Units</CFormLabel>
              <CFormInput
                type="number"
                id="target_units"
                value={formData.target_units || ''}
                onChange={(e) => handleInputChange('target_units', e.target.value ? parseInt(e.target.value) : undefined)}
                invalid={!!errors.target_units}
              />
              {errors.target_units && (
                <div className="invalid-feedback">{errors.target_units}</div>
              )}
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="gross_acres">Gross Acres</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                id="gross_acres"
                value={formData.gross_acres || ''}
                onChange={(e) => handleInputChange('gross_acres', e.target.value ? parseFloat(e.target.value) : undefined)}
                invalid={!!errors.gross_acres}
              />
              {errors.gross_acres && (
                <div className="invalid-feedback">{errors.gross_acres}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel htmlFor="address">Address</CFormLabel>
              <CFormInput
                type="text"
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value || undefined)}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="city">City</CFormLabel>
              <CFormInput
                type="text"
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value || undefined)}
              />
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="county">County</CFormLabel>
              <CFormInput
                type="text"
                id="county"
                value={formData.county || ''}
                onChange={(e) => handleInputChange('county', e.target.value || undefined)}
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel htmlFor="msa_id">Market (MSA)</CFormLabel>
              <CFormSelect
                id="msa_id"
                value={formData.msa_id || ''}
                onChange={(e) => handleInputChange('msa_id', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">-- Select --</option>
                {msas?.map(msa => (
                  <option key={msa.msa_id} value={msa.msa_id}>
                    {msa.msa_name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={6}>
              <CFormLabel htmlFor="apn">APN</CFormLabel>
              <CFormInput
                type="text"
                id="apn"
                value={formData.apn || ''}
                onChange={(e) => handleInputChange('apn', e.target.value || undefined)}
              />
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
