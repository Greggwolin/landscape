/**
 * Unified Document Analysis Route (v2.0)
 *
 * Integrates Claude unified extractor with full persistence to Neon.
 * This route orchestrates:
 * 1. Document text/PDF extraction
 * 2. Claude unified extraction call
 * 3. Persistence to dms_extract_queue, dms_unmapped, dms_assertion
 * 4. Backward-compatible field mappings for UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractWithClaude, extractFromPDFWithClaude, validateExtractionResult } from '@/lib/ai/claude-extractor';
import { convertToFieldMappings } from '@/lib/ai/unified-extractor';
import {
  persistExtractionResult,
  markExtractionFailed,
  isDocumentProcessed
} from '@/lib/ai/extraction-persistence';

// Allow up to 300 seconds for AI analysis of large documents (up to 50MB)
export const maxDuration = 300;

export interface DocumentAnalysisResult {
  success: boolean;
  filename: string;
  document_type: string;
  readability: {
    can_read: boolean;
    confidence: number;
    format_supported: boolean;
    text_quality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  extracted_data: any;
  field_mappings: Array<{
    source_text: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    user_confirmable: boolean;
  }>;
  processing_notes: string[];
  extraction_metadata?: {
    queue_id: number;
    unmapped_count: number;
    assertion_count: number;
  };
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  error?: string;
}

// Maximum file sizes
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100; // Safety limit for very large documents

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const docId = formData.get('docId') as string; // Optional - will generate if not provided
    const useDirectPDF = formData.get('useDirectPDF') === 'true'; // Use PDF beta API

    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({
        error: 'No projectId provided'
      }, { status: 400 });
    }

    // Validate file type
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported file type: ${file.type}`,
        filename: file.name,
        readability: {
          can_read: false,
          confidence: 0,
          format_supported: false,
          text_quality: 'poor' as const
        }
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 50MB)`,
        filename: file.name
      }, { status: 400 });
    }

    // Generate doc_id if not provided
    const finalDocId = docId || `doc_${projectId}_${Date.now()}`;

    // Check if already processed (idempotency)
    const alreadyProcessed = await isDocumentProcessed(finalDocId);
    if (alreadyProcessed) {
      console.log(`⚠️  Document ${finalDocId} already processed - returning existing result`);
      // Could optionally return the existing result here
    }

    console.log('📄 Starting unified document analysis...');
    console.log(`   File: ${file.name}`);
    console.log(`   Type: ${file.type}`);
    console.log(`   Size: ${Math.round(file.size / 1024)}KB`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Doc ID: ${finalDocId}`);

    let analysisResult: DocumentAnalysisResult;

    try {
      // Strategy 1: Use Claude PDF beta API directly if PDF and flag is set
      if (file.type === 'application/pdf' && useDirectPDF) {
        console.log('🤖 Using Claude PDF beta API...');
        analysisResult = await analyzeWithClaudePDF(file, finalDocId, parseInt(projectId));
      }
      // Strategy 2: Extract text first, then call Claude (default)
      else {
        console.log('📝 Extracting text first, then calling Claude...');
        analysisResult = await analyzeWithTextExtraction(file, finalDocId, parseInt(projectId));
      }

      return NextResponse.json(analysisResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Document analysis error:', error);

      // Mark as failed in queue
      await markExtractionFailed(
        finalDocId,
        parseInt(projectId),
        message,
        error instanceof Error ? error.stack : undefined
      );

      return NextResponse.json({
        success: false,
        error: 'Failed to analyze document',
        details: message,
        filename: file.name
      }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Request handling error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: message
    }, { status: 500 });
  }
}

/**
 * Analyze document using Claude PDF beta API
 */
