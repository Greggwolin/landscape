'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DMSAttribute } from '@/lib/dms/db';

const attributeSchema = z.object({
  attr_key: z.string()
    .min(1, 'Key is required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase, start with letter, use underscore for spaces'),
  attr_name: z.string().min(1, 'Name is required'),
  attr_type: z.enum(['text', 'number', 'date', 'boolean', 'currency', 'enum', 'lookup', 'tags', 'json']),
  attr_description: z.string().optional(),
  is_required: z.boolean().default(false),
  is_searchable: z.boolean().default(true),
  validation_rules: z.record(z.any()).default({}),
  enum_values: z.array(z.string()).optional(),
  lookup_table: z.string().optional(),
  display_order: z.number().default(0)
});

type AttributeFormData = z.infer<typeof attributeSchema>;

interface AttrBuilderProps {
  workspaceId: number;
  attributes?: DMSAttribute[];
  onSave: (attributes: Partial<DMSAttribute>[]) => Promise<void>;
  onCancel?: () => void;
}

export default function AttrBuilder({
  workspaceId,
  attributes = [],
  onSave,
  onCancel
}: AttrBuilderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localAttributes, setLocalAttributes] = useState<Partial<DMSAttribute>[]>(
    attributes.map(attr => ({ ...attr }))
  );
  const [enumInput, setEnumInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<AttributeFormData>({
    resolver: zodResolver(attributeSchema),
    mode: 'onChange'
  });

  const watchedType = watch('attr_type');
  const watchedEnumValues = watch('enum_values') || [];

  const attributeTypes = [
    { value: 'text', label: 'Text', description: 'Single or multi-line text input' },
    { value: 'number', label: 'Number', description: 'Numeric values with validation' },
    { value: 'currency', label: 'Currency', description: 'Monetary values with formatting' },
    { value: 'date', label: 'Date', description: 'Date picker input' },
    { value: 'boolean', label: 'Boolean', description: 'Checkbox for true/false values' },
    { value: 'enum', label: 'Select', description: 'Dropdown with predefined options' },
    { value: 'lookup', label: 'Lookup', description: 'Reference to another table' },
    { value: 'tags', label: 'Tags', description: 'Multiple text tags' },
    { value: 'json', label: 'JSON', description: 'Structured data object' }
  ];

  const handleAddAttribute = (data: AttributeFormData) => {
    const newAttribute: Partial<DMSAttribute> = {
      ...data,
      display_order: localAttributes.length
    };

    if (editingIndex !== null) {
      // Update existing attribute
      const updated = [...localAttributes];
      updated[editingIndex] = newAttribute;
      setLocalAttributes(updated);
      setEditingIndex(null);
    } else {
      // Add new attribute
      setLocalAttributes([...localAttributes, newAttribute]);
    }

    reset();
    setEnumInput('');
  };

  const handleEditAttribute = (index: number) => {
    const attr = localAttributes[index];
    if (attr) {
      reset(attr as AttributeFormData);
      setEditingIndex(index);
    }
  };

  const handleDeleteAttribute = (index: number) => {
    const updated = localAttributes.filter((_, i) => i !== index);
    // Reorder display_order
    updated.forEach((attr, i) => {
      attr.display_order = i;
    });
    setLocalAttributes(updated);
    
    if (editingIndex === index) {
      setEditingIndex(null);
      reset();
    }
  };

  const moveAttribute = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localAttributes.length) return;
    
    const updated = [...localAttributes];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    
    // Update display_order
    updated.forEach((attr, i) => {
      attr.display_order = i;
    });
    
    setLocalAttributes(updated);
  };

  const addEnumValue = () => {
    if (enumInput.trim()) {
      const currentValues = watchedEnumValues;
      const newValues = [...currentValues, enumInput.trim()];
      setValue('enum_values', newValues);
      setEnumInput('');
    }
  };

  const removeEnumValue = (index: number) => {
    const currentValues = watchedEnumValues;
    const newValues = currentValues.filter((_, i) => i !== index);
    setValue('enum_values', newValues);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(localAttributes);
    } catch (error) {
      console.error('Failed to save attributes:', error);
      alert('Failed to save attributes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateKeyFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[0-9]/, 'attr_$&');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Attribute Builder
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define custom attributes for document profiling
          </p>
        </div>
        <div className="flex space-x-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading || localAttributes.length === 0}
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
                Save Attributes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attribute Form */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
            {editingIndex !== null ? 'Edit Attribute' : 'Add New Attribute'}
          </h3>
          
          <form onSubmit={handleSubmit(handleAddAttribute)} className="space-y-4">
            {/* Name and Key */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name *
                </label>
                <input
                  {...register('attr_name')}
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Contract Value"
                  onChange={(e) => {
                    const name = e.target.value;
                    setValue('attr_name', name);
                    if (!watch('attr_key') || editingIndex === null) {
                      setValue('attr_key', generateKeyFromName(name));
                    }
                  }}
                />
                {errors.attr_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.attr_name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key *
                </label>
                <input
                  {...register('attr_key')}
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. contract_value"
                />
                {errors.attr_key && (
                  <p className="mt-1 text-xs text-red-600">{errors.attr_key.message}</p>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                {...register('attr_type')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {attributeTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                {...register('attr_description')}
                rows={2}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Optional description for users"
              />
            </div>

            {/* Enum Values (if enum type) */}
            {watchedType === 'enum' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={enumInput}
                      onChange={(e) => setEnumInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEnumValue();
                        }
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter option and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addEnumValue}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {watchedEnumValues.map((value, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => removeEnumValue(index)}
                          className="ml-1 hover:text-blue-600"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  {...register('is_required')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</span>
              </label>
              
              <label className="flex items-center">
                <input
                  {...register('is_searchable')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Searchable</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {editingIndex !== null ? 'Update Attribute' : 'Add Attribute'}
            </button>

            {editingIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  reset();
                  setEnumInput('');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Attribute List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Defined Attributes ({localAttributes.length})
            </h3>
          </div>
          
          {localAttributes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No attributes defined yet</p>
              <p className="text-sm mt-1">Add your first attribute using the form</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localAttributes.map((attr, index) => (
                <div
                  key={index}
                  className={`p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
                    editingIndex === index ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {attr.attr_name}
                        </h4>
                        <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1 rounded">
                          {attr.attr_key}
                        </code>
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                          {attr.attr_type}
                        </span>
                        {attr.is_required && (
                          <span className="text-xs text-red-600 dark:text-red-400">Required</span>
                        )}
                      </div>
                      {attr.attr_description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {attr.attr_description}
                        </p>
                      )}
                      {attr.enum_values && attr.enum_values.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {attr.enum_values.map((value, valueIndex) => (
                            <span key={valueIndex} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {/* Move buttons */}
                      <button
                        onClick={() => moveAttribute(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveAttribute(index, index + 1)}
                        disabled={index === localAttributes.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Move down"
                      >
                        ↓
                      </button>
                      
                      <button
                        onClick={() => handleEditAttribute(index)}
                        className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit attribute"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAttribute(index)}
                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete attribute"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}