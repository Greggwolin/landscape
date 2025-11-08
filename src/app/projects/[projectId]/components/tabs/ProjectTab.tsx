'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton, CFormInput, CFormFloating, CFormTextarea, CCollapse, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CFormSelect } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLightbulb, cilCloudUpload, cilPencil, cilCheck, cilX, cilChevronBottom, cilChevronTop } from '@coreui/icons';
import { fetchMarketStatsForProject, MarketStatsForProject } from '@/lib/api/market-intel';
import ContactsSection from '@/components/projects/contacts/ContactsSection';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import { StepRateTable, StepRow } from '@/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable';
import { useProjectContext } from '@/app/components/ProjectProvider';
import NewProjectModal from '@/app/components/NewProjectModal';
import { ProjectProfileTile } from '@/components/project/ProjectProfileTile';

interface Project {
  project_id: number;
  project_name: string;

  // Location
  street_address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  market?: string;
  submarket?: string;
  jurisdiction_city?: string;
  jurisdiction_state?: string;
  jurisdiction_county?: string;
  location_lat?: number | string;
  location_lon?: number | string;

  // Parcels
  apn_primary?: string;
  apn_secondary?: string;
  ownership_type?: string;
  legal_description?: string;

  // Property Classification
  project_type_code?: string;
  property_subtype?: string;
  property_class?: string;

  // Physical
  lot_size_sf?: number;
  lot_size_acres?: number;
  gross_sf?: number;
  total_units?: number;
  year_built?: number;
  stories?: number;
  acreage?: number;
  latitude?: number;
  longitude?: number;

  // Pricing
  asking_price?: number;
  price_per_unit?: number;
  price_per_sf?: number;
  cap_rate_current?: number;
  cap_rate_proforma?: number;

  // Current Financials
  current_gpr?: number;
  current_other_income?: number;
  current_gpi?: number;
  current_vacancy_rate?: number;
  current_egi?: number;
  current_opex?: number;
  current_noi?: number;

  // Proforma Financials
  proforma_gpr?: number;
  proforma_other_income?: number;
  proforma_gpi?: number;
  proforma_vacancy_rate?: number;
  proforma_egi?: number;
  proforma_opex?: number;
  proforma_noi?: number;

  // Broker
  listing_brokerage?: string;

  // Administrative
  job_number?: string;
  version_reference?: string;
  status?: string;
  start_date?: string;
  owner?: string;

  // Project description/notes
  project_notes?: string;
}

interface ProjectTabProps {
  project: Project;
  showProjectSelectorInLocationHeader?: boolean;
}

