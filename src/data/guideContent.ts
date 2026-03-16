/**
 * Guide Content Data
 *
 * All chapter/section content for the in-app User Guide.
 * Content is data-driven — update this file to change guide text
 * without touching component code.
 *
 * Content sourced from:
 *   docs/00-getting-started/PROJECT_CREATION_QUICKSTART.md
 *   docs/14-specifications/LANDSCAPER_USER_GUIDE.md
 *   docs/14-specifications/LANDSCAPER_ADMIN_USER_MANUAL.md
 *   docs/02-features/dms/README_DMS_v1.md
 *   docs/00-getting-started/LANDSCAPE_USER_GUIDE_MF_OPERATIONS.docx
 */

import type { GuideChapter } from '@/types/guide';

const placeholder = (topic: string): string =>
  `Content for "${topic}" will be written during the content authoring pass. This section covers the key concepts, workflows, and interface elements relevant to ${topic.toLowerCase()}.`;

export const guideChapters: GuideChapter[] = [
  // ─── Group: Getting Started ───────────────────────────────────
  {
    id: '1',
    number: '1',
    title: 'Introduction',
    subtitle: 'Welcome to Landscape',
    group: 'Getting Started',
    sections: [
      {
        id: '1.1',
        title: 'What Landscape Is',
        content: [
          { type: 'prose', text: 'Landscape is an AI-powered real estate analytics platform for land developers, appraisers, and commercial real estate professionals. It combines institutional-grade financial analysis with AI-native document extraction, market intelligence, and a conversational assistant called Landscaper.' },
          { type: 'prose', text: 'The platform is designed around progressive complexity — simple inputs that can grow into detailed, defensible analysis. You can start a deal with a single sentence ("I\'m looking at a 96-unit apartment deal in Tempe") and progressively add detail until you have a full valuation or underwriting package.' },
        ],
      },
      {
        id: '1.2',
        title: 'Two Ways to Get Started',
        content: [
          { type: 'prose', text: 'There are two paths to start a project in Landscape. You can talk to Landscaper — describe your deal in plain English and let the AI build the project for you. Or you can click New Project from the Dashboard and fill out the creation form manually. Both paths end up in the same workspace; choose whichever fits your situation.' },
          { type: 'callout', label: 'Recommended', text: 'If you have an offering memorandum, rent roll, or any deal document, start with Landscaper. Upload the document and let Landscaper extract the key data points. You can always refine later.' },
        ],
      },
    ],
  },
  {
    id: '2',
    number: '2',
    title: 'Creating a Project',
    group: 'Getting Started',
    sections: [
      {
        id: '2.1',
        title: 'Path A: Talk to Landscaper',
        content: [
          { type: 'prose', text: 'Open Landscaper from the top navigation and describe your deal. You can be as brief or detailed as you want.' },
          { type: 'prose', text: 'Brief: "I\'m looking at a 96-unit apartment deal in Tempe."' },
          { type: 'prose', text: 'Detailed: "Let\'s start a new apartment underwriting. Located at 8700 E. Camelback Road in Scottsdale, AZ. 100 units averaging 1,050sf. Average rent $1,500/month. Assume 5% vacancy. Going in cap of 5% with 60% debt at SOFR+3%, 7 year term, 20yr am. GP puts in 10% of equity, 8% pref, 20/80 promote to a 12% hurdle, then 50/50."' },
          { type: 'prose', text: 'Landscaper will parse what you gave it, ask targeted questions about what\'s missing, and build toward a value conclusion — all within the conversation. You don\'t need to fill out any forms, pick any dropdowns, or know how Landscape organizes projects internally.' },
          { type: 'prose', text: 'What Landscaper asks depends on what you provide. If you gave it debt terms, it won\'t ask again. If you said "market-level expenses," it\'ll propose specific numbers and ask you to confirm. If you mentioned a waterfall structure, it\'ll ask about GP fees and disposition costs.' },
          { type: 'callout', label: 'Smart Defaults', text: 'Landscaper won\'t ask about anything you already told it, anything it can look up (current SOFR rate, property tax rates), or what property type it is when you said "apartment."' },
        ],
      },
      {
        id: '2.2',
        title: 'Path B: Create Manually',
        content: [
          { type: 'prose', text: 'Click New Project from the Dashboard. Landscape asks three defining questions that shape your entire workspace, then drops you into the project tabs to enter data directly. This path is faster if you already know exactly what you\'re building and want to get straight to the input forms.' },
          { type: 'screenshot', src: '/guide/images/ch2/create-project.png', alt: 'New Project modal showing property type selection and basic info fields', caption: 'The New Project modal walks you through property type, analysis perspective, and analysis purpose.' },
        ],
      },
      {
        id: '2.3',
        title: 'The Three Defining Questions',
        content: [
          { type: 'prose', text: 'Whether Landscaper infers them from your description or you pick them from a form, every project is defined by three choices:' },
          { type: 'table', headers: ['Question', 'Options', 'What It Controls'], rows: [
            ['What is it? (Property Type)', 'Land, Multifamily, Office, Retail, Industrial', 'Data fields, container labels, extraction templates'],
            ['How are you looking at it? (Perspective)', 'Investment or Development', 'Financial model framework (NOI/cap rates vs. dev costs/absorption)'],
            ['Why are you analyzing it? (Purpose)', 'Valuation or Underwriting', 'Workspace tabs (valuation approaches vs. returns/capital structure)'],
          ]},
          { type: 'prose', text: 'These choices control which workspace tabs appear. Valuation purpose gives you a focused workspace with the three approaches to value. Underwriting adds financial structuring tools (Capitalization, Returns). Development perspective adds the budget. All choices can be changed later without losing data.' },
        ],
      },
      {
        id: '2.4',
        title: 'Project Home Overview',
        content: [
          { type: 'prose', text: 'Once a project exists, you land in the project workspace. From here you have three ways to add data: upload documents (Landscaper extracts structured data automatically), talk to Landscaper (ask questions, provide assumptions, request analysis), or enter data manually into any tab. All three methods feed the same underlying project data — mix and match however you work best.' },
          { type: 'screenshot', src: '/guide/images/ch2/project-home.png', alt: 'Project home page showing folder tabs and summary cards', caption: 'The project home page with folder-tab navigation and KPI summary cards.' },
          { type: 'callout', label: 'Nothing is Permanent', text: 'Your Perspective and Purpose choices can be changed anytime in the project profile. Landscape adjusts the visible tabs instantly. No data is lost when you switch — switching from Underwriting to Valuation hides the Capitalization tab but doesn\'t delete your debt and equity assumptions. Switch back and they\'re still there.' },
        ],
      },
    ],
  },
  {
    id: '3',
    number: '3',
    title: 'Platform Overview',
    subtitle: 'Navigation, layout, and core concepts',
    group: 'Getting Started',
    sections: [
      {
        id: '3.1',
        title: 'Workspace Tabs',
        content: [
          { type: 'prose', text: 'The project workspace uses an ARGUS-style folder tab layout. Eight top-level folders organize your project. The first two (Project, Property) and last three (Reports, Documents, Map) are always visible. The middle three change based on property category and analysis type.' },
          { type: 'prose', text: 'For income properties (Multifamily, Office, Retail, Industrial, Hotel, Mixed Use), the middle folders are Operations, Valuation, and Capitalization. For land development, they become Development/Sales, Feasibility/Valuation, and Capitalization. Capitalization only appears for Underwriting projects — appraisals hide it.' },
          { type: 'table', headers: ['Folder', 'Income Property', 'Land Development', 'Notes'], rows: [
            ['Project', 'Always', 'Always', 'Project profile, map, financial summary, contacts'],
            ['Property', 'Always', 'Always', 'Income: Location, Market, Details, Rent Roll, Renovation, Acquisition. Land: Market, Land Use, Parcels, Acquisition. Acquisition hidden for Valuation purpose.'],
            ['Operations', 'Always', '—', 'Single P&L page, no sub-tabs'],
            ['Development / Sales', '—', 'Always', 'Sub-tabs: Budget, Sales'],
            ['Valuation', 'Always', '—', 'Sub-tabs: Sales Comparison, Cost Approach, Income Approach, Reconciliation'],
            ['Feasibility / Valuation', '—', 'Always', 'Sub-tabs: Cash Flow, Returns, Sensitivity'],
            ['Capitalization', 'Underwriting only', 'Underwriting only', 'Sub-tabs: Debt, Equity. Hidden for Valuation purpose.'],
            ['Reports', 'Always', 'Always', 'Collapsible report panels'],
            ['Documents', 'Always', 'Always', 'Sub-tabs: Documents (DMS), Intelligence (Knowledge/RAG)'],
            ['Map', 'Always', 'Always', 'Unified spatial hub, no sub-tabs'],
          ]},
        ],
      },
      {
        id: '3.2',
        title: 'Three-Panel Layout',
        content: [
          { type: 'prose', text: 'Most workspace pages follow a macro-to-micro layout: summary cards at the top showing KPIs and totals, detail tables in the middle with filterable data grids, and individual records accessible via modals or drawers for editing. This pattern keeps you oriented — you always know the big picture while drilling into specifics.' },
        ],
      },
      {
        id: '3.3',
        title: 'Property Types and Containers',
        content: [
          { type: 'prose', text: 'Landscape uses a universal container system that adapts its labels to your property type. The same hierarchical tree structure works across all property types — only the naming changes.' },
          { type: 'table', headers: ['Property Type', 'Level 1', 'Level 2', 'Level 3'], rows: [
            ['Land Dev', 'Area', 'Phase', 'Parcel'],
            ['Multifamily', 'Building', 'Floor', 'Unit'],
            ['Office', 'Building', 'Floor', 'Suite'],
            ['Retail', 'Building', 'Wing', 'Bay'],
            ['Industrial', 'Building', 'Dock', 'Bay'],
          ]},
        ],
      },
    ],
  },

  // ─── Group: Landscaper AI ─────────────────────────────────────
  {
    id: '4',
    number: '4',
    title: 'Introduction to Landscaper',
    subtitle: 'Your AI-powered project assistant',
    group: 'Landscaper AI',
    sections: [
      {
        id: '4.1',
        title: 'What Landscaper Is',
        content: [
          { type: 'prose', text: 'Landscaper is the AI assistant built into every Landscape workspace. It helps you pull key information from documents, track activity, answer questions about your project, and make changes to project data — all through natural conversation.' },
          { type: 'callout', label: 'Key Concept', text: 'Landscaper is a persistent assistant that lives alongside every project. It has deep knowledge of your project data, uploaded documents, and market context. It can both answer questions and take actions on your behalf — with your confirmation before any data changes.' },
        ],
      },
      {
        id: '4.2',
        title: 'Where You\'ll Find It',
        content: [
          { type: 'prose', text: 'Landscaper appears in three places: the project workspace (the panel sits next to your project data on every tab), the admin modal (a Landscaper tab for configuring extraction rules), and the new project flow (a dropzone that can prefill project fields from a document).' },
          { type: 'screenshot', src: '/guide/images/chapter-04-landscaper/panel-open.png', alt: 'Landscaper chat panel open in the left sidebar', caption: 'Landscaper lives in a collapsible left panel, always available while you work.' },
        ],
      },
      {
        id: '4.3',
        title: 'Five Core Capabilities',
        content: [
          { type: 'prose', text: 'Landscaper has over 200 registered tools organized around five core capabilities:' },
          { type: 'table', headers: ['Capability', 'Description', 'Example'], rows: [
            ['Query', 'Ask questions about your project data', '"What is the average lot size in Area 2?"'],
            ['Extract', 'Pull structured data from uploaded documents', '"Extract the rent roll from this PDF"'],
            ['Analyze', 'Run calculations and comparisons', '"Compare NOI across my three scenarios"'],
            ['Mutate', 'Make changes to project data with confirmation', '"Update the cap rate to 5.25%"'],
            ['Advise', 'Get recommendations based on market data', '"Does this vacancy rate seem reasonable?"'],
          ]},
        ],
      },
      {
        id: '4.4',
        title: 'Recommended Workflow',
        content: [
          { type: 'prose', text: 'The most productive workflow with Landscaper follows a pattern: upload your documents first (offering memorandum, rent roll, T-12, appraisal), let Landscaper extract the data, review and approve the extractions in the Ingestion Workbench, then use the chat to ask questions, refine assumptions, and run analysis on the populated project.' },
          { type: 'prose', text: 'You don\'t have to follow this order — you can enter data manually and use Landscaper purely for analysis. But starting with document ingestion means Landscaper has richer context for every subsequent conversation.' },
        ],
      },
    ],
  },
  {
    id: '5',
    number: '5',
    title: 'Document Management System',
    subtitle: 'Upload, classify, and organize project documents',
    group: 'Landscaper AI',
    sections: [
      {
        id: '5.1',
        title: 'What the DMS Is',
        content: [
          { type: 'prose', text: 'The Document Management System (DMS) provides enterprise-grade document management for your projects. It supports custom metadata attributes, document type templates, full-text search with faceted filtering, and a complete audit trail for all profile changes.' },
        ],
      },
      {
        id: '5.2',
        title: 'Document Scope — Upload Everything',
        content: [
          { type: 'prose', text: 'Upload everything you have for a deal — offering memorandums, rent rolls, T-12 operating statements, appraisals, leases, surveys, environmental reports, tax records. Landscaper can extract structured data from all of these, and having more context makes its analysis more accurate.' },
          { type: 'callout', label: 'Tip', text: 'PDFs work best for extraction. Images (JPEG/PNG) are supported. Word and Excel files should be converted to PDF first for optimal extraction results.' },
          { type: 'table', headers: ['File Type', 'Max Size', 'Extraction Support'], rows: [
            ['PDF', '32 MB', 'Full extraction (native text only in alpha)'],
            ['Word (.doc, .docx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
            ['Excel (.xls, .xlsx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
            ['Images (.jpg, .png)', '8 MB', 'Basic extraction supported'],
            ['Text (.txt, .csv)', '4 MB', 'Upload and storage'],
          ]},
        ],
      },
      {
        id: '5.3',
        title: 'Navigating the DMS',
        content: [
          { type: 'prose', text: 'The Documents tab shows all uploaded documents for the current project. Use the search box for full-text queries and apply filters in the sidebar by document type, status, priority, or tags. Click any document row to view its details in the right panel.' },
          { type: 'screenshot', src: '/guide/images/chapter-05-dms/dms-overview.png', alt: 'DMS tab showing document list with classification badges and action buttons', caption: 'The DMS tab displays all uploaded documents with classification, status, and quick actions.' },
        ],
      },
      {
        id: '5.4',
        title: 'Uploading Documents',
        content: [
          { type: 'prose', text: 'Navigate to the Documents tab, then drag files into the upload zone or click to select files. After upload completes, click an uploaded file in the queue and fill the required profile fields in the right panel. Click Save Profile to complete the upload.' },
          { type: 'prose', text: 'When you upload a document, Landscape presents an intake choice: you can send the document through Structured Ingestion (which opens the Ingestion Workbench for AI-powered data extraction) or simply store it in the DMS without extraction.' },
        ],
      },
      {
        id: '5.5',
        title: 'Document Classification',
        content: [
          { type: 'prose', text: 'Every document is assigned a type (e.g., Offering Memorandum, Rent Roll, T-12, Appraisal) that determines which extraction templates Landscaper uses. Classification happens automatically during upload based on content analysis, but you can override it manually from the document profile.' },
        ],
      },
      {
        id: '5.6',
        title: 'Document Profiles',
        content: [
          { type: 'prose', text: 'Each document has a profile — a set of metadata fields defined by the document type template. Profiles can include standard fields (name, type, date, status) and custom attributes configured by your administrator. All profile changes are tracked in the audit log for compliance.' },
        ],
      },
      {
        id: '5.7',
        title: 'Organizing with Tags',
        content: [
          { type: 'prose', text: 'Apply tags to documents for cross-cutting organization that goes beyond type-based classification. Tags are free-form and filterable from the sidebar. Common patterns include tagging by deal phase ("Due Diligence", "Closing"), source ("Broker", "Seller", "Public Record"), or priority ("Review Needed", "Final").' },
        ],
      },
      {
        id: '5.8',
        title: 'Document Versioning',
        content: [
          { type: 'prose', text: 'When you upload a revised version of an existing document, the DMS preserves the original and links the new version to the same document record. Previous versions remain accessible through the version history panel. Extracted data is tied to the specific version that produced it.' },
        ],
      },
      {
        id: '5.9',
        title: 'Deleting Documents',
        content: [
          { type: 'prose', text: 'Documents can be soft-deleted from the DMS. Deleted documents are hidden from the default view but remain in the database for audit purposes. If a document was processed through the Ingestion Workbench, deleting it also cleans up associated staging records and uploaded files.' },
        ],
      },
      {
        id: '5.10',
        title: 'Scanned Documents and OCR',
        content: [
          { type: 'callout', label: 'Alpha Limitation', text: 'Scanned PDF support (OCR) is not available in the alpha release. Extraction will return empty results for scanned documents. Native (text-based) PDFs work correctly. If you have scanned documents, convert them to searchable PDFs using a tool like Adobe Acrobat before uploading.' },
        ],
      },
    ],
  },
  {
    id: '6',
    number: '6',
    title: 'Ingestion Workbench',
    subtitle: 'Review and commit AI-extracted data',
    group: 'Landscaper AI',
    sections: [
      {
        id: '6.1',
        title: 'What the Ingestion Workbench Is',
        content: [
          { type: 'prose', text: 'The Ingestion Workbench is a split-panel modal where you review data that Landscaper extracted from an uploaded document before committing it to your project. The left panel shows a Landscaper chat with ingestion-specific tools; the right panel shows a field-by-field review table organized by category.' },
          { type: 'screenshot', src: '/guide/images/chapter-06-ingestion/workbench-overview.png', alt: 'Ingestion Workbench split panel showing Landscaper chat on left and field review table on right', caption: 'The Ingestion Workbench: Landscaper chat (left) and field review table (right).' },
        ],
      },
      {
        id: '6.2',
        title: 'Opening the Workbench',
        content: [
          { type: 'prose', text: 'When you drop a file, Landscape presents an Intake Choice modal. Select "Structured Ingestion" to upload the file and open the Workbench. The file uploads immediately, extraction begins in the background, and the Workbench opens with fields populating as they\'re extracted.' },
          { type: 'prose', text: 'Canceling the Workbench (via X or the cancel button) abandons the session — staging rows are rejected, the uploaded file is deleted, and the document record is soft-deleted. No partial data reaches your project.' },
        ],
      },
      {
        id: '6.3',
        title: 'The Field Review Table',
        content: [
          { type: 'prose', text: 'The right panel shows every extracted field with its value, source snippet from the document, and current status. Fields are organized into tabs that vary by property type — for multifamily: Project, Property, Operations, Valuation, and All.' },
          { type: 'table', headers: ['Status', 'Color', 'Meaning'], rows: [
            ['Accepted', 'Green', 'Value confirmed and ready to commit'],
            ['Pending', 'Yellow', 'Extracted but not yet reviewed'],
            ['Conflict', 'Orange', 'Extracted value differs from existing project data'],
            ['Waiting', 'Gray', 'Extraction in progress'],
            ['Empty', 'Light Gray', 'No value extracted for this field'],
          ]},
          { type: 'prose', text: 'Each tab shows a badge with the count of fields in that category. Review fields from Pending to Accepted by clicking the checkmark, or edit the value inline before accepting.' },
        ],
      },
      {
        id: '6.4',
        title: 'Resolving Conflicts',
        content: [
          { type: 'prose', text: 'A conflict occurs when the extracted value differs from a value already in your project. The field row shows both the existing value and the newly extracted value side by side. You choose which to keep — accept the new extraction, keep the existing value, or edit to a different value entirely.' },
        ],
      },
      {
        id: '6.5',
        title: 'The Workbench Chat',
        content: [
          { type: 'prose', text: 'The left panel is a Landscaper chat with five ingestion-specific tools. You can ask Landscaper to explain an extraction ("Why did it extract $1,500 for average rent?"), update a staging field, approve or reject fields, or get a summary of what\'s been extracted so far. The chat sees the live state of the field review table.' },
        ],
      },
      {
        id: '6.6',
        title: 'Committing Extractions',
        content: [
          { type: 'prose', text: 'When you\'re satisfied with the reviewed fields, click Commit to write all accepted values to your project. Fields left in Pending status are also committed. Fields you explicitly rejected are skipped. After commit, the Workbench closes and the DMS record is created for the uploaded document.' },
        ],
      },
    ],
  },
  {
    id: '7',
    number: '7',
    title: 'Chat Interface',
    subtitle: 'Conversing with Landscaper',
    group: 'Landscaper AI',
    sections: [
      {
        id: '7.1',
        title: 'The Chat Interface',
        content: [
          { type: 'prose', text: 'The Landscaper chat panel persists messages and returns assistant responses within the context of your current project and page. Chat history is preserved and reloads (last 100 messages) when you return to a project. The panel is page-aware — Landscaper knows which tab you\'re on and adjusts its responses accordingly.' },
        ],
      },
      {
        id: '7.2',
        title: 'Asking Questions About Your Project',
        content: [
          { type: 'prose', text: 'You can ask Landscaper about any data in your project. It has access to all project tables, financial calculations, container hierarchy, and uploaded documents. Questions can be broad ("Give me a summary of this deal") or specific ("What\'s the per-unit operating expense in the T-12?").' },
          { type: 'prose', text: 'Landscaper can also make changes to project data. When you say "Set vacancy to 7%" or "Update the cap rate to 5.25%", Landscaper proposes the mutation and waits for your confirmation before writing to the database. You always see exactly what will change before it happens.' },
        ],
      },
      {
        id: '7.3',
        title: 'Asking Questions About Documents',
        content: [
          { type: 'prose', text: 'Landscaper can answer questions about uploaded documents using RAG (retrieval-augmented generation). Ask "What does the rent roll say about unit mix?" or "Summarize the key assumptions in this OM" and Landscaper will search the document content and respond with cited answers.' },
        ],
      },
      {
        id: '7.4',
        title: 'Property-Type Expertise',
        content: [
          { type: 'prose', text: 'Landscaper adapts its expertise to your property type. For multifamily projects, it understands rent rolls, unit mixes, NOI, and cap rates. For land development, it speaks in terms of lot yields, absorption schedules, development budgets, and residual land value. It uses the correct terminology and calculation methods for your deal type.' },
        ],
      },
    ],
  },
  {
    id: '8',
    number: '8',
    title: 'Assumption Validation',
    subtitle: 'How Landscaper checks your work',
    group: 'Landscaper AI',
    sections: [
      {
        id: '8.1',
        title: 'How Landscaper Validates Assumptions',
        content: [
          { type: 'prose', text: 'Landscaper continuously compares your project assumptions against market data, extracted document values, and internal consistency checks. When it detects a variance above a configurable threshold (default 0-50%), it surfaces an advice item in the right-side panel.' },
        ],
      },
      {
        id: '8.2',
        title: 'The Advice Panel',
        content: [
          { type: 'prose', text: 'The advice panel displays alongside the chat interface and lists variance items when available. Each item shows the field in question, the current value, the reference value (market data or document source), and the percentage variance. Items are ordered by severity.' },
        ],
      },
      {
        id: '8.3',
        title: 'Acting on Advice',
        content: [
          { type: 'prose', text: 'You can act on advice directly from the panel — click to navigate to the relevant field, or ask Landscaper in chat to explain the variance further. Landscaper can also update the value for you if you agree with the suggested adjustment. Advice items are informational, not mandatory — you may have good reasons to deviate from market.' },
        ],
      },
    ],
  },
  {
    id: '9',
    number: '9',
    title: 'Activity Feed',
    subtitle: 'Tracking Landscaper actions and extractions',
    group: 'Landscaper AI',
    sections: [
      {
        id: '9.1',
        title: 'What the Feed Shows',
        content: [
          { type: 'prose', text: 'The activity feed highlights what Landscaper has found or changed in your project. Items include document extractions, data mutations, advice generated, and system events. The feed refreshes automatically every 60 seconds and shows unread counts.' },
        ],
      },
      {
        id: '9.2',
        title: 'Navigating from the Feed',
        content: [
          { type: 'prose', text: 'Click any activity item to navigate to the related page and field. If a field is highlighted, Landscape scrolls to it and applies a visual highlight so you can verify the change in context. Clicking an item also marks it as read.' },
        ],
      },
    ],
  },

  // ─── Group: Multifamily Workflows ─────────────────────────────
  {
    id: '10',
    number: '10',
    title: 'Property Setup',
    subtitle: 'Configuring a multifamily project',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '10.1',
        title: 'Property Details',
        content: [
          { type: 'prose', text: placeholder('Property Details') },
        ],
      },
      {
        id: '10.2',
        title: 'Unit Mix Setup',
        content: [
          { type: 'prose', text: placeholder('Unit Mix Setup') },
          { type: 'screenshot', src: '/guide/images/chapter-10-property-setup/unit-mix.png', alt: 'Unit mix table showing unit types, counts, and square footages', caption: 'The unit mix table defines your property\'s unit types and counts.' },
        ],
      },
    ],
  },
  {
    id: '11',
    number: '11',
    title: 'Rent Roll',
    subtitle: 'Unit-level lease and rent data',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '11.1',
        title: 'Unit-Level Lease Data',
        content: [{ type: 'prose', text: placeholder('Unit-Level Lease Data') }],
      },
      {
        id: '11.2',
        title: 'Rent Roll Extraction',
        content: [{ type: 'prose', text: placeholder('Rent Roll Extraction') }],
      },
    ],
  },
  {
    id: '12',
    number: '12',
    title: 'Operations',
    subtitle: 'The unified operating statement',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '12.1',
        title: 'The Unified Operating Statement',
        content: [
          { type: 'prose', text: 'The Operations tab is the financial nerve center of a multifamily project. It presents a unified operating statement — a single grid that combines rental income, vacancy and loss deductions, and operating expenses into one continuous P&L view. Unlike traditional tools that scatter income and expense inputs across separate screens, Landscape keeps everything in one place so you can see the full picture from Gross Potential Rent down to Net Operating Income without switching tabs.' },
          { type: 'prose', text: 'The Operations tab does not exist in isolation. Rental income and occupancy data flow into it from the Property tab\'s Rent Roll. This means the Rent Roll is the single source of truth for unit-level rents — the Operations tab displays that income as read-only, calculated from actual unit data. Operating expenses can be populated by document ingestion (from a T-12 or offering memorandum) or entered manually. All values ultimately feed downstream into the Income Approach on the Valuation tab.' },
        ],
      },
      {
        id: '12.2',
        title: 'Three NOI Bases',
        content: [
          { type: 'prose', text: 'Landscape calculates NOI across three distinct bases, each occupying its own column in the grid for side-by-side comparison without duplicating data entry:' },
          { type: 'table', headers: ['NOI Basis', 'Description'], rows: [
            ['F-12 Current', 'Trailing twelve months at current contract rents'],
            ['F-12 Market', 'Trailing twelve months re-stated at market rents'],
            ['Stabilized', 'Projected stabilized performance at target occupancy'],
          ]},
        ],
      },
      {
        id: '12.3',
        title: 'Operating Income',
        content: [
          { type: 'prose', text: 'The top section displays rental income. These values are read-only on the Operations tab because they are calculated from the Rent Roll on the Property tab. You\'ll see a lock icon next to each rental income line item, indicating the value is sourced from unit-level data.' },
          { type: 'prose', text: 'Gross Potential Rent (GPR) is the total rent the property would generate if every unit were leased at its current contract rent — calculated automatically by summing (monthly rent × 12) across all units. Loss to Lease shows the difference between market rent and contract rent for each occupied unit. Other Income covers non-rental items such as parking, laundry, pet fees, or utility reimbursements.' },
          { type: 'callout', label: 'Editing Income', text: 'To edit rental income figures, navigate to the Property tab\'s Rent Roll and update the unit-level rents there. Changes flow automatically into the Operations tab.' },
        ],
      },
      {
        id: '12.4',
        title: 'Vacancy and Loss',
        content: [
          { type: 'prose', text: 'Below Operating Income, the vacancy section shows all deductions from gross revenue. Landscape supports multiple vacancy and loss line items, each as a percentage of GPR: Physical Vacancy (unleased units — calculated automatically from occupancy data when a Rent Roll exists), Economic Vacancy (occupied-but-non-paying units), Concessions (rent discounts and free-rent periods), and Bad Debt / Collection Loss.' },
          { type: 'prose', text: 'When a Rent Roll is present, physical vacancy is calculated from actual unit occupancy data and displayed with a lock icon. Clicking the lock overrides the calculated value and lets you enter a manual vacancy percentage — useful when you believe the current vacancy snapshot is not representative of stabilized performance.' },
        ],
      },
      {
        id: '12.5',
        title: 'Operating Expenses',
        content: [
          { type: 'prose', text: 'Operating expenses occupy the bottom portion of the grid, organized into parent categories (Taxes, Insurance, Utilities, Repairs & Maintenance, Management, Other) with child line items underneath. Category filter pills at the top let you isolate a single category for focused review.' },
          { type: 'prose', text: 'Expense values are entered in the $/Unit column. When you change a per-unit value, the Annual Total recalculates immediately ($/Unit × unit count). The $/SF column also updates in real time. You can drag expense line items between categories, add new items via the "+" button, or double-click any row\'s label to reassign its category from a dropdown.' },
          { type: 'subsection', number: '12.5.1', title: 'Data Provenance Icons', blocks: [
            { type: 'prose', text: 'Landscape tracks where every value came from. Ingested values display a lock icon (source-backed), manually entered values display an input icon, and overridden extractions display an input icon that can revert to the original. This transparency helps distinguish between values extracted from documents and your own assumptions — critical for audit trails and USPAP compliance.' },
            { type: 'table', headers: ['Icon', 'State', 'Click Behavior'], rows: [
              ['Lock', 'Ingested from document', 'Breaks document link, switches to manual entry'],
              ['Input', 'User-entered', 'No action (no extracted value to revert to)'],
              ['Input', 'User-modified (was extracted)', 'Reverts to original extracted value (confirms if >10% difference)'],
            ]},
          ]},
          { type: 'subsection', number: '12.5.2', title: 'Working with Ingested Data', blocks: [
            { type: 'prose', text: 'After ingesting a T-12 or offering memorandum, review the Operations tab by scanning the lock icons to see which fields were populated. Verify key figures against the source document, override where needed by clicking the lock, add missing items, then check the NOI row at the bottom. Fields you have manually overridden will not be silently replaced if you ingest a second document — you\'ll be prompted to accept or reject each conflict.' },
          ]},
        ],
      },
    ],
  },
  {
    id: '13',
    number: '13',
    title: 'Valuation',
    subtitle: 'Three approaches to value',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '13.1',
        title: 'Sales Comparison Approach',
        content: [{ type: 'prose', text: placeholder('Sales Comparison Approach') }],
      },
      {
        id: '13.2',
        title: 'Cost Approach',
        content: [{ type: 'prose', text: placeholder('Cost Approach') }],
      },
      {
        id: '13.3',
        title: 'Income Approach',
        content: [
          { type: 'prose', text: 'The Income Approach derives value from the property\'s operating income using Direct Capitalization and Discounted Cash Flow (DCF) methods. The 3-column P&L reflects the three NOI bases (F-12 Current, F-12 Market, Stabilized) with visibility toggles. The value tiles — three Direct Cap tiles plus a DCF tile — each derive their NOI from the corresponding Operations tab column. Changes to operating assumptions are reflected in real time.' },
        ],
      },
      {
        id: '13.4',
        title: 'Reconciliation',
        content: [
          { type: 'prose', text: placeholder('Reconciliation') },
          { type: 'callout', label: 'Alpha Note', text: 'The Reconciliation frontend is in development. The backend API for weight-based reconciliation with narrative versioning is complete.' },
        ],
      },
    ],
  },
  {
    id: '14',
    number: '14',
    title: 'Capitalization',
    subtitle: 'Equity, debt, and waterfall',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '14.1',
        title: 'Equity Partners',
        content: [{ type: 'prose', text: placeholder('Equity Partners') }],
      },
      {
        id: '14.2',
        title: 'Debt Facilities',
        content: [{ type: 'prose', text: placeholder('Debt Facilities') }],
      },
      {
        id: '14.3',
        title: 'Waterfall',
        content: [{ type: 'prose', text: placeholder('Waterfall') }],
      },
    ],
  },

  // ─── Group: Land Development Workflows ────────────────────────
  {
    id: '15',
    number: '15',
    title: 'Project Setup',
    subtitle: 'Configuring a land development project',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '15.1',
        title: 'Land Use Taxonomy',
        content: [
          { type: 'prose', text: 'Every land development project in Landscape is organized by a three-level land use taxonomy: Family (e.g., Residential), Type (e.g., Single Family), and Product (e.g., 50\' Lot). This taxonomy drives lot pricing, absorption schedules, and budget rollups across the project.' },
          { type: 'table', headers: ['Level', 'Example', 'Purpose'], rows: [
            ['Family', 'Residential', 'Top-level land use category'],
            ['Type', 'Single Family', 'Sub-category within the family'],
            ['Product', '50\' Lot', 'Specific product with pricing and absorption'],
          ]},
        ],
      },
      {
        id: '15.2',
        title: 'Parcel Inventory',
        content: [{ type: 'prose', text: placeholder('Parcel Inventory') }],
      },
      {
        id: '15.3',
        title: 'Planning Hierarchy',
        content: [{ type: 'prose', text: placeholder('Planning Hierarchy') }],
      },
    ],
  },
  {
    id: '16',
    number: '16',
    title: 'Budget',
    subtitle: 'Cost categories, line items, and scheduling',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '16.1',
        title: 'Cost Categories',
        content: [{ type: 'prose', text: placeholder('Cost Categories') }],
      },
      {
        id: '16.2',
        title: 'Line Items and Draw Schedule',
        content: [{ type: 'prose', text: placeholder('Line Items and Draw Schedule') }],
      },
      {
        id: '16.3',
        title: 'Absorption Schedule',
        content: [{ type: 'prose', text: placeholder('Absorption Schedule') }],
      },
    ],
  },
  {
    id: '17',
    number: '17',
    title: 'Feasibility',
    subtitle: 'Residual land value and return metrics',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '17.1',
        title: 'Residual Land Value',
        content: [{ type: 'prose', text: placeholder('Residual Land Value') }],
      },
      {
        id: '17.2',
        title: 'Cash Flow Projections',
        content: [{ type: 'prose', text: placeholder('Cash Flow Projections') }],
      },
      {
        id: '17.3',
        title: 'Return Metrics',
        content: [{ type: 'prose', text: placeholder('Return Metrics') }],
      },
    ],
  },
  {
    id: '18',
    number: '18',
    title: 'Capitalization',
    subtitle: 'Equity, construction loans, and waterfall',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '18.1',
        title: 'Equity Partners',
        content: [{ type: 'prose', text: placeholder('Equity Partners') }],
      },
      {
        id: '18.2',
        title: 'Construction Loan',
        content: [{ type: 'prose', text: placeholder('Construction Loan') }],
      },
      {
        id: '18.3',
        title: 'Waterfall',
        content: [{ type: 'prose', text: placeholder('Waterfall') }],
      },
    ],
  },

  // ─── Group: Administration ────────────────────────────────────
  {
    id: '19',
    number: '19',
    title: 'DMS Administration',
    subtitle: 'Profile templates and extraction mappings',
    group: 'Administration',
    sections: [
      {
        id: '19.1',
        title: 'Profile Templates',
        content: [
          { type: 'prose', text: 'Profile templates define which metadata fields are required or optional for each document type. Navigate to Documents (DMS) > Document Templates to create or edit templates. Enter a template name, optionally filter by doc type, and drag attributes from the Available pool into Required or Optional columns. Set the display order with up/down arrows and save.' },
          { type: 'prose', text: 'To manage the attributes themselves, go to Documents (DMS) > Manage Attributes. Each attribute has a display name, key (auto-generated), data type (text, number, date, boolean, currency, enum, lookup, tags, or JSON), and optional settings for required/searchable. For enum types, add dropdown values in the Options field.' },
        ],
      },
      {
        id: '19.2',
        title: 'Extraction Mappings',
        content: [
          { type: 'prose', text: 'The AI Extraction Mappings panel (found in System Administration > Landscaper tab) controls how extracted document fields map into database tables. You can search and filter mappings by document type, target table, confidence level, or status.' },
          { type: 'table', headers: ['Column', 'Description'], rows: [
            ['Active', 'Enable/disable the mapping'],
            ['Doc Type', 'Document type badge (OM, RENT_ROLL, T12, APPRAISAL)'],
            ['Pattern', 'Source label from the document, with aliases shown below'],
            ['Target', 'Database table.field plus transform rule if configured'],
            ['Confidence', 'High, Medium, or Low badge'],
            ['Actions', 'Edit or Delete (Delete hidden for system mappings)'],
          ]},
          { type: 'prose', text: 'Use this panel when a label in documents changes (e.g., "Year Built" becomes "Construction Year"), when you want to map a new field into the database, or when reviewing low-confidence mappings that need attention. Toggle the Stats button to see usage data: how many times each mapping has been triggered and its write success rate.' },
        ],
      },
    ],
  },
  {
    id: '20',
    number: '20',
    title: 'Workspace Settings',
    group: 'Administration',
    sections: [],
  },

  // ─── Group: Appendix ─────────────────────────────────────────
  {
    id: 'A',
    number: 'A',
    title: 'Landscaper Quick Reference',
    group: 'Appendix',
    sections: [
      {
        id: 'A.1',
        title: 'Common Commands',
        content: [
          { type: 'table', headers: ['What You Want', 'What to Say'], rows: [
            ['Get a deal summary', '"Give me a summary of this deal"'],
            ['Update a value', '"Set vacancy to 7%" or "Update the cap rate to 5.25%"'],
            ['Ask about documents', '"What does the rent roll say about unit mix?"'],
            ['Run a calculation', '"What\'s the DSCR at these debt terms?"'],
            ['Sensitivity analysis', '"Run a sensitivity on exit cap rate from 5% to 6%"'],
            ['Cross-check data', '"Any missing data I should check?"'],
            ['Send feedback', 'Include "#FB" in any message (e.g., "#FB the map is slow")'],
          ]},
        ],
      },
    ],
  },
  {
    id: 'B',
    number: 'B',
    title: 'Document Type Reference',
    group: 'Appendix',
    sections: [
      {
        id: 'B.1',
        title: 'Supported Document Types',
        content: [
          { type: 'table', headers: ['Type', 'Code', 'Typical Content'], rows: [
            ['Offering Memorandum', 'OM', 'Property summary, financials, rent roll, market overview'],
            ['Rent Roll', 'RENT_ROLL', 'Unit-level lease data: unit number, type, rent, status, dates'],
            ['T-12 Operating Statement', 'T12', 'Trailing 12-month income and expense actuals'],
            ['Appraisal', 'APPRAISAL', 'Property valuation with three approaches to value'],
            ['Survey', 'SURVEY', 'Land survey, boundary, easements, legal description'],
            ['Environmental', 'ENVIRONMENTAL', 'Phase I/II environmental site assessment'],
            ['Tax Record', 'TAX', 'Property tax assessment, millage rates, payment history'],
            ['Lease', 'LEASE', 'Individual lease agreement'],
          ]},
        ],
      },
    ],
  },
  {
    id: 'C',
    number: 'C',
    title: 'Field Status Reference',
    group: 'Appendix',
    sections: [
      {
        id: 'C.1',
        title: 'Ingestion Field Statuses',
        content: [
          { type: 'table', headers: ['Status', 'Color', 'Meaning', 'Action'], rows: [
            ['Accepted', 'Green', 'Value confirmed', 'Ready to commit'],
            ['Pending', 'Yellow', 'Extracted, not reviewed', 'Click checkmark to accept'],
            ['Conflict', 'Orange', 'Differs from existing data', 'Choose which value to keep'],
            ['Waiting', 'Gray', 'Extraction in progress', 'Wait for completion'],
            ['Empty', 'Light Gray', 'Nothing extracted', 'Enter manually or skip'],
          ]},
        ],
      },
      {
        id: 'C.2',
        title: 'Data Provenance Icons',
        content: [
          { type: 'table', headers: ['Icon', 'State', 'Meaning', 'Click Behavior'], rows: [
            ['Lock', 'Ingested', 'Value from uploaded document', 'Break link, switch to manual entry'],
            ['Input', 'User-entered', 'Manually entered by user', 'No action'],
            ['Input', 'User-modified', 'Was extracted, then overridden', 'Revert to original extraction'],
          ]},
        ],
      },
    ],
  },
  {
    id: 'D',
    number: 'D',
    title: 'Alpha Known Limitations',
    group: 'Appendix',
    sections: [
      {
        id: 'D.1',
        title: 'Current Limitations',
        content: [
          { type: 'table', headers: ['Area', 'Limitation', 'Workaround'], rows: [
            ['Scanned PDFs', 'OCR not implemented — extraction returns empty on scanned documents', 'Convert to searchable PDF using Adobe Acrobat before uploading'],
            ['Reconciliation', 'Frontend is a placeholder — backend API is complete', 'Use Landscaper chat to set reconciliation weights'],
            ['Reports', 'Hardcoded to a single project; no PDF generation', 'Export from individual tabs as needed'],
            ['Waterfall', 'Calculate endpoint returns 404', 'Use the financial engine directly via Landscaper'],
            ['Source Page Numbers', 'Extraction pipeline does not track which page a value was found on', 'Reference the source document manually'],
            ['Value-Add Toggle', 'Post-reno columns in Operations hidden by default', 'Enable via project profile settings'],
          ]},
        ],
      },
    ],
  },
];

/** All unique group labels in display order */
export const guideGroups: string[] = [
  'Getting Started',
  'Landscaper AI',
  'Multifamily Workflows',
  'Land Development Workflows',
  'Administration',
  'Appendix',
];
