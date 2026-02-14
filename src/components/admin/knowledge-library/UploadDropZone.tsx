'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CSpinner } from '@coreui/react';

interface UploadResult {
  doc_id?: number;
  name: string;
  error?: string;
  ai_classification?: {
    doc_type: string;
    doc_type_confidence: number;
    property_type: string | null;
    property_type_confidence: number;
    geo_tags: { level: string; value: string }[];
    text_extracted: boolean;
    text_length: number;
  };
}

interface UploadDropZoneProps {
  djangoApiUrl: string;
  onUploadComplete: () => void;
}

function formatClassification(result: UploadResult): string {
  const parts: string[] = [result.name];
  const cls = result.ai_classification;
  if (!cls || !cls.text_extracted) {
    parts.push('classification pending review');
    return parts.join(' \u2014 ');
  }
  const tags: string[] = [];
  if (cls.doc_type && cls.doc_type !== 'general') {
    tags.push(cls.doc_type);
  }
  if (cls.geo_tags?.length) {
    // Show first state + first city
    const state = cls.geo_tags.find((t) => t.level === 'state');
    const city = cls.geo_tags.find((t) => t.level === 'city');
    if (state) tags.push(state.value);
    if (city) tags.push(city.value);
  }
  if (cls.property_type) {
    const ptNames: Record<string, string> = {
      MF: 'Multifamily', LAND: 'Land', RET: 'Retail', OFF: 'Office',
      IND: 'Industrial', HTL: 'Hotel', MXU: 'Mixed Use',
    };
    tags.push(ptNames[cls.property_type] || cls.property_type);
  }
  if (tags.length > 0) {
    parts.push(tags.join(', '));
  } else {
    parts.push('classification pending review');
  }
  return parts.join(' \u2014 ');
}

export default function UploadDropZone({ djangoApiUrl, onUploadComplete }: UploadDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [classificationResults, setClassificationResults] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setClassificationResults([]);
    setUploadStatus(`Uploading and classifying ${files.length} file${files.length !== 1 ? 's' : ''}...`);

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append('files', file);
      }

      const response = await fetch(`${djangoApiUrl}/api/knowledge/library/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const uploads: UploadResult[] = data.uploads || [];
      const successCount = uploads.filter((u) => !u.error).length;

      // Build classification summaries
      const summaries = uploads
        .filter((u) => !u.error)
        .map((u) => formatClassification(u));

      setClassificationResults(summaries);
      setUploadStatus(`${successCount} file${successCount !== 1 ? 's' : ''} uploaded and classified`);
      onUploadComplete();

      // Clear results after 8 seconds (longer to let user read classifications)
      setTimeout(() => {
        setUploadStatus(null);
        setClassificationResults([]);
      }, 8000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed. Please try again.');
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    void uploadFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djangoApiUrl]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void uploadFiles(e.target.files);
    }
  };

  return (
    <>
      <div
        className={`kl-dropzone${isDragOver ? ' dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        {isUploading ? (
          <div className="kl-dropzone-uploading">
            <CSpinner size="sm" />
            <span>{uploadStatus}</span>
          </div>
        ) : uploadStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>{uploadStatus}</span>
            {classificationResults.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)', textAlign: 'center' }}>
                {classificationResults.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span>
            Drop files here to upload to Knowledge Library — Landscaper will auto-classify and geo-tag
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
