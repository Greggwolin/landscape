'use client';

import { useState } from 'react';
import { Mail, Phone, Building2, User, StickyNote, Edit2, Trash2 } from 'lucide-react';
import { ProjectContact } from '@/types/contacts';

interface ContactCardProps {
  contact: ProjectContact;
  projectId: number;
  onUpdated: () => void;
  onDeleted: () => void;
}

const contactFieldClass =
  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 contacts-input';

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

  if (isEditing) {
    return (
      <div className="contacts-card-edit p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={contactFieldClass}
          />
          <input
            type="text"
            placeholder="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={contactFieldClass}
          />
        </div>
        <input
          type="text"
          placeholder="Company"
          value={formData.company || ''}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className={contactFieldClass}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={contactFieldClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Direct Phone"
            value={formData.phone_direct || ''}
            onChange={(e) => setFormData({ ...formData, phone_direct: e.target.value })}
            className={contactFieldClass}
          />
          <input
            type="text"
            placeholder="Mobile Phone"
            value={formData.phone_mobile || ''}
            onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
            className={contactFieldClass}
          />
        </div>
        <textarea
          placeholder="Notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className={contactFieldClass}
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
    <div className="contacts-card p-4 space-y-2">
      {/* Name and Title */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 contacts-card-icon" />
            <span className="font-medium contacts-card-name">{contact.name}</span>
            {contact.title && (
              <span className="text-sm contacts-card-title">- {contact.title}</span>
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
        <div className="flex items-center gap-2 text-sm contacts-card-meta">
          <Building2 className="w-4 h-4 contacts-card-icon" />
          <span>{contact.company}</span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2 text-sm contacts-card-meta">
          <Mail className="w-4 h-4 contacts-card-icon" />
          <a
            href={`mailto:${contact.email}`}
            className="contacts-card-link hover:underline"
          >
            {contact.email}
          </a>
        </div>
      )}

      {/* Phones */}
      {(contact.phone_direct || contact.phone_mobile) && (
        <div className="flex items-center gap-2 text-sm contacts-card-meta">
          <Phone className="w-4 h-4 contacts-card-icon" />
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
        <div className="flex items-start gap-2 mt-2 pt-2 contacts-card-notes">
          <StickyNote className="w-4 h-4 contacts-card-icon mt-0.5" />
          <span className="text-xs">{contact.notes}</span>
        </div>
      )}
    </div>
  );
}
