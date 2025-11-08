import { NextRequest, NextResponse } from 'next/server';
import { dmsDb } from '@/lib/dms/db';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/dms/documents/[id]/profile - Update document profile
export async function PATCH(
  request: NextRequest,
  context: Params
) {
  try {
    const docId = parseInt((await context.params).id);
    
    if (isNaN(docId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { profile, userId, reason } = body;

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    // Update document profile with audit trail
    const updatedDoc = await dmsDb.updateDocumentProfile(
      docId,
      profile,
      userId,
      reason
    );

    return NextResponse.json({
      success: true,
      doc: updatedDoc
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// GET /api/dms/documents/[id]/profile - Get document with template attributes
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const docId = parseInt((await context.params).id);
    
    if (isNaN(docId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Get the document
    const docs = await dmsDb.searchDocuments({
      query: `doc_id:${docId}`,
      limit: 1
    });

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const doc = docs[0];

    // Get default template for this document
    const template = await dmsDb.getDefaultTemplate(
      doc.workspace_id,
      doc.project_id,
      doc.doc_type
    );

    let attributes = [];
    if (template) {
      attributes = await dmsDb.getTemplateAttributes(template.template_id);
    }

    return NextResponse.json({
      doc,
      template,
      attributes
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document profile' },
      { status: 500 }
    );
  }
}