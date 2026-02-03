'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CListGroup,
  CListGroupItem,
  CSpinner,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormCheck,
  CRow,
  CCol,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import {
  cilUser,
  cilBuilding,
  cilInstitution,
  cilMoney,
  cilPeople,
  cilPlus,
  cilTrash,
  cilEnvelopeClosed,
  cilPhone,
  cilStar,
} from '@coreui/icons';
import {
  getProjectContactsByCategory,
  getContactRoles,
  addContactToProject,
  removeContactFromProject,
  updateProjectContact,
} from '@/lib/api/contacts';
import type {
  ContactsByCategory,
  ContactRole,
  ProjectContact,
  ContactType,
  RoleCategory,
} from '@/types/contacts';
import { ContactTypeahead } from '@/components/contacts';
import type { ContactTypeaheadItem } from '@/types/contacts';

interface ProjectContactsSectionProps {
  projectId: number;
}

const CONTACT_TYPE_ICONS: Record<ContactType, (string | string[])[]> = {
  Person: cilUser,
  Company: cilBuilding,
  Entity: cilInstitution,
  Fund: cilMoney,
  Government: cilInstitution,
  Other: cilPeople,
};

const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  Person: 'primary',
  Company: 'success',
  Entity: 'warning',
  Fund: 'info',
  Government: 'secondary',
  Other: 'dark',
};

const ROLE_CATEGORY_ORDER: RoleCategory[] = [
  'Client',
  'Transaction Party',
  'Internal Team',
  'Vendor',
  'Other',
];

const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
  Client: 'primary',
  'Transaction Party': 'success',
  'Internal Team': 'info',
  Vendor: 'warning',
  Other: 'secondary',
};

