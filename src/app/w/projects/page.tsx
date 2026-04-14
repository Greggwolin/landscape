'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageShell } from '@/components/wrapper/PageShell';

const MOCK_PROJECTS = [
  { id: 1, name: 'Peoria Meadows MPC', type: 'LAND', subtitle: 'Master Planned Community — 42 parcels' },
  { id: 2, name: 'Riverwalk Apartments', type: 'MF', subtitle: 'Garden Style — 240 units' },
  { id: 3, name: 'Downtown Office Tower', type: 'OFF', subtitle: 'Class A — 18 floors' },
];

export default function WrapperProjectsPage() {
  const router = useRouter();

  return (
    <PageShell
      title="Projects"
      subtitle="All projects"
      headerActions={
        <button className="wrapper-btn wrapper-btn-primary">
          <Plus size={14} />
          New Project
        </button>
      }
    >
      <div className="wrapper-project-grid">
        {MOCK_PROJECTS.map((project) => (
          <div
            key={project.id}
            className="wrapper-project-card"
            onClick={() => router.push(`/w/projects/${project.id}`)}
          >
            <div className="wrapper-project-card-name">{project.name}</div>
            <div className="wrapper-project-card-type">
              <span
                style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  background: 'var(--w-accent)',
                  color: '#fff',
                  marginRight: 8,
                }}
              >
                {project.type}
              </span>
              {project.subtitle}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
