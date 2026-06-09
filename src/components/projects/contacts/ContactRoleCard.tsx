'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ContactGroup } from '@/types/contacts';
import ContactCard from './ContactCard';

interface ContactRoleCardProps {
  group: ContactGroup;
  projectId: number;
  onAddContact: () => void;
  onContactUpdated: () => void;
  onContactDeleted: () => void;
}

export default function ContactRoleCard({
  group,
  projectId,
  onAddContact,
  onContactUpdated,
  onContactDeleted
}: ContactRoleCardProps) {
  const [isExpanded, setIsExpanded] = useState(group.contacts.length > 0);

  const hasContacts = group.contacts.length > 0;

  return (
    <div className="contacts-role-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="contacts-role-header flex items-center justify-between px-4 py-2 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--cui-secondary-color)' }} />
          )}
          <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
            {group.role_label}
          </span>
          {hasContacts && (
            <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              ({group.contacts.length})
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddContact();
          }}
          className="text-sm font-medium px-2 py-1 rounded transition-colors"
          style={{
            color: 'var(--cui-primary)',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          + Add Contact
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="contacts-role-content p-4 space-y-3">
          {hasContacts ? (
            group.contacts.map(contact => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                projectId={projectId}
                onUpdated={onContactUpdated}
                onDeleted={onContactDeleted}
              />
            ))
          ) : (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              No contacts added yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
