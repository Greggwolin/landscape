'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { PlatformKnowledgeDocument } from '@/types/dms';

interface PlatformKnowledgeProfileFormProps {
  document: PlatformKnowledgeDocument;
  onSave: (updates: Partial<PlatformKnowledgeDocument>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

const KNOWLEDGE_DOMAIN_OPTIONS = [
  { value: 'valuation', label: 'Valuation' },
  { value: 'cost', label: 'Cost' },
  { value: 'market', label: 'Market' },
  { value: 'legal', label: 'Legal' },
  { value: 'standards', label: 'Standards' },
  { value: 'development', label: 'Development' },
  { value: 'operating_expenses', label: 'Operating Expenses' },
  { value: 'valuation_methodology', label: 'Valuation Methodology' },
  { value: 'market_data', label: 'Market Data' },
  { value: 'legal_regulatory', label: 'Legal/Regulatory' },
  { value: 'cost_estimation', label: 'Cost Estimation' },
  { value: 'other', label: 'Other' },
];

const PROPERTY_TYPE_OPTIONS = [
  'Multifamily',
  'Office',
  'Retail',
  'Industrial',
  'Land Development',
  'Hotel',
  'Mixed Use',
  'All',
];

const GEOGRAPHIC_SCOPE_OPTIONS = [
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Regional' },
  { value: 'msa', label: 'MSA' },
  { value: 'state', label: 'State' },
];

const platformKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  publisher: z.string().optional(),
  publication_year: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(1900).max(2100).optional()
  ),
  knowledge_domain: z.string().optional(),
  property_types: z.array(z.string()).default([]),
  subtitle: z.string().optional(),
  description: z.string().optional(),
});

type PlatformKnowledgeFormData = z.infer<typeof platformKnowledgeSchema>;

export default function PlatformKnowledgeProfileForm({
  document,
  onSave,
  onCancel,
  onSuccess,
}: PlatformKnowledgeProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<PlatformKnowledgeFormData>({
    resolver: zodResolver(platformKnowledgeSchema),
    defaultValues: {
      title: document.title || '',
      publisher: document.publisher || '',
      publication_year: document.publication_year || undefined,
      knowledge_domain: document.knowledge_domain || '',
      property_types: document.property_types || [],
      subtitle: document.subtitle || '',
      description: document.description || '',
    },
    mode: 'onChange',
  });

  const currentPropertyTypes = watch('property_types');

  const handlePropertyTypeToggle = (propertyType: string) => {
    const current = currentPropertyTypes || [];
    const updated = current.includes(propertyType)
      ? current.filter((t) => t !== propertyType)
      : [...current, propertyType];
    setValue('property_types', updated, { shouldDirty: true });
  };

  const onSubmit = async (data: PlatformKnowledgeFormData) => {
    setIsLoading(true);
    try {
      await onSave({
        title: data.title,
        publisher: data.publisher || null,
        publication_year: data.publication_year || null,
        knowledge_domain: data.knowledge_domain || null,
        property_types: data.property_types,
        subtitle: data.subtitle || null,
        description: data.description || null,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save platform knowledge profile:', error);
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
            Edit Platform Knowledge Profile
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Update metadata for this platform knowledge document
          </p>
        </div>
        <button
          onClick={onCancel}
          className="btn btn-sm btn-ghost-secondary"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className={`block w-full rounded-md border ${
                errors.title ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
              placeholder="Document title"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Source (Publisher) */}
          <div>
            <label
              htmlFor="publisher"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Source
            </label>
            <input
              {...register('publisher')}
              type="text"
              id="publisher"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., IREM, Appraisal Institute, BOMA"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Publisher or source organization
            </p>
          </div>

          {/* Source Year */}
          <div>
            <label
              htmlFor="publication_year"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Source Year
            </label>
            <input
              {...register('publication_year')}
              type="number"
              id="publication_year"
              min="1900"
              max="2100"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 2024"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Publication or data year
            </p>
          </div>

          {/* Knowledge Domain */}
          <div>
            <label
              htmlFor="knowledge_domain"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Knowledge Domain
            </label>
            <select
              {...register('knowledge_domain')}
              id="knowledge_domain"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select domain</option>
              {KNOWLEDGE_DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Primary subject area of this document
            </p>
          </div>

          {/* Property Types (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Property Types
            </label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPE_OPTIONS.map((propertyType) => (
                <button
                  key={propertyType}
                  type="button"
                  onClick={() => handlePropertyTypeToggle(propertyType)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    currentPropertyTypes?.includes(propertyType)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  {propertyType}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select all property types this document applies to
            </p>
          </div>

          {/* Geographic Scope */}
          <div>
            <label
              htmlFor="subtitle"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Geographic Scope
            </label>
            <select
              {...register('subtitle')}
              id="subtitle"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select scope</option>
              {GEOGRAPHIC_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Geographic coverage of the data
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief description of the document content..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
