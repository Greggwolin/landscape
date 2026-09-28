'use client';

import React from 'react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

/**
 * The left rail's Map — the user's own maps, OUTSIDE any project.
 *
 * Rule 9 (D-2026-09-22-NAV-R9, Gregg "9a"): "the map icon in the left nav bar
 * is for user maps OUTSIDE of projects." Reaffirms his 2026-08-17 ruling. A
 * project's map is the Map tab of that project's panel; this icon never opens
 * one. The surface itself — any location, parcel selection before a project
 * exists — is not built yet, and this page says so rather than quietly
 * dropping the user into a project.
 */
export default function WrapperUserMapPage() {
  return (
    <RightContentPanel title="Map" subtitle="Your maps, outside any project">
      <div className="p-3" style={{ color: 'var(--cui-secondary-color)', maxWidth: 520 }}>
        <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
          Maps of your own, not tied to a project, will live here. This part is not built yet.
        </p>
        <p className="mb-0">
          A project&apos;s map is in that project: open the project and choose Map at the top of the
          right-hand panel.
        </p>
      </div>
    </RightContentPanel>
  );
}
