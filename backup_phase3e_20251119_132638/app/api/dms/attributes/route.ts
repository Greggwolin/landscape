import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';
import type { DMSAttribute } from '@/lib/dms/db';

// GET /api/dms/attributes - List all attributes for workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // For now, get all attributes since we haven't implemented workspace-specific attributes
    // In a full implementation, you'd filter by workspace_id
    const attributes = await sql<DMSAttribute[]>`
      SELECT * FROM landscape.dms_attributes
      ORDER BY attr_name
    `;

    return NextResponse.json({ attributes });

  } catch (error) {
    console.error('Attributes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attributes' },
      { status: 500 }
    );
  }
}

// POST /api/dms/attributes - Create multiple attributes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, attributes } = body;

    if (!workspaceId || !Array.isArray(attributes)) {
      return NextResponse.json(
        { error: 'Workspace ID and attributes array are required' },
        { status: 400 }
      );
    }

    const createdAttributes: DMSAttribute[] = [];

    for (const attr of attributes) {
      const {
        attr_key,
        attr_name,
        attr_type,
        attr_description,
        is_required,
        is_searchable,
        validation_rules,
        enum_values,
        lookup_table,
        display_order
      } = attr;

      // Validate required fields
      if (!attr_key || !attr_name || !attr_type) {
        return NextResponse.json(
          { error: 'attr_key, attr_name, and attr_type are required for all attributes' },
          { status: 400 }
        );
      }

      // Check if attribute with this key already exists
      const existing = await sql<DMSAttribute[]>`
        SELECT attr_id FROM landscape.dms_attributes
        WHERE attr_key = ${attr_key}
      `;

      if (existing.length > 0) {
        return NextResponse.json(
          { error: `Attribute with key '${attr_key}' already exists` },
          { status: 409 }
        );
      }

      // Create the attribute
      const result = await sql<DMSAttribute[]>`
        INSERT INTO landscape.dms_attributes (
          attr_key, attr_name, attr_type, attr_description,
          is_required, is_searchable, validation_rules,
          enum_values, lookup_table, display_order
        )
        VALUES (
          ${attr_key}, ${attr_name}, ${attr_type}, ${attr_description || null},
          ${is_required || false}, ${is_searchable || true}, 
          ${JSON.stringify(validation_rules || {})},
          ${enum_values ? JSON.stringify(enum_values) : null},
          ${lookup_table || null}, ${display_order || 0}
        )
        RETURNING *
      `;

      createdAttributes.push(result[0]);
    }

    return NextResponse.json({
      success: true,
      attributes: createdAttributes
    });

  } catch (error) {
    console.error('Attributes creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create attributes' },
      { status: 500 }
    );
  }
}