'use client';

import React, { useState } from 'react';
import { FileText, Book, Code, Database, Map, DollarSign, ExternalLink, Search } from 'lucide-react';
import MarkdownViewer from '../components/Documentation/MarkdownViewer';
import Navigation from '../components/Navigation';
import { ProjectProvider } from '../components/ProjectProvider';

interface DocItem {
  title: string;
  path: string;
  category: 'Status' | 'Architecture' | 'Migration' | 'Component' | 'Technical' | 'AI';
  description: string;
  icon: React.ReactNode;
  lastModified: string;
}

const DocumentationIndex: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; title: string } | null>(null);

  const documents: DocItem[] = [
    // Status Reports
    {
      title: 'Landscaper Stability & Rent Roll Visibility (Feb 10, 2026)',
      path: '/docs/09-session-notes/2026-02-10-landscaper-stability-and-rent-roll-visibility.md',
      category: 'AI',
      description: 'Landscaper tool hang fix (truncation, loop limits, batch SQL), document extraction truncation fix (full rent roll visibility), dynamic columns in Configure Columns modal, auto-refresh after mutations, floor plan editable',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-02-10'
    },
    {
      title: 'Folder-Tabs UI Overhaul (Feb 8, 2026)',
      path: '/docs/09-session-notes/2026-02-08-folder-tabs-ui-overhaul.md',
      category: 'Component',
      description: '25+ legacy pages archived, ProjectContentRouter, ActiveProjectBar, media system (picker/preview/card), location intelligence expansion, property type tokens, Landscaper enhancements, income property cashflow service',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-02-08'
    },
    {
      title: 'Page Inventory & Cleanup Audit (Feb 7, 2026)',
      path: '/docs/PAGE_INVENTORY_AUDIT.md',
      category: 'Architecture',
      description: 'Complete audit of 92 page.tsx files and 7 layouts. Route inventory with status (ACTIVE/SANDBOX/DEAD), folder tab navigation mapping, Landscaper panel integration, dead route candidates',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-02-07'
    },
    {
      title: 'Debt UI Consolidation — Parts 1-3 (Feb 6, 2026)',
      path: '/docs/09-session-notes/2026-02-06-debt-ui-consolidation.md',
      category: 'Component',
      description: 'Loan Schedule Grid, Loan Schedule Modal, and Leveraged Cash Flow (DCF with debt service). Period toggles (M/Q/A), sticky columns, 3-scenario support, Django serializer fixes',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-02-06'
    },
    {
      title: 'Rent Roll Extraction Improvements (Feb 5, 2026)',
      path: '/docs/09-session-notes/2026-02-05-rent-roll-extraction-improvements.md',
      category: 'AI',
      description: 'Async background processing, direct Excel parsing, tenant name extraction, cancel extraction, dismissible banners, stuck job detection',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-02-05'
    },
    {
      title: 'DMS Version Control & Collision Detection (Feb 5, 2026)',
      path: '/docs/09-session-notes/2026-02-05-dms-version-control-collision-detection.md',
      category: 'Component',
      description: 'SHA-256 collision detection for document versions, two-step delete system (soft delete + permanent), restore functionality',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-02-05'
    },
    {
      title: 'Property Tab Restructure (Feb 2, 2026)',
      path: '/docs/09_session_notes/2026-02-02-property-tab-restructure.md',
      category: 'Component',
      description: 'Added Acquisition and Renovation sub-tabs to Property folder. Analysis type filtering, inline ledger editing (no modal), editable "Is Conditional" column, optimized column widths',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-02-02'
    },
    {
      title: 'Semantic Category Chips for Unit Cost Library (Feb 2, 2026)',
      path: '/docs/00_overview/IMPLEMENTATION_STATUS.md',
      category: 'Component',
      description: 'Tokenized the Unit Cost category pills by introducing `SemanticCategoryChip` + intent tokens, eliminating inline color math and enabling consistent light/dark theming.',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-02-02'
    },
    {
      title: 'Django Cash Flow Consolidation (Feb 1, 2026)',
      path: '/docs/09_session_notes/2026-02-01-project-switch-tab-preservation.md',
      category: 'Migration',
      description: 'Land Dev Cash Flow engine migrated to Django/Python. Waterfall section name fix (UPPERCASE matching), preferred return timing fix (Period 1 accrual), IRR verified at 32.36%',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-02-01'
    },
    {
      title: 'Project Switch Tab Preservation (Feb 1, 2026)',
      path: '/docs/09_session_notes/2026-02-01-project-switch-tab-preservation.md',
      category: 'Component',
      description: 'Navigation UX enhancement - switching projects now preserves current tab/page. Supports both path-based and query-param URL patterns with smart fallback logic',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-02-01'
    },
    {
      title: 'Cash Flow, Growth Rates & DCF Improvements (Jan 30, 2026)',
      path: '/docs/09_session_notes/2026-01-30-cashflow-growth-dcf-improvements.md',
      category: 'Component',
      description: 'Cash Flow UI overhaul (colorized filters, export repositioning), Growth Rate type prefixes, DCF ResultsSection component, MapTab GIS enhancements, Landscaper AI tool expansion',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-30'
    },
    {
      title: 'Assumptions Panel Styling (Jan 29, 2026)',
      path: '/docs/09_session_notes/2026-01-29-assumptions-panel-styling.md',
      category: 'Component',
      description: 'Shaded section headers, compact panel width (24%), units inside inputs, removed lock icons, all accordions open by default',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-29'
    },
    {
      title: 'Sales Comparison UI Refinements (Jan 29, 2026)',
      path: '/docs/09_session_notes/2026-01-29-sales-comparison-ui-refinements.md',
      category: 'Component',
      description: 'Flat Excel-style editable cells for Sales Comparison grid - removed pill styling, consistent header backgrounds, increased font size (13px)',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-29'
    },
    {
      title: 'Map Tab Draw Tools Phase 3 (Jan 28, 2026)',
      path: '/docs/09_session_notes/2026-01-28-map-tab-draw-tools.md',
      category: 'Component',
      description: 'Interactive drawing tools with @mapbox/mapbox-gl-draw - Point/Line/Polygon modes, live measurements (distance, area, perimeter), Django API persistence, FeatureModal refactor',
      icon: <Map className="w-5 h-5" />,
      lastModified: '2026-01-28'
    },
    {
      title: 'OpEx Inline Editing (Jan 27, 2026)',
      path: '/docs/09_session_notes/2026-01-27-opex-inline-editing.md',
      category: 'Component',
      description: 'Double-click inline editing for operating expense category reassignment - CoreUI CFormSelect dropdown, useOpexCategories hook, PATCH API endpoint',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-27'
    },
    {
      title: 'Landscaper Threads, Auth & DCF (Jan 26, 2026)',
      path: '/docs/09_session_notes/2026-01-26-landscaper-threads-auth-dcf.md',
      category: 'AI',
      description: 'Thread-based Landscaper chat with auto-titles and RAG summaries, cookie-based auth middleware for route protection, DCF valuation in Income Approach',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2026-01-26'
    },
    {
      title: 'Location Intelligence System (Jan 26, 2026)',
      path: '/docs/09_session_notes/2026-01-26-location-intelligence-implementation.md',
      category: 'Technical',
      description: 'Census demographics with PostGIS ring calculations (1/3/5 mi), Django REST API, MapLibre flyout with Turf.js visualization, TIGER/Line + ACS data loading',
      icon: <Map className="w-5 h-5" />,
      lastModified: '2026-01-26'
    },
    {
      title: 'Operating Statement Unified Table (Jan 26, 2026)',
      path: '/docs/00_overview/status/OPERATING_STATEMENT_UNIFIED_TABLE_COMPLETE_26-01-26.md',
      category: 'Component',
      description: 'Unified Operating Income + Expenses into a single aligned grid with drag-and-drop OpEx, value-add columns, and shared totals (EGI/NOI).',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-26'
    },
    {
      title: 'Cost Category Management Overview',
      path: '/docs/02-features/financial-engine/COST_CATEGORY_MANAGEMENT_OVERVIEW.md',
      category: 'Component',
      description: 'Overview of cost category management, hierarchy rules, and how categories integrate with budget and financial engine workflows.',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-26'
    },
    {
      title: 'Documentation Update (Jan 18, 2026)',
      path: '/docs/09_session_notes/2026-01-18-documentation-update.md',
      category: 'Status',
      description: 'Comprehensive documentation center update - consolidated recent session notes, updated status pages, refreshed timestamps',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-01-18'
    },
    {
      title: 'Operations & Income Approach Data Flow Fix (Jan 17, 2026)',
      path: '/docs/00_overview/status/OPERATIONS_INCOME_APPROACH_DATA_FLOW_COMPLETE_26-01-17.md',
      category: 'Status',
      description: 'Fixed Property → Operations → Income Approach data flow. Read-only rental income, calculated vacancy, NOI basis consolidation (4→3), 3-column P&L with toggles',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-17'
    },
    {
      title: 'Operations Tab Enhancements (Jan 14, 2026)',
      path: '/docs/09_session_notes/2026-01-14-operations-tab-enhancements.md',
      category: 'Component',
      description: 'Draggable OpEx categorization with React DnD, Detail/Summary toggle for all P&L sections (Rental Income, Vacancy, OpEx), CSS fixes for drag handles',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-14'
    },
    {
      title: 'Loss to Lease & Year 1 Buyer NOI (Jan 13, 2026)',
      path: '/docs/09_session_notes/2026-01-13-loss-to-lease-year1-noi.md',
      category: 'AI',
      description: 'Income analysis tools for multifamily - LTL calculator (simple + time-weighted), Year 1 Buyer NOI, rent control awareness (CA AB 1482), Landscaper tool integration',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-01-13'
    },
    {
      title: 'Document Extraction for New Project Modal (Jan 10, 2026)',
      path: '/docs/09_session_notes/2026-01-10-document-extraction-integration.md',
      category: 'AI',
      description: 'NewProjectDropZone integration - Drop OMs/rent rolls to auto-populate form fields using Claude extraction, visual indicators, clipboard paste support',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-01-10'
    },
    {
      title: 'Documentation Reorganization (Jan 6, 2026)',
      path: '/docs/09_session_notes/2026-01-06-documentation-refresh.md',
      category: 'Status',
      description: 'Major docs restructure - consolidated status docs to 00_overview/, session notes to 09_session_notes/, removed obsolete directories',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-01-06'
    },
    {
      title: 'Git Consolidation, Bug Fixes & Approval Workflow (Dec 23)',
      path: '/docs/09_session_notes/2025-12-23-git-consolidation-bug-fixes.md',
      category: 'Status',
      description: 'Feature branch merge (25 commits, 299 files), BUG-001 fix, Extraction History Approval Workflow with confidence-based approve/apply actions',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-12-23'
    },
    {
      title: 'Implementation Status (Dec 23)',
      path: '/docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-23.md',
      category: 'Status',
      description: 'Current implementation status - Extraction Approval Workflow complete, BUG-001 fixed, Knowledge Extraction Platform operational',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-12-23'
    },
    {
      title: 'Implementation Status (Jan 17, 2026)',
      path: '/docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md',
      category: 'Status',
      description: 'Operations & Income Approach data flow fix, NOI basis consolidation, Knowledge Extraction Platform, Developer Operations',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2026-01-17'
    },
    {
      title: 'Project 42 Multi-Scenario OpEx Parser Proof',
      path: '/docs/opex/Project42_MultiScenario_ParserProof.md',
      category: 'AI',
      description: 'Scenario-aware operating statement parse for Lynn Villa OM (T3 Annualized, Current Pro Forma, Post-Reno Pro Forma); JSON/CSV outputs saved for validation',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-12-23'
    },
    {
      title: 'Landscaper Phase 3 - Real Data & AI Wiring',
      path: '/docs/09_session_notes/2025-12-19-landscaper-phase3-wiring.md',
      category: 'AI',
      description: 'Chat API connection to Django, activity feed infrastructure, field highlighting, context-aware system prompts by property type',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-12-19'
    },
    {
      title: 'Session XK-83: Project Cleanup & Type Rename',
      path: '/docs/09_session_notes/2025-12-11-session-xk83-cleanup.md',
      category: 'Status',
      description: 'Deleted 4 test projects, renamed LAND→DEV project type code across database and frontend (9 files)',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-12-11'
    },
    {
      title: 'DMS Implementation Status',
      path: '/docs/02-features/dms/DMS-Implementation-Status.md',
      category: 'Status',
      description: 'DMS implementation guide - Multi-select delete, toast notifications, multi-filter expansion (Dec 11)',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-12-11'
    },
    {
      title: 'Implementation Status',
      path: '/docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-03.md',
      category: 'Status',
      description: 'Current implementation status - Updated with Zonda, HBACA ingestion tools + repo cleanup (Dec 3)',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-12-03'
    },
    {
      title: 'Waterfall Napkin Form Redesign',
      path: '/docs/09_session_notes/2025-12-05-waterfall-napkin-form-redesign.md',
      category: 'Component',
      description: 'NapkinWaterfallForm redesign with IRR/EM toggle, $800K Excel variance fix (now <$200), hurdle display by mode, cumulative accrued tracking',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-12-05'
    },
    {
      title: 'Waterfall Engine Status',
      path: '/docs/02-features/financial-engine/WATERFALL_STATUS.md',
      category: 'Status',
      description: 'Python waterfall engine - Excel-validated IRR distributions ($187 variance), dynamic hurdle display, multi-tier promote structures',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-12-05'
    },
    {
      title: 'Market Data Ingestion Tools (HBACA + Zonda)',
      path: '/docs/09_session_notes/2025-12-03-market-data-ingestion-tools.md',
      category: 'Technical',
      description: 'HBACA permit activity (9,392 records) and Zonda subdivision inventory (704 records) ingestion pipelines - Python CLIs with deduplication',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-12-03'
    },
    {
      title: 'Redfin Python Ingestion Tool',
      path: '/docs/09_session_notes/2025-12-02-redfin-ingestion-tool.md',
      category: 'Technical',
      description: 'Python-based Redfin ingestion for unified data pipeline - Fetches sold comps, normalizes to UnifiedResaleClosing, persists to Neon',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-12-02'
    },
    {
      title: 'Builder/Redfin Ingestion Architecture',
      path: '/docs/architecture/ingestion_builder_redfin_v1.md',
      category: 'Architecture',
      description: 'Unified ingestion architecture for builder (Lennar, NHS) and resale (Redfin) data - Adapters, persistence, CLI tools',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-12-02'
    },
    {
      title: 'Redfin Comps Integration',
      path: '/docs/09_session_notes/SESSION_NOTES_2025_11_30_REDFIN_COMPS_INTEGRATION.md',
      category: 'Component',
      description: 'Housing price comparables using Redfin API - Map visualization with price-tier markers, layer controls, and statistics',
      icon: <Map className="w-5 h-5" />,
      lastModified: '2025-11-30'
    },
    {
      title: 'User Management System',
      path: '/docs/09_session_notes/SESSION_NOTES_2025_11_30_REDFIN_COMPS_INTEGRATION.md',
      category: 'Component',
      description: 'Full CRUD user management in System Administration - Add/Edit/Delete users, password reset, active/inactive toggle',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-11-30'
    },
    {
      title: 'CHANGELOG',
      path: '/CHANGELOG.md',
      category: 'Status',
      description: 'Complete version history with Migration 013 details - Project type code standardization, backend updates, and tab routing fixes',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Finance Structure Migration Complete',
      path: '/docs/00_overview/status/FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md',
      category: 'Status',
      description: 'Finance Structure system migration to Django backend - Complete with auto-allocations, cost-to-complete, sale settlements, and participation tracking',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-01-22'
    },
    {
      title: 'Django Backend Implementation',
      path: '/docs/03-api-reference/DJANGO_BACKEND_IMPLEMENTATION.md',
      category: 'Status',
      description: 'Django backend Phase 1 complete - Admin panel with smart dropdowns, JWT auth, and Python engine integration',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-01-22'
    },
    {
      title: 'Documentation Update System',
      path: '/docs/process/DOCUMENTATION_UPDATE_WORKFLOW.md',
      category: 'Technical',
      description: 'Automated documentation update workflow - Slash command system with /update-docs for comprehensive doc management',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2026-01-06'
    },
    {
      title: 'Claude Commands Guide',
      path: '/.claude/commands/README.md',
      category: 'Technical',
      description: 'Custom Claude Code slash commands - Documentation update automation and workflow guides',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-01-22'
    },
    {
      title: 'Financial Engine Status',
      path: '/docs/00_overview/IMPLEMENTATION_STATUS.md',
      category: 'Status',
      description: 'Complete financial engine implementation status v3.7 — Folder-Tabs UI Overhaul (Feb 8), Debt UI Consolidation, Rent Roll Extraction, Python migration, and all prior phases',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2026-02-08'
    },
    {
      title: 'CRE Implementation Summary',
      path: '/docs/02-features/cre/CRE_IMPLEMENTATION_SUMMARY.md',
      category: 'Status',
      description: 'Commercial real estate calculation engine implementation summary',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Assumptions UI Final Status',
      path: '/docs/09_session_notes/archive/ASSUMPTIONS_UI_FINAL_STATUS.md',
      category: 'Status',
      description: 'Final status of assumptions UI implementation',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Scottsdale Promenade Data Summary',
      path: '/docs/09_session_notes/examples/SCOTTSDALE_DATA_SUMMARY.md',
      category: 'Status',
      description: 'Complete property data: 41 spaces, 39 tenants, 5 sample leases. Full rent roll with NNN, Modified Gross, and percentage rent structures. Ready for analysis.',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-18'
    },
    {
      title: 'App Development Status (Archive)',
      path: '/docs/09_session_notes/archive/App-Development-Status.md',
      category: 'Status',
      description: 'Complete reference document with database tables, API routes, and architecture (archived)',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-03'
    },

    // Architecture & System Design
    {
      title: 'System Architecture',
      path: '/ARCHITECTURE.md',
      category: 'Architecture',
      description: 'Complete system architecture documentation - Updated with Migration 013 (Project Type Code Standardization)',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2026-01-06'
    },
    {
      title: 'Database Schema Design',
      path: '/docs/05-database/DATABASE_SCHEMA.md',
      category: 'Architecture',
      description: 'Financial engine schema specification - Updated with Migration 013 project_type_code standardization and CHECK constraints',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Database Table Inventory',
      path: '/docs/05-database/TABLE_INVENTORY.md',
      category: 'Architecture',
      description: 'Complete inventory of 158 active tables - Updated with Migration 013 tbl_project schema changes (project_type_code)',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Database Documentation Index',
      path: '/docs/05-database/README.md',
      category: 'Architecture',
      description: 'Database documentation hub - Updated with Migration 013 recent changes and metrics (13 migrations executed)',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },

    // Migration & Consolidation
    {
      title: 'Migration 013 - Project Type Code Standardization',
      path: '/docs/08-migration-history/013-project-type-code-standardization.md',
      category: 'Migration',
      description: 'Complete migration 013 history - Standardized 7 project type codes (LAND, MF, OFF, RET, IND, HTL, MXU), renamed property_type_code → project_type_code, updated 21 frontend files + Django backend',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Migration 013 Execution Report',
      path: '/MIGRATION_013_EXECUTION_REPORT.md',
      category: 'Migration',
      description: 'Detailed execution report for Migration 013 - Timeline, verification results, manual tests, server restart procedures, and statistics',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Migration 013 Backend Updates',
      path: '/MIGRATION_013_BACKEND_UPDATES.md',
      category: 'Migration',
      description: 'Django backend changes for Migration 013 - Updated models, serializers, and fixed HTTP 500 errors on multifamily API endpoints',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Migration 013 Tab Routing Fix',
      path: '/MIGRATION_013_TAB_ROUTING_FIX.md',
      category: 'Migration',
      description: 'Tab routing bug fix - LAND projects now correctly show Land Development tabs instead of Income Property tabs',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-11-02'
    },
    {
      title: 'Budget Consolidation Migration',
      path: '/docs/08-migration-history/Budget-Consolidation-Migration-Complete.md',
      category: 'Migration',
      description: 'Complete migration of budget system consolidation',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Schema Naming Convention Analysis',
      path: '/docs/08-migration-history/Schema-Naming-Convention-Analysis.md',
      category: 'Migration',
      description: 'Analysis of database naming conventions',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Schema Coverage Analysis',
      path: '/docs/08-migration-history/Schema-Coverage-Analysis.md',
      category: 'Migration',
      description: 'Complete schema coverage and gap analysis',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Budget-Finance Schema Overlap',
      path: '/docs/08-migration-history/Budget-Finance-Schema-Overlap-Analysis.md',
      category: 'Migration',
      description: 'Analysis of budget and finance schema overlaps',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },

    // Component Documentation
    {
      title: 'Property Analysis UI Implementation',
      path: '/docs/02-features/cre/PROPERTY_ANALYSIS_UI_IMPLEMENTATION.md',
      category: 'Component',
      description: 'Property analysis and CRE calculation UI implementation',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Assumptions UI Implementation',
      path: '/docs/09_session_notes/archive/ASSUMPTIONS_UI_IMPLEMENTATION_SUMMARY.md',
      category: 'Component',
      description: 'Progressive disclosure assumptions UI implementation summary',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Planning Wizard',
      path: '/src/app/components/PlanningWizard/README.md',
      category: 'Component',
      description: 'Visual drag-and-drop land development planning interface',
      icon: <Map className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Parcel Cleanup Documentation',
      path: '/docs/09_session_notes/archive/parcel-cleanup-documentation.md',
      category: 'Component',
      description: 'Parcel data cleanup and migration procedures',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-09-23'
    },
    {
      title: 'Component Migration Plan',
      path: '/docs/09_session_notes/archive/COMPONENT_MIGRATION_PLAN.md',
      category: 'Component',
      description: 'Strategy for component architecture migration',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-09-22'
    },
    {
      title: 'Cleanup Completed',
      path: '/docs/09_session_notes/archive/CLEANUP_COMPLETED.md',
      category: 'Component',
      description: 'Record of completed cleanup tasks',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-09-22'
    },

    // Technical Implementation
    {
      title: 'CRE Calculation Engine',
      path: '/docs/02-features/cre/CRE_CALCULATION_ENGINE_DOCUMENTATION.md',
      category: 'Technical',
      description: 'Commercial real estate calculation engine technical documentation',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Finance Structure API Testing Guide',
      path: '/backend/TESTING_GUIDE.md',
      category: 'Technical',
      description: '3 ways to test Finance Structure APIs - Django Admin, DRF Browsable API, and cURL/HTTP clients with complete examples',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Django Admin Access Guide',
      path: '/backend/ADMIN_ACCESS.md',
      category: 'Technical',
      description: 'Quick start guide for accessing Django admin panel and managing Finance Structure data',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Django Backend README',
      path: '/backend/README.md',
      category: 'Technical',
      description: 'Django backend setup, installation, and development guide with Python engine integration',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Financial App API Documentation',
      path: '/backend/apps/financial/README.md',
      category: 'Technical',
      description: 'Complete Finance Structure API documentation - Budget items, actuals, finance structures, cost allocations, sale settlements, and participation payments',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Containers App API Documentation',
      path: '/backend/apps/containers/README.md',
      category: 'Technical',
      description: 'Container management API documentation - CRUD operations for projects, phases, parcels, buildings, and units',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Calculations App API Documentation',
      path: '/backend/apps/calculations/README.md',
      category: 'Technical',
      description: 'Python financial calculation engine API documentation - Integration with numpy-financial and pandas',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-22'
    },
    {
      title: 'Python Financial Engine',
      path: '/services/financial_engine_py/README.md',
      category: 'Technical',
      description: 'Python financial engine with numpy-financial & pandas - 5-10x faster calculations (IRR, NPV, DSCR, cash flow projections)',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-21'
    },
    {
      title: 'Python Engine Migration Status',
      path: '/services/financial_engine_py/MIGRATION_STATUS.md',
      category: 'Technical',
      description: 'Detailed Python migration tracking - Phase 1 complete with 88% test coverage',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-21'
    },
    {
      title: 'Python Engine Installation Guide',
      path: '/services/financial_engine_py/INSTALLATION_COMPLETE.md',
      category: 'Technical',
      description: 'Quick start guide for Python financial engine - CLI usage, TypeScript integration, testing',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-21'
    },
    {
      title: 'Document Management System (DMS)',
      path: '/docs/02-features/dms/README_DMS_v1.md',
      category: 'Technical',
      description: 'Enterprise DMS with custom attributes, templates, full-text search, and audit trail. Hybrid architecture with JSONB profiles.',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-07'
    },
    {
      title: 'DMS Implementation Status',
      path: '/docs/02-features/dms/DMS-Implementation-Status.md',
      category: 'Technical',
      description: 'Current DMS implementation status and feature completion',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-07'
    },
    {
      title: 'Developer Guide',
      path: '/docs/00-getting-started/DEVELOPER_GUIDE.md',
      category: 'Technical',
      description: 'Complete developer onboarding and setup guide',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Financial Engine Quick Start',
      path: '/docs/00-getting-started/QUICK_START_FINANCIAL_ENGINE.md',
      category: 'Technical',
      description: 'Quick start guide for the financial calculation engine',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },

    // AI & Machine Learning
    {
      title: 'Landscape AI Ingestion Brief',
      path: '/docs/14-specifications/LANDSCAPE_AI_INGESTION_BRIEF.md',
      category: 'AI',
      description: 'AI-powered document understanding model for extracting structured data from real estate offering memoranda, rent rolls, and appraisals',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Assumptions UI Test Checklist',
      path: '/docs/09_session_notes/archive/ASSUMPTIONS_UI_TEST_CHECKLIST.md',
      category: 'AI',
      description: 'Comprehensive testing checklist for assumptions UI',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Validation Summary',
      path: '/docs/07-testing/VALIDATION_SUMMARY.md',
      category: 'AI',
      description: 'Testing and validation summary',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-16'
    }
  ];

  // Sort documents by lastModified in descending order (newest first)
  const sortedDocuments = [...documents].sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  const categories = [
    { id: 'all', label: 'All Documents', count: sortedDocuments.length },
    { id: 'Status', label: 'Status Reports', count: sortedDocuments.filter(d => d.category === 'Status').length },
    { id: 'Architecture', label: 'Architecture', count: sortedDocuments.filter(d => d.category === 'Architecture').length },
    { id: 'Migration', label: 'Migration', count: sortedDocuments.filter(d => d.category === 'Migration').length },
    { id: 'Component', label: 'Components', count: sortedDocuments.filter(d => d.category === 'Component').length },
    { id: 'Technical', label: 'Technical', count: sortedDocuments.filter(d => d.category === 'Technical').length },
    { id: 'AI', label: 'AI & Processing', count: sortedDocuments.filter(d => d.category === 'AI').length }
  ];

  const filteredDocs = sortedDocuments.filter(doc => {
    const matchesSearch = searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      'Status': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Architecture': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Migration': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Component': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Technical': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'AI': 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const handleDocClick = (path: string, title: string) => {
    setSelectedDoc({ path, title });
  };

  return (
    <ProjectProvider>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
        <Navigation activeView="documentation" setActiveView={() => {}} />
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--cui-body-color)' }}>
            <Book className="w-8 h-8" />
            📚 Documentation Center
          </h1>
          <p style={{ color: 'var(--cui-secondary-color)' }}>
            Comprehensive documentation, status reports, and technical specifications
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--cui-secondary-color)' }} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)',
                border: '1px solid'
              }}
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                style={{
                  backgroundColor: selectedCategory === cat.id ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                  color: selectedCategory === cat.id ? 'white' : 'var(--cui-body-color)',
                  borderColor: selectedCategory === cat.id ? 'var(--cui-primary)' : 'var(--cui-border-color)'
                }}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => (
            <button
              key={index}
              onClick={() => handleDocClick(doc.path, doc.title)}
              className="group rounded-lg p-5 text-left transition-all border"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-primary)' }}>
                  {doc.icon}
                </div>
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--cui-secondary-color)' }} />
              </div>

              {/* Title */}
              <h3 className="font-semibold mb-2 transition-colors" style={{ color: 'var(--cui-body-color)' }}>
                {doc.title}
              </h3>

              {/* Description */}
              <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--cui-secondary-color)' }}>
                {doc.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
                <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  {new Date(doc.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* No Results */}
        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No documents found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            {categories.slice(1).map(cat => (
              <div key={cat.id}>
                <div className="text-2xl font-bold text-white">{cat.count}</div>
                <div className="text-sm text-gray-400">{cat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Markdown Viewer Modal */}
        {selectedDoc && (
          <MarkdownViewer
            filePath={selectedDoc.path}
            title={selectedDoc.title}
            onClose={() => setSelectedDoc(null)}
          />
        )}
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
};

export default DocumentationIndex;
