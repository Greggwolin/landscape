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

  // Role configuration: standard roles to always show (even if empty)
  const roleConfig: Record<string, string> = {
    property_contact: 'Property Contact',
    listing_broker: 'Listing Broker',
    buyer_broker: 'Buyer Broker',
    mortgage_broker: 'Mortgage Broker',
    owner_representative: 'Owner Representative',
    seller: 'Seller',
    buyer: 'Buyer',
    lender: 'Lender',
    title: 'Title Company',
    escrow: 'Escrow',
    attorney: 'Attorney',
    property_manager: 'Property Manager',
    other: 'Other Contacts',
  };

  // Show primary roles always, plus any roles that have contacts
  const primaryRoles = ['property_contact', 'listing_broker', 'mortgage_broker', 'owner_representative'];
  const rolesWithContacts = contactGroups.map(g => g.role_key);
  const allRolesToShow = [...new Set([...primaryRoles, ...rolesWithContacts])];

  // Ensure all roles to show are present in display
  const displayGroups = allRolesToShow.map(roleKey => {
    const existingGroup = contactGroups.find(g => g.role_key === roleKey);
    if (existingGroup) return existingGroup;

    // Create empty group for display
    return {
      role_key: roleKey,
      role_label: roleConfig[roleKey] || roleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
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
