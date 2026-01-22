'use client';

/**
 * ContactCard - Individual contact display/edit component
 *
 * STYLING RULES:
 * - All colors use CSS variables (--cui-*)
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, grid, gap, p-*, m-*) are allowed
 *
 * @updated 2026-01-21 - CoreUI theming
 */

import { useState } from 'react';
import { Mail, Phone, Building2, User, StickyNote, Edit2, Trash2 } from 'lucide-react';
import { ProjectContact } from '@/types/contacts';

interface ContactCardProps {
  contact: ProjectContact;
  projectId: number;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function ContactCard({
  contact,
  projectId,
  onUpdated,
  onDeleted
}: ContactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(contact);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contacts/${contact.contact_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        setIsEditing(false);
        onUpdated();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/contacts/${contact.contact_id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onDeleted();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleCancel = () => {
    setFormData(contact);
    setIsEditing(false);
  };

  // Shared input styles using CSS variables
  const inputStyle = {
    backgroundColor: 'var(--cui-body-bg)',
    color: 'var(--cui-body-color)',
    borderColor: 'var(--cui-border-color)',
  };

  if (isEditing) {
    return (
      <div
        className="rounded-lg p-4 space-y-3"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{
              ...inputStyle,
              border: '1px solid var(--cui-border-color)',
            }}
          />
          <input
            type="text"
            placeholder="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{
              ...inputStyle,
              border: '1px solid var(--cui-border-color)',
            }}
          />
        </div>
        <input
          type="text"
          placeholder="Company"
          value={formData.company || ''}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{
            ...inputStyle,
            border: '1px solid var(--cui-border-color)',
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{
            ...inputStyle,
            border: '1px solid var(--cui-border-color)',
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Direct Phone"
            value={formData.phone_direct || ''}
            onChange={(e) => setFormData({ ...formData, phone_direct: e.target.value })}
            className="px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{
              ...inputStyle,
              border: '1px solid var(--cui-border-color)',
            }}
          />
          <input
            type="text"
            placeholder="Mobile Phone"
            value={formData.phone_mobile || ''}
            onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
            className="px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{
              ...inputStyle,
              border: '1px solid var(--cui-border-color)',
            }}
          />
        </div>
        <textarea
          placeholder="Notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{
            ...inputStyle,
            border: '1px solid var(--cui-border-color)',
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="btn btn-outline-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 space-y-2 transition-colors"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      {/* Name and Title */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
            <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
              {contact.name}
            </span>
            {contact.title && (
              <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                - {contact.title}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-sm btn-ghost-primary d-flex align-items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-sm btn-ghost-danger d-flex align-items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <Building2 className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
          <span>{contact.company}</span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <Mail className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
          <a
            href={`mailto:${contact.email}`}
            className="hover:underline"
            style={{ color: 'var(--cui-primary)' }}
          >
            {contact.email}
          </a>
        </div>
      )}

      {/* Phones */}
      {(contact.phone_direct || contact.phone_mobile) && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <Phone className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
          <div className="flex gap-3">
            {contact.phone_direct && (
              <span>D: {contact.phone_direct}</span>
            )}
            {contact.phone_mobile && (
              <span>M: {contact.phone_mobile}</span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div
          className="flex items-start gap-2 text-sm mt-2 pt-2"
          style={{
            color: 'var(--cui-secondary-color)',
            borderTop: '1px solid var(--cui-border-color)',
          }}
        >
          <StickyNote className="w-4 h-4 mt-0.5" style={{ color: 'var(--cui-secondary-color)' }} />
          <span className="text-xs">{contact.notes}</span>
        </div>
      )}
    </div>
  );
}
