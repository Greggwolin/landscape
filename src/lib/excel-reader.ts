import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import path from 'path';

export interface ExcelSheet {
  name: string;
  data: unknown[][];
  json: Record<string, unknown>[];
}

export interface ExcelWorkbook {
  filename: string;
  sheets: ExcelSheet[];
  sheetNames: string[];
}

export class ExcelReader {
  /**
   * Read an Excel file and return structured data
   */
  static readFile(filePath: string): ExcelWorkbook {
    try {
      // Read the file as a buffer
      const buffer = readFileSync(filePath);
      
      // Parse the workbook
      const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true, cellFormula: true });
      
      const sheets: ExcelSheet[] = [];
      
      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays (preserves formatting)
        const data = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          blankrows: false
        }) as unknown[][];
        
        // Convert to JSON with headers as keys
        const json = XLSX.utils.sheet_to_json(worksheet, {
          defval: null,
          blankrows: false
        }) as Record<string, unknown>[];
        
        sheets.push({
          name: sheetName,
          data,
          json
        });
      });
      
      return {
        filename: path.basename(filePath),
        sheets,
        sheetNames: workbook.SheetNames
      };
      
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get a specific sheet by name
   */
  static getSheet(workbook: ExcelWorkbook, sheetName: string): ExcelSheet | null {
    return workbook.sheets.find(sheet => sheet.name === sheetName) || null;
  }
  
  /**
   * Get cell value with formula information
   */
  static getCellWithFormula(filePath: string, sheetName: string, cellAddress: string): {
    value: unknown;
    formula?: string;
    type?: string;
  } {
    try {
      const buffer = readFileSync(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: true });
      
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`Sheet '${sheetName}' not found`);
      }
      
      const cell = worksheet[cellAddress];
      if (!cell) {
        return { value: null };
      }
      
      return {
        value: cell.v,
        formula: cell.f,
        type: cell.t
      };
      
    } catch (error) {
      throw new Error(`Failed to get cell: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Search for text across all sheets
   */
  static searchText(workbook: ExcelWorkbook, searchText: string, caseSensitive: boolean = false): Array<{
    sheet: string;
    row: number;
    col: number;
    value: unknown;
  }> {
    const results: Array<{
      sheet: string;
      row: number;
      col: number;
      value: unknown;
    }> = [];
    
    const search = caseSensitive ? searchText : searchText.toLowerCase();
    
    workbook.sheets.forEach(sheet => {
      sheet.data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell !== null && cell !== undefined) {
            const cellValue = caseSensitive ? String(cell) : String(cell).toLowerCase();
            if (cellValue.includes(search)) {
              results.push({
                sheet: sheet.name,
                row: rowIndex,
                col: colIndex,
                value: cell
              });
            }
          }
        });
      });
    });
    
    return results;
  }
  
  /**
   * Extract all formulas from a workbook
   */
  static extractFormulas(filePath: string): Array<{
    sheet: string;
    cell: string;
    formula: string;
    value: unknown;
  }> {
    try {
      const buffer = readFileSync(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: true });
      
      const formulas: Array<{
        sheet: string;
        cell: string;
        formula: string;
        value: unknown;
      }> = [];
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        Object.keys(worksheet).forEach(cellAddress => {
          if (cellAddress.startsWith('!')) return; // Skip metadata
          
          const cell = worksheet[cellAddress];
          if (cell && cell.f) {
            formulas.push({
              sheet: sheetName,
              cell: cellAddress,
              formula: cell.f,
              value: cell.v
            });
          }
        });
      });
      
      return formulas;
      
    } catch (error) {
      throw new Error(`Failed to extract formulas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get workbook metadata and statistics
   */
  static getWorkbookInfo(filePath: string): {
    filename: string;
    sheetCount: number;
    sheets: Array<{
      name: string;
      rowCount: number;
      colCount: number;
      cellCount: number;
    }>;
    totalCells: number;
    hasFormulas: boolean;
    formulaCount: number;
  } {
    const workbook = this.readFile(filePath);
    const formulas = this.extractFormulas(filePath);
    
    let totalCells = 0;
    const sheetInfo = workbook.sheets.map(sheet => {
      const rowCount = sheet.data.length;
      const colCount = rowCount > 0 ? Math.max(...sheet.data.map(row => row.length)) : 0;
      const cellCount = sheet.data.reduce((sum, row) => sum + row.filter(cell => cell !== null && cell !== undefined).length, 0);
      totalCells += cellCount;
      
      return {
        name: sheet.name,
        rowCount,
        colCount,
        cellCount
      };
    });
    
    return {
      filename: workbook.filename,
      sheetCount: workbook.sheets.length,
      sheets: sheetInfo,
      totalCells,
      hasFormulas: formulas.length > 0,
      formulaCount: formulas.length
    };
  }
}
