import { NextRequest, NextResponse } from 'next/server';
import { ExcelReader, ExcelSheet } from '@/lib/excel-reader';
import path from 'path';

// Security: Validate and sanitize file paths
function validateAndSanitizeFilePath(filename: string): string | null {
  // Reject null, empty, or non-string inputs
  if (!filename || typeof filename !== 'string') {
    return null;
  }
  
  // Remove any path traversal attempts
  const sanitized = filename.replace(/\.\./g, '');
  
  // Only allow specific file extensions
  const allowedExtensions = ['.xlsx', '.xlsm', '.xls'];
  const hasValidExtension = allowedExtensions.some(ext => 
    sanitized.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return null;
  }
  
  // Resolve base directory and target path
  const baseDir = path.resolve(process.cwd(), 'LocalFiles');
  const targetPath = path.resolve(baseDir, sanitized);
  
  // Ensure the target path is within the base directory
  if (!targetPath.startsWith(baseDir)) {
    return null;
  }
  
  return targetPath;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const filename = searchParams.get('filename');
    const sheetName = searchParams.get('sheet');
    const searchTerm = searchParams.get('search');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    // Validate and sanitize file path to prevent path traversal
    const filePath = validateAndSanitizeFilePath(filename);
    if (!filePath) {
      return NextResponse.json({ 
        error: 'Invalid filename. Only .xlsx, .xlsm, and .xls files are allowed.' 
      }, { status: 400 });
    }
    
    switch (action) {
      case 'info':
        const info = ExcelReader.getWorkbookInfo(filePath);
        return NextResponse.json(info);
        
      case 'sheets':
        const workbook = ExcelReader.readFile(filePath);
        return NextResponse.json({
          filename: workbook.filename,
          sheetNames: workbook.sheetNames
        });
        
      case 'sheet':
        if (!sheetName) {
          return NextResponse.json({ error: 'Sheet name is required' }, { status: 400 });
        }
        const fullWorkbook = ExcelReader.readFile(filePath);
        const sheet = ExcelReader.getSheet(fullWorkbook, sheetName);
        if (!sheet) {
          return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }
        return NextResponse.json(sheet);
        
      case 'formulas':
        const formulas = ExcelReader.extractFormulas(filePath);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : 100;
        return NextResponse.json({
          total: formulas.length,
          formulas: formulas.slice(0, limit)
        });
        
      case 'search':
        if (!searchTerm) {
          return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
        }
        const searchWorkbook = ExcelReader.readFile(filePath);
        const caseSensitive = searchParams.get('case') === 'true';
        const results = ExcelReader.searchText(searchWorkbook, searchTerm, caseSensitive);
        const searchLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
        return NextResponse.json({
          searchTerm,
          total: results.length,
          results: results.slice(0, searchLimit)
        });
        
      case 'cell':
        const cellAddress = searchParams.get('cell');
        if (!sheetName || !cellAddress) {
          return NextResponse.json({ 
            error: 'Sheet name and cell address are required' 
          }, { status: 400 });
        }
        try {
          const cellData = ExcelReader.getCellWithFormula(filePath, sheetName, cellAddress);
          return NextResponse.json(cellData);
        } catch (error) {
          return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, { status: 404 });
        }
        
      default:
        // Default: return basic workbook info
        const defaultInfo = ExcelReader.getWorkbookInfo(filePath);
        return NextResponse.json(defaultInfo);
    }
    
  } catch (error) {
    console.error('Excel API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, sheets, formulas, search } = body;
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    // Validate and sanitize file path to prevent path traversal
    const filePath = validateAndSanitizeFilePath(filename);
    if (!filePath) {
      return NextResponse.json({ 
        error: 'Invalid filename. Only .xlsx, .xlsm, and .xls files are allowed.' 
      }, { status: 400 });
    }
    const results: {
      info?: ReturnType<typeof ExcelReader.getWorkbookInfo>
      sheets?: Record<string, ExcelSheet>
      formulas?: { total: number; formulas: Array<{ sheet: string; cell: string; formula: string; value: unknown }> }
      search?: { term: string; total: number; results: Array<{ sheet: string; row: number; col: number; value: unknown }> }
    } = {}
    
    // Get workbook info
    results.info = ExcelReader.getWorkbookInfo(filePath);
    
    // Get specific sheets if requested
    if (sheets && Array.isArray(sheets)) {
      const workbook = ExcelReader.readFile(filePath);
      results.sheets = {};
      
      for (const sheetName of sheets) {
        const sheet = ExcelReader.getSheet(workbook, sheetName);
        if (sheet) {
          results.sheets[sheetName] = sheet;
        }
      }
    }
    
    // Get formulas if requested
    if (formulas) {
      const formulaList = ExcelReader.extractFormulas(filePath);
      results.formulas = {
        total: formulaList.length,
        formulas: typeof formulas === 'number' 
          ? formulaList.slice(0, formulas)
          : formulaList.slice(0, 100)
      };
    }
    
    // Perform search if requested
    if (search && typeof search === 'object') {
      const { term, caseSensitive = false, limit = 50 } = search;
      if (term) {
        const workbook = ExcelReader.readFile(filePath);
        const searchResults = ExcelReader.searchText(workbook, term, caseSensitive);
        results.search = {
          term,
          total: searchResults.length,
          results: searchResults.slice(0, limit)
        };
      }
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Excel API POST error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
