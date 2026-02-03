'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChangelogModal } from './ChangelogModal';

interface VersionBadgeProps {
  className?: string;
}

export function VersionBadge({ className = '' }: VersionBadgeProps) {
  const [version, setVersion] = useState<string>('v0.1.0');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVersion = useCallback(async () => {
    try {
      let accessToken: string | null = null;
      try {
        const tokens = localStorage.getItem('auth_tokens');
        accessToken = tokens ? JSON.parse(tokens).access : null;
      } catch {
        accessToken = null;
      }

      const headers: HeadersInit = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/changelog/current-version/`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.version) {
          setVersion(data.version);
        }
      }
    } catch (err) {
      // Use default version on error
      console.error('Failed to fetch version:', err);
    }
  }, []);

  useEffect(() => {
    void fetchVersion();
  }, [fetchVersion]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`version-badge ${className}`}
        title="View Changelog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--cui-secondary-color)',
          background: 'transparent',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--cui-secondary-bg)';
          e.currentTarget.style.color = 'var(--cui-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--cui-secondary-color)';
        }}
      >
        {version}
      </button>

      <ChangelogModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

export default VersionBadge;
