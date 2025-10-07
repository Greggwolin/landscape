'use client';

import { ProjectProvider } from '@/app/components/ProjectProvider';

export default function AdminDMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectProvider>{children}</ProjectProvider>;
}
