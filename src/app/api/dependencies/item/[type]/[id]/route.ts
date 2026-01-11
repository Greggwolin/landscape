import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTimelineItemSummary, TimelineItemType } from '@/lib/timeline-engine/item-service';

const ITEM_TYPES: TimelineItemType[] = ['budget', 'milestone'];

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { type: typeParam, id } = await context.params;
    const type = typeParam as TimelineItemType;
    if (!ITEM_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item type' },
        { status: 400 }
      );
    }

    const itemId = Number(id);
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Invalid item id' },
        { status: 400 }
      );
    }

    const itemSummary = await getTimelineItemSummary(type, itemId);
    if (!itemSummary) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    const predecessors = await sql`
      SELECT
        d.dependency_id,
        d.predecessor_type,
        d.predecessor_id,
        d.dependency_type,
        d.lag_days,
        d.is_hard_constraint,
        COALESCE(
          CASE WHEN d.predecessor_type = 'budget' THEN cat_pre.detail END,
          CASE WHEN d.predecessor_type = 'milestone' THEN ms_pre.milestone_name END,
          CONCAT(UPPER(d.predecessor_type), ' #', d.predecessor_id::text)
        ) AS predecessor_name
      FROM landscape.tbl_dependency d
      LEFT JOIN landscape.core_fin_fact_budget fb_pre
        ON d.predecessor_type = 'budget' AND fb_pre.fact_id = d.predecessor_id
      LEFT JOIN landscape.core_fin_category cat_pre
        ON fb_pre.category_id = cat_pre.category_id
      LEFT JOIN landscape.tbl_project_milestone ms_pre
        ON d.predecessor_type = 'milestone' AND ms_pre.milestone_id = d.predecessor_id
      WHERE d.successor_type = ${type}
        AND d.successor_id = ${itemId}
        AND d.is_active = TRUE
      ORDER BY d.created_at
    `;

    const successors = await sql`
      SELECT
        d.dependency_id,
        d.successor_type,
        d.successor_id,
        d.dependency_type,
        d.lag_days,
        d.is_hard_constraint,
        COALESCE(
          CASE WHEN d.successor_type = 'budget' THEN cat_suc.detail END,
          CASE WHEN d.successor_type = 'milestone' THEN ms_suc.milestone_name END,
          CONCAT(UPPER(d.successor_type), ' #', d.successor_id::text)
        ) AS successor_name
      FROM landscape.tbl_dependency d
      LEFT JOIN landscape.core_fin_fact_budget fb_suc
        ON d.successor_type = 'budget' AND fb_suc.fact_id = d.successor_id
      LEFT JOIN landscape.core_fin_category cat_suc
        ON fb_suc.category_id = cat_suc.category_id
      LEFT JOIN landscape.tbl_project_milestone ms_suc
        ON d.successor_type = 'milestone' AND ms_suc.milestone_id = d.successor_id
      WHERE d.predecessor_type = ${type}
        AND d.predecessor_id = ${itemId}
        AND d.is_active = TRUE
      ORDER BY d.created_at
    `;

    return NextResponse.json({
      success: true,
      itemId,
      itemType: type,
      itemName: itemSummary.name,
      predecessors,
      successors
    });
  } catch (error: any) {
    console.error('Fetch item dependencies error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch dependencies' },
      { status: 500 }
    );
  }
}
