'use client';

import React, { useState, useEffect } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import Dropzone from '@/components/dms/upload/Dropzone';
import Queue from '@/components/dms/upload/Queue';
import ProfileForm from '@/components/dms/profile/ProfileForm';

export default function DMSUploadPage() {
  const { activeProject: currentProject } = useProjectContext();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  // Use hardcoded workspace ID 1 (W1 - default phased development workspace)
  const defaultWorkspaceId = 1;

  const handleUploadComplete = (results: any[]) => {
    console.log('Upload complete:', results);
    setUploadedFiles((prev) => [...prev, ...results]);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error.message}`);
  };

  const handleProfileSave = async (docId: number, profile: Record<string, any>) => {
    try {
      const response = await fetch(`/api/dms/documents/${docId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      alert('Profile saved successfully!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Profile save error:', error);
      alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!currentProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            Please select a project from the navigation to upload documents.
          </p>
        </div>
      </div>
    );
  }

  if (!defaultWorkspaceId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Document Upload
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload documents for project: <strong>{currentProject.project_name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upload */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upload Files
            </h2>
            <Dropzone
              projectId={currentProject.project_id}
              workspaceId={defaultWorkspaceId}
              docType="general"
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Upload Queue */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Uploaded Files ({uploadedFiles.length})
              </h2>
              <Queue
                files={uploadedFiles}
                onFileSelect={(file) => setSelectedFile(file)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Profile Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Document Profile
          </h2>

          {selectedFile ? (
            <div>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <ProfileForm
                docId={selectedFile.doc_id}
                projectId={currentProject.project_id}
                workspaceId={defaultWorkspaceId}
                docType="general"
                initialProfile={selectedFile.profile_json || {}}
                onSave={(profile) => handleProfileSave(selectedFile.doc_id, profile)}
                onCancel={() => setSelectedFile(null)}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm">
                Select an uploaded file to edit its profile
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
