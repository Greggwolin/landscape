'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CContainer,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CInputGroup,
  CFormInput,
  CButton,
  CButtonGroup,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSearch,
  cilPlus,
  cilUser,
  cilBuilding,
  cilInstitution,
  cilMoney,
  cilPeople,
  cilEnvelopeClosed,
  cilPhone,
} from '@coreui/icons';
import { getContacts } from '@/lib/api/contacts';
import type { ContactListItem, ContactType, PaginatedResponse } from '@/types/contacts';
import ContactDetailPanel from '@/components/contacts/ContactDetailPanel';
import ContactModal from '@/components/contacts/ContactModal';
import { SemanticBadge } from '@/components/ui/landscape';

const CONTACT_TYPE_ICONS: Record<ContactType, (string | string[])[]> = {
  Person: cilUser,
  Company: cilBuilding,
  Entity: cilInstitution,
  Fund: cilMoney,
  Government: cilInstitution,
  Other: cilPeople,
};

type FilterType = 'All' | ContactType;

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Person', label: 'People' },
  { key: 'Company', label: 'Companies' },
  { key: 'Entity', label: 'Entities' },
  { key: 'Fund', label: 'Funds' },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactListItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof getContacts>[0] = {};
      if (filterType !== 'All') {
        params.type = filterType;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      const response = await getContacts(params);
      setContacts(response.results);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle contact selection
  const handleContactClick = (contact: ContactListItem) => {
    setSelectedContactId(contact.contact_id);
  };

  // Handle add new contact
  const handleAddContact = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  // Handle contact saved
  const handleContactSaved = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    fetchContacts();
  };

  // Handle panel close
  const handlePanelClose = () => {
    setSelectedContactId(null);
  };

  // Handle contact updated from panel
  const handleContactUpdated = () => {
    fetchContacts();
  };

  // Contact counts by type
  const contactCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    contacts.forEach((c) => {
      counts[c.contact_type] = (counts[c.contact_type] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  return (
    <CContainer fluid className="py-4">
      <CCard className="border-0 shadow-sm">
        <CCardHeader className="bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
          <div>
            <h4 className="mb-0">Contacts</h4>
            <small className="text-muted">
              Manage contacts across all projects
            </small>
          </div>
          <CButton color="primary" onClick={handleAddContact}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Contact
          </CButton>
        </CCardHeader>

        <CCardBody>
          {/* Search and Filter Row */}
          <CRow className="mb-4 g-3">
            <CCol md={6} lg={4}>
              <CInputGroup>
                <CFormInput
                  placeholder="Search by name, company, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <CButton color="secondary" variant="outline">
                  <CIcon icon={cilSearch} />
                </CButton>
              </CInputGroup>
            </CCol>
            <CCol md={6} lg={8}>
              <CButtonGroup role="group" className="flex-wrap">
                {FILTER_OPTIONS.map((option) => (
                  <CButton
                    key={option.key}
                    color={filterType === option.key ? 'primary' : 'secondary'}
                    variant={filterType === option.key ? undefined : 'outline'}
                    onClick={() => setFilterType(option.key)}
                    size="sm"
                  >
                    {option.label}
                    {contactCounts[option.key] !== undefined && (
                      <SemanticBadge
                        intent="navigation-meta"
                        value={filterType === option.key ? 'active' : 'inactive'}
                        className="ms-2"
                      >
                        {contactCounts[option.key] || 0}
                      </SemanticBadge>
                    )}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>

          {/* Contacts Table */}
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="text-muted mt-2">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-5">
              <CIcon icon={cilPeople} size="3xl" className="text-muted mb-3" />
              <p className="text-muted mb-3">
                {debouncedSearch || filterType !== 'All'
                  ? 'No contacts found matching your criteria'
                  : 'No contacts yet. Add your first contact to get started.'}
              </p>
              {!debouncedSearch && filterType === 'All' && (
                <CButton color="primary" onClick={handleAddContact}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Add Contact
                </CButton>
              )}
            </div>
          ) : (
            <CTable hover responsive className="align-middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: '40px' }}></CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Email</CTableHeaderCell>
                  <CTableHeaderCell>Phone</CTableHeaderCell>
                  <CTableHeaderCell>Location</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {contacts.map((contact) => (
                  <CTableRow
                    key={contact.contact_id}
                    onClick={() => handleContactClick(contact)}
                    style={{ cursor: 'pointer' }}
                    className={
                      selectedContactId === contact.contact_id
                        ? 'table-active'
                        : ''
                    }
                  >
                    <CTableDataCell>
                      <SemanticBadge
                        intent="category"
                        value={contact.contact_type.toLowerCase()}
                        className="p-2"
                        title={contact.contact_type}
                      >
                        <CIcon
                          icon={CONTACT_TYPE_ICONS[contact.contact_type]}
                          size="sm"
                        />
                      </SemanticBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-semibold">
                        {contact.display_name || contact.name}
                      </div>
                      {contact.display_name && contact.display_name !== contact.name && (
                        <small className="text-muted">{contact.name}</small>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {contact.company_name || (
                        <span className="text-muted">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {contact.email ? (
                        <span className="d-flex align-items-center gap-1">
                          <CIcon icon={cilEnvelopeClosed} size="sm" className="text-muted" />
                          {contact.email}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {contact.phone ? (
                        <span className="d-flex align-items-center gap-1">
                          <CIcon icon={cilPhone} size="sm" className="text-muted" />
                          {contact.phone}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {contact.city || contact.state ? (
                        <span>
                          {[contact.city, contact.state]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Contact Detail Panel */}
      {selectedContactId && (
        <ContactDetailPanel
          contactId={selectedContactId}
          onClose={handlePanelClose}
          onUpdate={handleContactUpdated}
        />
      )}

      {/* Add/Edit Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        contact={editingContact}
        onClose={handleModalClose}
        onSave={handleContactSaved}
      />
    </CContainer>
  );
}
