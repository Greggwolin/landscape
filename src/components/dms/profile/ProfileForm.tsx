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
  dollar_amount: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number' && Number.isNaN(value)) {
      return undefined;
    }
    return value;
  }, z.number().optional()),
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
        dollar_amount: data.dollar_amount ?? undefined,
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
    <div
      className="border rounded overflow-hidden"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-card-border-color)',
        color: 'var(--cui-body-color)'
      }}
    >
      {/* Header */}
      <div
        className="d-flex align-items-center justify-content-between p-3 border-bottom"
        style={{
          backgroundColor: 'var(--cui-card-header-bg)',
          borderColor: 'var(--cui-card-border-color)'
        }}
      >
        <div>
          <h2 className="m-0 fw-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>
            {docId ? 'Edit Document Profile' : 'Document Profile'}
          </h2>
          <p className="mb-0" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
            Add metadata to help organize and find this document
          </p>
        </div>
        <button
          onClick={onCancel}
          className="btn btn-sm btn-ghost-secondary"
          aria-label="Close"
        >
          <XMarkIcon style={{ width: '1.25rem', height: '1.25rem' }} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-3">
        <div className="d-flex flex-column gap-3">
          {/* Document Type */}
          <div>
            <label htmlFor="doc_type" className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
              Document Type <span className="text-danger">*</span>
            </label>
            {loadingDocTypes ? (
              <div className="d-flex align-items-center gap-2 small" style={{ color: 'var(--cui-secondary-color)' }}>
                <div className="spinner-border spinner-border-sm" role="status" />
                Loading options...
              </div>
            ) : (
              <select
                {...register('doc_type')}
                id="doc_type"
                className={`form-select form-select-sm ${errors.doc_type ? 'is-invalid' : ''}`}
                style={{
                  backgroundColor: 'var(--cui-input-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
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
              <p className="mt-1 small text-danger">{errors.doc_type.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="form-control form-control-sm"
              style={{
                backgroundColor: 'var(--cui-input-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
              placeholder="Brief description of the document..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
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
            <label htmlFor="doc_date" className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
              Document Date
            </label>
            <input
              {...register('doc_date')}
              type="date"
              id="doc_date"
              className="form-control form-control-sm"
              style={{
                backgroundColor: 'var(--cui-input-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
            />
            <p className="mt-1 small" style={{ color: 'var(--cui-secondary-color)' }}>
              The official date of the document (e.g., contract date, report date)
            </p>
          </div>

          {/* Parties */}
          <div>
            <label htmlFor="parties" className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
              Parties Involved
            </label>
            <input
              {...register('parties')}
              type="text"
              id="parties"
              className="form-control form-control-sm"
              style={{
                backgroundColor: 'var(--cui-input-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
              placeholder="e.g., ABC Corp, City of Portland"
            />
            <p className="mt-1 small" style={{ color: 'var(--cui-secondary-color)' }}>
              Organizations or individuals related to this document
            </p>
          </div>

          {/* Dollar Amount */}
          <div>
            <label htmlFor="dollar_amount" className="form-label mb-1" style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem' }}>
              Dollar Amount
            </label>
            <div className="position-relative">
              <div className="position-absolute top-0 bottom-0 start-0 d-flex align-items-center ps-2 pe-1">
                <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>$</span>
              </div>
              <input
                {...register('dollar_amount', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value))
                })}
                type="number"
                id="dollar_amount"
                step="0.01"
                min="0"
                className="form-control form-control-sm"
                style={{
                  paddingLeft: '1.75rem',
                  backgroundColor: 'var(--cui-input-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 small" style={{ color: 'var(--cui-secondary-color)' }}>
              Contract value, invoice amount, or other financial figure
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top" style={{ borderColor: 'var(--cui-card-border-color)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || !isDirty || isLoading}
            className="btn btn-primary d-inline-flex align-items-center"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
