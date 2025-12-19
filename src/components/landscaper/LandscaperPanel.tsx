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
    <div className="flex flex-col h-full gap-3">
      {/* Landscaper Chat Card */}
      <div
        className={`flex flex-col min-h-0 rounded-xl shadow-lg overflow-hidden ${
          isActivityExpanded ? 'flex-[0.4]' : 'flex-1'
        }`}
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        <LandscaperChat projectId={projectId} />
      </div>

      {/* Activity Feed Card - Separate standalone, taller to show more content */}
      <div
        className={`rounded-xl shadow-lg overflow-hidden ${
          isActivityExpanded ? 'flex-[0.6] min-h-[300px]' : 'flex-none'
        }`}
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        <ActivityFeed
          projectId={projectId}
          isExpanded={isActivityExpanded}
          onToggle={handleActivityToggle}
        />
      </div>
    </div>
  );
}
