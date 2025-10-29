'use client';

import { useState, useEffect } from 'react';
import { ContactGroup } from '@/types/contacts';
import ContactRoleCard from './ContactRoleCard';
import AddContactModal from './AddContactModal';

interface ContactsSectionProps {
  projectId: number;
}

export default function ContactsSection({ projectId }: ContactsSectionProps) {
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    fetchContacts();
  }, [projectId]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/contacts`);
      const result = await response.json();
      if (result.success) {
        setContactGroups(result.data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = (roleKey: string) => {
    setSelectedRole(roleKey);
    setIsAddModalOpen(true);
  };

  const handleContactAdded = () => {
    fetchContacts(); // Refresh contact list
    setIsAddModalOpen(false);
  };

  const handleContactUpdated = () => {
    fetchContacts(); // Refresh contact list
  };

  const handleContactDeleted = () => {
    fetchContacts(); // Refresh contact list
  };

  if (loading) {
    return <div className="text-gray-500">Loading contacts...</div>;
  }

  // Always show these role sections (even if empty)
  const standardRoles = ['property_contact', 'listing_broker', 'owner_representative', 'other'];

  // Ensure all standard roles are present in display
  const displayGroups = standardRoles.map(roleKey => {
    const existingGroup = contactGroups.find(g => g.role_key === roleKey);
    if (existingGroup) return existingGroup;

    // Create empty group for display
    return {
      role_key: roleKey,
      role_label: roleKey === 'property_contact' ? 'Property Contact'
        : roleKey === 'listing_broker' ? 'Listing Broker'
        : roleKey === 'owner_representative' ? 'Owner Representative'
        : 'Other Contacts',
      contacts: []
    };
  });

  return (
    <div className="space-y-3">
      {displayGroups.map(group => (
        <ContactRoleCard
          key={group.role_key}
          group={group}
          projectId={projectId}
          onAddContact={() => handleAddContact(group.role_key)}
          onContactUpdated={handleContactUpdated}
          onContactDeleted={handleContactDeleted}
        />
      ))}

      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleContactAdded}
        projectId={projectId}
        preselectedRole={selectedRole}
      />
    </div>
  );
}