export default function ProjectTab({
  project: initialProject,
  showProjectSelectorInLocationHeader = false
}: ProjectTabProps) {
  const { projects, selectProject, activeProjectId } = useProjectContext();
  // Fetch full project details (initial project from provider only has basic fields)
  const [project, setProject] = useState<Project>(initialProject);
  const [loadingProject, setLoadingProject] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoadingProject(true);
        const response = await fetch(`/api/projects/${initialProject.project_id}/details`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        } else {
          // Fallback to initial project if API fails
          setProject(initialProject);
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
        setProject(initialProject);
      } finally {
        setLoadingProject(false);
      }
    };

    fetchProjectDetails();
  }, [initialProject.project_id]);

  // Helper functions for formatting
  const formatCurrency = (value?: number | string | null) => {
    if (!value && value !== 0) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatPercent = (value?: number | string | null) => {
    if (!value && value !== 0) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return `${(numValue * 100).toFixed(2)}%`;
  };

  const formatNumber = (value?: number | string | null) => {
    if (!value && value !== 0) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return numValue.toLocaleString();
  };

  const formatPercentChange = (current?: number | string | null, proforma?: number | string | null) => {
    if (!current || !proforma) return '—';
    const currentNum = typeof current === 'string' ? parseFloat(current) : current;
    const proformaNum = typeof proforma === 'string' ? parseFloat(proforma) : proforma;

    if (isNaN(currentNum) || isNaN(proformaNum) || currentNum === 0) return '—';

    const percentChange = ((proformaNum - currentNum) / currentNum) * 100;

    if (percentChange === 0) return '—';

    const sign = percentChange > 0 ? '+' : '';
    return `${sign}${percentChange.toFixed(1)}%`;
  };

  // Check if financial data exists
  const hasFinancialData = !!(
    project.current_noi ||
    project.proforma_noi ||
    project.asking_price
  );

  const [marketStats, setMarketStats] = useState<MarketStatsForProject | null>(null);
  const [loadingMarketData, setLoadingMarketData] = useState(true);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [financialSummaryExpanded, setFinancialSummaryExpanded] = useState(false);
  const [marketRatesExpanded, setMarketRatesExpanded] = useState(true);
  const [contactsExpanded, setContactsExpanded] = useState(true);
  const [showInflationModal, setShowInflationModal] = useState(false);
  const [inflationScheduleName, setInflationScheduleName] = useState('');
  const [inflationSteps, setInflationSteps] = useState<StepRow[]>([
    { step: 1, fromPeriod: 1, rate: null, periods: null, thruPeriod: null }
  ]);
  const [savedInflationSchedules, setSavedInflationSchedules] = useState<Array<{
    id: string;
    name: string;
    steps: StepRow[];
    createdAt: Date;
  }>>([]);

  const addressFields: (keyof Project)[] = ['street_address', 'city', 'county', 'state', 'zip_code'];

  const isMissingCoordinates = (projectWithCoords: Project) =>
    projectWithCoords.location_lat === null ||
    projectWithCoords.location_lat === undefined ||
    projectWithCoords.location_lon === null ||
    projectWithCoords.location_lon === undefined;

  const hasLocationEdits = (changes: Partial<Project>) =>
    addressFields.some(field => Object.prototype.hasOwnProperty.call(changes, field));

  const buildProfileAddressPayload = (latestProject: Project, changes: Partial<Project>) => {
    const needsCoordinates = isMissingCoordinates(latestProject);

    if (!hasLocationEdits(changes) && !needsCoordinates) {
      return null;
    }

    const normalizeValue = (value?: string | number | null) => {
      if (value === undefined || value === null) return undefined;
      const strValue = typeof value === 'string' ? value : String(value);
      const trimmed = strValue.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const address =
      normalizeValue(
        Object.prototype.hasOwnProperty.call(changes, 'street_address')
          ? changes.street_address
          : latestProject.street_address
      );

    const city =
      normalizeValue(
        Object.prototype.hasOwnProperty.call(changes, 'city')
          ? changes.city
          : latestProject.city ?? latestProject.jurisdiction_city
      );

    const county =
      normalizeValue(
        Object.prototype.hasOwnProperty.call(changes, 'county')
          ? changes.county
          : latestProject.county ?? latestProject.jurisdiction_county
      );

    const state =
      normalizeValue(
        Object.prototype.hasOwnProperty.call(changes, 'state')
          ? changes.state
          : latestProject.state ?? latestProject.jurisdiction_state
      );

    const zipCode =
      normalizeValue(
        Object.prototype.hasOwnProperty.call(changes, 'zip_code')
          ? changes.zip_code
          : latestProject.zip_code
      );

    if (!address || !city) {
      return null;
    }

    const payload: { address: string; city: string; county?: string; state?: string; zip_code?: string } = { address, city };
    if (county) {
      payload.county = county;
    }
    if (state) {
      payload.state = state;
    }
    if (zipCode) {
      payload.zip_code = zipCode;
    }
    return payload;
  };

  const maybeUpdateProfileCoordinates = async (latestProject: Project, changes: Partial<Project>) => {
    const payload = buildProfileAddressPayload(latestProject, changes);
    if (!payload) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${latestProject.project_id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Failed to update project profile with location fields');
      }
    } catch (error) {
      console.error('Error updating project profile with location fields:', error);
    }
  };
  const [originalInflationSteps, setOriginalInflationSteps] = useState<StepRow[]>([]);
  const scheduleNameInputRef = React.useRef<HTMLInputElement>(null);

  const handleProjectSelection = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === 'new') {
      setIsNewProjectModalOpen(true);
      return;
    }

    const nextId = Number(value);
    if (!Number.isNaN(nextId)) {
      selectProject(nextId);
    }
  };

  // Handle inflation step updates
  const handleUpdateInflationStep = (stepIndex: number, field: 'rate' | 'periods', value: number | null) => {
    let updatedSteps = [...inflationSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      [field]: value
    };

    // If periods field is being updated
    if (field === 'periods') {
      // Check if user entered "E" (null value represents "E" in the system)
      // If "E" is entered, remove all subsequent steps
      if (value === null && stepIndex < updatedSteps.length - 1) {
        updatedSteps = updatedSteps.slice(0, stepIndex + 1);
      }

      // Recalculate From Period and Thru Period for all steps
      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];

        // From Period
        if (i === 0) {
          step.fromPeriod = 1;
        } else {
          const prevStep = updatedSteps[i - 1];
          if (prevStep.thruPeriod && prevStep.thruPeriod !== null) {
            step.fromPeriod = prevStep.thruPeriod + 1;
          }
        }

        // Thru Period
        if (step.fromPeriod && step.periods && step.periods !== null) {
          step.thruPeriod = step.fromPeriod + step.periods - 1;
        } else if (step.periods === null) {
          step.thruPeriod = null; // Represents "E"
        } else {
          step.thruPeriod = null;
        }
      }

      // Check if we should add a new step
      const lastStep = updatedSteps[updatedSteps.length - 1];
      const shouldAddStep = lastStep.rate !== null &&
                           lastStep.periods !== null &&
                           lastStep.periods > 0; // periods is a number, not "E"

      if (shouldAddStep) {
        const nextFromPeriod = lastStep.thruPeriod ? lastStep.thruPeriod + 1 : null;
        updatedSteps.push({
          step: updatedSteps.length + 1,
          fromPeriod: nextFromPeriod,
          rate: null,
          periods: null,
          thruPeriod: null
        });
      }
    }

    // If rate field is being updated, check if we should add new step
    if (field === 'rate') {
      const currentStep = updatedSteps[stepIndex];
      const isLastStep = stepIndex === updatedSteps.length - 1;
      const shouldAddStep = isLastStep &&
                           currentStep.rate !== null &&
                           currentStep.periods !== null &&
                           currentStep.periods > 0;

      if (shouldAddStep) {
        const nextFromPeriod = currentStep.thruPeriod ? currentStep.thruPeriod + 1 : null;
        updatedSteps.push({
          step: updatedSteps.length + 1,
          fromPeriod: nextFromPeriod,
          rate: null,
          periods: null,
          thruPeriod: null
        });
      }
    }

    setInflationSteps(updatedSteps);
  };

  const hasInflationChanges = () => {
    return JSON.stringify(inflationSteps) !== JSON.stringify(originalInflationSteps);
  };

  const handleCloseInflationModal = () => {
    // Just close without any prompt or saving
    setInflationScheduleName('');
    setShowInflationModal(false);
  };

  const handleSaveInflationSteps = () => {
    if (!inflationScheduleName.trim()) {
      alert('Please enter a name for this inflation schedule');
      return;
    }

    const newSchedule = {
      id: `schedule_${Date.now()}`,
      name: inflationScheduleName,
      steps: [...inflationSteps],
      createdAt: new Date()
    };

    setSavedInflationSchedules([...savedInflationSchedules, newSchedule]);

    // TODO: Save to backend/database
    console.log('Saving inflation schedule:', newSchedule);

    // Reset modal and close
    setInflationScheduleName('');
    setShowInflationModal(false);
  };

  const handleLoadInflationSchedule = (schedule: { id: string; name: string; steps: StepRow[] }) => {
    setInflationSteps([...schedule.steps]);
    setOriginalInflationSteps([...schedule.steps]);
    setInflationScheduleName(schedule.name);
    setShowInflationModal(true);
  };

  const handleOpenNewInflationSchedule = () => {
    const defaultSteps = [
      { step: 1, fromPeriod: 1, rate: null, periods: null, thruPeriod: null }
    ];
    setInflationScheduleName('');
    setInflationSteps(defaultSteps);
    setOriginalInflationSteps(defaultSteps);
    setShowInflationModal(true);
  };

  const handleDeleteInflationSchedule = (scheduleId: string) => {
    setSavedInflationSchedules(savedInflationSchedules.filter(s => s.id !== scheduleId));
  };

  // Auto-focus and select schedule name field when modal opens
  useEffect(() => {
    if (showInflationModal && scheduleNameInputRef.current) {
      setTimeout(() => {
        scheduleNameInputRef.current?.focus();
        scheduleNameInputRef.current?.select();
      }, 100);
    }
  }, [showInflationModal]);

  // Fetch market data based on project location
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setLoadingMarketData(true);
        const stats = await fetchMarketStatsForProject(
          project.jurisdiction_city,
          project.jurisdiction_state
        );
        setMarketStats(stats);
      } catch (error) {
        console.error('Failed to load market data:', error);
      } finally {
        setLoadingMarketData(false);
      }
    };

    loadMarketData();
  }, [project.jurisdiction_city, project.jurisdiction_state]);

  if (loadingProject) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center" style={{ color: 'var(--cui-secondary-color)' }}>
          <div className="spinner-border mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div>Loading project details...</div>
        </div>
      </div>
    );
  }

  // Determine if this is a land development project
  const isLandDevelopment = project.project_type_code === 'LAND' ||
                            project.project_type_code === 'SUBDIVISION' ||
                            project.project_type_code === 'MPC';

  // Handle save for location
  const handleSaveLocation = async () => {
    try {
      const pendingChanges = { ...editedProject };
      const response = await fetch(`/api/projects/${project.project_id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingChanges)
      });

      if (response.ok) {
        const updated = await response.json();
        setProject(updated);
        void maybeUpdateProfileCoordinates(updated, pendingChanges);
        setEditingLocation(false);
        setEditedProject({});
      }
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };

  // Handle save for profile
  const handleSaveProfile = async () => {
    try {
      const pendingChanges = { ...editedProject };
      const response = await fetch(`/api/projects/${project.project_id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingChanges)
      });

      if (response.ok) {
        const updated = await response.json();
        setProject(updated);
        void maybeUpdateProfileCoordinates(updated, pendingChanges);
        setEditingProfile(false);
        setEditedProject({});
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  // Handle cancel
  const handleCancelLocation = () => {
    setEditingLocation(false);
    setEditedProject({});
  };

  const handleCancelProfile = () => {
    setEditingProfile(false);
    setEditedProject({});
  };

  // Get value for editing
  const getEditValue = (field: keyof Project) => {
    return editedProject[field] !== undefined ? editedProject[field] : project[field];
  };

  const renderMapCard = () => (
    <CCard style={{ height: '100%' }}>
      <CCardHeader>Map - 3D Oblique View</CCardHeader>
      <CCardBody style={{ padding: '12px', height: 'calc(100% - 49px)' }}>
        <ProjectTabMap
          projectId={String(project.project_id)}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
          tabId="project"
        />
      </CCardBody>
    </CCard>
  );

  const renderLocationCard = () => (
    <CCard className="mb-3" style={{ backgroundColor: "var(--cui-body-bg)", color: "var(--cui-body-color)" }}>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-3" style={{ backgroundColor: "var(--cui-card-cap-bg)", color: "var(--cui-body-color)" }}>
        <div className="flex-grow-1">
          <span className="text-xs text-uppercase fw-semibold" style={{ color: 'var(--cui-secondary-color)' }}>
            Project Profile
          </span>
        </div>
        {!editingLocation ? (
          <CButton
            color="primary"
            size="sm"
            onClick={() => setEditingLocation(true)}
          >
            <CIcon icon={cilPencil} size="sm" className="me-1" />
            Edit
          </CButton>
        ) : (
          <div className="d-flex gap-2">
            <CButton
              color="success"
              size="sm"
              onClick={handleSaveLocation}
            >
              <CIcon icon={cilCheck} size="sm" className="me-1" />
              Save
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              onClick={handleCancelLocation}
            >
              <CIcon icon={cilX} size="sm" className="me-1" />
              Cancel
            </CButton>
          </div>
        )}
      </CCardHeader>
      <CCardBody style={{ backgroundColor: "var(--cui-body-bg)", color: "var(--cui-secondary-color)" }}>
        {!editingLocation ? (
          <>
            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>Address</div>
              <div>{project.street_address || 'Not specified'}</div>
            </div>
            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>City</div>
              <div>
                {project.city && project.state
                  ? `${project.city}, ${project.state} ${project.zip_code || ''}`
                  : 'Not specified'}
              </div>
            </div>
            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>County</div>
              <div>{project.county || 'Not specified'}</div>
            </div>
            {(project.market || project.submarket) && (
              <div className="mb-2 d-flex">
                <div style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>Market</div>
                <div>
                  {project.market || 'Not specified'}
                  {project.submarket && (
                    <span className="text-xs ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
                      ({project.submarket})
                    </span>
                  )}
                </div>
              </div>
            )}
            {(project.apn_primary || project.apn_secondary) && (
              <div className="mb-2 d-flex">
                <div style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>APNs</div>
                <div>
                  {project.apn_primary}
                  {project.apn_secondary && `, ${project.apn_secondary}`}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <style jsx>{`
              .form-floating > label {
                opacity: 0.65;
                transform: scale(0.85) translateY(-0.5rem) translateX(0.15rem);
              }
            `}</style>

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="street_address"
                placeholder="Street Address"
                value={getEditValue('street_address') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, street_address: e.target.value })}
              />
              <label htmlFor="street_address">Street Address</label>
            </CFormFloating>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="city"
                    placeholder="City"
                    value={getEditValue('city') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, city: e.target.value })}
                  />
                  <label htmlFor="city">City</label>
                </CFormFloating>
              </CCol>
              <CCol md={3}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="state"
                    placeholder="State"
                    value={getEditValue('state') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, state: e.target.value })}
                  />
                  <label htmlFor="state">State</label>
                </CFormFloating>
              </CCol>
              <CCol md={3}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="zip_code"
                    placeholder="Zip"
                    value={getEditValue('zip_code') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, zip_code: e.target.value })}
                  />
                  <label htmlFor="zip_code">Zip</label>
                </CFormFloating>
              </CCol>
            </CRow>

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="county"
                placeholder="County"
                value={getEditValue('county') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, county: e.target.value })}
              />
              <label htmlFor="county">County</label>
            </CFormFloating>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="market"
                    placeholder="Market"
                    value={getEditValue('market') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, market: e.target.value })}
                  />
                  <label htmlFor="market">Market</label>
                </CFormFloating>
              </CCol>
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="submarket"
                    placeholder="Submarket"
                    value={getEditValue('submarket') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, submarket: e.target.value })}
                  />
                  <label htmlFor="submarket">Submarket</label>
                </CFormFloating>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="apn_primary"
                    placeholder="Primary APN"
                    value={getEditValue('apn_primary') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, apn_primary: e.target.value })}
                  />
                  <label htmlFor="apn_primary">Primary APN</label>
                </CFormFloating>
              </CCol>
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="text"
                    id="apn_secondary"
                    placeholder="Secondary APN"
                    value={getEditValue('apn_secondary') as string || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, apn_secondary: e.target.value })}
                  />
                  <label htmlFor="apn_secondary">Secondary APN</label>
                </CFormFloating>
              </CCol>
            </CRow>
          </>
        )}
      </CCardBody>
    </CCard>
  );

  const renderProfileCard = () => (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Project Profile</span>
        {!editingProfile ? (
          <CButton
            color="primary"
            size="sm"
            onClick={() => setEditingProfile(true)}
          >
            <CIcon icon={cilPencil} size="sm" className="me-1" />
            Edit
          </CButton>
        ) : (
          <div className="d-flex gap-2">
            <CButton
              color="success"
              size="sm"
              onClick={handleSaveProfile}
            >
              <CIcon icon={cilCheck} size="sm" className="me-1" />
              Save
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              onClick={handleCancelProfile}
            >
              <CIcon icon={cilX} size="sm" className="me-1" />
              Cancel
            </CButton>
          </div>
        )}
      </CCardHeader>
      <CCardBody>
        {!editingProfile ? (
          <>
            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Type</div>
              <div>{project.project_type_code || 'Not specified'}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Subtype</div>
              <div>{project.property_subtype || 'Not specified'}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Class</div>
              <div>{project.property_class || 'Not specified'}</div>
            </div>

            {isLandDevelopment && (
              <div className="mb-2 d-flex">
                <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Status</div>
                <div>{project.status || 'Planning'}</div>
              </div>
            )}

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Ownership</div>
              <div>{project.ownership_type || 'Not specified'}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Lot Size</div>
              <div>
                {project.lot_size_sf ? formatNumber(project.lot_size_sf) : 'TBD'}
                {project.lot_size_acres && (
                  <span className="text-xs ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
                    ({Number(project.lot_size_acres).toFixed(2)} acres)
                  </span>
                )}
              </div>
            </div>

            {isLandDevelopment && (
              <div className="mb-2 d-flex">
                <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Start Date</div>
                <div>{project.start_date || 'TBD'}</div>
              </div>
            )}

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Year Built</div>
              <div>{project.year_built || 'N/A'}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Total Units</div>
              <div>{formatNumber(project.total_units)}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Stories</div>
              <div>{project.stories || 'N/A'}</div>
            </div>

            <div className="mb-2 d-flex">
              <div style={{ fontWeight: 'bold', width: '140px', flexShrink: 0 }}>Gross SF</div>
              <div>{formatNumber(project.gross_sf)}</div>
            </div>

            {project.project_notes && (
              <div className="mb-2 mt-3">
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Notes</div>
                <div style={{
                  padding: '8px',
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  {project.project_notes}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <style jsx>{`
              .form-floating > label {
                opacity: 0.65;
                transform: scale(0.85) translateY(-0.5rem) translateX(0.15rem);
              }
            `}</style>

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="project_type_code"
                placeholder="Property Type"
                value={getEditValue('project_type_code') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, project_type_code: e.target.value })}
              />
              <label htmlFor="project_type_code">Property Type</label>
            </CFormFloating>

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="property_subtype"
                placeholder="Property Subtype"
                value={getEditValue('property_subtype') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, property_subtype: e.target.value })}
              />
              <label htmlFor="property_subtype">Property Subtype</label>
            </CFormFloating>

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="property_class"
                placeholder="Property Class"
                value={getEditValue('property_class') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, property_class: e.target.value })}
              />
              <label htmlFor="property_class">Property Class</label>
            </CFormFloating>

            {isLandDevelopment && (
              <CFormFloating className="mb-3">
                <CFormInput
                  type="text"
                  id="status"
                  placeholder="Status"
                  value={getEditValue('status') as string || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, status: e.target.value })}
                />
                <label htmlFor="status">Status</label>
              </CFormFloating>
            )}

            <CFormFloating className="mb-3">
              <CFormInput
                type="text"
                id="ownership_type"
                placeholder="Ownership Type"
                value={getEditValue('ownership_type') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, ownership_type: e.target.value })}
              />
              <label htmlFor="ownership_type">Ownership Type</label>
            </CFormFloating>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="number"
                    id="lot_size_sf"
                    placeholder="Lot Size (SF)"
                    value={getEditValue('lot_size_sf') as number || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, lot_size_sf: parseFloat(e.target.value) })}
                  />
                  <label htmlFor="lot_size_sf">Lot Size (SF)</label>
                </CFormFloating>
              </CCol>
              <CCol md={6}>
                <CFormFloating>
                  <CFormInput
                    type="number"
                    id="lot_size_acres"
                    placeholder="Lot Size (Acres)"
                    step="0.01"
                    value={getEditValue('lot_size_acres') as number || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, lot_size_acres: parseFloat(e.target.value) })}
                  />
                  <label htmlFor="lot_size_acres">Lot Size (Acres)</label>
                </CFormFloating>
              </CCol>
            </CRow>

            {isLandDevelopment && (
              <CFormFloating className="mb-3">
                <CFormInput
                  type="date"
                  id="start_date"
                  placeholder="Start Date"
                  value={getEditValue('start_date') as string || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, start_date: e.target.value })}
                />
                <label htmlFor="start_date">Start Date</label>
              </CFormFloating>
            )}

            <CFormFloating className="mb-3">
              <CFormInput
                type="number"
                id="year_built"
                placeholder="Year Built"
                value={getEditValue('year_built') as number || ''}
                onChange={(e) => setEditedProject({ ...editedProject, year_built: parseInt(e.target.value) })}
              />
              <label htmlFor="year_built">Year Built</label>
            </CFormFloating>

            <CFormFloating className="mb-3">
              <CFormInput
                type="number"
                id="total_units"
                placeholder="Total Units"
                value={getEditValue('total_units') as number || ''}
                onChange={(e) => setEditedProject({ ...editedProject, total_units: parseInt(e.target.value) })}
              />
              <label htmlFor="total_units">Total Units</label>
            </CFormFloating>

            <CFormFloating className="mb-3">
              <CFormInput
                type="number"
                id="stories"
                placeholder="Stories"
                value={getEditValue('stories') as number || ''}
                onChange={(e) => setEditedProject({ ...editedProject, stories: parseInt(e.target.value) })}
              />
              <label htmlFor="stories">Stories</label>
            </CFormFloating>

            <CFormFloating className="mb-3">
              <CFormInput
                type="number"
                id="gross_sf"
                placeholder="Gross SF"
                value={getEditValue('gross_sf') as number || ''}
                onChange={(e) => setEditedProject({ ...editedProject, gross_sf: parseFloat(e.target.value) })}
              />
              <label htmlFor="gross_sf">Gross SF</label>
            </CFormFloating>

            <CFormFloating>
              <CFormTextarea
                id="project_notes"
                placeholder="Notes"
                style={{ height: '100px' }}
                value={getEditValue('project_notes') as string || ''}
                onChange={(e) => setEditedProject({ ...editedProject, project_notes: e.target.value })}
              />
              <label htmlFor="project_notes">Notes</label>
            </CFormFloating>
          </>
        )}
      </CCardBody>
    </CCard>
  );

  const renderOverviewColumns = () => {
    return (
      <>
        <CCol md={5} lg={4}>
          <ProjectProfileTile projectId={project.project_id} />
        </CCol>
        <CCol md={7} lg={8}>
          {renderMapCard()}
        </CCol>
      </>
    );
  };

  return (
    <>
    <div className="space-y-4">
      {/* Section 1: Location, Profile & Map (Two Column Layout) */}
      <CRow>
        {renderOverviewColumns()}
      </CRow>

      {/* Section 2: Financial Summary */}
      {hasFinancialData && (
        <CCard>
          <CCardHeader
            className="d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setFinancialSummaryExpanded(!financialSummaryExpanded)}
          >
            <span>Financial Summary</span>
            <CIcon icon={financialSummaryExpanded ? cilChevronTop : cilChevronBottom} size="lg" />
          </CCardHeader>
          <CCardBody>
            {/* Financial Summary Tiles - All in One Row */}
            <CRow className="mb-4">
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-primary-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-primary)' }}>
                    {formatCurrency(project.asking_price)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Asking Price
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-info-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-info)' }}>
                    {formatCurrency(project.price_per_unit)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Price / Unit
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-success-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-success)' }}>
                    ${project.price_per_sf ? Number(project.price_per_sf).toFixed(2) : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Price / SF
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-warning-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-warning)' }}>
                    {formatPercent(project.cap_rate_current)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Current Cap
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-danger-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-danger)' }}>
                    {formatPercent(project.cap_rate_proforma)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Proforma Cap
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-secondary-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(project.current_noi)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Current NOI
                  </div>
                </div>
              </CCol>
              <CCol>
                <div className="text-center p-2" style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderRadius: '8px' }}>
                  <div className="text-xl font-bold" style={{ color: 'var(--cui-body-color)' }}>
                    {formatCurrency(project.proforma_noi)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>
                    Proforma NOI
                  </div>
                </div>
              </CCol>
            </CRow>

            {/* Collapsible Financial Table */}
            <CCollapse visible={financialSummaryExpanded}>
              {/* Financial Table with Offering, % Change, and Landscape Proforma */}
              <div className="table-responsive" style={{ position: 'relative' }}>
              <table className="table table-sm" style={{ borderColor: 'var(--cui-border-color)' }}>
                <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                  <tr>
                    <th rowSpan={2} style={{ color: 'var(--cui-body-color)', verticalAlign: 'middle', width: '25%' }}>Metric</th>
                    <th colSpan={2} className="text-center" style={{ color: 'var(--cui-body-color)', borderBottom: 'none' }}>
                      Project Offering
                    </th>
                    <th rowSpan={2} className="text-center" style={{ color: 'var(--cui-body-color)', verticalAlign: 'bottom', paddingBottom: '8px', width: '12%' }}>
                      % Change
                    </th>
                    <th rowSpan={2} className="text-center" style={{ color: 'var(--cui-body-color)', verticalAlign: 'bottom', paddingBottom: '8px', width: '18%' }}>
                      <div>Landscape</div>
                      <div>Proforma</div>
                    </th>
                  </tr>
                  <tr>
                    <th className="text-end" style={{ color: 'var(--cui-body-color)', width: '20%' }}>Current</th>
                    <th className="text-end" style={{ color: 'var(--cui-body-color)', width: '20%' }}>Proforma</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>GPR (Annual)</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.current_gpr)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.proforma_gpr)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_gpr, project.proforma_gpr)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>Other Income</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.current_other_income)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.proforma_other_income)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_other_income, project.proforma_other_income)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>GPI</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.current_gpi)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.proforma_gpi)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_gpi, project.proforma_gpi)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>Vacancy Rate</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercent(project.current_vacancy_rate)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercent(project.proforma_vacancy_rate)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_vacancy_rate, project.proforma_vacancy_rate)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>EGI</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.current_egi)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.proforma_egi)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_egi, project.proforma_egi)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--cui-secondary-color)' }}>Operating Expenses</td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.current_opex)}
                    </td>
                    <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(project.proforma_opex)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {formatPercentChange(project.current_opex, project.proforma_opex)}
                    </td>
                    <td className="text-center" style={{ color: 'var(--cui-body-color)' }}>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Pending User Assumptions Overlay - shown over Landscape Proforma column */}
              <div style={{
                position: 'absolute',
                top: '56px', // After header rows
                right: '0',
                width: '20%', // Covers the Landscape Proforma column (1 of 5 columns)
                height: 'calc(100% - 56px)',
                backgroundColor: 'rgba(200, 200, 200, 0.15)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: '#999',
                  fontWeight: 'normal',
                  fontSize: '0.85rem'
                }}>
                  Pending User Assumptions
                </div>
              </div>
              </div>
            </CCollapse>
          </CCardBody>
        </CCard>
      )}

      {/* Section 3: Market Rates - Accordion */}
      <CCard className="mb-3">
        <CCardHeader
          className="d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => setMarketRatesExpanded(!marketRatesExpanded)}
        >
          <span>Market Rates</span>
          <CIcon icon={marketRatesExpanded ? cilChevronTop : cilChevronBottom} size="lg" />
        </CCardHeader>
        {marketRatesExpanded && (
          <CCardBody>
            {/* Inflation / Growth Rates */}
            <div className="mb-3">
              <h6 className="mb-3" style={{ color: 'var(--cui-body-color)' }}>Inflation / Growth Rates</h6>

              {/* General Inflation Row */}
              <div className="mb-2 d-flex align-items-center">
                <div style={{ fontWeight: 'bold', width: '180px', flexShrink: 0 }}>Inflation: General</div>
                <div style={{ width: '120px', marginRight: '10px' }}>
                  <CFormInput
                    id="general_inflation"
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    defaultValue="2.5"
                    size="sm"
                  />
                </div>
                <div style={{ marginRight: '10px' }}>%</div>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNewInflationSchedule();
                  }}
                >
                  Custom
                </CButton>
              </div>

              {/* Saved Inflation Schedules - Each on its own row */}
              {savedInflationSchedules.map((schedule) => (
                <div key={schedule.id} className="mb-2 d-flex align-items-center">
                  <div style={{ fontWeight: 'bold', width: '180px', flexShrink: 0 }}>
                    Inflation: {schedule.name}
                  </div>
                  <div
                    style={{
                      width: '120px',
                      marginRight: '10px',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--cui-tertiary-bg)',
                      border: '1px solid var(--cui-border-color)',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      textAlign: 'center'
                    }}
                  >
                    Custom
                  </div>
                  <div style={{ marginRight: '10px' }}>&nbsp;</div>
                  <CButton
                    color="primary"
                    variant="ghost"
                    size="sm"
                    className="p-1 me-1"
                    style={{ minWidth: 'auto', fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadInflationSchedule(schedule);
                    }}
                  >
                    Edit
                  </CButton>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    style={{ minWidth: 'auto', fontSize: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete schedule "${schedule.name}"?`)) {
                        handleDeleteInflationSchedule(schedule.id);
                      }
                    }}
                  >
                    Delete
                  </CButton>
                </div>
              ))}
            </div>
          </CCardBody>
        )}
      </CCard>

      {/* Section 4: Contacts */}
      <CCard className="mb-3">
        <CCardHeader
          className="d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => setContactsExpanded(!contactsExpanded)}
        >
          <span>Contacts</span>
          <CIcon icon={contactsExpanded ? cilChevronTop : cilChevronBottom} size="lg" />
        </CCardHeader>
        {contactsExpanded && (
          <CCardBody>
            {project.listing_brokerage && (
              <div className="mb-3">
                <strong>Listing Brokerage:</strong>
                <div>{project.listing_brokerage}</div>
              </div>
            )}

            {/* Contacts Section */}
            <ContactsSection projectId={project.project_id} />
          </CCardBody>
        )}
      </CCard>

      {/* Section 5: Landscaper AI Assistant with Document Upload */}
      <CCard>
        <CCardHeader>
          <CIcon icon={cilLightbulb} className="me-2" />
          Landscaper AI Assistant
        </CCardHeader>
        <CCardBody>
          <CRow>
            {/* Left side - AI Description */}
            <CCol md={7}>
              <h5>Welcome to your project!</h5>
              <p>
                Landscaper AI can help you get started by analyzing your planning documents,
                site plans, market studies, and financial models.
              </p>
              <p><strong>Upload documents to automatically extract:</strong></p>
              <ul>
                <li>Project hierarchy and phasing</li>
                <li>Development assumptions</li>
                <li>Market comparables</li>
                <li>Financial projections</li>
              </ul>
              <div className="mt-3">
                <h6>Supported Documents:</h6>
                <ul className="text-sm">
                  <li>Site plans and plat maps (PDF, images)</li>
                  <li>Market studies and feasibility reports (PDF, Word)</li>
                  <li>Financial models (Excel, CSV)</li>
                  <li>Entitlement documents (PDF)</li>
                  <li>Engineering plans (PDF, CAD)</li>
                </ul>
              </div>
              <div className="mt-3">
                <CButton color="link" href={`/projects/${project.project_id}?tab=documents`}>
                  View all documents →
                </CButton>
              </div>
            </CCol>

            {/* Right side - Drag & Drop Upload Area */}
            <CCol md={5}>
              <div
                className="border-2 border-dashed rounded p-6 text-center h-100 d-flex flex-column justify-content-center"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  minHeight: '300px'
                }}
              >
                <CIcon icon={cilCloudUpload} size="xl" className="mb-3" style={{ color: 'var(--cui-secondary-color)' }} />
                <p className="mb-2">Drag and drop files here</p>
                <p className="text-sm mb-3" style={{ color: 'var(--cui-secondary-color)' }}>
                  or click to browse
                </p>
                <div>
                  <CButton color="primary">Select Files</CButton>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--cui-secondary-color)' }}>
                  PDF, Excel, Word, Images, CAD files
                </p>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Section 7: Macro Conditions - Individual Colored Tiles */}
      <div className="mb-2">
        <h5 className="mb-3" style={{ color: 'var(--cui-body-color)' }}>
          Macro Conditions
          {project.jurisdiction_city && project.jurisdiction_state && (
            <span className="text-xs ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
              (Based on {project.jurisdiction_city}, {project.jurisdiction_state})
            </span>
          )}
        </h5>
        {!project.jurisdiction_city || !project.jurisdiction_state && (
          <div className="mb-3 text-center">
            <p className="text-xs" style={{ color: 'var(--cui-warning)' }}>
              Project location not set. Showing national data.
            </p>
          </div>
        )}
      </div>

      <CRow>
        {/* Inflation Tile */}
        <CCol md={3}>
          <CCard className="text-center" style={{ backgroundColor: 'var(--cui-primary-bg)', borderColor: 'var(--cui-primary)' }}>
            <CCardBody>
              {loadingMarketData ? (
                <div style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold" style={{ color: 'var(--cui-primary)' }}>
                    {marketStats?.inflation.value !== null
                      ? `${marketStats.inflation.value.toFixed(1)}`
                      : 'N/A'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--cui-body-color)' }}>
                    Inflation (CPI)
                  </div>
                  {marketStats?.inflation.yoy !== null && (
                    <div
                      className="text-xs mt-2"
                      style={{
                        color: marketStats.inflation.yoy >= 0 ? 'var(--cui-danger)' : 'var(--cui-success)',
                      }}
                    >
                      {marketStats.inflation.yoy >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(marketStats.inflation.yoy).toFixed(1)}% YoY
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                    {marketStats?.inflation.updatedDate}
                  </div>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* 10-Year Treasury Tile */}
        <CCol md={3}>
          <CCard className="text-center" style={{ backgroundColor: 'var(--cui-success-bg)', borderColor: 'var(--cui-success)' }}>
            <CCardBody>
              {loadingMarketData ? (
                <div style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold" style={{ color: 'var(--cui-success)' }}>
                    {marketStats?.treasury10y.value !== null
                      ? `${marketStats.treasury10y.value.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--cui-body-color)' }}>
                    10-Year Treasury
                  </div>
                  {marketStats?.treasury10y.yoy !== null && (
                    <div
                      className="text-xs mt-2"
                      style={{
                        color: marketStats.treasury10y.yoy >= 0 ? 'var(--cui-danger)' : 'var(--cui-success)',
                      }}
                    >
                      {marketStats.treasury10y.yoy >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(marketStats.treasury10y.yoy).toFixed(1)}% YoY
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                    {marketStats?.treasury10y.updatedDate}
                  </div>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Prime Rate Tile */}
        <CCol md={3}>
          <CCard className="text-center" style={{ backgroundColor: 'var(--cui-warning-bg)', borderColor: 'var(--cui-warning)' }}>
            <CCardBody>
              {loadingMarketData ? (
                <div style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold" style={{ color: 'var(--cui-warning)' }}>
                    {marketStats?.primeRate.value !== null
                      ? `${marketStats.primeRate.value.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--cui-body-color)' }}>
                    Prime Rate
                  </div>
                  {marketStats?.primeRate.yoy !== null && (
                    <div
                      className="text-xs mt-2"
                      style={{
                        color: marketStats.primeRate.yoy >= 0 ? 'var(--cui-danger)' : 'var(--cui-success)',
                      }}
                    >
                      {marketStats.primeRate.yoy >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(marketStats.primeRate.yoy).toFixed(1)}% YoY
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                    {marketStats?.primeRate.updatedDate}
                  </div>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* SOFR Tile */}
        <CCol md={3}>
          <CCard className="text-center" style={{ backgroundColor: 'var(--cui-info-bg)', borderColor: 'var(--cui-info)' }}>
            <CCardBody>
              {loadingMarketData ? (
                <div style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>
              ) : (
                <>
                  <div className="text-3xl font-bold" style={{ color: 'var(--cui-info)' }}>
                    {marketStats?.sofr90day.value !== null
                      ? `${marketStats.sofr90day.value.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--cui-body-color)' }}>
                    SOFR (90-day)
                  </div>
                  {marketStats?.sofr90day.yoy !== null && (
                    <div
                      className="text-xs mt-2"
                      style={{
                        color: marketStats.sofr90day.yoy >= 0 ? 'var(--cui-danger)' : 'var(--cui-success)',
                      }}
                    >
                      {marketStats.sofr90day.yoy >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(marketStats.sofr90day.yoy).toFixed(1)}% YoY
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                    {marketStats?.sofr90day.updatedDate}
                  </div>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Inflation Step Schedule Modal */}
      <CModal
        visible={showInflationModal}
        onClose={handleCloseInflationModal}
        alignment="center"
      >
        <style jsx global>{`
          #inflation-schedule-modal .modal-dialog {
            max-width: 450px !important;
          }
          #inflation-schedule-modal input,
          #inflation-schedule-modal textarea,
          #inflation-schedule-modal button {
            transition: none !important;
          }
          #inflation-schedule-modal input:hover,
          #inflation-schedule-modal textarea:hover {
            border-color: var(--cui-border-color) !important;
            background-color: var(--cui-body-bg) !important;
          }
          #inflation-schedule-modal input:focus,
          #inflation-schedule-modal textarea:focus,
          #inflation-schedule-modal button:focus {
            outline: 2px solid #6c757d !important;
            outline-offset: -2px;
            box-shadow: none !important;
            border-color: #6c757d !important;
            background-color: var(--cui-body-bg) !important;
          }
          #inflation-schedule-modal input::selection,
          #inflation-schedule-modal textarea::selection {
            background-color: rgba(108, 117, 125, 0.2) !important;
            color: inherit !important;
          }
        `}</style>
        <div id="inflation-schedule-modal">
          <CModalHeader>
            <CModalTitle>Custom Inflation Schedule</CModalTitle>
          </CModalHeader>
          <CModalBody>
          <div className="mb-3">
            <label htmlFor="schedule_name" className="form-label" style={{ fontWeight: 500 }}>
              Schedule Name
            </label>
            <CFormInput
              id="schedule_name"
              type="text"
              placeholder="e.g., High Inflation Scenario"
              value={inflationScheduleName}
              onChange={(e) => setInflationScheduleName(e.target.value)}
              onFocus={(e) => e.target.select()}
              ref={scheduleNameInputRef}
            />
          </div>
          <p className="mb-3" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
            Define inflation rates by period. Use "E" to indicate the end of the analysis period.
          </p>
          <StepRateTable
            steps={inflationSteps}
            onUpdateStep={handleUpdateInflationStep}
            rateUnit="%"
            readonly={false}
          />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseInflationModal}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleSaveInflationSteps}>
              Save Schedule
            </CButton>
          </CModalFooter>
        </div>
      </CModal>
    </div>
    <NewProjectModal
      isOpen={isNewProjectModalOpen}
      onClose={() => setIsNewProjectModalOpen(false)}
    />
    </>
  );
}
