'use client';

import React from 'react';

import { LandscaperResponse } from './ReviewTypes';

interface ChangesPreviewProps {
  response: LandscaperResponse | null;
}

export function ChangesPreview({ response }: ChangesPreviewProps) {
  if (!response?.suggested_preview_html) {
    return null;
  }

  return (
    <div className="changes-preview">
      <div className="changes-preview-header">Preview Changes</div>
      <div className="changes-preview-body">
        <div
          className="changes-preview-html"
          dangerouslySetInnerHTML={{ __html: response.suggested_preview_html }}
        />
      </div>
    </div>
  );
}

export default ChangesPreview;
