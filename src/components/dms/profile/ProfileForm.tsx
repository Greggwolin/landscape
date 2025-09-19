'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { CoreDoc, DMSAttribute, DMSTemplate } from '@/lib/dms/db';

interface ProfileFormProps {
  doc: CoreDoc;
  template?: DMSTemplate;
  attributes?: (DMSAttribute & { is_required: boolean; display_order: number })[];
  onSave: (docId: number, profile: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: (doc: CoreDoc) => void;
}

// Dynamic schema based on attributes
const createProfileSchema = (attributes: (DMSAttribute & { is_required: boolean })[] = []) => {
  const schemaFields: Record<string, any> = {};
  
  attributes.forEach(attr => {
    let fieldSchema: any;
    
    switch (attr.attr_type) {
      case 'text':
        fieldSchema = z.string();
        if (attr.validation_rules?.maxLength) {
          fieldSchema = fieldSchema.max(attr.validation_rules.maxLength);
        }
        if (attr.validation_rules?.minLength) {
          fieldSchema = fieldSchema.min(attr.validation_rules.minLength);
        }
        break;
        
      case 'number':
        fieldSchema = z.number();
        if (attr.validation_rules?.min !== undefined) {
          fieldSchema = fieldSchema.min(attr.validation_rules.min);
        }
        if (attr.validation_rules?.max !== undefined) {
          fieldSchema = fieldSchema.max(attr.validation_rules.max);
        }
        break;
        
      case 'currency':
        fieldSchema = z.number().min(0);
        break;
        
      case 'date':
        fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid date format'
        });
        break;
        
      case 'boolean':
        fieldSchema = z.boolean();
        break;
        
      case 'enum':
        if (attr.enum_values && attr.enum_values.length > 0) {
          fieldSchema = z.enum(attr.enum_values as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
        
      case 'tags':
        fieldSchema = z.array(z.string()).default([]);
        break;
        
      case 'json':
        fieldSchema = z.any();
        break;
        
      default:
        fieldSchema = z.string();
    }
    
    // Make optional if not required
    if (!attr.is_required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaFields[attr.attr_key] = fieldSchema;
  });
  
  return z.object(schemaFields);
};

export default function ProfileForm({
  doc,
  template,
  attributes = [],
  onSave,
  onCancel,
  onSuccess
}: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  
  const schema = createProfileSchema(attributes);
  type ProfileFormData = z.infer<typeof schema>;
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues: doc.profile_json || {},
    mode: 'onChange'
  });

  // Initialize tag inputs
  useEffect(() => {
    const tagInputState: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr.attr_type === 'tags') {
        tagInputState[attr.attr_key] = '';
      }
    });
    setTagInputs(tagInputState);
  }, [attributes]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      await onSave(doc.doc_id, data);
      onSuccess?.(doc);
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (attrKey: string, tag: string) => {
    if (tag.trim()) {
      const currentTags = (watch(attrKey as keyof ProfileFormData) as string[]) || [];
      const newTags = [...currentTags, tag.trim()];
      setValue(attrKey as keyof ProfileFormData, newTags as any, { shouldDirty: true });
      setTagInputs(prev => ({ ...prev, [attrKey]: '' }));
    }
  };

  const removeTag = (attrKey: string, tagIndex: number) => {
    const currentTags = (watch(attrKey as keyof ProfileFormData) as string[]) || [];
    const newTags = currentTags.filter((_, index) => index !== tagIndex);
    setValue(attrKey as keyof ProfileFormData, newTags as any, { shouldDirty: true });
  };

  const renderField = (attr: DMSAttribute & { is_required: boolean; display_order: number }) => {
    const error = errors[attr.attr_key as keyof ProfileFormData];
    const fieldValue = watch(attr.attr_key as keyof ProfileFormData);
    
    switch (attr.attr_type) {
      case 'text':
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            {attr.validation_rules?.multiline ? (
              <textarea
                {...register(attr.attr_key as keyof ProfileFormData)}
                id={attr.attr_key}
                rows={3}
                className={`block w-full rounded-md border ${
                  error ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                placeholder={attr.validation_rules?.placeholder || `Enter ${attr.attr_name.toLowerCase()}`}
              />
            ) : (
              <input
                {...register(attr.attr_key as keyof ProfileFormData)}
                type="text"
                id={attr.attr_key}
                className={`block w-full rounded-md border ${
                  error ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                placeholder={attr.validation_rules?.placeholder || `Enter ${attr.attr_name.toLowerCase()}`}
              />
            )}
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            <div className="relative">
              {attr.attr_type === 'currency' && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
              )}
              <input
                {...register(attr.attr_key as keyof ProfileFormData, { valueAsNumber: true })}
                type="number"
                id={attr.attr_key}
                step={attr.attr_type === 'currency' ? '0.01' : attr.validation_rules?.step || '1'}
                min={attr.validation_rules?.min}
                max={attr.validation_rules?.max}
                className={`block w-full rounded-md border ${
                  error ? 'border-red-300' : 'border-gray-300'
                } ${attr.attr_type === 'currency' ? 'pl-8' : 'pl-3'} pr-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                placeholder={attr.validation_rules?.placeholder || `Enter ${attr.attr_name.toLowerCase()}`}
              />
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            <input
              {...register(attr.attr_key as keyof ProfileFormData)}
              type="date"
              id={attr.attr_key}
              className={`block w-full rounded-md border ${
                error ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            />
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={attr.attr_key} className="flex items-center">
            <input
              {...register(attr.attr_key as keyof ProfileFormData)}
              type="checkbox"
              id={attr.attr_key}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor={attr.attr_key} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">{attr.attr_description}</p>
            )}
          </div>
        );

      case 'enum':
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            <select
              {...register(attr.attr_key as keyof ProfileFormData)}
              id={attr.attr_key}
              className={`block w-full rounded-md border ${
                error ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            >
              <option value="">Select {attr.attr_name.toLowerCase()}</option>
              {attr.enum_values?.map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      case 'tags':
        const currentTags = (fieldValue as string[]) || [];
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            
            {/* Tag input */}
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={tagInputs[attr.attr_key] || ''}
                onChange={(e) => setTagInputs(prev => ({ ...prev, [attr.attr_key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(attr.attr_key, tagInputs[attr.attr_key] || '');
                  }
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Type and press Enter to add tag"
              />
              <button
                type="button"
                onClick={() => addTag(attr.attr_key, tagInputs[attr.attr_key] || '')}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
            
            {/* Current tags */}
            <div className="flex flex-wrap gap-2">
              {currentTags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(attr.attr_key, index)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      case 'json':
        return (
          <div key={attr.attr_key}>
            <label htmlFor={attr.attr_key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {attr.attr_name}
              {attr.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {attr.attr_description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{attr.attr_description}</p>
            )}
            <textarea
              {...register(attr.attr_key as keyof ProfileFormData)}
              id={attr.attr_key}
              rows={4}
              className={`block w-full rounded-md border ${
                error ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono`}
              placeholder="Enter valid JSON"
            />
            {error && (
              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Edit Profile: {doc.doc_name}
          </h2>
          {template && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Using template: {template.template_name}
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        <div className="space-y-4">
          {attributes
            .sort((a, b) => a.display_order - b.display_order)
            .map(renderField)}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || !isDirty || isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}