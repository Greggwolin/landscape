/**
 * Document Ingestion Components
 *
 * A CopilotKit-powered HITL interface for multifamily document ingestion.
 * Implements the three-panel "travel app" pattern with:
 * - Left panel: Document upload and extraction cards
 * - Center panel: Property overview visualization
 * - Right panel: AI chat assistant
 * - Bottom bar: Milestone progress tracker
 */

export { DocumentIngestion } from './DocumentIngestion';
export { DocumentCard } from './DocumentCard';
export { PropertyOverview } from './PropertyOverview';
export { IngestionChat } from './IngestionChat';
export { MilestoneBar } from './MilestoneBar';
export * from './types';
