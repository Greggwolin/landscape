const { Client } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

async function runQueries() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Query A: Recent documents
    console.log('\n=== QUERY A: Recent Documents ===');
    try {
      const resultA = await client.query(`
        SELECT doc_id, project_id, doc_name, doc_type, created_at
        FROM landscape.core_doc
        ORDER BY created_at DESC
        LIMIT 10;
      `);
      console.log('Results:', JSON.stringify(resultA.rows, null, 2));
    } catch (e) {
      console.log('Error or table does not exist:', e.message);
    }

    // Query B: Project template assignments
    console.log('\n=== QUERY B: Project Template Assignments ===');
    try {
      const resultB = await client.query(`
        SELECT 
          p.project_id,
          p.project_name,
          p.project_type,
          p.dms_template_id,
          t.template_name,
          t.doc_type_options
        FROM landscape.tbl_project p
        LEFT JOIN landscape.dms_templates t ON p.dms_template_id = t.template_id
        ORDER BY p.project_id;
      `);
      console.log('Results:', JSON.stringify(resultB.rows, null, 2));
    } catch (e) {
      console.log('Error or columns do not exist:', e.message);
    }

    // Query C: Smart filters
    console.log('\n=== QUERY C: Smart Filters ===');
    try {
      const resultC = await client.query(`
        SELECT project_id, filter_name, filter_type, filter_value, display_order, is_active
        FROM landscape.core_doc_smartfilter
        ORDER BY project_id, display_order;
      `);
      console.log('Results:', JSON.stringify(resultC.rows, null, 2));
    } catch (e) {
      console.log('Error or table does not exist:', e.message);
    }

    // Query D: DMS templates
    console.log('\n=== QUERY D: DMS Templates ===');
    try {
      const resultD = await client.query(`
        SELECT template_id, template_name, project_type, is_default, doc_type_options
        FROM landscape.dms_templates
        ORDER BY template_id;
      `);
      console.log('Results:', JSON.stringify(resultD.rows, null, 2));
    } catch (e) {
      console.log('Error or table does not exist:', e.message);
    }

    // Additional exploratory queries
    console.log('\n=== ADDITIONAL: Check tbl_project columns ===');
    try {
      const resultExtra = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'landscape' AND table_name = 'tbl_project'
        ORDER BY ordinal_position;
      `);
      console.log('tbl_project columns:', JSON.stringify(resultExtra.rows, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }

  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await client.end();
  }
}

runQueries();
