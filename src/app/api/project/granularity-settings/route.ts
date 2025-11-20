import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

interface GranularitySettings {
  level1Enabled: boolean;
  level1Label: string;
  level2Enabled: boolean;
  level2Label: string;
  level3Enabled: boolean;
  level3Label: string;
  autoNumber: boolean;
  planningEfficiency: number | null;
}

// GET - Load current granularity settings for a project
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

    const [config] = await sql`
      SELECT
        tier_1_label as level1_label,
        tier_2_label as level2_label,
        tier_3_label as level3_label,
        auto_number
      FROM landscape.tbl_project_config
      WHERE project_id = ${projectId}
    `;

    let projectPlanning: { planning_efficiency: number | null } | undefined;
    try {
      [projectPlanning] = await sql`
        SELECT planning_efficiency
        FROM landscape.tbl_project
        WHERE project_id = ${projectId}::bigint
        LIMIT 1
      `;
    } catch (error) {
      console.warn('Could not read planning_efficiency column:', error);
      projectPlanning = undefined;
    }

    if (!config) {
      return NextResponse.json({
        level1Enabled: true,
        level1Label: 'Area',
        level2Enabled: true,
        level2Label: 'Phase',
        level3Enabled: true,
        level3Label: 'Parcel',
        autoNumber: false,
        planningEfficiency: projectPlanning?.planning_efficiency ?? null
      });
    }

    return NextResponse.json({
      level1Enabled: true,
      level1Label: config.level1_label ?? 'Area',
      level2Enabled: true,
      level2Label: config.level2_label ?? 'Phase',
      level3Enabled: true,
      level3Label: config.level3_label ?? 'Parcel',
      autoNumber: Boolean(config.auto_number),
      planningEfficiency: projectPlanning?.planning_efficiency ?? null
    });
    } catch (error) {
    console.error('Error loading granularity settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PUT - Save granularity settings for a project
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const settings: GranularitySettings = await request.json();

    await sql`
      INSERT INTO landscape.tbl_project_config (project_id, asset_type, tier_1_label, tier_2_label, tier_3_label, auto_number)
      VALUES (${projectId}, 'project', ${settings.level1Label}, ${settings.level2Label}, ${settings.level3Label}, ${settings.autoNumber})
      ON CONFLICT (project_id) DO UPDATE
      SET
        tier_1_label = EXCLUDED.tier_1_label,
        tier_2_label = EXCLUDED.tier_2_label,
        tier_3_label = EXCLUDED.tier_3_label,
        auto_number = EXCLUDED.auto_number,
        updated_at = NOW()
    `;

    // Update planning efficiency in tbl_project
    try {
      await sql`
        UPDATE landscape.tbl_project
        SET planning_efficiency = ${settings.planningEfficiency}
        WHERE project_id = ${projectId}::bigint
      `;
    } catch (error) {
      console.error('Could not update planning_efficiency column:', error);
      // Don't fail the whole request, but log the error clearly
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving granularity settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
