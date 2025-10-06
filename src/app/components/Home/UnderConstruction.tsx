'use client';

import React from 'react';

interface FeatureTile {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'in-progress' | 'testing' | 'planned';
  route: string;
  progress?: number;
}

const features: FeatureTile[] = [
  {
    id: 'gis-test',
    title: 'GIS Parcel Viewer',
    description: 'Interactive map with parcel selection and property details',
    icon: '🗺️',
    status: 'testing',
    route: '/gis-test',
    progress: 85
  },
  {
    id: 'map-debug',
    title: 'Map Debug Tools',
    description: 'Advanced mapping diagnostics and debugging interface',
    icon: '🔧',
    status: 'testing',
    route: '/map-debug',
    progress: 75
  },
  {
    id: 'budget-grid',
    title: 'Budget Grid (Light)',
    description: 'Materio-themed budget grid with inline editing',
    icon: '💰',
    status: 'in-progress',
    route: '/budget-grid',
    progress: 90
  },
  {
    id: 'budget-grid-v2',
    title: 'Budget Grid (Dark)',
    description: 'Dark-themed budget grid with comparison features',
    icon: '🌙',
    status: 'in-progress',
    route: '/budget-grid-v2',
    progress: 90
  },
  {
    id: 'dms',
    title: 'Document Management',
    description: 'Full document management system with AI extraction',
    icon: '📄',
    status: 'in-progress',
    route: '#',
    progress: 80
  },
  {
    id: 'gis-setup',
    title: 'GIS Setup Wizard',
    description: 'Step-by-step GIS configuration and parcel import',
    icon: '🧭',
    status: 'testing',
    route: '#',
    progress: 70
  },
  {
    id: 'ai-extraction',
    title: 'AI Document Analysis',
    description: 'Automated document parsing and data extraction',
    icon: '🤖',
    status: 'in-progress',
    route: '#',
    progress: 65
  },
  {
    id: 'contacts',
    title: 'Contact Management',
    description: 'Unified contact database with role assignments',
    icon: '👥',
    status: 'planned',
    route: '#',
    progress: 30
  }
];

const statusColors = {
  'in-progress': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  'testing': 'bg-green-500/20 border-green-500/30 text-green-400',
  'planned': 'bg-gray-500/20 border-gray-500/30 text-gray-400'
};

const statusLabels = {
  'in-progress': 'In Progress',
  'testing': 'Testing',
  'planned': 'Planned'
};

const UnderConstruction: React.FC = () => {
  const handleTileClick = (route: string) => {
    if (route === '#') {
      alert('This feature is not yet accessible. Check back soon!');
    } else {
      window.location.href = route;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🚧</span>
          <h1 className="text-3xl font-bold text-white">Under Construction</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Features and pages currently in development or testing
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleTileClick(feature.route)}
            className="group relative bg-gray-800 border border-gray-700 rounded-lg p-6 text-left transition-all hover:border-gray-600 hover:bg-gray-750 hover:scale-105 active:scale-100"
          >
            {/* Icon and Status Badge */}
            <div className="flex items-start justify-between mb-4">
              <span className="text-4xl">{feature.icon}</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  statusColors[feature.status]
                }`}
              >
                {statusLabels[feature.status]}
              </span>
            </div>

            {/* Title and Description */}
            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-blue-400 transition-colors">
              {feature.title}
            </h3>
            <p className="text-gray-400 text-sm mb-4">{feature.description}</p>

            {/* Progress Bar */}
            {feature.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-gray-400 font-medium">{feature.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${feature.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Hover Arrow */}
            {feature.route !== '#' && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <h4 className="text-white font-medium mb-3">Status Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-400">In Progress - Actively being developed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">Testing - Feature complete, undergoing testing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-400">Planned - Scheduled for future development</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
