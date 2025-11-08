'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import UnitCostsPanel from '@/components/benchmarks/unit-costs/UnitCostsPanel';
import UnitCostTemplateModal from '@/components/benchmarks/unit-costs/UnitCostTemplateModal';
import InlineEditableCell from '@/components/benchmarks/unit-costs/InlineEditableCell';
import InlineEditableUOMCell from '@/components/benchmarks/unit-costs/InlineEditableUOMCell';
import InlineEditableCategoryCell from '@/components/benchmarks/unit-costs/InlineEditableCategoryCell';
import type { DevelopmentStage, UnitCostTemplateSummary, UnitCostCategoryReference } from '@/types/benchmarks';

const STAGE_LABELS: Record<DevelopmentStage, string> = {
  stage1_entitlements: 'Stage 1 - Entitlements',
  stage2_engineering: 'Stage 2 - Engineering',
  stage3_development: 'Stage 3 - Development'
};

// Formatters for display
const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  } catch {
    return dateString;
  }
};

export default function UnitCostsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStage = (searchParams.get('stage') as DevelopmentStage) || 'stage3_development';

  const [selectedStage, setSelectedStage] = useState<DevelopmentStage>(initialStage);
  const [templates, setTemplates] = useState<UnitCostTemplateSummary[]>([]);
  const [categories, setCategories] = useState<UnitCostCategoryReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] = useState<UnitCostTemplateSummary | undefined>(undefined);

  // Update stage when URL changes
  useEffect(() => {
    const stage = (searchParams.get('stage') as DevelopmentStage) || 'stage3_development';
    setSelectedStage(stage);
  }, [searchParams]);

  // Load categories and templates when stage changes (for Stage 1 & 2 only)
  useEffect(() => {
    if (selectedStage === 'stage1_entitlements' || selectedStage === 'stage2_engineering') {
      loadCategories(selectedStage);
      loadTemplates(selectedStage);
    }
  }, [selectedStage]);

  async function loadCategories(stage: DevelopmentStage) {
    try {
      const response = await fetch(`/api/unit-costs/categories-by-stage`);
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();

      // Extract categories for the selected stage
      const stageCategories = data[stage] || [];
      setCategories(stageCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadTemplates(stage: DevelopmentStage) {
    setLoading(true);
    try {
      const response = await fetch(`/api/unit-costs/templates-by-stage?stage=${stage}`);
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleStageChange(stage: DevelopmentStage) {
    router.push(`/benchmarks/unit-costs?stage=${stage}`);
  }

  function handleAddTemplate() {
    setModalMode('create');
    setEditingTemplate(undefined);
    setModalOpen(true);
  }

  function handleEditTemplate(template: UnitCostTemplateSummary) {
    setModalMode('edit');
    setEditingTemplate(template);
    setModalOpen(true);
  }

  async function handleDeleteTemplate(template: UnitCostTemplateSummary) {
    const confirmed = window.confirm(`Are you sure you want to delete "${template.item_name}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/unit-costs/templates/${template.template_id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');

      // Reload templates
      await loadTemplates(selectedStage);
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  }

  async function handleSaveTemplate(templateData: Partial<UnitCostTemplateSummary>) {
    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/unit-costs/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        });
        if (!response.ok) throw new Error('Failed to create template');
      } else if (editingTemplate) {
        const response = await fetch(`/api/unit-costs/templates/${editingTemplate.template_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        });
        if (!response.ok) throw new Error('Failed to update template');
      }

      // Reload templates
      await loadTemplates(selectedStage);
    } catch (err) {
      console.error('Error saving template:', err);
      throw err; // Re-throw to let modal handle error display
    }
  }

  async function handleInlineSave(
    templateId: number,
    fieldName: string,
    value: any
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/unit-costs/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: value })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      // Update local state optimistically
      setTemplates(prev =>
        prev.map(t =>
          t.template_id === templateId
            ? { ...t, [fieldName]: value }
            : t
        )
      );

      return true;
    } catch (err) {
      console.error('Inline save error:', err);
      return false;
    }
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border overflow-hidden">

        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--cui-body-color)' }}>Unit Cost Library</h1>
            <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Development cost templates and benchmarks
            </p>
          </div>
        </div>

        {/* Stage Tabs */}
        <div style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}>
          <div className="flex gap-0 px-4">
            {(Object.keys(STAGE_LABELS) as DevelopmentStage[]).map(stage => (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: selectedStage === stage ? 'var(--cui-primary)' : 'transparent',
                  color: selectedStage === stage ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                  backgroundColor: 'transparent'
                }}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div>
          {selectedStage === 'stage3_development' ? (
            // Stage 3: Show existing full UI with Hard/Soft/Deposits/Other tabs
            <UnitCostsPanel />
          ) : (
            // Stage 1 & 2: Show simple table view
            <div className="p-4">
              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
                  Loading templates...
                </div>
              ) : (
                <>
                  {templates.length > 0 ? (
                    <div style={{ backgroundColor: 'var(--cui-body-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded border">
                      <table className="w-full">
                        <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              Category
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              Item Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              UOM
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              Typical Value
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              As of Date
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                              <div className="flex items-center justify-center gap-2">
                                Actions
                                <button
                                  className="px-2 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80"
                                  style={{
                                    backgroundColor: 'var(--cui-primary)',
                                    color: 'white'
                                  }}
                                  onClick={handleAddTemplate}
                                  title="Add new unit cost"
                                >
                                  + Add
                                </button>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.map((template) => (
                            <tr
                              key={template.template_id}
                              style={{ borderTop: '1px solid var(--cui-border-color)' }}
                            >
                              <td className="text-sm">
                                <InlineEditableCategoryCell
                                  value={template.category_id}
                                  displayValue={template.category_name}
                                  recordId={template.template_id}
                                  categories={categories}
                                  onSave={handleInlineSave}
                                  className="px-2 py-1"
                                />
                              </td>
                              <td className="text-sm">
                                <InlineEditableCell
                                  value={template.item_name}
                                  fieldName="item_name"
                                  recordId={template.template_id}
                                  type="text"
                                  onSave={handleInlineSave}
                                  className="px-2 py-1"
                                />
                              </td>
                              <td className="text-sm">
                                <InlineEditableUOMCell
                                  value={template.default_uom_code}
                                  recordId={template.template_id}
                                  onSave={handleInlineSave}
                                  className="px-2 py-1"
                                />
                              </td>
                              <td className="text-sm">
                                <InlineEditableCell
                                  value={template.typical_mid_value}
                                  fieldName="typical_mid_value"
                                  recordId={template.template_id}
                                  type="number"
                                  align="right"
                                  formatter={formatCurrency}
                                  onSave={handleInlineSave}
                                  className="px-2 py-1"
                                />
                              </td>
                              <td className="text-sm">
                                <InlineEditableCell
                                  value={template.as_of_date}
                                  fieldName="as_of_date"
                                  recordId={template.template_id}
                                  type="date"
                                  formatter={formatDate}
                                  onSave={handleInlineSave}
                                  className="px-2 py-1"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    className="text-xs transition-colors hover:underline"
                                    style={{ color: 'var(--cui-primary)' }}
                                    onClick={() => handleEditTemplate(template)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-xs transition-colors hover:underline"
                                    style={{ color: 'var(--cui-danger)' }}
                                    onClick={() => handleDeleteTemplate(template)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12" style={{ color: 'var(--cui-secondary-color)' }}>
                      No templates defined for {STAGE_LABELS[selectedStage]}.
                      <br />
                      <button
                        className="mt-4 px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--cui-primary)',
                          color: 'white'
                        }}
                        onClick={handleAddTemplate}
                      >
                        + Add First Template
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unit Cost Template Modal */}
      <UnitCostTemplateModal
        isOpen={modalOpen}
        mode={modalMode}
        template={editingTemplate}
        categories={categories}
        stage={selectedStage}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
