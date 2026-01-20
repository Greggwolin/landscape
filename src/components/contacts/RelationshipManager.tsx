'use client';

import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CListGroup,
  CListGroupItem,
  CButton,
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
  CFormInput,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilPlus,
  cilTrash,
  cilLink,
  cilUser,
  cilBuilding,
  cilInstitution,
  cilMoney,
  cilPeople,
} from '@coreui/icons';
import {
  getContactRelationships,
  createContactRelationship,
  deleteContactRelationship,
} from '@/lib/api/contacts';
import type {
  ContactRelationship,
  ContactRelationshipsResponse,
  ContactType,
} from '@/types/contacts';
import ContactTypeahead from './ContactTypeahead';
import type { ContactTypeaheadItem } from '@/types/contacts';

interface RelationshipManagerProps {
  contactId: number;
  contactType: ContactType;
  onUpdate?: () => void;
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

const RELATIONSHIP_TYPES = [
  { value: 'employee', label: 'Employee of' },
  { value: 'owner', label: 'Owner of' },
  { value: 'partner', label: 'Partner in' },
  { value: 'member', label: 'Member of' },
  { value: 'subsidiary', label: 'Subsidiary of' },
  { value: 'parent', label: 'Parent of' },
  { value: 'affiliate', label: 'Affiliate of' },
  { value: 'investor', label: 'Investor in' },
  { value: 'advisor', label: 'Advisor to' },
  { value: 'other', label: 'Other' },
];

export default function RelationshipManager({
  contactId,
  contactType,
  onUpdate,
}: RelationshipManagerProps) {
  const [relationships, setRelationships] = useState<ContactRelationshipsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [selectedContact, setSelectedContact] = useState<ContactTypeaheadItem | null>(null);
  const [relationshipType, setRelationshipType] = useState('employee');
  const [roleTitle, setRoleTitle] = useState('');

  const fetchRelationships = async () => {
    setLoading(true);
    try {
      const data = await getContactRelationships(contactId);
      setRelationships(data);
    } catch (error) {
      console.error('Error fetching relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [contactId]);

  const handleAddRelationship = async () => {
    if (!selectedContact) return;

    setSaving(true);
    try {
      await createContactRelationship(contactId, {
        related_to_id: selectedContact.contact_id,
        relationship_type: relationshipType,
        role_title: roleTitle || undefined,
      });

      setShowAddModal(false);
      setSelectedContact(null);
      setRelationshipType('employee');
      setRoleTitle('');
      fetchRelationships();
      onUpdate?.();
    } catch (error) {
      console.error('Error creating relationship:', error);
      alert('Failed to create relationship');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelationship = async (relationshipId: number) => {
    const confirmed = window.confirm('Are you sure you want to remove this relationship?');
    if (!confirmed) return;

    setDeleting(relationshipId);
    try {
      await deleteContactRelationship(contactId, relationshipId);
      fetchRelationships();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting relationship:', error);
      alert('Failed to delete relationship');
    } finally {
      setDeleting(null);
    }
  };

  // Get existing related contact IDs to exclude from search
  const existingRelatedIds = relationships
    ? [
        ...relationships.outgoing.map((r) => r.related_to_id),
        ...relationships.incoming.map((r) => r.contact_id),
        contactId,
      ]
    : [contactId];

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <span className="ms-2 text-muted">Loading relationships...</span>
      </div>
    );
  }

  const hasRelationships =
    relationships &&
    (relationships.outgoing.length > 0 || relationships.incoming.length > 0);

  return (
    <>
      <CCard className="border-0 shadow-sm">
        <CCardHeader className="bg-transparent d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilLink} />
            <span className="fw-semibold">Relationships</span>
            {hasRelationships && (
              <CBadge color="secondary">
                {(relationships?.outgoing.length || 0) +
                  (relationships?.incoming.length || 0)}
              </CBadge>
            )}
          </div>
          <CButton
            color="primary"
            size="sm"
            variant="ghost"
            onClick={() => setShowAddModal(true)}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add
          </CButton>
        </CCardHeader>

        <CCardBody className="p-0">
          {!hasRelationships ? (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilLink} size="xl" className="mb-2 opacity-50" />
              <p className="mb-0">No relationships defined</p>
              <small>Link this contact to companies, entities, or other contacts</small>
            </div>
          ) : (
            <CListGroup flush>
              {/* Outgoing relationships (this contact → other) */}
              {relationships?.outgoing.map((rel) => (
                <CListGroupItem
                  key={rel.relationship_id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center gap-2">
                    <CBadge
                      color={CONTACT_TYPE_COLORS[rel.related_to_type as ContactType]}
                      className="p-2"
                    >
                      <CIcon
                        icon={CONTACT_TYPE_ICONS[rel.related_to_type as ContactType]}
                        size="sm"
                      />
                    </CBadge>
                    <div>
                      <div className="fw-semibold">{rel.related_to_name}</div>
                      <small className="text-muted">
                        {rel.relationship_type}
                        {rel.role_title && ` • ${rel.role_title}`}
                      </small>
                    </div>
                  </div>
                  <CButton
                    color="danger"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRelationship(rel.relationship_id)}
                    disabled={deleting === rel.relationship_id}
                  >
                    {deleting === rel.relationship_id ? (
                      <CSpinner size="sm" />
                    ) : (
                      <CIcon icon={cilTrash} />
                    )}
                  </CButton>
                </CListGroupItem>
              ))}

              {/* Incoming relationships (other → this contact) */}
              {relationships?.incoming.map((rel) => (
                <CListGroupItem
                  key={rel.relationship_id}
                  className="d-flex justify-content-between align-items-center bg-light bg-opacity-50"
                >
                  <div className="d-flex align-items-center gap-2">
                    <CBadge
                      color={CONTACT_TYPE_COLORS[rel.contact_type as ContactType]}
                      className="p-2"
                    >
                      <CIcon
                        icon={CONTACT_TYPE_ICONS[rel.contact_type as ContactType]}
                        size="sm"
                      />
                    </CBadge>
                    <div>
                      <div className="fw-semibold">{rel.contact_name}</div>
                      <small className="text-muted">
                        {rel.relationship_type}
                        {rel.role_title && ` • ${rel.role_title}`}
                        <CBadge color="secondary" className="ms-2" shape="rounded-pill">
                          incoming
                        </CBadge>
                      </small>
                    </div>
                  </div>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </CCardBody>
      </CCard>

      {/* Add Relationship Modal */}
      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)}>
        <CModalHeader closeButton>
          <CModalTitle>Add Relationship</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel>
                  Related Contact <span className="text-danger">*</span>
                </CFormLabel>
                <ContactTypeahead
                  value={selectedContact}
                  onChange={setSelectedContact}
                  excludeIds={existingRelatedIds}
                  placeholder="Search for a contact..."
                />
              </CCol>

              <CCol md={12}>
                <CFormLabel>
                  Relationship Type <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                >
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-muted">
                  How this contact relates to the selected contact
                </small>
              </CCol>

              <CCol md={12}>
                <CFormLabel>Role/Title (Optional)</CFormLabel>
                <CFormInput
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g., CEO, Managing Partner, Board Member"
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleAddRelationship}
            disabled={!selectedContact || saving}
          >
            {saving ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              'Add Relationship'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
