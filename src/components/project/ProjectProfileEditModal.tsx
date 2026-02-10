'use client';

/**
 * ProjectProfileEditModal Component
 *
 * Modal form for editing project profile metadata.
 * - Property Type → Property Subtype cascade (from lu_property_subtype)
 * - Analysis Type from project-taxonomy constants
 * - On save, property_type_code is sent directly to the backend
 */

import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormFloating,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import useSWR from 'swr';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile, ProjectProfileFormData, MSA } from '@/types/project-profile';
import { OWNERSHIP_TYPES, validateTargetUnits, validateGrossAcres } from '@/types/project-profile';
import { ANALYSIS_TYPES, ANALYSIS_TYPE_LABELS, type AnalysisType } from '@/types/project-taxonomy';

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

interface PropertyTypeOption {
  value: string;
  label: string;
}

interface PropertySubtypeOption {
  id: number;
  propertyType: string;
  code: string;
  name: string;
  sortOrder: number;
}

interface ProjectProfileEditModalProps {
  projectId: number;
  profile: ProjectProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const msaFetcher = (url: string) => fetchJson<MSA[]>(url);
const propertyTypeFetcher = (url: string) =>
  fetchJson<{ options: PropertyTypeOption[] }>(url).then((r) => r.options);
const subtypeFetcher = (url: string) =>
  fetchJson<{ subtypes: PropertySubtypeOption[] }>(url).then((r) => r.subtypes);

export const ProjectProfileEditModal: React.FC<ProjectProfileEditModalProps> = ({
  projectId,
  profile,
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const buildFormState = (current: ProjectProfile): ProjectProfileFormData => ({
    project_name: current.project_name,
    analysis_type: (current.analysis_type || 'DEVELOPMENT') as AnalysisType,
    property_type_code: current.project_type_code || current.project_type || undefined,
    property_subtype: current.property_subtype,
    target_units: current.target_units,
    gross_acres: current.gross_acres,
    asking_price: current.asking_price,
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

  // Fetch property types from picklist
  const { data: propertyTypes } = useSWR<PropertyTypeOption[]>(
    '/api/lookups/property-types',
    propertyTypeFetcher
  );

  // Fetch property subtypes cascading from selected property type
  const { data: subtypeOptions } = useSWR<PropertySubtypeOption[]>(
    formData.property_type_code
      ? `/api/picklists/property-subtypes?property_type=${formData.property_type_code}`
      : null,
    subtypeFetcher
  );

  // When property type changes, clear subtype if it doesn't match
  useEffect(() => {
    if (!formData.property_type_code) {
      return;
    }
    if (subtypeOptions && formData.property_subtype) {
      const match = subtypeOptions.some(
        (s) => s.name === formData.property_subtype || s.code === formData.property_subtype
      );
      if (!match) {
        setFormData((prev) => ({ ...prev, property_subtype: undefined }));
      }
    }
  }, [formData.property_type_code, subtypeOptions, formData.property_subtype]);

  // Auto-select if only one subtype
  useEffect(() => {
    if (subtypeOptions && subtypeOptions.length === 1 && !formData.property_subtype) {
      setFormData((prev) => ({ ...prev, property_subtype: subtypeOptions[0].name }));
    }
  }, [subtypeOptions, formData.property_subtype]);

  // Reset form when modal opens with updated profile data
  useEffect(() => {
    if (isOpen) {
      setFormData(buildFormState(profile));
      setErrors({});
    }
   
  }, [isOpen, profile]);

  const handleInputChange = (field: keyof ProjectProfileFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePropertyTypeChange = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      property_type_code: code || undefined,
      property_subtype: undefined // clear subtype when type changes
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_name?.trim()) {
      newErrors.project_name = 'Project Name is required';
    }

    if (!formData.analysis_type) {
      newErrors.analysis_type = 'Analysis Type is required';
    }

    if (formData.target_units !== undefined && formData.target_units !== null) {
      if (!validateTargetUnits(formData.target_units)) {
        newErrors.target_units = 'Units must be a positive integer';
      }
    }

    if (formData.gross_acres !== undefined && formData.gross_acres !== null) {
      if (!validateGrossAcres(formData.gross_acres)) {
        newErrors.gross_acres = 'Gross Acres must be positive with max 2 decimal places';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (): Partial<ProjectProfileFormData> => {
    const payload: Partial<ProjectProfileFormData> = {};
    (Object.keys(formData) as Array<keyof ProjectProfileFormData>).forEach((key) => {
      if (formData[key] !== undefined) {
        if (
          (key === 'start_date' || key === 'analysis_start_date' || key === 'analysis_end_date') &&
          formData[key] === ''
        ) {
          (payload as Record<string, unknown>)[key] = null;
        } else {
          (payload as Record<string, unknown>)[key] = formData[key];
        }
      }
    });
    return payload;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      const payload = buildPayload();

      const response = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update profile');
      }

      // Also update core project fields (dates, analysis_type) for consistency
      const corePayload: Record<string, unknown> = {};
      if (payload.start_date !== undefined) corePayload.start_date = payload.start_date;
      if (payload.analysis_start_date !== undefined)
        corePayload.analysis_start_date = payload.analysis_start_date;
      if (payload.analysis_end_date !== undefined)
        corePayload.analysis_end_date = payload.analysis_end_date;
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
          {/* Row 1: Project Name (30%), Analysis Type (25%), Asking Price (45%) */}
          <CRow className="mb-3">
            <CCol xs={12} className="profile-col-r1-project">
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
            <CCol xs={12} className="profile-col-r1-analysis">
              <CFormSelect
                id="analysis_type"
                floatingLabel={
                  <>
                    Analysis Type <span className="text-danger">*</span>
                  </>
                }
                value={formData.analysis_type || ''}
                onChange={(e) =>
                  handleInputChange('analysis_type', e.target.value as AnalysisType)
                }
                invalid={!!errors.analysis_type}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {ANALYSIS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ANALYSIS_TYPE_LABELS[type]}
                  </option>
                ))}
              </CFormSelect>
              {errors.analysis_type && (
                <div className="invalid-feedback d-block">{errors.analysis_type}</div>
              )}
            </CCol>
            <CCol xs={12} className="profile-col-r1-price">
              <CFormFloating>
                <CFormInput
                  type="text"
                  inputMode="numeric"
                  id="asking_price"
                  value={
                    formData.asking_price
                      ? Number(formData.asking_price).toLocaleString('en-US')
                      : ''
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    const numValue = rawValue ? parseFloat(rawValue) : undefined;
                    if (rawValue === '' || !isNaN(numValue as number)) {
                      handleInputChange('asking_price', numValue || undefined);
                    }
                  }}
                  placeholder=" "
                />
                <CFormLabel htmlFor="asking_price">Asking Price</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          {/* Row 2: Property Type (25%), Property Subtype (30%), Units (20%), Gross Acres (25%) */}
          <CRow className="mb-3">
            <CCol xs={12} className="profile-col-r2-type">
              <CFormSelect
                id="property_type_code"
                floatingLabel="Property Type"
                value={formData.property_type_code || ''}
                onChange={(e) => handlePropertyTypeChange(e.target.value)}
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {propertyTypes?.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol xs={12} className="profile-col-r2-subtype">
              <CFormSelect
                id="property_subtype"
                floatingLabel="Property Subtype"
                value={formData.property_subtype || ''}
                onChange={(e) =>
                  handleInputChange('property_subtype', e.target.value || undefined)
                }
                className="text-start"
                placeholder=" "
                disabled={!formData.property_type_code}
              >
                <option value="" disabled hidden></option>
                {subtypeOptions?.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol xs={12} className="profile-col-r2-units">
              <CFormFloating>
                <CFormInput
                  type="number"
                  id="target_units"
                  value={formData.target_units || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'target_units',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  invalid={!!errors.target_units}
                  placeholder=" "
                />
                <CFormLabel htmlFor="target_units">Units</CFormLabel>
              </CFormFloating>
              {errors.target_units && (
                <div className="invalid-feedback d-block">{errors.target_units}</div>
              )}
            </CCol>

            <CCol xs={12} className="profile-col-r2-acres">
              <CFormFloating>
                <CFormInput
                  type="number"
                  step="0.01"
                  id="gross_acres"
                  value={formData.gross_acres || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'gross_acres',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
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

          {/* Row 3: Ownership Type (40%), Analysis Start Date (60%) */}
          <CRow className="mb-3">
            <CCol xs={12} className="profile-col-r3-ownership">
              <CFormSelect
                id="ownership_type"
                floatingLabel="Ownership Type"
                value={formData.ownership_type || ''}
                onChange={(e) =>
                  handleInputChange('ownership_type', e.target.value || undefined)
                }
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {OWNERSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol xs={12} className="profile-col-r3-start">
              <CFormFloating>
                <CFormInput
                  type="date"
                  id="analysis_start_date"
                  value={formData.analysis_start_date || ''}
                  onChange={(e) =>
                    handleInputChange('analysis_start_date', e.target.value || undefined)
                  }
                  placeholder=" "
                />
                <CFormLabel htmlFor="analysis_start_date">
                  Analysis Start Date [Period = 0]
                </CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          {/* Row 4+: Address (unchanged) */}
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) =>
                    handleInputChange('address', e.target.value || undefined)
                  }
                  placeholder=" "
                />
                <CFormLabel htmlFor="address">Address</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          {/* Row 6: City, County, State, Zip */}
          <CRow className="mb-3">
            <CCol md={4}>
              <CFormFloating>
                <CFormInput
                  type="text"
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) =>
                    handleInputChange('city', e.target.value || undefined)
                  }
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
                  onChange={(e) =>
                    handleInputChange('county', e.target.value || undefined)
                  }
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
                  onChange={(e) =>
                    handleInputChange('state', e.target.value || undefined)
                  }
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
                  onChange={(e) =>
                    handleInputChange('zip_code', e.target.value || undefined)
                  }
                  placeholder=" "
                />
                <CFormLabel htmlFor="zip_code">Zip Code</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>

          {/* Row 7: Market (MSA), APN */}
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormSelect
                id="msa_id"
                floatingLabel="Market (MSA)"
                value={formData.msa_id || ''}
                onChange={(e) =>
                  handleInputChange(
                    'msa_id',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="text-start"
                placeholder=" "
              >
                <option value="" disabled hidden></option>
                {msas?.map((msa) => (
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
                  onChange={(e) =>
                    handleInputChange('apn', e.target.value || undefined)
                  }
                  placeholder=" "
                />
                <CFormLabel htmlFor="apn">APN</CFormLabel>
              </CFormFloating>
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <SemanticButton intent="secondary-action" onClick={onClose} disabled={isSaving}>
          Cancel
        </SemanticButton>
        <SemanticButton intent="primary-action" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </SemanticButton>
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

    @media (min-width: 768px) {
      .project-profile-floating .profile-col-r1-project {
        flex: 0 0 30%;
        max-width: 30%;
      }
      .project-profile-floating .profile-col-r1-analysis {
        flex: 0 0 25%;
        max-width: 25%;
      }
      .project-profile-floating .profile-col-r1-price {
        flex: 0 0 45%;
        max-width: 45%;
      }

      .project-profile-floating .profile-col-r2-type {
        flex: 0 0 25%;
        max-width: 25%;
      }
      .project-profile-floating .profile-col-r2-subtype {
        flex: 0 0 30%;
        max-width: 30%;
      }
      .project-profile-floating .profile-col-r2-units {
        flex: 0 0 20%;
        max-width: 20%;
      }
      .project-profile-floating .profile-col-r2-acres {
        flex: 0 0 25%;
        max-width: 25%;
      }

      .project-profile-floating .profile-col-r3-ownership {
        flex: 0 0 40%;
        max-width: 40%;
      }
      .project-profile-floating .profile-col-r3-start {
        flex: 0 0 60%;
        max-width: 60%;
      }
    }
  `}</style>
);
