'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import TagInput from './TagInput';

interface ProfileFormProps {
  docId?: number;
  projectId: number;
  workspaceId?: number;
  docType?: string;
  projectType?: string | null;
  initialProfile?: Record<string, unknown>;
  onSave: (profile: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Simplified profile schema - no more complex attribute registry
const profileSchema = z.object({
  doc_type: z.string().min(1, 'Document type is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  doc_date: z.string().optional(),
  parties: z.string().optional(), // Comma-separated string for simplicity
  dollar_amount: z.number().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({
  docId,
  projectId,
  workspaceId,
  docType,
  projectType,
  initialProfile = {},
  onSave,
  onCancel,
  onSuccess
}: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [docTypeOptions, setDocTypeOptions] = useState<string[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      doc_type: initialProfile.doc_type || docType || '',
      description: initialProfile.description || '',
      tags: initialProfile.tags || [],
      doc_date: initialProfile.doc_date || '',
      parties: initialProfile.parties || '',
      dollar_amount: initialProfile.dollar_amount || undefined,
    },
    mode: 'onChange'
  });

  const currentTags = watch('tags');

  // Fetch doc_type options from template
  useEffect(() => {
    const fetchDocTypeOptions = async () => {
      try {
        const params = new URLSearchParams({
          project_id: projectId.toString(),
        });

        if (workspaceId) {
          params.append('workspace_id', workspaceId.toString());
        }
        if (projectType) {
          params.append('project_type', projectType);
        }

        const response = await fetch(`/api/dms/templates/doc-types?${params.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setDocTypeOptions(data.doc_type_options || ['general']);
        } else {
          // Fallback to common doc types
          setDocTypeOptions(['general', 'contract', 'invoice', 'report', 'drawing', 'permit', 'correspondence']);
        }
      } catch (error) {
        console.error('Error fetching doc type options:', error);
        // Fallback to common doc types
        setDocTypeOptions(['general', 'contract', 'invoice', 'report', 'drawing', 'permit', 'correspondence']);
      } finally {
        setLoadingDocTypes(false);
      }
    };

    fetchDocTypeOptions();
  }, [projectId, workspaceId, projectType]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Convert parties string to array if needed (for future flexibility)
      const profileData = {
        ...data,
        parties: data.parties || undefined,
        dollar_amount: data.dollar_amount || undefined,
      };

      await onSave(profileData);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {docId ? 'Edit Document Profile' : 'Document Profile'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Add metadata to help organize and find this document
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        <div className="space-y-4">
          {/* Document Type */}
          <div>
            <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            {loadingDocTypes ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading options...
              </div>
            ) : (
              <select
                {...register('doc_type')}
                id="doc_type"
                className={`block w-full rounded-md border ${
                  errors.doc_type ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
              >
                <option value="">Select document type</option>
                {docTypeOptions.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            )}
            {errors.doc_type && (
              <p className="mt-1 text-xs text-red-600">{errors.doc_type.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief description of the document..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <TagInput
              value={currentTags}
              onChange={(tags) => setValue('tags', tags, { shouldDirty: true })}
              projectId={projectId}
              workspaceId={workspaceId}
              placeholder="Type to add tags (e.g., environmental, legal, financial)"
            />
          </div>

          {/* Document Date */}
          <div>
            <label htmlFor="doc_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Date
            </label>
            <input
              {...register('doc_date')}
              type="date"
              id="doc_date"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The official date of the document (e.g., contract date, report date)
            </p>
          </div>

          {/* Parties */}
          <div>
            <label htmlFor="parties" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parties Involved
            </label>
            <input
              {...register('parties')}
              type="text"
              id="parties"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., ABC Corp, City of Portland"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Organizations or individuals related to this document
            </p>
          </div>

          {/* Dollar Amount */}
          <div>
            <label htmlFor="dollar_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dollar Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">$</span>
              </div>
              <input
                {...register('dollar_amount', { valueAsNumber: true })}
                type="number"
                id="dollar_amount"
                step="0.01"
                min="0"
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 pl-8 pr-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Contract value, invoice amount, or other financial figure
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || !isDirty || isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
