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
    title: 'Document Management & Intelligence',
    subtitle: 'Upload, profile, extract, and commit',
    group: 'Landscaper AI',
    sections: [
      {
        id: '5.0',
        title: 'Overview',
        content: [
          { type: 'prose', text: 'The Document Management System (DMS) is one of Landscape\'s most powerful differentiators. It\'s not just a file cabinet — it\'s the primary mechanism through which Landscaper learns about your deal. Every document you upload is a potential source of structured data, and every extraction you commit deepens Landscaper\'s understanding of your project.' },
          { type: 'prose', text: 'The core philosophy: upload everything. Offering memorandums, rent rolls, T-12 operating statements, appraisals, old leases, broker emails, survey reports, environmental records, tax bills — all of it. You don\'t need to know in advance which documents will be useful. Landscape\'s AI extracts what it can from each one, and the document itself remains available for Landscaper to query at any time, even if extraction was partial.' },
          { type: 'callout', label: 'Filters, Not Folders', text: 'The DMS doesn\'t use folders. There\'s no hierarchy of directories to maintain. Instead, every document has a type, a status, and one or more tags — and you navigate your document library through filters. Search by type, filter by tag, narrow by date. The result is a library that stays organized without the overhead of deciding where things "live." Any combination of filters gives you a clean, targeted view.' },
          { type: 'prose', text: 'This chapter covers the full DMS workflow: navigating the library, uploading and profiling documents, how the AI extractor works, the Ingestion Workbench where you review and commit extracted data, and the administration tools that shape extraction behavior over time. For how committed data feeds Landscaper\'s persistent knowledge about your project, see the Platform Knowledge chapter.' },
        ],
      },
      {
        id: '5.1',
        title: 'Navigating the DMS',
        content: [
          { type: 'prose', text: 'The Documents tab is your full document library for the current project. By default it shows all documents sorted by most recently uploaded. The filter bar at the top lets you narrow by document type (Offering Memorandum, Rent Roll, T-12, Appraisal, Lease, and more), processing status (Pending, Extracted, Committed, Error), or any tags you\'ve applied.' },
          { type: 'screenshot', src: '/guide/images/chapter-05-dms/dms-overview.png', alt: 'DMS tab showing document list with filter bar, type badges, and status indicators', caption: 'The DMS tab: filter bar at top, document list with type and status badges, right panel for document details.' },
          { type: 'prose', text: 'The search box performs full-text search across document names, profile metadata, and — for documents that have been extracted — across the content of the documents themselves. This means you can search for a specific tenant name, address, or dollar figure and find the documents that contain it.' },
          { type: 'prose', text: 'Click any document row to open its detail panel on the right. The detail panel shows the document\'s profile fields, extraction status, version history, and a direct link to open the document itself. From here you can edit the profile, trigger re-extraction, or upload a new version.' },
          { type: 'callout', label: 'Why No Folders?', text: 'Traditional file systems force you to decide where a document lives before you need it. A rent roll might live in "Due Diligence" or "Property" or "Financials" — and the wrong choice means you can\'t find it later. Tags let a document belong to multiple categories simultaneously, and filters let you query across any combination of them. The library stays clean without maintenance.' },
        ],
      },
      {
        id: '5.2',
        title: 'Uploading Documents',
        content: [
          { type: 'prose', text: 'Drag files into the upload zone on the Documents tab, or click the upload button to open a file picker. Multiple files can be uploaded at once. Supported formats and limits:' },
          { type: 'table', headers: ['File Type', 'Max Size', 'Extraction Support'], rows: [
            ['PDF (native/text-based)', '32 MB', 'Full extraction — all fields'],
            ['PDF (scanned/image)', '32 MB', 'Alpha limitation: OCR not yet available; upload for storage and manual review'],
            ['Word (.doc, .docx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
            ['Excel (.xls, .xlsx)', '16 MB', 'Upload and storage; convert to PDF for extraction'],
            ['Images (.jpg, .png)', '8 MB', 'Basic extraction supported'],
            ['Text (.txt, .csv)', '4 MB', 'Upload and storage'],
          ]},
          { type: 'prose', text: 'After files are selected, Landscape presents an Intake Choice: send the document through Structured Ingestion (AI extraction + Workbench review) or store it in the DMS without extraction. Choose Structured Ingestion for any document that contains structured data you want in your project — rent rolls, financials, appraisals. Choose store-only for reference documents (maps, photos, correspondence) where there\'s nothing to extract.' },
          { type: 'callout', label: 'When in Doubt, Extract', text: 'If you\'re unsure whether a document has useful data, choose Structured Ingestion. The worst case is that extraction finds nothing, and you commit zero fields. The document is still stored and searchable. The cost of a failed extraction is a few seconds of your time. The cost of skipping extraction on a document that had useful data is that Landscaper doesn\'t know about it.' },
        ],
      },
      {
        id: '5.3',
        title: 'Document Profiles',
        content: [
          { type: 'prose', text: 'Every document in the DMS has a profile — a structured set of metadata fields that describe the document itself, separate from the data extracted from its contents. The profile answers: what is this document, when is it from, who produced it, and what is its current status in your workflow.' },
          { type: 'prose', text: 'Profile fields are defined by document type templates. Each template specifies which fields are required (must be filled before saving) and which are optional. Standard fields across all types include Document Name, Document Type, Document Date, and Status. Document types like Appraisal or Offering Memorandum add type-specific fields such as Effective Date, Appraiser Name, or Broker.' },
          { type: 'prose', text: 'Why profiles matter for extraction: Landscaper uses the profile — especially the document type and date — to select the right extraction template and to weight confidence scores correctly. An Appraisal dated 2019 should not be treated the same as one dated 2024. Getting the profile right improves extraction accuracy and helps Landscaper give you better advice.' },
          { type: 'prose', text: 'Custom attributes extend profiles for your organization\'s specific needs. Administrators can create attributes of any data type (text, number, date, currency, dropdown, tags) and assign them to document type templates. All profile changes are logged to an audit trail for compliance.' },
        ],
      },
      {
        id: '5.4',
        title: 'Tags and Versions',
        content: [
          { type: 'prose', text: 'Tags are free-form labels that you apply to documents for cross-cutting organization. A single document can carry multiple tags, and the filter bar lets you combine tags with type and status filters to build precise views of your library.' },
          { type: 'prose', text: 'Common tagging patterns: by deal phase ("Due Diligence", "Closing", "Post-Close"), by source ("Broker Provided", "Seller Provided", "Third Party", "Public Record"), by review status ("Needs Review", "Reviewed", "Flagged"), or by subject ("Unit Mix", "Capital Expenditures", "Market Data"). There\'s no wrong approach — the goal is that any document is findable in under 10 seconds using filters.' },
          { type: 'prose', text: 'When a document is updated — a new rent roll from the seller, a revised appraisal — upload the new version from the document\'s detail panel rather than uploading a separate file. The DMS links the new file to the same document record and preserves the original as a prior version. Extraction data is tied to the specific version that produced it, so you always know which file each data point came from.' },
          { type: 'prose', text: 'Deleted documents are soft-deleted: hidden from the default view but retained in the database for audit purposes. If the document was processed through Structured Ingestion, deletion also cleans up associated staging records and removes the file from storage.' },
        ],
      },
      {
        id: '5.5',
        title: 'The AI Extractor',
        content: [
          { type: 'prose', text: 'When you choose Structured Ingestion, Landscape\'s AI extractor analyzes the document and attempts to identify and pull every structured data field it knows about for that document type. For a rent roll, that means unit numbers, unit types, square footage, lease dates, contract rents, and market rents. For a T-12, that means every line of income and expense, plus totals and per-unit figures.' },
          { type: 'prose', text: 'The extractor produces a confidence score for each field based on how clearly the value appeared in the source document, how well it matched expected patterns, and whether it found corroborating evidence elsewhere in the document. High-confidence fields (clearly labeled, consistently formatted) are extracted cleanly. Low-confidence fields flag for your review.' },
          { type: 'prose', text: 'Two distinct document types require different handling. Native PDFs — documents created digitally and exported as PDF — have a text layer that the extractor reads directly. These produce the best results. Scanned PDFs — physical documents photographed or photocopied into PDF — have no text layer; the extractor sees only an image.' },
          { type: 'callout', label: 'Alpha Limitation: Scanned PDFs', text: 'OCR (optical character recognition) preprocessing for scanned PDFs is not yet available in the alpha release. If you upload a scanned document and extraction returns empty or near-zero results, the document is likely scanned. Convert it to a searchable PDF using Adobe Acrobat, Google Drive, or a similar tool before re-uploading. The document is still stored and available for reference in the meantime.' },
          { type: 'prose', text: 'Partial extraction is still useful. If the extractor pulls 60% of the fields from a complex document, that\'s 60% you don\'t have to enter manually. The remaining fields either weren\'t present in the document, were in a format the extractor didn\'t recognize, or fell below the confidence threshold. The Ingestion Workbench shows you exactly what was and wasn\'t extracted so you can fill gaps manually.' },
        ],
      },
      {
        id: '5.6',
        title: 'The Ingestion Workbench',
        content: [
          { type: 'prose', text: 'The Ingestion Workbench is a split-panel interface that opens automatically after Structured Ingestion begins. The left panel is a Landscaper chat with ingestion-specific tools. The right panel is a field review table showing every field the extractor found, organized into tabs by category.' },
          { type: 'screenshot', src: '/guide/images/chapter-06-ingestion/workbench-overview.png', alt: 'Ingestion Workbench split panel showing Landscaper chat on left and field review table on right', caption: 'The Ingestion Workbench: Landscaper chat (left) and field review table (right). Fields populate in real time as extraction completes.' },
          { type: 'prose', text: 'Each field row shows the extracted value, a source snippet from the document (the exact text the extractor found it in), and a status badge. Fields are organized into tabs that vary by property type. For multifamily: Project, Property, Operations, Valuation, and All. For land development: Project, Planning, Budget, Valuation, and All. Each tab shows a badge with the count of fields it contains.' },
          { type: 'table', headers: ['Status', 'Color', 'Meaning'], rows: [
            ['Accepted', 'Green', 'Value confirmed — will be written to your project on commit'],
            ['Pending', 'Yellow', 'Extracted but not yet reviewed — will also commit unless you reject it'],
            ['Conflict', 'Orange', 'Extracted value differs from data already in your project — requires your decision'],
            ['Waiting', 'Gray', 'Extraction still in progress for this field'],
            ['Empty', 'Light Gray', 'No value extracted — field was not found or fell below confidence threshold'],
          ]},
          { type: 'prose', text: 'To accept a field, click the checkmark. To edit before accepting, click the value and type a correction, then accept. To reject a field (skip it entirely on commit), click the X. Conflicts require an explicit choice: accept the new extracted value, keep the existing project value, or edit to something different.' },
          { type: 'prose', text: 'The Workbench Chat on the left gives you a Landscaper session with five ingestion-specific tools. Ask it to explain an extraction ("Why did it extract $1,500 for average rent — I expected $1,650"), ask it to approve all fields in a category, ask for a summary of what\'s been extracted so far, or ask it to flag anything that looks inconsistent. The chat has live visibility into the field review table state.' },
          { type: 'prose', text: 'When you\'re ready, click Commit. All Accepted and Pending fields are written to your project. Rejected fields are skipped. The Workbench closes, the DMS record is finalized, and the committed data becomes part of your project — visible in the relevant tabs and available to Landscaper for analysis and advice.' },
          { type: 'prose', text: 'This is where "upload everything" pays off. A broker email that contained an off-market cap rate. A year-old appraisal with a rent schedule. A survey that confirmed the lot dimensions. Each committed extraction adds a data point that Landscaper can reference, cross-check, and reason about. Over time, the document library becomes a structured knowledge base about your deal, not just a pile of files.' },
          { type: 'callout', label: 'Abandoning a Session', text: 'Closing the Workbench via the X button or Cancel abandons the session. Staging rows are rejected, the uploaded file is deleted from storage, and the document record is soft-deleted. No partial data reaches your project. If you need to stop mid-review, commit what you\'ve accepted so far — partial commits are fine — rather than abandoning.' },
        ],
      },
      {
        id: '5.7',
        title: 'Administration',
        content: [
          { type: 'prose', text: 'Two administration panels control how the DMS behaves for your organization: Document Templates and AI Extraction Mappings. Both are accessible via the Documents tab for users with administrator access.' },
          { type: 'prose', text: 'Document Templates define the profile fields for each document type. Navigate to Documents > Document Templates to create or edit templates. For each template, you specify which attributes are required, which are optional, and the display order. Attributes are managed separately under Documents > Manage Attributes — each attribute has a display name, data type (text, number, date, boolean, currency, enum, lookup, tags, or JSON), and optional constraints for required or searchable behavior. For enum attributes, define the dropdown values in the Options field.' },
          { type: 'prose', text: 'AI Extraction Mappings control how the extractor maps what it finds in a document to database fields in your project. Navigate to System Administration > Landscaper to view and manage mappings. Each mapping ties a source label (the text pattern found in documents, with optional aliases) to a target database field, with a configured confidence level and active/inactive toggle.' },
          { type: 'table', headers: ['Column', 'Description'], rows: [
            ['Active', 'Enable or disable this mapping — inactive mappings are ignored during extraction'],
            ['Doc Type', 'The document type this mapping applies to (OM, Rent Roll, T-12, Appraisal)'],
            ['Pattern', 'The source label — what the extractor looks for in the document, plus any aliases'],
            ['Target', 'The database table and field where the value is written, plus any transform rule'],
            ['Confidence', 'High, Medium, or Low — determines how the field is flagged in the Workbench'],
            ['Actions', 'Edit or Delete (system mappings cannot be deleted)'],
          ]},
          { type: 'prose', text: 'Use extraction mappings when a label in your documents has changed (e.g., "Year Built" became "Construction Year" in a new template you receive), when you want to map a field that isn\'t currently extracted, or when reviewing low-confidence mappings that are producing poor results. Toggle the Stats view to see how many times each mapping has triggered and its write success rate — the ratio of triggers to successful database writes.' },
        ],
      },
    ],
  },
  {
    id: '6',
    number: '6',
    title: 'Chat Interface',
    subtitle: 'Conversing with Landscaper',
    group: 'Landscaper AI',
    sections: [
      {
        id: '6.1',
        title: 'The Chat Interface',
        content: [
          { type: 'prose', text: 'The Landscaper chat panel persists messages and returns assistant responses within the context of your current project and page. Chat history is preserved and reloads (last 100 messages) when you return to a project. The panel is page-aware — Landscaper knows which tab you\'re on and adjusts its responses accordingly.' },
        ],
      },
      {
        id: '6.2',
        title: 'Asking Questions About Your Project',
        content: [
          { type: 'prose', text: 'You can ask Landscaper about any data in your project. It has access to all project tables, financial calculations, container hierarchy, and uploaded documents. Questions can be broad ("Give me a summary of this deal") or specific ("What\'s the per-unit operating expense in the T-12?").' },
          { type: 'prose', text: 'Landscaper can also make changes to project data. When you say "Set vacancy to 7%" or "Update the cap rate to 5.25%", Landscaper proposes the mutation and waits for your confirmation before writing to the database. You always see exactly what will change before it happens.' },
        ],
      },
      {
        id: '6.3',
        title: 'Asking Questions About Documents',
        content: [
          { type: 'prose', text: 'Landscaper can answer questions about uploaded documents using RAG (retrieval-augmented generation). Ask "What does the rent roll say about unit mix?" or "Summarize the key assumptions in this OM" and Landscaper will search the document content and respond with cited answers.' },
        ],
      },
      {
        id: '6.4',
        title: 'Property-Type Expertise',
        content: [
          { type: 'prose', text: 'Landscaper adapts its expertise to your property type. For multifamily projects, it understands rent rolls, unit mixes, NOI, and cap rates. For land development, it speaks in terms of lot yields, absorption schedules, development budgets, and residual land value. It uses the correct terminology and calculation methods for your deal type.' },
        ],
      },
    ],
  },
  {
    id: '7',
    number: '7',
    title: 'Assumption Validation',
    subtitle: 'How Landscaper checks your work',
    group: 'Landscaper AI',
    sections: [
      {
        id: '7.1',
        title: 'How Landscaper Validates Assumptions',
        content: [
          { type: 'prose', text: 'Landscaper continuously compares your project assumptions against market data, extracted document values, and internal consistency checks. When it detects a variance above a configurable threshold (default 0-50%), it surfaces an advice item in the right-side panel.' },
        ],
      },
      {
        id: '7.2',
        title: 'The Advice Panel',
        content: [
          { type: 'prose', text: 'The advice panel displays alongside the chat interface and lists variance items when available. Each item shows the field in question, the current value, the reference value (market data or document source), and the percentage variance. Items are ordered by severity.' },
        ],
      },
      {
        id: '7.3',
        title: 'Acting on Advice',
        content: [
          { type: 'prose', text: 'You can act on advice directly from the panel — click to navigate to the relevant field, or ask Landscaper in chat to explain the variance further. Landscaper can also update the value for you if you agree with the suggested adjustment. Advice items are informational, not mandatory — you may have good reasons to deviate from market.' },
        ],
      },
    ],
  },
  {
    id: '8',
    number: '8',
    title: 'Activity Feed',
    subtitle: 'Tracking Landscaper actions and extractions',
    group: 'Landscaper AI',
    sections: [
      {
        id: '8.1',
        title: 'What the Feed Shows',
        content: [
          { type: 'prose', text: 'The activity feed highlights what Landscaper has found or changed in your project. Items include document extractions, data mutations, advice generated, and system events. The feed refreshes automatically every 60 seconds and shows unread counts.' },
        ],
      },
      {
        id: '8.2',
        title: 'Navigating from the Feed',
        content: [
          { type: 'prose', text: 'Click any activity item to navigate to the related page and field. If a field is highlighted, Landscape scrolls to it and applies a visual highlight so you can verify the change in context. Clicking an item also marks it as read.' },
        ],
      },
    ],
  },

  // ─── Group: Multifamily Workflows ─────────────────────────────
  {
    id: '9',
    number: '9',
    title: 'Property Setup',
    subtitle: 'Configuring a multifamily project',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '9.1',
        title: 'Property Details',
        content: [
          { type: 'prose', text: placeholder('Property Details') },
        ],
      },
      {
        id: '9.2',
        title: 'Unit Mix Setup',
        content: [
          { type: 'prose', text: placeholder('Unit Mix Setup') },
          { type: 'screenshot', src: '/guide/images/chapter-09-property-setup/unit-mix.png', alt: 'Unit mix table showing unit types, counts, and square footages', caption: 'The unit mix table defines your property\'s unit types and counts.' },
        ],
      },
    ],
  },
  {
    id: '10',
    number: '10',
    title: 'Rent Roll',
    subtitle: 'Unit-level lease and rent data',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '10.1',
        title: 'Unit-Level Lease Data',
        content: [{ type: 'prose', text: placeholder('Unit-Level Lease Data') }],
      },
      {
        id: '10.2',
        title: 'Rent Roll Extraction',
        content: [{ type: 'prose', text: placeholder('Rent Roll Extraction') }],
      },
    ],
  },
  {
    id: '11',
    number: '11',
    title: 'Operations',
    subtitle: 'The unified operating statement',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '11.1',
        title: 'The Unified Operating Statement',
        content: [
          { type: 'prose', text: 'The Operations tab is the financial nerve center of a multifamily project. It presents a unified operating statement — a single grid that combines rental income, vacancy and loss deductions, and operating expenses into one continuous P&L view. Unlike traditional tools that scatter income and expense inputs across separate screens, Landscape keeps everything in one place so you can see the full picture from Gross Potential Rent down to Net Operating Income without switching tabs.' },
          { type: 'prose', text: 'The Operations tab does not exist in isolation. Rental income and occupancy data flow into it from the Property tab\'s Rent Roll. This means the Rent Roll is the single source of truth for unit-level rents — the Operations tab displays that income as read-only, calculated from actual unit data. Operating expenses can be populated by document ingestion (from a T-12 or offering memorandum) or entered manually. All values ultimately feed downstream into the Income Approach on the Valuation tab.' },
        ],
      },
      {
        id: '11.2',
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
        id: '11.3',
        title: 'Operating Income',
        content: [
          { type: 'prose', text: 'The top section displays rental income. These values are read-only on the Operations tab because they are calculated from the Rent Roll on the Property tab. You\'ll see a lock icon next to each rental income line item, indicating the value is sourced from unit-level data.' },
          { type: 'prose', text: 'Gross Potential Rent (GPR) is the total rent the property would generate if every unit were leased at its current contract rent — calculated automatically by summing (monthly rent × 12) across all units. Loss to Lease shows the difference between market rent and contract rent for each occupied unit. Other Income covers non-rental items such as parking, laundry, pet fees, or utility reimbursements.' },
          { type: 'callout', label: 'Editing Income', text: 'To edit rental income figures, navigate to the Property tab\'s Rent Roll and update the unit-level rents there. Changes flow automatically into the Operations tab.' },
        ],
      },
      {
        id: '11.4',
        title: 'Vacancy and Loss',
        content: [
          { type: 'prose', text: 'Below Operating Income, the vacancy section shows all deductions from gross revenue. Landscape supports multiple vacancy and loss line items, each as a percentage of GPR: Physical Vacancy (unleased units — calculated automatically from occupancy data when a Rent Roll exists), Economic Vacancy (occupied-but-non-paying units), Concessions (rent discounts and free-rent periods), and Bad Debt / Collection Loss.' },
          { type: 'prose', text: 'When a Rent Roll is present, physical vacancy is calculated from actual unit occupancy data and displayed with a lock icon. Clicking the lock overrides the calculated value and lets you enter a manual vacancy percentage — useful when you believe the current vacancy snapshot is not representative of stabilized performance.' },
        ],
      },
      {
        id: '11.5',
        title: 'Operating Expenses',
        content: [
          { type: 'prose', text: 'Operating expenses occupy the bottom portion of the grid, organized into parent categories (Taxes, Insurance, Utilities, Repairs & Maintenance, Management, Other) with child line items underneath. Category filter pills at the top let you isolate a single category for focused review.' },
          { type: 'prose', text: 'Expense values are entered in the $/Unit column. When you change a per-unit value, the Annual Total recalculates immediately ($/Unit × unit count). The $/SF column also updates in real time. You can drag expense line items between categories, add new items via the "+" button, or double-click any row\'s label to reassign its category from a dropdown.' },
          { type: 'subsection', number: '11.5.1', title: 'Data Provenance Icons', blocks: [
            { type: 'prose', text: 'Landscape tracks where every value came from. Ingested values display a lock icon (source-backed), manually entered values display an input icon, and overridden extractions display an input icon that can revert to the original. This transparency helps distinguish between values extracted from documents and your own assumptions — critical for audit trails and USPAP compliance.' },
            { type: 'table', headers: ['Icon', 'State', 'Click Behavior'], rows: [
              ['Lock', 'Ingested from document', 'Breaks document link, switches to manual entry'],
              ['Input', 'User-entered', 'No action (no extracted value to revert to)'],
              ['Input', 'User-modified (was extracted)', 'Reverts to original extracted value (confirms if >10% difference)'],
            ]},
          ]},
          { type: 'subsection', number: '11.5.2', title: 'Working with Ingested Data', blocks: [
            { type: 'prose', text: 'After ingesting a T-12 or offering memorandum, review the Operations tab by scanning the lock icons to see which fields were populated. Verify key figures against the source document, override where needed by clicking the lock, add missing items, then check the NOI row at the bottom. Fields you have manually overridden will not be silently replaced if you ingest a second document — you\'ll be prompted to accept or reject each conflict.' },
          ]},
        ],
      },
    ],
  },
  {
    id: '12',
    number: '12',
    title: 'Valuation',
    subtitle: 'Three approaches to value',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '12.1',
        title: 'Sales Comparison Approach',
        content: [{ type: 'prose', text: placeholder('Sales Comparison Approach') }],
      },
      {
        id: '12.2',
        title: 'Cost Approach',
        content: [{ type: 'prose', text: placeholder('Cost Approach') }],
      },
      {
        id: '12.3',
        title: 'Income Approach',
        content: [
          { type: 'prose', text: 'The Income Approach derives value from the property\'s operating income using Direct Capitalization and Discounted Cash Flow (DCF) methods. The 3-column P&L reflects the three NOI bases (F-12 Current, F-12 Market, Stabilized) with visibility toggles. The value tiles — three Direct Cap tiles plus a DCF tile — each derive their NOI from the corresponding Operations tab column. Changes to operating assumptions are reflected in real time.' },
        ],
      },
      {
        id: '12.4',
        title: 'Reconciliation',
        content: [
          { type: 'prose', text: placeholder('Reconciliation') },
          { type: 'callout', label: 'Alpha Note', text: 'The Reconciliation frontend is in development. The backend API for weight-based reconciliation with narrative versioning is complete.' },
        ],
      },
    ],
  },
  {
    id: '13',
    number: '13',
    title: 'Capitalization',
    subtitle: 'Equity, debt, and waterfall',
    group: 'Multifamily Workflows',
    sections: [
      {
        id: '13.1',
        title: 'Equity Partners',
        content: [{ type: 'prose', text: placeholder('Equity Partners') }],
      },
      {
        id: '13.2',
        title: 'Debt Facilities',
        content: [{ type: 'prose', text: placeholder('Debt Facilities') }],
      },
      {
        id: '13.3',
        title: 'Waterfall',
        content: [{ type: 'prose', text: placeholder('Waterfall') }],
      },
    ],
  },

  // ─── Group: Land Development Workflows ────────────────────────
  {
    id: '14',
    number: '14',
    title: 'Project Setup',
    subtitle: 'Configuring a land development project',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '14.1',
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
        id: '14.2',
        title: 'Parcel Inventory',
        content: [{ type: 'prose', text: placeholder('Parcel Inventory') }],
      },
      {
        id: '14.3',
        title: 'Planning Hierarchy',
        content: [{ type: 'prose', text: placeholder('Planning Hierarchy') }],
      },
    ],
  },
  {
    id: '15',
    number: '15',
    title: 'Budget',
    subtitle: 'Cost categories, line items, and scheduling',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '15.1',
        title: 'Cost Categories',
        content: [{ type: 'prose', text: placeholder('Cost Categories') }],
      },
      {
        id: '15.2',
        title: 'Line Items and Draw Schedule',
        content: [{ type: 'prose', text: placeholder('Line Items and Draw Schedule') }],
      },
      {
        id: '15.3',
        title: 'Absorption Schedule',
        content: [{ type: 'prose', text: placeholder('Absorption Schedule') }],
      },
    ],
  },
  {
    id: '16',
    number: '16',
    title: 'Feasibility',
    subtitle: 'Residual land value and return metrics',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '16.1',
        title: 'Residual Land Value',
        content: [{ type: 'prose', text: placeholder('Residual Land Value') }],
      },
      {
        id: '16.2',
        title: 'Cash Flow Projections',
        content: [{ type: 'prose', text: placeholder('Cash Flow Projections') }],
      },
      {
        id: '16.3',
        title: 'Return Metrics',
        content: [{ type: 'prose', text: placeholder('Return Metrics') }],
      },
    ],
  },
  {
    id: '17',
    number: '17',
    title: 'Capitalization',
    subtitle: 'Equity, construction loans, and waterfall',
    group: 'Land Development Workflows',
    sections: [
      {
        id: '17.1',
        title: 'Equity Partners',
        content: [{ type: 'prose', text: placeholder('Equity Partners') }],
      },
      {
        id: '17.2',
        title: 'Construction Loan',
        content: [{ type: 'prose', text: placeholder('Construction Loan') }],
      },
      {
        id: '17.3',
        title: 'Waterfall',
        content: [{ type: 'prose', text: placeholder('Waterfall') }],
      },
    ],
  },

  // ─── Group: Administration ────────────────────────────────────
  {
    id: '18',
    number: '18',
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
