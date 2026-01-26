# Landscaper User Guide

This guide is for app users who want to use Landscaper to upload documents, review AI suggestions, and manage extraction mappings in the admin modal.

## What is Landscaper?

Landscaper is the AI assistant that helps you pull key information from documents, track activity, and get guidance for your project.

## Where You’ll Find It

- **Project workspace**: The Landscaper panel sits next to your project data.
- **Admin modal**: A special “Landscaper” tab for configuring extraction rules.
- **New Project flow**: A dropzone that can prefill project fields from a document.

## Common Tasks

### 1) Upload a Document and See AI Results

1. Open a project.
2. Use the Landscaper panel to upload a PDF or image.
3. Landscaper extracts data and shows a review screen if needed.
4. Approve or adjust values before they are saved.

Tips:

- PDFs work best.
- Images are supported (JPEG/PNG).
- Word/Excel files should be converted to PDF first.

### 2) Review and Approve Extracted Fields

When Landscaper finds values in a document, you may see a review screen:

- **High confidence** fields are likely correct.
- **Medium/Low confidence** fields should be double-checked.
- You can edit values before saving.

### 3) Use the Activity Feed

The activity feed highlights what Landscaper has found or changed.

- Click an item to jump to the related page.
- If a field is highlighted, check it for accuracy.

### 4) Chat With Landscaper

Ask questions about your project or uploaded documents.

Examples:

- “What does the rent roll say about unit mix?”
- “Summarize the key assumptions in this OM.”
- “Any missing data I should check?”

### 5) New Project Auto-Fill (From a Document)

When creating a project, you can drop an OM or summary document in the dropzone.

Landscaper will try to fill:

- Property name
- Address, city, state, ZIP
- Units
- Building square footage
- Property type

Auto-filled fields show a visual indicator so you can review them.

## Admin: AI Extraction Mappings (For Power Users)

If you manage configuration, the **Landscaper** tab in the System Administration modal lets you adjust extraction rules.

You can:

- Search or filter mappings by document type, table, confidence, or status.
- Enable/disable mappings.
- Add or edit mapping rules.

This is useful when:

- A label in documents changes (e.g., “Year Built” becomes “Construction Year”).
- You want to map a new field into the database.

## Helpful Tips

- Start with clean PDFs for best results.
- Review anything marked **Medium** or **Low** confidence.
- If data is missing, it may not exist in the document.
- Use chat to ask for summaries or cross-checks.

## Troubleshooting

- **No extraction results**: Try re-uploading a cleaner PDF.
- **Wrong values**: Edit during review or report to your admin.
- **Missing fields**: The document may not include them.

## Need Help?

If you see consistent extraction issues, contact your admin to update the mapping rules or run a test with a known-good document.
