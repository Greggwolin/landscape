'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckIcon, XMarkIcon, PlusIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { DMSTemplate, DMSAttribute } from '@/lib/dms/db';

const templateSchema = z.object({
  template_name: z.string().min(1, 'Template name is required'),
  project_id: z.number().optional(),
  doc_type: z.string().optional(),
  is_default: z.boolean().default(false)
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateAttributeConfig {
  attr_id: number;
  is_required: boolean;
  display_order: number;
}

interface TemplateDesignerProps {
  workspaceId: number;
  projectId?: number;
  template?: DMSTemplate;
  availableAttributes?: DMSAttribute[];
  templateAttributes?: (DMSAttribute & { is_required: boolean; display_order: number })[];
  onSave: (template: Partial<DMSTemplate>, attributeConfigs: TemplateAttributeConfig[]) => Promise<void>;
  onCancel?: () => void;
}

export default function TemplateDesigner({
  workspaceId,
  projectId,
  template,
  availableAttributes = [],
  templateAttributes = [],
  onSave,
  onCancel
}: TemplateDesignerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<TemplateAttributeConfig[]>(
    templateAttributes.map(attr => ({
      attr_id: attr.attr_id,
      is_required: attr.is_required,
      display_order: attr.display_order
    }))
  );
  const [previewMode, setPreviewMode] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? {
      template_name: template.template_name,
      project_id: template.project_id || undefined,
      doc_type: template.doc_type || '',
      is_default: template.is_default
    } : {
      project_id: projectId,
      is_default: false
    },
    mode: 'onChange'
  });

  const watchedDocType = watch('doc_type');

  const docTypes = [
    'general', 'contract', 'permit', 'drawing', 'specification', 
    'report', 'correspondence', 'invoice', 'receipt', 'legal',
    'environmental', 'safety', 'quality', 'financial'
  ];

  const addAttribute = (attrId: number) => {
    if (selectedAttributes.some(config => config.attr_id === attrId)) {
      return; // Already added
    }

    const newConfig: TemplateAttributeConfig = {
      attr_id: attrId,
      is_required: false,
      display_order: selectedAttributes.length
    };

    setSelectedAttributes([...selectedAttributes, newConfig]);
  };

  const removeAttribute = (attrId: number) => {
    const updated = selectedAttributes.filter(config => config.attr_id !== attrId);
    // Reorder display_order
    updated.forEach((config, index) => {
      config.display_order = index;
    });
    setSelectedAttributes(updated);
  };

  const updateAttributeConfig = (attrId: number, updates: Partial<TemplateAttributeConfig>) => {
    setSelectedAttributes(prev => 
      prev.map(config => 
        config.attr_id === attrId 
          ? { ...config, ...updates }
          : config
      )
    );
  };

  const moveAttribute = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedAttributes.length) return;
    
    const updated = [...selectedAttributes];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    
    // Update display_order
    updated.forEach((config, index) => {
      config.display_order = index;
    });
    
    setSelectedAttributes(updated);
  };

  const getAttributeById = (attrId: number) => {
    return availableAttributes.find(attr => attr.attr_id === attrId);
  };

  const handleSave = async (data: TemplateFormData) => {
    setIsLoading(true);
    try {
      const templateData: Partial<DMSTemplate> = {
        ...data,
        workspace_id: workspaceId,
        doc_type: data.doc_type || null,
        project_id: data.project_id || null
      };

      await onSave(templateData, selectedAttributes);
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    const sortedAttributes = selectedAttributes
      .map(config => ({
        config,
        attribute: getAttributeById(config.attr_id)
      }))
      .filter(item => item.attribute)
      .sort((a, b) => a.config.display_order - b.config.display_order);

    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          Template Preview: {watch('template_name') || 'Untitled Template'}
        </h3>
        
        {sortedAttributes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No attributes selected
          </p>
        ) : (
          <div className="space-y-4">
            {sortedAttributes.map(({ config, attribute }) => (
              <div key={config.attr_id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {attribute!.attr_name}
                  {config.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {attribute!.attr_description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {attribute!.attr_description}
                  </p>
                )}
                
                {/* Mock input based on type */}
                {attribute!.attr_type === 'text' && (
                  <input
                    type="text"
                    disabled
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    placeholder={`Enter ${attribute!.attr_name.toLowerCase()}`}
                  />
                )}
                {attribute!.attr_type === 'number' && (
                  <input
                    type="number"
                    disabled
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="0"
                  />
                )}
                {attribute!.attr_type === 'date' && (
                  <input
                    type="date"
                    disabled
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                  />
                )}
                {attribute!.attr_type === 'boolean' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      disabled
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {attribute!.attr_name}
                    </span>
                  </div>
                )}
                {attribute!.attr_type === 'enum' && (
                  <select
                    disabled
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option>Select {attribute!.attr_name.toLowerCase()}</option>
                    {attribute!.enum_values?.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Design document profiling templates with custom attributes
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="btn btn-sm btn-ghost-secondary d-inline-flex align-items-center"
          >
            <EyeIcon className="w-4 h-4 mr-1" />
            {previewMode ? 'Edit' : 'Preview'}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="btn btn-sm btn-ghost-secondary"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSubmit(handleSave)}
            disabled={!isValid || isLoading}
            className="btn btn-primary btn-sm d-inline-flex align-items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="p-4">
          {renderPreview()}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Settings */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Template Settings
            </h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  {...register('template_name')}
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Contract Documents"
                />
                {errors.template_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.template_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document Type
                </label>
                <select
                  {...register('doc_type')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All document types</option>
                  {docTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project ID
                  </label>
                  <input
                    {...register('project_id', { valueAsNumber: true })}
                    type="number"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-600 dark:border-gray-600 dark:text-white"
                    readOnly
                  />
                </div>
              )}

              <label className="flex items-center">
                <input
                  {...register('is_default')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Set as default template
                </span>
              </label>
            </form>
          </div>

          {/* Available Attributes */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Available Attributes
            </h3>
            
            {availableAttributes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No attributes available</p>
                <p className="text-sm mt-1">Create attributes first</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAttributes
                  .filter(attr => !selectedAttributes.some(config => config.attr_id === attr.attr_id))
                  .map(attr => (
                    <div
                      key={attr.attr_id}
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {attr.attr_name}
                            </h4>
                            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              {attr.attr_type}
                            </span>
                          </div>
                          {attr.attr_description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {attr.attr_description}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => addAttribute(attr.attr_id)}
                          className="btn btn-sm btn-ghost-success"
                          title="Add to template"
                          aria-label="Add to template"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Template Attributes */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Template Attributes ({selectedAttributes.length})
            </h3>
            
            {selectedAttributes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No attributes selected</p>
                <p className="text-sm mt-1">Add attributes from the available list</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedAttributes
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((config, index) => {
                    const attr = getAttributeById(config.attr_id);
                    if (!attr) return null;

                    return (
                      <div
                        key={config.attr_id}
                        className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {attr.attr_name}
                              </h4>
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                {attr.attr_type}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-2">
                              <label className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={config.is_required}
                                  onChange={(e) => updateAttributeConfig(config.attr_id, { is_required: e.target.checked })}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-1 text-gray-600 dark:text-gray-400">Required</span>
                              </label>
                              
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Order: {config.display_order + 1}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => moveAttribute(index, index - 1)}
                              disabled={index === 0}
                              className="btn btn-sm btn-ghost-secondary"
                              title="Move up"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveAttribute(index, index + 1)}
                              disabled={index === selectedAttributes.length - 1}
                              className="btn btn-sm btn-ghost-secondary"
                              title="Move down"
                              aria-label="Move down"
                            >
                              ↓
                            </button>

                            <button
                              onClick={() => removeAttribute(config.attr_id)}
                              className="btn btn-sm btn-ghost-danger"
                              title="Remove from template"
                              aria-label="Remove from template"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}