'use client';

import React, { useState, useEffect } from 'react';
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasTitle,
  COffcanvasBody,
  CCloseButton,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CCard,
  CCardBody,
  CListGroup,
  CListGroupItem,
  CBadge,
  CButton,
  CButtonGroup,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilUser,
  cilBuilding,
  cilInstitution,
  cilMoney,
  cilPeople,
  cilEnvelopeClosed,
  cilPhone,
  cilLocationPin,
  cilPencil,
  cilTrash,
  cilLink,
  cilBriefcase,
  cilNotes,
} from '@coreui/icons';
import {
  getContact,
  getContactRelationships,
  getContactProjects,
  deleteContact,
} from '@/lib/api/contacts';
import type {
  ContactDetail,
  ContactRelationshipsResponse,
  ContactType,
  RoleCategory,
} from '@/types/contacts';

interface ContactDetailPanelProps {
  contactId: number;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (contact: ContactDetail) => void;
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

const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
  Client: 'primary',
  'Transaction Party': 'success',
  'Internal Team': 'info',
  Vendor: 'warning',
  Other: 'secondary',
};

interface ProjectAssignment {
  project_contact_id: number;
  project_id: number;
  project_name: string;
  project_type_code: string;
  role: string;
  role_category: RoleCategory;
  is_primary: boolean;
  assigned_at: string;
}

