'use client';

import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CRow,
  CCol,
  CSpinner,
  CInputGroup,
  CInputGroupText,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import {
  cilUser,
  cilBuilding,
  cilEnvelopeClosed,
  cilPhone,
  cilLocationPin,
  cilNotes,
  cilTag,
} from '@coreui/icons';
import { createContact, updateContact } from '@/lib/api/contacts';
import type { ContactListItem, ContactFormData, ContactType } from '@/types/contacts';
import { SemanticBadge } from '@/components/ui/landscape';

interface ContactModalProps {
  isOpen: boolean;
  contact?: ContactListItem | null;
  onClose: () => void;
  onSave: () => void;
  cabinetId?: number;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'Person', label: 'Person' },
  { value: 'Company', label: 'Company' },
  { value: 'Entity', label: 'Entity (LLC, Trust, etc.)' },
  { value: 'Fund', label: 'Fund' },
  { value: 'Government', label: 'Government' },
  { value: 'Other', label: 'Other' },
];

const initialFormData: ContactFormData = {
  name: '',
  contact_type: 'Person',
  display_name: '',
  company_name: '',
  job_title: '',
  email: '',
  phone: '',
  mobile_phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'USA',
  notes: '',
  tags: [],
};

export default function ContactModal({
  isOpen,
  contact,
  onClose,
  onSave,
  cabinetId,
}: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'notes'>('basic');

  const isEditing = !!contact;

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        contact_type: contact.contact_type,
        display_name: contact.display_name || '',
        company_name: contact.company_name || '',
        job_title: '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile_phone: '',
        address_line1: '',
        address_line2: '',
        city: contact.city || '',
        state: contact.state || '',
        postal_code: '',
        country: 'USA',
        notes: '',
        tags: [],
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setActiveTab('basic');
  }, [contact, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.contact_type) {
      newErrors.contact_type = 'Contact type is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        cabinet_id: cabinetId,
      };

      // Remove empty strings
      Object.keys(payload).forEach((key) => {
        const k = key as keyof typeof payload;
        if (payload[k] === '') {
          delete payload[k];
        }
      });

      if (isEditing && contact) {
        await updateContact(contact.contact_id, payload);
      } else {
        await createContact(payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving contact:', error);
      setErrors({ submit: 'Failed to save contact. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <CNav variant="tabs" className="mb-3">
            <CNavItem>
              <CNavLink
                active={activeTab === 'basic'}
                onClick={() => setActiveTab('basic')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilUser} className="me-1" />
                Basic Info
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'address'}
                onClick={() => setActiveTab('address')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilLocationPin} className="me-1" />
                Address
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'notes'}
                onClick={() => setActiveTab('notes')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilNotes} className="me-1" />
                Notes & Tags
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent>
            {/* Basic Info Tab */}
            <CTabPane visible={activeTab === 'basic'}>
              <CRow className="g-3">
                <CCol md={8}>
                  <CFormLabel htmlFor="name">
                    Name <span className="text-danger">*</span>
                  </CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      invalid={!!errors.name}
                      placeholder="Full name or organization name"
                    />
                  </CInputGroup>
                  {errors.name && (
                    <div className="text-danger small mt-1">{errors.name}</div>
                  )}
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="contact_type">
                    Type <span className="text-danger">*</span>
                  </CFormLabel>
                  <CFormSelect
                    id="contact_type"
                    name="contact_type"
                    value={formData.contact_type}
                    onChange={handleChange}
                    invalid={!!errors.contact_type}
                  >
                    {CONTACT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="display_name">Display Name</CFormLabel>
                  <CFormInput
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder="Alternate display name (optional)"
                  />
                  <small className="text-muted">
                    How this contact should appear in lists
                  </small>
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="company_name">Company</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilBuilding} />
                    </CInputGroupText>
                    <CFormInput
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Company or organization"
                    />
                  </CInputGroup>
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="job_title">Job Title</CFormLabel>
                  <CFormInput
                    id="job_title"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    placeholder="Position or role"
                  />
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="email">Email</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeClosed} />
                    </CInputGroupText>
                    <CFormInput
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      invalid={!!errors.email}
                      placeholder="email@example.com"
                    />
                  </CInputGroup>
                  {errors.email && (
                    <div className="text-danger small mt-1">{errors.email}</div>
                  )}
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="phone">Phone</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilPhone} />
                    </CInputGroupText>
                    <CFormInput
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </CInputGroup>
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="mobile_phone">Mobile</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilPhone} />
                    </CInputGroupText>
                    <CFormInput
                      id="mobile_phone"
                      name="mobile_phone"
                      type="tel"
                      value={formData.mobile_phone}
                      onChange={handleChange}
                      placeholder="(555) 987-6543"
                    />
                  </CInputGroup>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Address Tab */}
            <CTabPane visible={activeTab === 'address'}>
              <CRow className="g-3">
                <CCol md={12}>
                  <CFormLabel htmlFor="address_line1">Address Line 1</CFormLabel>
                  <CFormInput
                    id="address_line1"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    placeholder="Street address"
                  />
                </CCol>

                <CCol md={12}>
                  <CFormLabel htmlFor="address_line2">Address Line 2</CFormLabel>
                  <CFormInput
                    id="address_line2"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    placeholder="Suite, unit, building, floor, etc."
                  />
                </CCol>

                <CCol md={5}>
                  <CFormLabel htmlFor="city">City</CFormLabel>
                  <CFormInput
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="state">State</CFormLabel>
                  <CFormInput
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="postal_code">Postal Code</CFormLabel>
                  <CFormInput
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="ZIP code"
                  />
                </CCol>

                <CCol md={12}>
                  <CFormLabel htmlFor="country">Country</CFormLabel>
                  <CFormSelect
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="USA">United States</option>
                    <option value="CAN">Canada</option>
                    <option value="MEX">Mexico</option>
                    <option value="OTHER">Other</option>
                  </CFormSelect>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Notes & Tags Tab */}
            <CTabPane visible={activeTab === 'notes'}>
              <CRow className="g-3">
                <CCol md={12}>
                  <CFormLabel htmlFor="notes">Notes</CFormLabel>
                  <CFormTextarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Internal notes about this contact..."
                  />
                </CCol>

                <CCol md={12}>
                  <CFormLabel>Tags</CFormLabel>
                  <CInputGroup className="mb-2">
                    <CInputGroupText>
                      <CIcon icon={cilTag} />
                    </CInputGroupText>
                    <CFormInput
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <SemanticButton
                      intent="secondary-action"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Add
                    </SemanticButton>
                  </CInputGroup>
                  <div className="d-flex flex-wrap gap-1">
                    {formData.tags?.map((tag, index) => (
                      <SemanticBadge
                        key={index}
                        intent="user-tag"
                        value={tag}
                        interactive
                        userTagState="filled"
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <span>{tag}</span>
                        <span aria-hidden="true">&times;</span>
                      </SemanticBadge>
                    ))}
                  </div>
                </CCol>
              </CRow>
            </CTabPane>
          </CTabContent>

          {errors.submit && (
            <div className="alert alert-danger mt-3 mb-0">{errors.submit}</div>
          )}
        </CModalBody>

        <CModalFooter>
          <SemanticButton intent="secondary-action" variant="ghost" onClick={onClose}>
            Cancel
          </SemanticButton>
          <SemanticButton intent="primary-action" type="submit" disabled={saving}>
            {saving ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update Contact' : 'Create Contact'
            )}
          </SemanticButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
