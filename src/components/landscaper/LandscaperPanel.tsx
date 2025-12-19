'use client';

import React, { useState, useEffect } from 'react';
import { LandscaperChat } from './LandscaperChat';
import { ActivityFeed } from './ActivityFeed';

interface LandscaperPanelProps {
  projectId: number;
}

export function LandscaperPanel({ projectId }: LandscaperPanelProps) {
  // Internal state management with localStorage persistence
  const [isActivityExpanded, setActivityExpanded] = useState(true);

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('landscape-activity-expanded');
    if (saved !== null) {
      setActivityExpanded(saved === 'true');
    }
  }, []);

  const handleActivityToggle = () => {
    const newValue = !isActivityExpanded;
    setActivityExpanded(newValue);
    localStorage.setItem('landscape-activity-expanded', String(newValue));
  };

  return (
    <div className="h-full p-3">
      {/* Card wrapper with elevation */}
      <div
        className="flex flex-col h-full rounded-xl shadow-lg overflow-hidden"
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        {/* Chat section - grows when Activity collapsed */}
        <div
          className={`flex flex-col min-h-0 ${
            isActivityExpanded ? 'flex-[0.6]' : 'flex-1'
          }`}
        >
          <LandscaperChat projectId={projectId} />
        </div>

        {/* Activity Feed accordion */}
        <ActivityFeed
          projectId={projectId}
          isExpanded={isActivityExpanded}
          onToggle={handleActivityToggle}
        />
      </div>
    </div>
  );
}
