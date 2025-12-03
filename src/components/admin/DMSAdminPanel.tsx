'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the DMS admin page
const DMSAdminPage = dynamic(() => import('@/app/admin/dms/templates/page'), {
  ssr: false,
});

export default function DMSAdminPanel() {
  return (
    <div>
      <DMSAdminPage />
    </div>
  );
}
