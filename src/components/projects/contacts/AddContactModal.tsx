'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ContactFormData, CONTACT_ROLES } from '@/types/contacts';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  preselectedRole?: string;
}

const fieldClass =
  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 contacts-input';

export default function AddContactModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  preselectedRole
}: AddContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    contact_role: preselectedRole || 'property_contact',
    name: '',
    title: '',
    company: '',
    email: '',
    phone_direct: '',
    phone_mobile: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preselectedRole) {
      setFormData(prev => ({ ...prev, contact_role: preselectedRole }));
    }
  }, [preselectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        resetForm();
      } else {
        setError('Failed to create contact');
      }
    } catch (error) {
      setError('Failed to create contact');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contact_role: preselectedRole || 'property_contact',
      name: '',
      title: '',
      company: '',
      email: '',
      phone_direct: '',
      phone_mobile: '',
      notes: ''
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto contacts-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b contacts-modal-header">
          <h2 className="text-xl font-semibold contacts-modal-title">Add Contact</h2>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Contact Role */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Contact Role *
            </label>
            <select
              value={formData.contact_role}
              onChange={(e) =>
                setFormData({ ...formData, contact_role: e.target.value })
              }
              className={fieldClass}
            >
              {CONTACT_ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
              className={fieldClass}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Regional Manager"
              className={fieldClass}
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Company
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="ABC Property Management"
              className={fieldClass}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.smith@example.com"
              className={fieldClass}
            />
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Direct Phone
            </label>
            <input
                type="text"
                value={formData.phone_direct || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone_direct: e.target.value })
                }
                placeholder="+1 555 123 4567"
                className={fieldClass}
              />
            </div>
            <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Mobile Phone
            </label>
            <input
                type="text"
                value={formData.phone_mobile || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone_mobile: e.target.value })
                }
                placeholder="+1 555 987 6543"
              className={fieldClass}
            />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium contacts-modal-label mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              rows={3}
              className={fieldClass}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