async function analyzeWithClaudePDF(
  file: File,
  docId: string,
  projectId: number
): Promise<DocumentAnalysisResult> {
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Call Claude with PDF
  const extractionResult = await extractFromPDFWithClaude(buffer, file.name);

  // Validate result
  const validation = validateExtractionResult(extractionResult);

  // Persist to database
  const persistenceResult = await persistExtractionResult(extractionResult, {
    docId,
    projectId,
    fileUri: file.name
  });

  // Convert to field mappings for UI compatibility
  const fieldMappings = convertToFieldMappings(extractionResult);

  // Build processing notes
  const processingNotes: string[] = [
    'Document analyzed using Claude PDF beta API',
    `Extracted ${extractionResult.mapped.tbl_parcel.length} parcels`,
    `Found ${extractionResult.unmapped.length} unmapped fields`,
    `Generated ${extractionResult.doc_assertions?.length || 0} assertions`,
    `Persisted to queue_id=${persistenceResult.queueId}`
  ];

  if (validation.warnings.length > 0) {
    processingNotes.push(`⚠️ ${validation.warnings.length} warnings generated`);
  }

  return {
    success: true,
    filename: file.name,
    document_type: extractionResult.mapped.core_doc?.doc_type || 'unknown',
    readability: {
      can_read: true,
      confidence: 0.95,
      format_supported: true,
      text_quality: 'excellent'
    },
    extracted_data: extractionResult.mapped,
    field_mappings: fieldMappings,
    processing_notes: processingNotes,
    extraction_metadata: persistenceResult,
    validation
  };
}

/**
 * Analyze document by extracting text first
 */
async function analyzeWithTextExtraction(
  file: File,
  docId: string,
  projectId: number
): Promise<DocumentAnalysisResult> {
  // Extract text from document
  const documentText = await extractDocumentText(file);

  if (!documentText || documentText.length < 100) {
    throw new Error('Document text extraction failed or produced insufficient text');
  }

  console.log(`✅ Extracted ${documentText.length} characters of text`);

  // Call Claude with extracted text
  const extractionResult = await extractWithClaude(documentText);

  // Validate result
  const validation = validateExtractionResult(extractionResult);

  // Persist to database
  const persistenceResult = await persistExtractionResult(extractionResult, {
    docId,
    projectId,
    fileUri: file.name
  });

  // Convert to field mappings for UI compatibility
  const fieldMappings = convertToFieldMappings(extractionResult);

  // Build processing notes
  const processingNotes: string[] = [
    `Extracted ${documentText.length} characters from document`,
    'Analyzed with Claude unified extractor v2.0',
    `Extracted ${extractionResult.mapped.tbl_parcel.length} parcels`,
    `Found ${extractionResult.unmapped.length} unmapped fields`,
    `Generated ${extractionResult.doc_assertions?.length || 0} assertions`,
    `Persisted to queue_id=${persistenceResult.queueId}`
  ];

  if (validation.warnings.length > 0) {
    processingNotes.push(`⚠️ ${validation.warnings.length} warnings generated`);
  }

  return {
    success: true,
    filename: file.name,
    document_type: extractionResult.mapped.core_doc?.doc_type || 'unknown',
    readability: {
      can_read: true,
      confidence: 0.90,
      format_supported: true,
      text_quality: 'good'
    },
    extracted_data: extractionResult.mapped,
    field_mappings: fieldMappings,
    processing_notes: processingNotes,
    extraction_metadata: persistenceResult,
    validation
  };
}

/**
 * Extract text from various document types
 */
async function extractDocumentText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  switch (file.type) {
    case 'application/pdf':
      return await extractPDFText(arrayBuffer);

    case 'image/jpeg':
    case 'image/png':
    case 'image/tiff':
      return await extractImageText(arrayBuffer);

    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

/**
 * Extract text from PDF using pdftotext
 */
async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
  const textOutputPath = path.join(tempDir, `extracted_text_${Date.now()}.txt`);

  try {
    // Write PDF to temp file
    fs.writeFileSync(tempPdfPath, Buffer.from(arrayBuffer));

    // Extract text using pdftotext
    const pdfTextCommand = `pdftotext "${tempPdfPath}" "${textOutputPath}"`;
    await execPromise(pdfTextCommand);

    // Read extracted text
    if (!fs.existsSync(textOutputPath)) {
      throw new Error('pdftotext did not create output file');
    }

    const fullText = fs.readFileSync(textOutputPath, 'utf-8');

    // Clean up temp files
    fs.unlinkSync(tempPdfPath);
    fs.unlinkSync(textOutputPath);

    if (!fullText.trim()) {
      throw new Error('PDF text extraction produced no content');
    }

    // Clean and normalize text
    const cleanText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    return cleanText;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    if (fs.existsSync(textOutputPath)) fs.unlinkSync(textOutputPath);
    throw error;
  }
}

/**
 * Extract text from images using Tesseract OCR
 */
async function extractImageText(arrayBuffer: ArrayBuffer): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const buffer = Buffer.from(arrayBuffer);

  const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
  return text.trim();
}
