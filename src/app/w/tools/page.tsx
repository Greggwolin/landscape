'use client';

import { PageShell } from '@/components/wrapper/PageShell';

const TOOL_CATEGORIES = [
  { name: 'Skills', count: 12, description: 'Landscaper skills and capabilities' },
  { name: 'Analysis', count: 8, description: 'Financial and market analysis tools' },
  { name: 'Reports', count: 20, description: 'Report templates and generators' },
  { name: 'Data Sources', count: 6, description: 'Market data and benchmarks' },
  { name: 'Document', count: 5, description: 'Document processing and extraction' },
  { name: 'Custom', count: 0, description: 'User-created custom tools' },
];

export default function WrapperToolsPage() {
  return (
    <PageShell title="Tools">
      <div className="w-placeholder-grid">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.name} className="w-placeholder-card">
            <h3>{cat.name}</h3>
            <p>{cat.description}</p>
            <p style={{ marginTop: 8, fontSize: '12px', color: 'var(--w-text-muted)' }}>
              {cat.count} tools
            </p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