export default function ContactDetailPanel({
  contactId,
  onClose,
  onUpdate,
  onEdit,
}: ContactDetailPanelProps) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [relationships, setRelationships] = useState<ContactRelationshipsResponse | null>(null);
  const [projects, setProjects] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'relationships' | 'projects'>('details');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contactData, relationshipsData, projectsData] = await Promise.all([
          getContact(contactId),
          getContactRelationships(contactId),
          getContactProjects(contactId),
        ]);
        setContact(contactData);
        setRelationships(relationshipsData);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching contact details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleDelete = async () => {
    if (!contact) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${contact.display_name || contact.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteContact(contactId);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. It may be referenced by projects.');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (contact && onEdit) {
      onEdit(contact);
    }
  };

  return (
    <COffcanvas
      placement="end"
      visible={true}
      onHide={onClose}
      backdrop={true}
      style={{ width: '450px' }}
    >
      <COffcanvasHeader>
        <COffcanvasTitle>Contact Details</COffcanvasTitle>
        <CCloseButton className="text-reset" onClick={onClose} />
      </COffcanvasHeader>

      <COffcanvasBody>
        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
            <p className="text-muted mt-2">Loading contact...</p>
          </div>
        ) : !contact ? (
          <div className="text-center py-5">
            <p className="text-muted">Contact not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="d-flex align-items-start mb-4">
              <CBadge
                color={CONTACT_TYPE_COLORS[contact.contact_type]}
                className="p-3 me-3"
              >
                <CIcon
                  icon={CONTACT_TYPE_ICONS[contact.contact_type]}
                  size="xl"
                />
              </CBadge>
              <div className="flex-grow-1">
                <h5 className="mb-1">{contact.display_name || contact.name}</h5>
                {contact.display_name && contact.display_name !== contact.name && (
                  <small className="text-muted d-block">{contact.name}</small>
                )}
                <CBadge color={CONTACT_TYPE_COLORS[contact.contact_type]} className="mt-1">
                  {contact.contact_type}
                </CBadge>
              </div>
              <CButtonGroup size="sm">
                {onEdit && (
                  <CButton color="secondary" variant="ghost" onClick={handleEdit}>
                    <CIcon icon={cilPencil} />
                  </CButton>
                )}
                <CButton
                  color="danger"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <CIcon icon={cilTrash} />
                </CButton>
              </CButtonGroup>
            </div>

            {/* Navigation Tabs */}
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilNotes} className="me-1" />
                  Details
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'relationships'}
                  onClick={() => setActiveTab('relationships')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilLink} className="me-1" />
                  Relationships
                  {relationships && (
                    <CBadge color="secondary" className="ms-1">
                      {relationships.outgoing.length + relationships.incoming.length}
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'projects'}
                  onClick={() => setActiveTab('projects')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilBriefcase} className="me-1" />
                  Projects
                  {projects.length > 0 && (
                    <CBadge color="secondary" className="ms-1">
                      {projects.length}
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {/* Details Tab */}
              <CTabPane visible={activeTab === 'details'}>
                <CCard className="border-0 shadow-sm mb-3">
                  <CCardBody>
                    <h6 className="text-muted mb-3">Contact Information</h6>
                    <CListGroup flush>
                      {contact.company_name && (
                        <CListGroupItem className="d-flex align-items-center px-0">
                          <CIcon icon={cilBuilding} className="text-muted me-2" />
                          <div>
                            <small className="text-muted d-block">Company</small>
                            {contact.company_name}
                          </div>
                        </CListGroupItem>
                      )}
                      {contact.job_title && (
                        <CListGroupItem className="d-flex align-items-center px-0">
                          <CIcon icon={cilBriefcase} className="text-muted me-2" />
                          <div>
                            <small className="text-muted d-block">Title</small>
                            {contact.job_title}
                          </div>
                        </CListGroupItem>
                      )}
                      {contact.email && (
                        <CListGroupItem className="d-flex align-items-center px-0">
                          <CIcon icon={cilEnvelopeClosed} className="text-muted me-2" />
                          <div>
                            <small className="text-muted d-block">Email</small>
                            <a href={`mailto:${contact.email}`}>{contact.email}</a>
                          </div>
                        </CListGroupItem>
                      )}
                      {contact.phone && (
                        <CListGroupItem className="d-flex align-items-center px-0">
                          <CIcon icon={cilPhone} className="text-muted me-2" />
                          <div>
                            <small className="text-muted d-block">Phone</small>
                            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                          </div>
                        </CListGroupItem>
                      )}
                      {(contact.city || contact.state || contact.address_line1) && (
                        <CListGroupItem className="d-flex align-items-start px-0">
                          <CIcon icon={cilLocationPin} className="text-muted me-2 mt-1" />
                          <div>
                            <small className="text-muted d-block">Address</small>
                            {contact.address_line1 && <div>{contact.address_line1}</div>}
                            {contact.address_line2 && <div>{contact.address_line2}</div>}
                            {(contact.city || contact.state || contact.postal_code) && (
                              <div>
                                {[contact.city, contact.state].filter(Boolean).join(', ')}
                                {contact.postal_code && ` ${contact.postal_code}`}
                              </div>
                            )}
                          </div>
                        </CListGroupItem>
                      )}
                    </CListGroup>
                  </CCardBody>
                </CCard>

                {contact.notes && (
                  <CCard className="border-0 shadow-sm mb-3">
                    <CCardBody>
                      <h6 className="text-muted mb-3">Notes</h6>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {contact.notes}
                      </p>
                    </CCardBody>
                  </CCard>
                )}

                {contact.tags && contact.tags.length > 0 && (
                  <CCard className="border-0 shadow-sm">
                    <CCardBody>
                      <h6 className="text-muted mb-3">Tags</h6>
                      <div className="d-flex flex-wrap gap-1">
                        {contact.tags.map((tag, index) => (
                          <CBadge key={index} color="secondary" shape="rounded-pill">
                            {tag}
                          </CBadge>
                        ))}
                      </div>
                    </CCardBody>
                  </CCard>
                )}
              </CTabPane>

              {/* Relationships Tab */}
              <CTabPane visible={activeTab === 'relationships'}>
                {relationships && (
                  <>
                    {relationships.outgoing.length > 0 && (
                      <CCard className="border-0 shadow-sm mb-3">
                        <CCardBody>
                          <h6 className="text-muted mb-3">Affiliated With</h6>
                          <CListGroup flush>
                            {relationships.outgoing.map((rel) => (
                              <CListGroupItem key={rel.relationship_id} className="px-0">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <div className="fw-semibold">{rel.related_to_name}</div>
                                    <small className="text-muted">
                                      {rel.relationship_type}
                                      {rel.role_title && ` - ${rel.role_title}`}
                                    </small>
                                  </div>
                                  <CBadge
                                    color={CONTACT_TYPE_COLORS[rel.related_to_type as ContactType]}
                                  >
                                    {rel.related_to_type}
                                  </CBadge>
                                </div>
                              </CListGroupItem>
                            ))}
                          </CListGroup>
                        </CCardBody>
                      </CCard>
                    )}

                    {relationships.incoming.length > 0 && (
                      <CCard className="border-0 shadow-sm mb-3">
                        <CCardBody>
                          <h6 className="text-muted mb-3">Affiliations (Incoming)</h6>
                          <CListGroup flush>
                            {relationships.incoming.map((rel) => (
                              <CListGroupItem key={rel.relationship_id} className="px-0">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <div className="fw-semibold">{rel.contact_name}</div>
                                    <small className="text-muted">
                                      {rel.relationship_type}
                                      {rel.role_title && ` - ${rel.role_title}`}
                                    </small>
                                  </div>
                                  <CBadge
                                    color={CONTACT_TYPE_COLORS[rel.contact_type as ContactType]}
                                  >
                                    {rel.contact_type}
                                  </CBadge>
                                </div>
                              </CListGroupItem>
                            ))}
                          </CListGroup>
                        </CCardBody>
                      </CCard>
                    )}

                    {relationships.outgoing.length === 0 &&
                      relationships.incoming.length === 0 && (
                        <div className="text-center py-4">
                          <CIcon icon={cilLink} size="xl" className="text-muted mb-2" />
                          <p className="text-muted">No relationships defined</p>
                        </div>
                      )}
                  </>
                )}
              </CTabPane>

              {/* Projects Tab */}
              <CTabPane visible={activeTab === 'projects'}>
                {projects.length > 0 ? (
                  <CCard className="border-0 shadow-sm">
                    <CCardBody>
                      <CListGroup flush>
                        {projects.map((project) => (
                          <CListGroupItem key={project.project_contact_id} className="px-0">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-semibold">{project.project_name}</div>
                                <small className="text-muted">
                                  {project.role}
                                  {project.is_primary && (
                                    <CBadge color="info" className="ms-2">
                                      Primary
                                    </CBadge>
                                  )}
                                </small>
                              </div>
                              <CBadge
                                color={ROLE_CATEGORY_COLORS[project.role_category]}
                              >
                                {project.role_category}
                              </CBadge>
                            </div>
                          </CListGroupItem>
                        ))}
                      </CListGroup>
                    </CCardBody>
                  </CCard>
                ) : (
                  <div className="text-center py-4">
                    <CIcon icon={cilBriefcase} size="xl" className="text-muted mb-2" />
                    <p className="text-muted">Not assigned to any projects</p>
                  </div>
                )}
              </CTabPane>
            </CTabContent>
          </>
        )}
      </COffcanvasBody>
    </COffcanvas>
  );
}
