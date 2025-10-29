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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">
            {group.role_label}
          </span>
          {hasContacts && (
            <span className="text-sm text-gray-500">
              ({group.contacts.length})
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddContact();
          }}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-white">
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
            <div className="text-center py-6 text-gray-500 text-sm">
              No contacts added yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
