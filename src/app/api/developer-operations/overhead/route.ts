import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-Time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const CONTAINER_LEVEL_LABELS: Record<string, string> = {
  project: 'Project',
  phase: 'Phase',
  subdivision: 'Subdivision',
  building: 'Building',
};

function calculateTotalAmount(amount: number, frequency: string, durationPeriods: number): number {
  if (frequency === 'one_time') {
    return amount;
  }
  return amount * durationPeriods;
}

/**
 * GET /api/developer-operations/overhead
 * List all management overhead items for a project with summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const items = await sql`
      SELECT
        id,
        project_id,
        item_name,
        amount,
        frequency,
        start_period,
        duration_periods,
        container_level,
        container_id,
        notes,
        created_at,
        updated_at
      FROM landscape.management_overhead
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY item_name, created_at
    `;

    // Transform with display labels and calculated totals
    const transformedItems = items.map((item) => {
      const amount = Number(item.amount);
      const durationPeriods = Number(item.duration_periods || 1);
      const totalAmount = calculateTotalAmount(amount, item.frequency, durationPeriods);

      return {
        id: Number(item.id),
        project_id: Number(item.project_id),
        item_name: item.item_name,
        amount,
        frequency: item.frequency,
        frequency_display: FREQUENCY_LABELS[item.frequency] || item.frequency,
        start_period: Number(item.start_period || 1),
        duration_periods: durationPeriods,
        container_level: item.container_level,
        container_level_display: item.container_level
          ? CONTAINER_LEVEL_LABELS[item.container_level] || item.container_level
          : null,
        container_id: item.container_id ? Number(item.container_id) : null,
        notes: item.notes,
        total_amount: totalAmount,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

    // Calculate summary
    const totalOverhead = transformedItems.reduce((sum, item) => sum + item.total_amount, 0);
    let monthlyOverhead = 0;
    transformedItems.forEach((item) => {
      if (item.frequency === 'monthly') {
        monthlyOverhead += item.amount;
      } else if (item.frequency === 'quarterly') {
        monthlyOverhead += item.amount / 3;
      } else if (item.frequency === 'annually') {
        monthlyOverhead += item.amount / 12;
      }
    });

    return NextResponse.json({
      items: transformedItems,
      summary: {
        total_overhead: totalOverhead,
        monthly_overhead: monthlyOverhead,
        items_count: transformedItems.length,
      },
    });
  } catch (error) {
    console.error('Error fetching management overhead:', error);
    return NextResponse.json(
      { error: 'Failed to fetch management overhead' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/developer-operations/overhead
 * Create a new management overhead item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      item_name,
      amount,
      frequency = 'monthly',
      start_period = 1,
      duration_periods = 1,
      container_level,
      container_id,
      notes,
    } = body;

    if (!project_id || !item_name || amount === undefined) {
      return NextResponse.json(
        { error: 'project_id, item_name, and amount are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO landscape.management_overhead (
        project_id,
        item_name,
        amount,
        frequency,
        start_period,
        duration_periods,
        container_level,
        container_id,
        notes
      ) VALUES (
        ${project_id},
        ${item_name},
        ${amount},
        ${frequency},
        ${start_period},
        ${duration_periods},
        ${container_level || null},
        ${container_id || null},
        ${notes || null}
      )
      RETURNING *
    `;

    const item = result[0];
    const itemAmount = Number(item.amount);
    const itemDuration = Number(item.duration_periods || 1);
    const totalAmount = calculateTotalAmount(itemAmount, item.frequency, itemDuration);

    return NextResponse.json(
      {
        id: Number(item.id),
        project_id: Number(item.project_id),
        item_name: item.item_name,
        amount: itemAmount,
        frequency: item.frequency,
        frequency_display: FREQUENCY_LABELS[item.frequency] || item.frequency,
        start_period: Number(item.start_period || 1),
        duration_periods: itemDuration,
        container_level: item.container_level,
        container_level_display: item.container_level
          ? CONTAINER_LEVEL_LABELS[item.container_level] || item.container_level
          : null,
        container_id: item.container_id ? Number(item.container_id) : null,
        notes: item.notes,
        total_amount: totalAmount,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating management overhead:', error);
    return NextResponse.json(
      { error: 'Failed to create management overhead' },
      { status: 500 }
    );
  }
}
