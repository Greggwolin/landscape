# Document Upload & Ingestion — User Guide

**Last Updated:** 2026-03-17
**Applies to:** Unified Intake Modal

---

## Overview

Every document you bring into Landscape goes through a single upload flow, regardless of how you add it. Whether you drag files onto the page, use the Upload button on the Documents tab, or drop a file into the Landscaper panel, you'll see the same Intake Modal.

The modal handles three things: staging your files, letting you choose what Landscape should do with each one, and uploading.

---

## How to Upload Documents

### Drag and Drop

Drag one or more files anywhere onto a project page. The Intake Modal opens automatically.

**Supported file types:** PDF, Excel (.xlsx, .xls, .xlsm), CSV, Word (.doc, .docx), images (JPG, PNG, GIF), plain text (.txt)

**Maximum file size:** 32 MB for PDFs, 16 MB for Office documents, 8 MB for images and CSVs, 4 MB for text files.

### Upload Button

On the Documents tab, click **Upload Documents** in the page header. Select files from your computer. The Intake Modal opens.

---

## The Intake Modal

When files are added, the Intake Modal opens with a list of your documents. Each file row shows the file name, size, auto-detected document type, confidence level, and an intent selector.

### Choosing an Intent

Each file gets one of three intents. Landscape auto-suggests based on the filename and content, but you can override per file. Hover over any intent button to see a full description.

#### Extract Inputs

Best for: Rent rolls, T-12 operating statements, offering memoranda, property financials.

What happens: Landscape extracts specific data fields from the document and opens the Ingestion Workbench — a split-panel review screen where you verify each extracted value before it's committed to the project. Extracted fields populate project tables directly (units, leases, operating expenses, etc.).

The document is stored in the project's Documents tab.

#### Project Knowledge

Best for: Appraisals, market studies, crime reports, environmental studies, broker opinions of value, neighborhood data.

What happens: The document is stored in the project's Documents tab and processed through the knowledge pipeline — extracting text, creating searchable chunks, and generating embeddings. Landscaper can reference this document when drafting analysis, narratives, and recommendations for the project.

After upload, a metadata modal appears where you can review AI-suggested tags and document type. Landscaper skims the document and pre-populates these suggestions.

#### Platform Knowledge

Best for: Industry benchmarks, cap rate surveys, construction cost data, methodology guides, general market research useful across multiple projects.

What happens: The document is processed through the knowledge pipeline and made available to Landscaper across all projects matching the selected property types. It is not stored in any project's Documents tab.

After upload, a metadata modal appears where you can review AI-suggested tags, applicable property types, geographic scope, and time period. This metadata helps Landscaper find and apply the document's information when relevant.

### Batch Controls

When uploading multiple files, use the **Set all to** buttons at the top of the modal to apply the same intent to every file. You can still override individual files after setting the batch default. Destination summary pills show how many files are going to each destination.

Click **Upload N Documents** to start. Each file uploads and processes according to its intent.

---

## Duplicate Detection

Before upload, Landscape checks each file against existing project documents:

- **Content match** (SHA256 hash) — the file is byte-for-byte identical to an existing document.
- **Filename match** — a document with the same name already exists but the content differs, so it saves as a new version.

For duplicates, the intent selector is disabled.

---

## After Upload

### Extract Inputs → Workbench

The Ingestion Workbench opens automatically for the first document. The Workbench is a split-panel view with Landscaper on the left and a field review table on the right. Review each field, then click Commit to write values to the project.

If multiple files were set to Extract Inputs, they queue — the Workbench processes one document at a time.

### Project Knowledge → Metadata Modal

A lightweight modal appears with AI-suggested document type, tags, and a summary. Review or adjust, then click "Add to Project." The document appears in the Documents tab and feeds Landscaper's analysis.

### Platform Knowledge → Metadata Modal

A modal appears with AI-suggested category, property types, geographic scope, time period, and tags. Review or adjust, then click "Add to Platform." The document feeds Landscaper across all matching projects but does not appear in any project's Documents tab.

---

## Destination Summary

| Intent | Visible in Documents tab? | Feeds Landscaper? | Scope |
|---|---|---|---|
| Extract Inputs | Yes | Yes (after commit) | This project |
| Project Knowledge | Yes | Yes | This project |
| Platform Knowledge | No | Yes | All matching projects |

---

## Troubleshooting

### "Upload service did not return results"

The file storage service (UploadThing) is not responding. Verify the `UPLOADTHING_TOKEN` environment variable is set in your deployment environment. Restart the dev server if running locally.

### Upload succeeds but no extraction runs

Check the intent — if the file was set to Project Knowledge or Platform Knowledge, no field extraction runs. Those intents feed the knowledge base. Re-upload with Extract Inputs to trigger the Workbench.

### Scanned PDFs return empty extractions

Scanned documents (images without a text layer) require OCR preprocessing, which is not yet implemented in the alpha. Native digital PDFs with selectable text work normally.
