#!/usr/bin/env node

/**
 * API Audit Script
 * 
 * Analyzes existing API endpoints against the database schema
 * to identify coverage gaps and opportunities for new endpoints.
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load expected schema from JSON export
const schemaJsonPath = join(__dirname, '..', 'LocalFiles', 'landscape_neon_91225b.json');
let expectedSchema;
try {
  const schemaContent = readFileSync(schemaJsonPath, 'utf8');
  expectedSchema = JSON.parse(schemaContent);
} catch (error) {
  console.error('❌ Could not load schema JSON:', error.message);
  process.exit(1);
}

// Get all unique table names from schema
const allTables = [...new Set(expectedSchema.map(col => col.table_name))].sort();

// Categorize tables by functional area
const tableCategories = {
  'Financial System': allTables.filter(t => t.startsWith('core_fin_')),
  'Lookup System': allTables.filter(t => t.startsWith('core_lookup_')),
  'Land Use': allTables.filter(t => t.startsWith('lu_') || t.includes('landuse')),
  'Zoning': allTables.filter(t => t.includes('zoning') || t === 'glossary_zoning'),
  'Project Management': allTables.filter(t => ['tbl_project', 'tbl_phase', 'tbl_area', 'tbl_parcel'].includes(t)),
  'Budget & Finance': allTables.filter(t => ['tbl_budget', 'tbl_budget_items', 'tbl_budget_structure', 'tbl_capitalization'].includes(t)),
  'Acquisition': allTables.filter(t => t.includes('acquisition')),
  'Planning & Approval': allTables.filter(t => ['tbl_approval', 'planning_doc'].includes(t)),
  'Contacts & Vendors': allTables.filter(t => t.includes('contact')),
  'Utility & Reference': allTables.filter(t => ['tbl_measures', 'tbl_assumptionrule', 'market_assumptions'].includes(t)),
  'Products & Lots': allTables.filter(t => t.includes('lot') || t.includes('product')),
  'Views & Temp': allTables.filter(t => t.startsWith('vw_') || t.startsWith('tmp_')),
};

// Remove categorized tables from allTables to find uncategorized ones
const categorizedTables = Object.values(tableCategories).flat();
const uncategorizedTables = allTables.filter(t => !categorizedTables.includes(t));
if (uncategorizedTables.length > 0) {
  tableCategories['Other'] = uncategorizedTables;
}

function scanApiDirectory(dirPath) {
  const apis = [];
  
  function scanRecursively(currentPath, relativePath = '') {
    const items = readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = join(currentPath, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanRecursively(itemPath, join(relativePath, item));
      } else if (item === 'route.ts') {
        // Found an API route
        const routePath = relativePath || '/';
        const fullPath = itemPath;
        
        // Try to read the file to get HTTP methods
        try {
          const content = readFileSync(fullPath, 'utf8');
          const methods = [];
          
          if (content.includes('export async function GET')) methods.push('GET');
          if (content.includes('export async function POST')) methods.push('POST');
          if (content.includes('export async function PUT')) methods.push('PUT');
          if (content.includes('export async function PATCH')) methods.push('PATCH');
          if (content.includes('export async function DELETE')) methods.push('DELETE');
          
          // Extract table references
          const tableMatches = content.match(/FROM\s+(\w+\.)?(\w+)/gi) || [];
          const tables = tableMatches.map(match => {
            const parts = match.replace(/FROM\s+/i, '').split('.');
            return parts.length > 1 ? parts[1] : parts[0];
          });
          
          apis.push({
            path: routePath.replace(/\\/g, '/'), // Normalize path separators
            methods,
            file: fullPath,
            tables: [...new Set(tables)]
          });
        } catch (error) {
          console.warn(`⚠️  Could not read ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  scanRecursively(dirPath);
  return apis;
}

function analyzeAPIs() {
  console.log('🔍 Auditing API endpoints against database schema...\n');
  
  const apiDir = join(__dirname, '..', 'src', 'app', 'api');
  const existingAPIs = scanApiDirectory(apiDir);
  
  console.log(`📊 Found ${existingAPIs.length} API endpoints:\n`);
  
  // Group APIs by functionality
  const apisByCategory = {};
  const tablesWithAPIs = new Set();
  
  existingAPIs.forEach(api => {
    // Categorize API by path
    const pathParts = api.path.split('/').filter(p => p);
    const category = pathParts[0] || 'root';
    
    if (!apisByCategory[category]) {
      apisByCategory[category] = [];
    }
    apisByCategory[category].push(api);
    
    // Track which tables have APIs
    api.tables.forEach(table => tablesWithAPIs.add(table));
  });
  
  // Display existing APIs by category
  console.log('📋 Existing API Coverage:\n');
  Object.entries(apisByCategory).forEach(([category, apis]) => {
    console.log(`  🗂️  ${category.toUpperCase()}`);
    apis.forEach(api => {
      const methodsStr = api.methods.join(', ');
      const tablesStr = api.tables.length > 0 ? ` (${api.tables.join(', ')})` : '';
      console.log(`     ${methodsStr.padEnd(20)} ${api.path}${tablesStr}`);
    });
    console.log();
  });
  
  // Analyze coverage by table category
  console.log('📈 Table Coverage Analysis:\n');
  
  Object.entries(tableCategories).forEach(([category, tables]) => {
    const coveredTables = tables.filter(table => tablesWithAPIs.has(table));
    const coveragePercent = tables.length > 0 ? Math.round((coveredTables.length / tables.length) * 100) : 0;
    
    console.log(`  ${category}:`);
    console.log(`    📊 Coverage: ${coveredTables.length}/${tables.length} tables (${coveragePercent}%)`);
    
    if (coveredTables.length > 0) {
      console.log(`    ✅ Covered: ${coveredTables.join(', ')}`);
    }
    
    const missingTables = tables.filter(table => !tablesWithAPIs.has(table));
    if (missingTables.length > 0) {
      console.log(`    ❌ Missing: ${missingTables.join(', ')}`);
    }
    console.log();
  });
  
  // Overall statistics
  const totalTablesWithAPIs = tablesWithAPIs.size;
  const totalTables = allTables.length;
  const overallCoverage = Math.round((totalTablesWithAPIs / totalTables) * 100);
  
  console.log('📊 OVERALL STATISTICS:\n');
  console.log(`  🎯 API Coverage: ${totalTablesWithAPIs}/${totalTables} tables (${overallCoverage}%)`);
  console.log(`  📁 Total Endpoints: ${existingAPIs.length}`);
  console.log(`  📋 Categories: ${Object.keys(apisByCategory).length}`);
  
  // Priority recommendations
  console.log('\n🚀 HIGH-PRIORITY MISSING ENDPOINTS:\n');
  
  const priorities = [
    {
      title: 'Financial System (0% coverage)',
      tables: tableCategories['Financial System'],
      reason: 'Core financial features missing - budget management, categories, funding'
    },
    {
      title: 'Lookup System (0% coverage)', 
      tables: tableCategories['Lookup System'],
      reason: 'Essential for dropdowns, reference data, and data validation'
    },
    {
      title: 'Enhanced Zoning Data',
      tables: tableCategories['Zoning'].filter(t => !tablesWithAPIs.has(t)),
      reason: 'Rich jurisdiction-specific zoning information available'
    },
    {
      title: 'Land Use Specifications',
      tables: tableCategories['Land Use'].filter(t => !tablesWithAPIs.has(t)),
      reason: 'Development standards, residential/commercial specifications'
    }
  ];
  
  priorities.forEach((priority, index) => {
    if (priority.tables.length > 0) {
      console.log(`  ${index + 1}. ${priority.title}`);
      console.log(`     📋 Tables: ${priority.tables.join(', ')}`);
      console.log(`     💡 Why: ${priority.reason}`);
      console.log();
    }
  });
  
  // Suggested API endpoints
  console.log('📝 SUGGESTED NEW API ENDPOINTS:\n');
  
  const suggestions = [
    { path: '/api/fin/categories', methods: ['GET', 'POST'], tables: ['core_fin_category'], description: 'Financial category management' },
    { path: '/api/fin/budgets', methods: ['GET', 'POST'], tables: ['core_fin_budget_version', 'core_fin_fact_budget'], description: 'Budget version and fact management' },
    { path: '/api/fin/funding', methods: ['GET', 'POST'], tables: ['core_fin_funding_source'], description: 'Funding source management' },
    { path: '/api/lookups', methods: ['GET'], tables: ['core_lookup_vw'], description: 'All lookup data' },
    { path: '/api/lookups/[key]', methods: ['GET'], tables: ['core_lookup_item'], description: 'Specific lookup list items' },
    { path: '/api/zoning/glossary', methods: ['GET'], tables: ['glossary_zoning'], description: 'Enhanced zoning glossary with jurisdiction data' },
    { path: '/api/landuse/specs', methods: ['GET'], tables: ['lu_res_spec', 'lu_com_spec'], description: 'Development standards and specifications' },
    { path: '/api/landuse/families', methods: ['GET'], tables: ['lu_family', 'lu_subtype'], description: 'Land use classification system' },
  ];
  
  suggestions.forEach(suggestion => {
    console.log(`  🔗 ${suggestion.methods.join('|').padEnd(12)} ${suggestion.path}`);
    console.log(`     📊 Tables: ${suggestion.tables.join(', ')}`);
    console.log(`     📝 ${suggestion.description}`);
    console.log();
  });
  
  return {
    existingAPIs,
    tablesCovered: totalTablesWithAPIs,
    totalTables,
    coveragePercent: overallCoverage,
    priorities,
    suggestions
  };
}

// Run audit
try {
  const results = analyzeAPIs();
  console.log('✨ API audit complete!');
  
  if (results.coveragePercent < 50) {
    console.log('⚠️  Low API coverage detected. Consider prioritizing the suggested endpoints.');
    process.exit(1);
  }
} catch (error) {
  console.error('💥 API audit failed:', error);
  process.exit(1);
}