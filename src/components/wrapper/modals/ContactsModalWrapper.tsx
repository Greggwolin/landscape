'use client';

import dynamic from 'next/dynamic';
import type { ModalWrapperProps } from '@/contexts/ModalRegistryContext';

// ContactsSection is standalone — only needs projectId, no full project object
const ContactsSection = dynamic(
  () => import('@/components/projects/contacts/ContactsSection'),
  { ssr: false }
);

export function ContactsModalWrapper({ project }: ModalWrapperProps) {
  return (
    <div style={{ padding: 16 }}>
      <ContactsSection projectId={project.project_id} />
    </div>
  );
}
