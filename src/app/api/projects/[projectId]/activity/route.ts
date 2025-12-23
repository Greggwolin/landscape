/**
 * Project Activity API
 *
 * GET /api/projects/[projectId]/activity
 *
 * Returns recent activity for a project including:
 * - Document uploads
 * - Budget changes
 * - Chat interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type ActivityChannel = 'landscaper' | 'property' | 'market' | 'budget' | 'underwriter' | 'docs';

interface ActivityItem {
  id: string;
  timestamp: string;
  channel: ActivityChannel;
  type: 'extraction' | 'update' | 'validation' | 'question' | 'insight' | 'upload';
  title: string;
  description: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  profile?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '20');

    const activities: ActivityItem[] = [];

    // Query recent document uploads with embedding counts for confidence
    const docResults = await sql<{
      doc_id: number;
      created_at: Date;
      doc_name: string;
      status: string;
      doc_profile: string | null;
      profile: string | null;
      embedding_count: number;
    }[]>`
      SELECT
        d.doc_id,
        d.created_at,
        d.doc_name,
        d.status,
        d.doc_profile,
        d.profile,
        COALESCE(e.embedding_count, 0)::int as embedding_count
      FROM landscape.core_doc d
      LEFT JOIN (
        SELECT source_id, COUNT(*) as embedding_count
        FROM landscape.knowledge_embeddings
        WHERE source_type = 'document_chunk'
        GROUP BY source_id
      ) e ON d.doc_id = e.source_id
      WHERE d.project_id = ${projectId}::bigint
      ORDER BY d.created_at DESC
      LIMIT ${limit}
    `;

    for (const doc of docResults) {
      // Confidence based on actual processing status:
      // - high: document has been processed and has embeddings
      // - medium: document uploaded but processing incomplete
      // - low: document not processed or failed
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (doc.embedding_count > 0) {
        confidence = 'high';
      } else if (doc.status === 'review' || doc.status === 'draft') {
        confidence = 'medium';
      }

      activities.push({
        id: `doc_${doc.doc_id}`,
        timestamp: doc.created_at.toISOString(),
        channel: 'docs',
        type: 'upload',
        title: doc.embedding_count > 0 ? 'Document processed' : 'Document uploaded',
        description: doc.doc_name,
        confidence,
        source: doc.doc_name,
        profile: doc.profile || doc.doc_profile || undefined,
      });
    }

    // Query recent budget changes (if table exists)
    try {
      const budgetResults = await sql<{
        fact_id: number;
        updated_at: Date;
        category_name: string | null;
        amount: number;
      }[]>`
        SELECT
          b.fact_id,
          b.updated_at,
          c.category_name,
          b.amount
        FROM landscape.tbl_budget_fact b
        LEFT JOIN landscape.core_unit_cost_category c ON b.category_id = c.category_id
        WHERE b.project_id = ${projectId}::bigint
        ORDER BY b.updated_at DESC
        LIMIT ${limit}
      `;

      for (const budget of budgetResults) {
        activities.push({
          id: `budget_${budget.fact_id}`,
          timestamp: budget.updated_at.toISOString(),
          channel: 'budget',
          type: 'update',
          title: 'Budget updated',
          description: budget.category_name || 'Budget item',
          confidence: 'medium',
        });
      }
    } catch {
      // Budget table may not exist for this project
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Filter by channel if specified
    let filteredActivities = activities;
    if (channel) {
      filteredActivities = activities.filter(a => a.channel === channel);
    }

    // Limit results
    const limitedActivities = filteredActivities.slice(0, limit);

    return NextResponse.json({ items: limitedActivities });

  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json({ items: [] });
  }
}