export default function ProjectContactsSection({ projectId }: ProjectContactsSectionProps) {
  const [contactsByCategory, setContactsByCategory] = useState<ContactsByCategory | null>(null);
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Add contact form state
  const [selectedContact, setSelectedContact] = useState<ContactTypeaheadItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isBillingContact, setIsBillingContact] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsData, rolesData] = await Promise.all([
        getProjectContactsByCategory(projectId),
        getContactRoles(),
      ]);
      setContactsByCategory(contactsData);
      setRoles(rolesData.results);
    } catch (error) {
      console.error('Error fetching project contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get existing contact IDs assigned to this project
  const existingContactIds = contactsByCategory
    ? Object.values(contactsByCategory)
        .flat()
        .map((pc) => pc.contact_id)
    : [];

  const handleAddContact = async () => {
    if (!selectedContact || !selectedRoleId) return;

    setSaving(true);
    try {
      await addContactToProject(projectId, {
        contact_id: selectedContact.contact_id,
        role_id: selectedRoleId,
        is_primary: isPrimary,
        is_billing_contact: isBillingContact,
      });

      setShowAddModal(false);
      resetAddForm();
      fetchData();
    } catch (error) {
      console.error('Error adding contact to project:', error);
      alert('Failed to add contact to project');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveContact = async (projectContactId: number) => {
    const confirmed = window.confirm('Remove this contact from the project?');
    if (!confirmed) return;

    setRemovingId(projectContactId);
    try {
      await removeContactFromProject(projectId, projectContactId);
      fetchData();
    } catch (error) {
      console.error('Error removing contact:', error);
      alert('Failed to remove contact');
    } finally {
      setRemovingId(null);
    }
  };

  const handleTogglePrimary = async (projectContact: ProjectContact) => {
    try {
      await updateProjectContact(projectId, projectContact.project_contact_id, {
        is_primary: !projectContact.is_primary,
      });
      fetchData();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const resetAddForm = () => {
    setSelectedContact(null);
    setSelectedRoleId(null);
    setIsPrimary(false);
    setIsBillingContact(false);
  };

  // Group roles by category for the dropdown
  const rolesByCategory = roles.reduce(
    (acc, role) => {
      const cat = role.role_category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(role);
      return acc;
    },
    {} as Record<RoleCategory, ContactRole[]>
  );

  if (loading) {
    return (
      <CCard className="border-0 shadow-sm">
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="text-muted mt-2">Loading contacts...</p>
        </CCardBody>
      </CCard>
    );
  }

  const hasAnyContacts = contactsByCategory
    ? Object.values(contactsByCategory).some((arr) => arr.length > 0)
    : false;

  return (
    <>
      <CCard className="border-0 shadow-sm">
        <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Project Contacts</h5>
            <small className="text-muted">People and organizations involved in this project</small>
          </div>
          <SemanticButton intent="primary-action" size="sm" onClick={() => setShowAddModal(true)}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Contact
          </SemanticButton>
        </CCardHeader>

        <CCardBody className="p-0">
          {!hasAnyContacts ? (
            <div className="text-center py-5">
              <CIcon icon={cilPeople} size="3xl" className="text-muted mb-3" />
              <p className="text-muted mb-3">No contacts assigned to this project yet</p>
              <SemanticButton intent="primary-action" onClick={() => setShowAddModal(true)}>
                <CIcon icon={cilPlus} className="me-1" />
                Add First Contact
              </SemanticButton>
            </div>
          ) : (
            <CAccordion flush alwaysOpen activeItemKey={ROLE_CATEGORY_ORDER}>
              {ROLE_CATEGORY_ORDER.map((category) => {
                const contacts = contactsByCategory?.[category] || [];
                if (contacts.length === 0) return null;

                return (
                  <CAccordionItem key={category} itemKey={category}>
                    <CAccordionHeader>
                      <div className="d-flex align-items-center gap-2">
                        <CBadge color={ROLE_CATEGORY_COLORS[category]}>
                          {contacts.length}
                        </CBadge>
                        <span className="fw-semibold">{category}</span>
                      </div>
                    </CAccordionHeader>
                    <CAccordionBody className="p-0">
                      <CListGroup flush>
                        {contacts.map((pc) => (
                          <CListGroupItem
                            key={pc.project_contact_id}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div className="d-flex align-items-center gap-3">
                              <CBadge
                                color={CONTACT_TYPE_COLORS[pc.contact_type as ContactType]}
                                className="p-2"
                              >
                                <CIcon
                                  icon={CONTACT_TYPE_ICONS[pc.contact_type as ContactType]}
                                  size="sm"
                                />
                              </CBadge>
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold">
                                    {pc.contact_display_name || pc.contact_name}
                                  </span>
                                  {pc.is_primary && (
                                    <CBadge color="info" shape="rounded-pill">
                                      <CIcon icon={cilStar} size="sm" className="me-1" />
                                      Primary
                                    </CBadge>
                                  )}
                                </div>
                                <div className="text-muted small">
                                  <span>{pc.role_label}</span>
                                  {pc.company_name && (
                                    <span> • {pc.company_name}</span>
                                  )}
                                </div>
                                <div className="d-flex gap-3 mt-1">
                                  {pc.email && (
                                    <a
                                      href={`mailto:${pc.email}`}
                                      className="text-muted small d-flex align-items-center gap-1"
                                    >
                                      <CIcon icon={cilEnvelopeClosed} size="sm" />
                                      {pc.email}
                                    </a>
                                  )}
                                  {pc.phone && (
                                    <a
                                      href={`tel:${pc.phone}`}
                                      className="text-muted small d-flex align-items-center gap-1"
                                    >
                                      <CIcon icon={cilPhone} size="sm" />
                                      {pc.phone}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="d-flex gap-1">
                              <SemanticButton
                                intent={pc.is_primary ? 'confirm-action' : 'tertiary-action'}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTogglePrimary(pc)}
                                title={pc.is_primary ? 'Remove primary' : 'Set as primary'}
                              >
                                <CIcon icon={cilStar} />
                              </SemanticButton>
                              <SemanticButton
                                intent="destructive-action"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveContact(pc.project_contact_id)}
                                disabled={removingId === pc.project_contact_id}
                                title="Remove from project"
                              >
                                {removingId === pc.project_contact_id ? (
                                  <CSpinner size="sm" />
                                ) : (
                                  <CIcon icon={cilTrash} />
                                )}
                              </SemanticButton>
                            </div>
                          </CListGroupItem>
                        ))}
                      </CListGroup>
                    </CAccordionBody>
                  </CAccordionItem>
                );
              })}
            </CAccordion>
          )}
        </CCardBody>
      </CCard>

      {/* Add Contact Modal */}
      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
        <CModalHeader closeButton>
          <CModalTitle>Add Contact to Project</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel>
                  Select Contact <span className="text-danger">*</span>
                </CFormLabel>
                <ContactTypeahead
                  value={selectedContact}
                  onChange={setSelectedContact}
                  excludeIds={existingContactIds}
                  placeholder="Search for a contact to add..."
                />
                <small className="text-muted">
                  Search by name, company, or email
                </small>
              </CCol>

              <CCol md={12}>
                <CFormLabel>
                  Role <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect
                  value={selectedRoleId || ''}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
                >
                  <option value="">Select a role...</option>
                  {ROLE_CATEGORY_ORDER.map((category) => {
                    const categoryRoles = rolesByCategory[category];
                    if (!categoryRoles || categoryRoles.length === 0) return null;
                    return (
                      <optgroup key={category} label={category}>
                        {categoryRoles.map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.role_label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormCheck
                  id="isPrimary"
                  label="Primary contact for this role"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
              </CCol>

              <CCol md={6}>
                <CFormCheck
                  id="isBillingContact"
                  label="Billing contact"
                  checked={isBillingContact}
                  onChange={(e) => setIsBillingContact(e.target.checked)}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <SemanticButton intent="secondary-action" variant="ghost" onClick={() => setShowAddModal(false)}>
            Cancel
          </SemanticButton>
          <SemanticButton
            intent="primary-action"
            onClick={handleAddContact}
            disabled={!selectedContact || !selectedRoleId || saving}
          >
            {saving ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              'Add to Project'
            )}
          </SemanticButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
