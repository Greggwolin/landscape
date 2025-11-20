/**
 * PDF Text Extraction Utility
 * Uses pdftotext from pdf-poppler
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Extract text from a PDF file using pdftotext
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create temp file
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
  const tempTextPath = path.join(tempDir, 'extracted_text.txt');

  try {
    // Write PDF to temp file
    await fs.writeFile(tempPdfPath, buffer);
    console.log(`✓ Wrote PDF to temporary file: ${tempPdfPath}`);

    // Run pdftotext
    const command = `pdftotext "${tempPdfPath}" "${tempTextPath}"`;
    console.log(`Running pdftotext command: ${command}`);

    await execAsync(command);

    // Read extracted text
    const text = await fs.readFile(tempTextPath, 'utf-8');
    console.log(`✓ Successfully extracted ${text.length} characters from PDF`);

    // Cleanup
    await fs.unlink(tempPdfPath).catch(() => {});
    await fs.unlink(tempTextPath).catch(() => {});

    return text;
  } catch (error) {
    console.error('PDF text extraction failed:', error);

    // Cleanup on error
    await fs.unlink(tempPdfPath).catch(() => {});
    await fs.unlink(tempTextPath).catch(() => {});

    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
