'use client';

import React from 'react';
import {
  useCopilotAction,
  useCopilotReadable,
} from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import type { PropertySummary, IngestionDocument, StagingData } from './types';

interface IngestionChatProps {
  projectId: number;
  projectName: string;
  documents: IngestionDocument[];
  summary: PropertySummary;
  stagingData?: StagingData | null;
  onConfirmExtraction?: (docId: number) => void;
  onRequestEdit?: (docId: number, field: string) => void;
  onAddAskingPrice?: (price: number) => void;
}

export function IngestionChat({
  projectId,
  projectName,
  documents,
  summary,
  stagingData,
  onConfirmExtraction,
  onRequestEdit,
  onAddAskingPrice,
}: IngestionChatProps) {
  // Make project context readable to CopilotKit
  useCopilotReadable({
    description: 'Current project information',
    value: {
      projectId,
      projectName,
      documentCount: documents.length,
      confirmedDocs: documents.filter(d => d.status === 'confirmed').length,
      pendingDocs: documents.filter(d => d.status === 'pending').length,
      processingDocs: documents.filter(d => d.status === 'processing').length,
    },
  });

  // Make property summary readable
  useCopilotReadable({
    description: 'Extracted property summary data',
    value: {
      totalUnits: summary.totalUnits,
      averageRent: summary.averageRent,
      occupancy: summary.occupancy,
      noi: summary.noi,
      capRate: summary.capRate,
      pricePerUnit: summary.pricePerUnit,
      unitMixCount: summary.unitMix.length,
    },
  });

  // Make document list readable
  useCopilotReadable({
    description: 'Uploaded documents and their extraction status',
    value: documents.map(doc => ({
      name: doc.doc_name,
      type: doc.doc_type,
      status: doc.status,
      needsReview: doc.extraction?.needs_review ?? false,
      warnings: doc.extraction?.warnings ?? [],
    })),
  });

  // Make staging data readable if available
  useCopilotReadable({
    description: 'Staged extraction data awaiting confirmation',
    value: stagingData ? {
      totalUnits: stagingData.summary.total_units,
      occupiedUnits: stagingData.summary.occupied_units,
      vacantUnits: stagingData.summary.vacant_units,
      monthlyIncome: stagingData.summary.monthly_income,
      unitTypesCount: stagingData.unit_types.length,
      unitsCount: stagingData.units.length,
      leasesCount: stagingData.leases.length,
      issuesCount: stagingData.needs_review.length,
    } : null,
  });

  // Action: Confirm extraction for a document
  useCopilotAction({
    name: 'confirmExtraction',
    description: 'Confirm the AI-extracted data for a document and commit it to the database',
    parameters: [
      {
        name: 'docId',
        type: 'number',
        description: 'The document ID to confirm',
        required: true,
      },
    ],
    handler: async ({ docId }) => {
      if (onConfirmExtraction) {
        onConfirmExtraction(docId);
        return `Extraction for document ${docId} has been confirmed and committed.`;
      }
      return 'Unable to confirm extraction at this time.';
    },
  });

  // Action: Request edit for a specific field
  useCopilotAction({
    name: 'requestFieldEdit',
    description: 'Open the editor to correct a specific extracted field',
    parameters: [
      {
        name: 'docId',
        type: 'number',
        description: 'The document ID containing the field',
        required: true,
      },
      {
        name: 'fieldName',
        type: 'string',
        description: 'The name of the field to edit',
        required: true,
      },
    ],
    handler: async ({ docId, fieldName }) => {
      if (onRequestEdit) {
        onRequestEdit(docId, fieldName);
        return `Opening editor for ${fieldName} in document ${docId}.`;
      }
      return 'Unable to open editor at this time.';
    },
  });

  // Action: Add asking price
  useCopilotAction({
    name: 'addAskingPrice',
    description: 'Add or update the asking price for the property',
    parameters: [
      {
        name: 'price',
        type: 'number',
        description: 'The asking price in dollars',
        required: true,
      },
    ],
    handler: async ({ price }) => {
      if (onAddAskingPrice) {
        onAddAskingPrice(price);
        const pricePerUnit = summary.totalUnits
          ? Math.round(price / summary.totalUnits)
          : null;
        return `Asking price set to $${price.toLocaleString()}${
          pricePerUnit ? `. Price per unit: $${pricePerUnit.toLocaleString()}` : ''
        }`;
      }
      return 'Unable to set asking price at this time.';
    },
  });

  // Action: Flag item for due diligence
  useCopilotAction({
    name: 'flagForDueDiligence',
    description: 'Flag an item or finding for further due diligence review',
    parameters: [
      {
        name: 'item',
        type: 'string',
        description: 'Description of the item to flag',
        required: true,
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Priority level: high, medium, or low',
        required: false,
      },
    ],
    handler: async ({ item, priority = 'medium' }) => {
      // In a real implementation, this would save to the database
      console.log(`Flagging for DD: ${item} (${priority})`);
      return `Flagged "${item}" for due diligence review with ${priority} priority.`;
    },
  });

  // Generate initial instructions based on current state
  const getInstructions = () => {
    const pendingCount = documents.filter(d => d.status === 'pending').length;
    const processingCount = documents.filter(d => d.status === 'processing').length;
    const hasWarnings = documents.some(d => d.extraction?.warnings?.length);

    let instructions = `You are Landscaper, an AI assistant helping with multifamily property due diligence for "${projectName}".

Your role is to:
1. Help users understand extracted data from their documents
2. Highlight issues, anomalies, or items needing attention
3. Answer questions about the property financials and unit mix
4. Guide users through the HITL confirmation process

Current state:
- ${documents.length} documents uploaded
- ${pendingCount} pending review
- ${processingCount} currently processing
`;

    if (hasWarnings) {
      instructions += `\nThere are warnings that need user attention. Proactively mention these.`;
    }

    if (!summary.pricePerUnit) {
      instructions += `\nThe asking price is missing. The cap rate is inferred from market data.`;
    }

    return instructions;
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Chat Header */}
      <div
        className="d-flex align-items-center gap-3 px-3 py-3"
        style={{ borderBottom: '1px solid var(--cui-border-color)' }}
      >
        <div
          className="d-flex align-items-center justify-content-center rounded"
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--cui-primary), var(--cui-info))',
            fontSize: '18px',
          }}
        >
          🌿
        </div>
        <div>
          <div className="fw-semibold" style={{ fontSize: '14px' }}>
            Landscaper
          </div>
          <div className="text-success" style={{ fontSize: '11px' }}>
            ● {documents.some(d => d.status === 'processing') ? 'Analyzing documents' : 'Ready'}
          </div>
        </div>
      </div>

      {/* CopilotKit Chat */}
      <div className="flex-grow-1 overflow-hidden">
        <CopilotChat
          instructions={getInstructions()}
          labels={{
            title: '',
            initial: documents.length === 0
              ? 'Upload documents to begin property analysis.'
              : `I've processed ${documents.filter(d => d.status === 'confirmed').length} of ${documents.length} documents. ${
                  documents.some(d => d.status === 'pending')
                    ? 'Some items need your review.'
                    : 'All extractions confirmed!'
                }`,
          }}
          className="h-100"
        />
      </div>
    </div>
  );
}

export default IngestionChat;
