import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    console.log('🚀 Starting DMS migration...');
    
    // Execute migrations step by step
    console.log('📄 Creating DMS tables...');

    // 1. Workspaces table
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_workspaces (
          workspace_id BIGSERIAL PRIMARY KEY,
          workspace_code VARCHAR(50) UNIQUE NOT NULL,
          workspace_name VARCHAR(255) NOT NULL,
          description TEXT,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Insert default workspace
    await sql`
      INSERT INTO landscape.dms_workspaces (workspace_code, workspace_name, description, is_default)
      VALUES ('W1', 'Phased Development', 'Default phased development workspace', TRUE)
      ON CONFLICT (workspace_code) DO NOTHING
    `;

    // 2. Custom attribute definitions
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_attributes (
          attr_id BIGSERIAL PRIMARY KEY,
          attr_key VARCHAR(100) NOT NULL,
          attr_name VARCHAR(255) NOT NULL,
          attr_type VARCHAR(50) NOT NULL CHECK (attr_type IN ('text', 'number', 'date', 'boolean', 'currency', 'enum', 'lookup', 'tags', 'json')),
          attr_description TEXT,
          is_required BOOLEAN DEFAULT FALSE,
          is_searchable BOOLEAN DEFAULT TRUE,
          validation_rules JSONB DEFAULT '{}',
          enum_values JSONB DEFAULT NULL,
          lookup_table VARCHAR(100) DEFAULT NULL,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(attr_key)
      )
    `;

    // 3. Document templates
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_templates (
          template_id BIGSERIAL PRIMARY KEY,
          template_name VARCHAR(255) NOT NULL,
          workspace_id BIGINT REFERENCES landscape.dms_workspaces(workspace_id),
          project_id BIGINT REFERENCES landscape.tbl_project(project_id) DEFAULT NULL,
          doc_type VARCHAR(100),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 4. Template attribute bindings
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_template_attributes (
          template_id BIGINT REFERENCES landscape.dms_templates(template_id) ON DELETE CASCADE,
          attr_id BIGINT REFERENCES landscape.dms_attributes(attr_id) ON DELETE CASCADE,
          is_required BOOLEAN DEFAULT FALSE,
          default_value JSONB DEFAULT NULL,
          display_order INTEGER DEFAULT 0,
          PRIMARY KEY (template_id, attr_id)
      )
    `;

    // 5. Core document registry
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.core_doc (
          doc_id BIGSERIAL PRIMARY KEY,
          project_id BIGINT REFERENCES landscape.tbl_project(project_id),
          workspace_id BIGINT REFERENCES landscape.dms_workspaces(workspace_id),
          phase_id BIGINT REFERENCES landscape.tbl_phase(phase_id) DEFAULT NULL,
          parcel_id BIGINT REFERENCES landscape.tbl_parcel(parcel_id) DEFAULT NULL,
          
          -- Document metadata
          doc_name VARCHAR(500) NOT NULL,
          doc_type VARCHAR(100) NOT NULL DEFAULT 'general',
          discipline VARCHAR(100) DEFAULT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_size_bytes BIGINT NOT NULL,
          sha256_hash VARCHAR(64) NOT NULL,
          storage_uri TEXT NOT NULL,
          
          -- Versioning
          version_no INTEGER DEFAULT 1,
          parent_doc_id BIGINT REFERENCES landscape.core_doc(doc_id) DEFAULT NULL,
          
          -- Status tracking
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'indexed', 'failed', 'archived')),
          
          -- Profile data (Hybrid model)
          profile_json JSONB DEFAULT '{}',
          
          -- Hot fields (can be indexed, updated via triggers)
          doc_date DATE DEFAULT NULL,
          contract_value DECIMAL(15,2) DEFAULT NULL,
          priority VARCHAR(20) DEFAULT NULL,
          
          -- Audit fields
          created_by BIGINT DEFAULT NULL,
          updated_by BIGINT DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 6. Profile audit log
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_profile_audit (
          audit_id BIGSERIAL PRIMARY KEY,
          doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
          changed_by BIGINT DEFAULT NULL,
          change_type VARCHAR(50) NOT NULL DEFAULT 'profile_update',
          old_profile_json JSONB DEFAULT '{}',
          new_profile_json JSONB DEFAULT '{}',
          changed_fields TEXT[] DEFAULT '{}',
          change_reason TEXT DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 7. OCR/Extraction queue
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.dms_extract_queue (
          queue_id BIGSERIAL PRIMARY KEY,
          doc_id BIGINT REFERENCES landscape.core_doc(doc_id) ON DELETE CASCADE,
          extract_type VARCHAR(50) NOT NULL DEFAULT 'ocr',
          priority INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          error_message TEXT DEFAULT NULL,
          extracted_data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          processed_at TIMESTAMPTZ DEFAULT NULL
      )
    `;

    console.log('📊 Creating indexes...');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_core_doc_project_id ON landscape.core_doc(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_core_doc_workspace_id ON landscape.core_doc(workspace_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_core_doc_status ON landscape.core_doc(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_core_doc_doc_type ON landscape.core_doc(doc_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_core_doc_profile_json ON landscape.core_doc USING GIN(profile_json)`;

    console.log('🌱 Seeding default data...');

    // Insert default attributes
    await sql`
      INSERT INTO landscape.dms_attributes (attr_key, attr_name, attr_type, attr_description, is_required, is_searchable, display_order) VALUES
          ('doc_date', 'Document Date', 'date', 'The official date of the document', FALSE, TRUE, 10),
          ('description', 'Description', 'text', 'Document description or summary', FALSE, TRUE, 20),
          ('priority', 'Priority', 'enum', 'Document priority level', FALSE, TRUE, 40),
          ('tags', 'Tags', 'tags', 'Document tags for categorization', FALSE, TRUE, 60)
      ON CONFLICT (attr_key) DO NOTHING
    `;

    // Set enum values for priority
    await sql`
      UPDATE landscape.dms_attributes 
      SET enum_values = '["Low", "Medium", "High", "Critical"]'::jsonb
      WHERE attr_key = 'priority'
    `;

    // Create default template
    await sql`
      INSERT INTO landscape.dms_templates (template_name, workspace_id, is_default)
      SELECT 'Default Document Template', workspace_id, TRUE
      FROM landscape.dms_workspaces 
      WHERE workspace_code = 'W1'
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'landscape' 
        AND (table_name LIKE 'dms_%' OR table_name = 'core_doc')
      ORDER BY table_name
    `;
    
    const tableList: string[] = [];
    tables.forEach((table: any) => {
      tableList.push(table.table_name);
    });
    
    // Check default data
    const workspaces = await sql`
      SELECT workspace_code, workspace_name 
      FROM landscape.dms_workspaces
      ORDER BY workspace_id
    `;
    
    const attributes = await sql`
      SELECT attr_key, attr_name, attr_type
      FROM landscape.dms_attributes
      ORDER BY display_order
    `;
    
    const templates = await sql`
      SELECT template_name, is_default
      FROM landscape.dms_templates
      ORDER BY template_id
    `;
    
    const seedData = {
      workspaces: workspaces.length,
      attributes: attributes.length,
      templates: templates.length
    };
    
    console.log('🎉 DMS migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'DMS migration completed successfully',
      tables: tableList,
      seedData,
      details: {
        workspaces: workspaces.map((w: any) => ({ code: w.workspace_code, name: w.workspace_name })),
        attributes: attributes.map((a: any) => ({ key: a.attr_key, name: a.attr_name, type: a.attr_type })),
        templates: templates.map((t: any) => ({ name: t.template_name, default: t.is_default }))
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: errorMessage
    }, { status: 500 });
  }
}