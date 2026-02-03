'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import NewProjectChat from './NewProjectChat';
import NewProjectFieldTable from './NewProjectFieldTable';
import NewProjectChannelTabs from './NewProjectChannelTabs';
import type {
  ChatMessage,
  FieldValue,
  ReadinessResult,
  ViewMode,
  ChannelTab,
  ValidationResult,
} from './types';
import { FIELD_COUNT_THRESHOLD, MINIMUM_CREATE_FIELDS } from './types';

interface NewProjectOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: number) => void;
}

// Initial welcome message from Landscaper
const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Tell me about your new project, or drag a document into this window for me to review.

I can extract data from:
• Offering memorandums
• Rent rolls
• T-12 operating statements
• Appraisals

What are we working on?`,
  timestamp: new Date(),
};

export default function NewProjectOnboardingModal({
  isOpen,
  onClose,
  onProjectCreated,
}: NewProjectOnboardingModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Core state
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('multifamily');

  // Field values
  const [fields, setFields] = useState<Map<string, FieldValue>>(new Map());

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeTab, setActiveTab] = useState<ChannelTab>('property');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Document state
  const [pendingDocument, setPendingDocument] = useState<File | null>(null);

  // Readiness state
  const [modelReadiness, setModelReadiness] = useState<ReadinessResult | null>(null);

  // Submission state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Check if we should transition to tabs view
  useEffect(() => {
    if (fields.size >= FIELD_COUNT_THRESHOLD && viewMode === 'table') {
      setViewMode('tabs');
    }
  }, [fields.size, viewMode]);

  // Check if minimum fields are populated for Create button
  const canCreateProject = useMemo(() => {
    // Need at least project_name or property_name, and location
    const hasName = fields.has('project_name') || fields.has('property_name');
    const hasLocation = (fields.has('city') && fields.has('state')) || fields.has('street_address');
    return hasName && hasLocation;
  }, [fields]);

  // Get display name for header
  const displayName = useMemo(() => {
    if (projectName) return projectName;
    const nameField = fields.get('project_name') || fields.get('property_name');
    return nameField?.value || 'New Project';
  }, [projectName, fields]);

  // Handle sending a chat message
  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // If we have a project ID, use the real Landscaper endpoint
      if (projectId) {
        const response = await fetch(`/api/projects/${projectId}/landscaper/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            activeTab: 'documents',  // Onboarding focuses on document upload/extraction
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const assistantMessage: ChatMessage = {
            id: data.messageId || `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
            metadata: {
              fieldsExtracted: data.fieldsExtracted,
              confidence: data.confidence,
            },
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update fields if any were extracted
          if (data.fieldsExtracted && data.extractedValues) {
            updateFieldsFromExtraction(data.extractedValues, 'chat');
          }
        }
      } else {
        // No project yet - use simple rule-based responses
        const assistantMessage = generateSimpleResponse(content);
        setMessages((prev) => [...prev, assistantMessage]);

        // Try to extract simple field values from the message
        const extractedFields = extractFieldsFromMessage(content);
        if (extractedFields.size > 0) {
          setFields((prev) => {
            const updated = new Map(prev);
            extractedFields.forEach((value, key) => {
              updated.set(key, value);
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble processing that. Could you try rephrasing?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [projectId]);

  // Handle document drop
  const handleDocumentDrop = useCallback(async (file: File) => {
    setPendingDocument(file);
    setIsProcessing(true);

    // Add a message about receiving the document
    const receiptMessage: ChatMessage = {
      id: `receipt-${Date.now()}`,
      role: 'assistant',
      content: `I received **${file.name}**. Let me analyze it...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, receiptMessage]);

    try {
      // For now, simulate document processing
      // In production, this would call the document processing endpoints
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate extraction results
      const mockExtractedFields = simulateDocumentExtraction(file.name);

      // Update fields
      setFields((prev) => {
        const updated = new Map(prev);
        mockExtractedFields.forEach((value, key) => {
          updated.set(key, value);
        });
        return updated;
      });

      // Calculate mock readiness
      const fieldKeys = Array.from(mockExtractedFields.keys());
      setModelReadiness({
        readiness_score: Math.min(95, fieldKeys.length * 3),
        populated_count: fieldKeys.length,
        total_input_fields: 209,
        missing_critical: fieldKeys.length < 10 ? [
          { field_key: 'cap_rate_exit', label: 'Exit Cap Rate' },
          { field_key: 'expense_growth_pct', label: 'Expense Growth %' },
        ] : [],
        missing_important: [
          { field_key: 'rent_growth_year_2', label: 'Year 2 Rent Growth' },
          { field_key: 'discount_rate', label: 'Discount Rate' },
        ],
        can_run_model: fieldKeys.length >= 10,
        confidence_level: fieldKeys.length >= 15 ? 'high' : fieldKeys.length >= 10 ? 'medium' : 'low',
      });

      // Add summary message
      const summaryMessage = generateExtractionSummary(file.name, mockExtractedFields.size);
      setMessages((prev) => [...prev, summaryMessage]);

    } catch (error) {
      console.error('Document processing error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I had trouble processing **${file.name}**. The file may be corrupted or in an unsupported format. Try uploading a different document.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setPendingDocument(null);
    }
  }, []);

  // Update fields from extraction
  const updateFieldsFromExtraction = useCallback((
    extractedValues: Record<string, any>,
    source: 'chat' | 'document'
  ) => {
    setFields((prev) => {
      const updated = new Map(prev);
      Object.entries(extractedValues).forEach(([key, value]) => {
        updated.set(key, {
          value,
          source,
          confidence: 0.85,
          timestamp: new Date(),
        });
      });
      return updated;
    });
  }, []);

  // Handle project creation
  const handleCreateProject = useCallback(async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      // Build payload from fields
      const payload: Record<string, any> = {
        project_name: fields.get('project_name')?.value ||
                     fields.get('property_name')?.value ||
                     'New Project',
        property_subtype: propertyType.toUpperCase(),
        analysis_type: 'Income Property',
      };

      // Add location fields
      if (fields.has('street_address')) payload.street_address = fields.get('street_address')?.value;
      if (fields.has('city')) payload.city = fields.get('city')?.value;
      if (fields.has('state')) payload.state = fields.get('state')?.value;
      if (fields.has('zip_code')) payload.zip_code = fields.get('zip_code')?.value;

      // Add property fields
      if (fields.has('total_units')) payload.total_units = Number(fields.get('total_units')?.value);
      if (fields.has('rentable_sf')) payload.gross_sf = Number(fields.get('rentable_sf')?.value);

      const response = await fetch('/api/projects/minimal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const { project } = await response.json();
      setProjectId(project.project_id);
      setProjectName(project.project_name);

      // Notify parent
      onProjectCreated?.(project.project_id);

      // Add success message
      const successMessage: ChatMessage = {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: `I've created the project **${project.project_name}**. You can continue adding information here, or click "Open Project" to go to the full workspace.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }, [fields, propertyType, onProjectCreated]);

  // Handle opening the project
  const handleOpenProject = useCallback(() => {
    if (projectId) {
      router.push(`/projects/${projectId}`);
      onClose();
    }
  }, [projectId, router, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (fields.size > 0 && !projectId) {
      const confirmed = window.confirm('You have unsaved work. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  }, [fields.size, projectId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isDark
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        {/* Header */}
        <header
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark
              ? 'border-slate-800 bg-slate-900/70'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-semibold">{displayName}</h2>
              {projectId && (
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Project #{projectId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Create/Open button */}
            {projectId ? (
              <Button onClick={handleOpenProject} className="gap-2">
                Open Project
                <ExternalLink className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                disabled={!canCreateProject || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className={`rounded-lg p-2 transition ${
                isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Error display */}
        {createError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
            {createError}
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column - Chat (70%) */}
          <div
            className={`flex-1 overflow-hidden border-r ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
            style={{ flexBasis: '70%' }}
          >
            <NewProjectChat
              messages={messages}
              isProcessing={isProcessing}
              onSendMessage={handleSendMessage}
              onDocumentDrop={handleDocumentDrop}
              isDark={isDark}
              projectId={projectId}
            />
          </div>

          {/* Right column - Fields (30%) */}
          <div
            className="overflow-hidden"
            style={{ flexBasis: '30%' }}
          >
            {viewMode === 'table' ? (
              <NewProjectFieldTable
                fields={fields}
                isDark={isDark}
              />
            ) : (
              <NewProjectChannelTabs
                fields={fields}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                readiness={modelReadiness}
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Generate simple response for pre-project chat
function generateSimpleResponse(userMessage: string): ChatMessage {
  const msg = userMessage.toLowerCase();

  let content = "Got it! Let me know more details, or drop a document for me to analyze.";

  if (msg.includes('apartment') || msg.includes('multifamily') || msg.includes('unit')) {
    content = "A multifamily property - great! What's the location and unit count? Or if you have an offering memorandum, drop it here and I'll extract the details.";
  } else if (msg.includes('retail') || msg.includes('shopping')) {
    content = "Retail property noted. What's the location and approximate square footage? Feel free to share any documents you have.";
  } else if (msg.includes('office')) {
    content = "An office building - got it. What market is this in? If you have a flyer or OM, I can pull the key details.";
  } else if (msg.includes('phoenix') || msg.includes('arizona') || msg.includes('az')) {
    content = "Phoenix metro - I know that market well. What type of property are we looking at?";
  } else if (msg.includes('offering') || msg.includes('om') || msg.includes('memorandum')) {
    content = "Perfect! Drag the offering memorandum into this window and I'll extract all the key data points for you.";
  }

  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date(),
  };
}

// Helper: Extract basic fields from user message
function extractFieldsFromMessage(message: string): Map<string, FieldValue> {
  const fields = new Map<string, FieldValue>();
  const msg = message.toLowerCase();

  // Try to extract unit count
  const unitMatch = message.match(/(\d+)\s*(?:unit|apt|apartment)/i);
  if (unitMatch) {
    fields.set('total_units', {
      value: parseInt(unitMatch[1]),
      source: 'chat',
      confidence: 0.8,
      timestamp: new Date(),
    });
  }

  // Try to extract city/state
  const cityStateMatch = message.match(/in\s+([A-Za-z\s]+),?\s*([A-Z]{2})/i);
  if (cityStateMatch) {
    fields.set('city', {
      value: cityStateMatch[1].trim(),
      source: 'chat',
      confidence: 0.7,
      timestamp: new Date(),
    });
    fields.set('state', {
      value: cityStateMatch[2].toUpperCase(),
      source: 'chat',
      confidence: 0.9,
      timestamp: new Date(),
    });
  }

  // Try to extract property type
  if (msg.includes('multifamily') || msg.includes('apartment')) {
    fields.set('property_type', {
      value: 'MULTIFAMILY',
      source: 'chat',
      confidence: 0.9,
      timestamp: new Date(),
    });
  } else if (msg.includes('retail')) {
    fields.set('property_type', {
      value: 'RETAIL',
      source: 'chat',
      confidence: 0.9,
      timestamp: new Date(),
    });
  } else if (msg.includes('office')) {
    fields.set('property_type', {
      value: 'OFFICE',
      source: 'chat',
      confidence: 0.9,
      timestamp: new Date(),
    });
  }

  return fields;
}

// Helper: Simulate document extraction (mock data)
function simulateDocumentExtraction(fileName: string): Map<string, FieldValue> {
  const fields = new Map<string, FieldValue>();
  const timestamp = new Date();

  // Simulate extracting common fields from an OM
  const mockData: Record<string, any> = {
    property_name: 'Chadron Terrace',
    street_address: '14105 Chadron Avenue',
    city: 'Hawthorne',
    state: 'CA',
    zip_code: '90250',
    total_units: 113,
    year_built: 2016,
    stories: 3,
    rentable_sf: 89400,
    parking_spaces_total: 156,
    parking_ratio: 1.38,
    asking_price: 42500000,
    cap_rate_current: 5.25,
    current_vacancy_rate: 4.5,
    opex_real_estate_taxes: 425000,
    opex_property_insurance: 95000,
    opex_management_fee: 127500,
    submarket: 'South Bay',
  };

  Object.entries(mockData).forEach(([key, value]) => {
    fields.set(key, {
      value,
      source: 'document',
      confidence: 0.85 + Math.random() * 0.1,
      timestamp,
    });
  });

  return fields;
}

// Helper: Generate extraction summary message
function generateExtractionSummary(fileName: string, fieldCount: number): ChatMessage {
  return {
    id: `summary-${Date.now()}`,
    role: 'assistant',
    content: `I've analyzed **${fileName}** and extracted **${fieldCount} fields**.

**Key details found:**
• Property: Chadron Terrace
• Location: Hawthorne, CA
• Units: 113
• Asking Price: $42.5M
• Cap Rate: 5.25%

You can review all extracted data in the panel on the right. Click any field to edit if needed.

Would you like me to pull any additional information from the document?`,
    timestamp: new Date(),
    metadata: {
      documentId: Date.now(),
      fieldsExtracted: ['property_name', 'city', 'state', 'total_units', 'asking_price'],
      confidence: 0.88,
    },
  };
}
