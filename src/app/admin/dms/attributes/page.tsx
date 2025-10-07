'use client';

import React, { useState, useEffect } from 'react';
import AttrBuilder from '@/components/dms/admin/AttrBuilder';
import type { DMSAttribute } from '@/lib/dms/db';

export default function DMSAttributesAdminPage() {
  const [attributes, setAttributes] = useState<DMSAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<number>(1);

  // Fetch existing attributes
  useEffect(() => {
    async function fetchAttributes() {
      try {
        const response = await fetch(
          `/api/dms/attributes?workspaceId=${defaultWorkspaceId}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch attributes');
        }
        const data = await response.json();
        setAttributes(data.attributes || []);
      } catch (error) {
        console.error('Error fetching attributes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAttributes();
  }, [defaultWorkspaceId]);

  const handleSave = async (newAttributes: Partial<DMSAttribute>[]) => {
    try {
      const response = await fetch('/api/dms/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: defaultWorkspaceId,
          attributes: newAttributes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attributes');
      }

      const data = await response.json();

      // Refresh attributes list
      const refreshResponse = await fetch(
        `/api/dms/attributes?workspaceId=${defaultWorkspaceId}`
      );
      const refreshData = await refreshResponse.json();
      setAttributes(refreshData.attributes || []);

      alert(`Successfully saved ${data.attributes.length} attribute(s)!`);
    } catch (error) {
      console.error('Save error:', error);
      throw error; // Re-throw to let AttrBuilder handle it
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
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
          Document Attributes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Define custom attributes for document profiling across all projects
        </p>
      </div>

      {/* Existing Attributes Summary */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Current Attributes
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {attributes.length} attribute{attributes.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <div className="flex gap-2">
            {attributes.slice(0, 5).map((attr) => (
              <span
                key={attr.attr_id}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              >
                {attr.attr_name}
              </span>
            ))}
            {attributes.length > 5 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                +{attributes.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Attribute Builder */}
      <AttrBuilder
        workspaceId={defaultWorkspaceId}
        attributes={attributes}
        onSave={handleSave}
      />

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Attribute Types
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Basic Types
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                <strong>Text:</strong> Single or multi-line text
              </li>
              <li>
                <strong>Number:</strong> Numeric values
              </li>
              <li>
                <strong>Currency:</strong> Monetary values with formatting
              </li>
              <li>
                <strong>Date:</strong> Date picker input
              </li>
              <li>
                <strong>Boolean:</strong> True/false checkbox
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Advanced Types
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                <strong>Enum:</strong> Dropdown with predefined options
              </li>
              <li>
                <strong>Lookup:</strong> Reference to database table
              </li>
              <li>
                <strong>Tags:</strong> Multiple text tags
              </li>
              <li>
                <strong>JSON:</strong> Structured data object
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Best Practices
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Use clear, descriptive names</li>
              <li>Keep attribute keys lowercase with underscores</li>
              <li>Mark frequently used attributes as searchable</li>
              <li>Group related attributes with display_order</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
