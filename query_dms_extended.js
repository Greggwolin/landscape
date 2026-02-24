const { Client } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

async function runQueries() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check DMS templates table structure
    console.log('\n=== DMS Templates Table Structure ===');
    try {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'landscape' AND table_name = 'dms_templates'
        ORDER BY ordinal_position;
      `);
      console.log('dms_templates columns:', JSON.stringify(result.rows, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }

    // Query all DMS templates
    console.log('\n=== QUERY D: DMS Templates (corrected) ===');
    try {
      const result = await client.query(`
        SELECT template_id, template_name, is_default, doc_type_options
        FROM landscape.dms_templates
        ORDER BY template_id;
      `);
      console.log('Results:', JSON.stringify(result.rows, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }

    // Check smart filter table structure
    console.log('\n=== Smart Filter Table Structure ===');
    try {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'landscape' AND table_name = 'core_doc_smartfilter'
        ORDER BY ordinal_position;
      `);
      console.log('core_doc_smartfilter columns:', JSON.stringify(result.rows, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }

    // Query smart filters
    console.log('\n=== QUERY C: Smart Filters (if exists) ===');
    try {
      const result = await client.query(`
        SELECT * FROM landscape.core_doc_smartfilter
        LIMIT 5;
      `);
      console.log('Results:', JSON.stringify(result.rows, null, 2));
    } catch (e) {
      console.log('Error or table does not exist:', e.message);
    }

    // Check all document type assignments for recent docs
    console.log('\n=== Document Type Usage ===');
    try {
      const result = await client.query(`
        SELECT doc_type, COUNT(*) as count
        FROM landscape.core_doc
        GROUP BY doc_type
        ORDER BY count DESC;
      `);
      console.log('Results:', JSON.stringify(result.rows, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }

    // Check core_doc table structure
    console.log('\n=== core_doc Table Structure ===');
    try {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'landscape' AND table_name = 'core_doc'
        ORDER BY ordinal_position;
      `);
      console.log('core_doc columns:', JSON.stringify(result.rows, null, 2));
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
